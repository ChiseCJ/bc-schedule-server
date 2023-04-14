/* eslint-disable lines-between-class-members */
import Koa, { Context, Next } from 'koa'
import koaBody from 'koa-body'
import Router from 'koa-router'
import { IBcScheduleType, IExecutorParams, ICallbackType, ITaskItem, ITaskList, IReadLogType, ExposeLogger } from './types'
import { isArray, getLocalIP, isFunction, isObject, request } from './util'
import { opLogger } from './middleware'
import { WLogger, readLocalLogById } from './logger'

const defaultOptions: Omit<IBcScheduleType, 'port' | 'scheduleCenterUrl'> = {
  route: '',
  logOption: {
    opLog: false,
    logPath: 'logs',
  },
}

export class BcScheduleServer {
  app!: Koa
  router!: Router
  taskList!: string[]
  private runningTaskList!: Set<number>
  private taskCacheList!: Map<string, ITaskItem>
  private options!: IBcScheduleType
  private logInstance!: WLogger

  constructor(options: IBcScheduleType) {
    if (!options || options.port == null) {
      console.error('\x1b[3m\x1b[34m \nccLog ——> [BcScheduleServer Error: 请配置启动 port] \x1b[0m')
      return
    }

    this.options = Object.assign(defaultOptions, options)
    this.taskCacheList = new Map()
    this.taskList = []
    this.runningTaskList = new Set()

    this.logInstance = new WLogger(this.options.logOption || {})
    this.start()
  }

  /**
   * @expose 注册定时任务
   * @return 已经注册的任务名称
   */
  registerTask(list: ITaskList): string[] {
    if (!isArray(list)) return this.taskList

    if (this.taskCacheList) {
      for (const task of list) {
        if (isFunction(task) && task.name && !this.taskCacheList.has(task.name)) {
          this.taskCacheList.set(task.name, task)
          this.taskList.push(task.name)
        }
      }
    }
    return this.taskList
  }

  private start() {
    const { port, route, koaOptions = {} } = this.options

    this.app = new Koa(koaOptions)
    this.router = new Router({ prefix: route })

    this.expendAndMiddleware(this.app)

    this.addRoutes()
    this.app.use(this.router.routes()).use(this.router.allowedMethods())

    this.app.listen(port, () => {
      const localIp = getLocalIP()
      console.log('\x1b[3m\x1b[34m \nccLog —>\x1b[0m', `Server running on\n  http://127.0.0.1:${port}\n  http://${localIp}:${port}`)

      const { callback } = this.options
      if (typeof callback === 'function') {
        callback(port)
      }
    })
  }

  private expendAndMiddleware(app: Koa) {
    const { opLog = false } = this.options.logOption!
    app.use(koaBody())
    app.use(opLogger(opLog, this.logInstance))
  }

  private addRoutes() {
    // 用于心跳检测
    this.router.post('/beat', (ctx: Context) => {
      ctx.status = 200
      ctx.body = { code: 200, msg: 'success' }
    })
    // 空闲心跳监测
    this.router.post('/idleBeat', (ctx: Context) => {
      const { jobId } = ctx.request.body || { jobId: -1 }
      ctx.status = 200
      ctx.body = this.hasTask(jobId) ? { code: 500, msg: `jobId:${jobId} is running` } : { code: 200, msg: 'success' }
    })
    this.router.post('/run', this.taskCheck.bind(this), this.taskHandle.bind(this))
    // todo 停止正在执行的任务
    this.router.post('/kill', (ctx: Context) => {
      const { jobId } = ctx.request.body || { jobId: -1 }
      ctx.status = 200
      ctx.body = { code: 500, msg: `not support kill jobId: ${jobId}` }
    })
    // 执行日志
    this.router.post('/log', async (ctx: Context) => {
      const { body } = ctx.request
      let resultContent = { logContent: 'local log is not used', fromLineNum: 1, toLineNum: 2, end: true }

      if (body) {
        const { logId } = body as IReadLogType
        const { findFlag, endFlag, content, fromLineNum, lineNum } = await readLocalLogById(this.logInstance)(body)
        if (!findFlag) {
          resultContent = { logContent: `log not found, logId: ${logId}`, fromLineNum: 1, toLineNum: 2, end: false }
        } else {
          resultContent = { logContent: content || '', fromLineNum: fromLineNum || 1, toLineNum: lineNum || 2, end: endFlag }
        }
      }

      ctx.status = 200
      ctx.body = { code: 200, msg: '', content: resultContent }
    })
  }

  private hasTask(jobId: number) {
    return this.runningTaskList.has(jobId)
  }

  /**
   * 校验参数及任务函数，及对应 jobId 是否已在运行
   */
  private taskCheck(ctx: Context, next: Next): Promise<any> | void {
    const { body } = ctx.request
    if (body && body?.executorHandler) {
      const { executorHandler, jobId } = ctx.request.body as IExecutorParams

      if (!this.taskList.includes(executorHandler)) {
        ctx.status = 200
        ctx.body = { code: 500, msg: `error: task ${executorHandler} is not register` }
      } else if (this.hasTask(jobId)) {
        ctx.status = 200
        ctx.body = { code: 500, msg: `jobId:${jobId} is running` }
      } else {
        return next()
      }
    } else {
      ctx.status = 200
      ctx.body = { code: 500, msg: 'error: request payload invalid' }
    }
  }

  private async taskHandle(ctx: Context) {
    const { jobId, logId, logDateTime, executorHandler } = ctx.request.body as IExecutorParams
    // 每次请求都生成一个新的 winston 实例
    const logger = this.logInstance.create({ logDateTime, logId })

    this.runningTaskList.add(jobId)
    this.execTask(executorHandler, ctx.request.body, logger)
      .then(result => this.finishTask({ logger, jobId, logId, result }))
      .catch(error => this.finishTask({ logger, jobId, logId, error }))

    ctx.status = 200
    ctx.body = { code: 200, msg: 'success run task' }
  }

  private async execTask(executorHandler: string, executorParams: IExecutorParams, logger: ExposeLogger) {
    const task = this.taskCacheList.get(executorHandler)
    return task!(logger, executorParams)
  }

  private finishTask(options: { jobId: number, logId: number, result?: any, error?: Error, logger: ExposeLogger }) {
    const { jobId, logId, result, error, logger } = options
    if (error) {
      logger.error(error.message || error)
      this.callback({ logId, error })
    } else {
      this.callback({ logId, result })
    }
    this.runningTaskList.delete(jobId)
  }

  private callback(params: ICallbackType) {
    const { scheduleCenterUrl } = this.options
    const url = `${scheduleCenterUrl}/api/callback`

    const { logId, result, error } = params
    const handleCode = error ? 500 : 200
    const handleMsg = error ? error.message || error.toString()
      : result ? (isObject(result) ? JSON.stringify(result) : (result).toString()) : 'execute success'

    request(url, [{ logId, handleCode, handleMsg }])
  }
}
