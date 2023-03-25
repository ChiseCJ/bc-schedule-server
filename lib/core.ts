/* eslint-disable lines-between-class-members */
import Koa, { Context, Next } from 'koa'
import koaBody from 'koa-body'
import Router from 'koa-router'
import { IBcScheduleType, IParamsType, ICallbackType, ITaskItem, ITaskList, IReadLogType, ExposeLogger } from './interface'
import { isArray, getLocalIP, isFunction, isObject, request } from './util'
import { errorCapturer, opLogger } from './middleware'
import { Logger } from './logger'

const defaultOptions: Omit<IBcScheduleType, 'port' | 'scheduleCenterUrl'> = {
  opLog: false,
  route: '',
  localLog: {
    logName: 'xxl-job',
    logPath: 'logs',
  },
}

const fakeLogger: {
  info: () => any
  error: () => any
} = {
  info: console.info.bind(console),
  error: console.error.bind(console),
}

export class BcScheduleServer {
  app!: Koa
  router!: Router
  taskList!: string[]
  logger: ExposeLogger = fakeLogger
  private runningTaskList!: Set<number>
  private taskCacheList!: Map<string, ITaskItem>
  private options!: IBcScheduleType
  private readLog!: Function

  constructor(options: IBcScheduleType) {
    if (!options || options.port == null) {
      console.error('\x1b[3m\x1b[34m \nccLog ——> [BcScheduleServer Error: 请配置启动 port] \x1b[0m')
      return
    }

    this.options = Object.assign(defaultOptions, options)
    this.taskCacheList = new Map()
    this.taskList = []
    this.runningTaskList = new Set()

    if (typeof this.options.localLog === 'object') {
      const logInstance = new Logger(this.options.localLog)
      this.readLog = logInstance.readLocalLogById.bind(logInstance)
      this.logger = logInstance.create()
    }

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
        if (isFunction(task) && !this.taskCacheList.has(task.name)) {
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
      console.log('\x1b[3m\x1b[34m \nccLog ——> \x1b[0m', `Server running on http://127.0.0.1:${port}; http://${localIp}:${port}`)

      const { callback } = this.options
      if (typeof callback === 'function') {
        callback(port)
      }
    })
  }

  private expendAndMiddleware(app: Koa) {
    errorCapturer()

    const { opLog = false } = this.options
    app.use(koaBody())
    app.use(opLogger(opLog, this.logger))
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

      if (body && typeof this.options.localLog === 'object') {
        const { logId } = body as IReadLogType
        const { findFlag, endFlag, content, fromLineNum, lineNum } = await this.readLog(body)
        if (!findFlag) {
          resultContent = { logContent: `log not found, logId: ${logId}`, fromLineNum: 1, toLineNum: 2, end: false }
        } else {
          resultContent = { logContent: content, fromLineNum, toLineNum: lineNum, end: endFlag }
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
      const { executorHandler, jobId } = ctx.request.body as IParamsType

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
    const { jobId, logId, executorHandler } = ctx.request.body as IParamsType

    this.logger.info(`--- Job Task: ${jobId} is running: ${logId} ---`)
    this.runningTaskList.add(jobId)
    this.execTask(executorHandler, ctx.request.body)
      .then(result => this.finishTask({ jobId, logId, result }))
      .catch(error => this.finishTask({ jobId, logId, error }))

    ctx.status = 200
    ctx.body = { code: 200, msg: 'success run task' }
  }

  private async execTask(executorHandler: string, params: IParamsType) {
    const task = this.taskCacheList.get(executorHandler)
    return task!(params, this.logger)
  }

  private finishTask(options: { jobId: number, logId: number, result?: any, error?: Error }) {
    const { jobId, logId, result, error } = options
    if (error) {
      this.logger.error(error.message || error)
      this.callback({ logId, error })
    } else {
      this.callback({ logId, result })
    }
    this.runningTaskList.delete(jobId)
    this.logger.info(`--- Job Task: ${jobId} is finished: ${logId} ---`)
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
