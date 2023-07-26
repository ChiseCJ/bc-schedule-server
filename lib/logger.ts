/* eslint-disable lines-between-class-members */
import path from 'path'
import fs from 'fs'
import readline from 'readline'
import jsonStringify from 'safe-stable-stringify'
import { Logger, createLogger, format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { ExposeLogger, ILoggerType, IReadLogType, IReadResponse } from './types'
import { isLocal, formatDate } from './util'

const logFormat = format.printf(info => {
  const { timestamp, level, message, stack, errorType, jobId = 0, logId = 0 } = info
  const msgStr = jsonStringify(message, (_, value: any) => ['bigint', 'symbol'].includes(typeof value) ? value.toString() : value)
  if (stack) {
    return `${timestamp} [XXL-JOB-${jobId}-${logId}] ${level}:${errorType ? `${errorType}-` : ''}${stack || ''}`
  }
  return `${timestamp} [XXL-JOB-${jobId}-${logId}] ${level}:${msgStr || ''}`
})

const formatOptions = {
  local: [format.colorize({ all: true }), format.errors({ stack: true }), format.json(), format.splat(), format.simple()],
  prod: [format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.errors({ stack: true }), format.splat(), logFormat]
}

export class WLogger {
  options: ILoggerType
  logger: Logger

  constructor(options: ILoggerType, type: 'request' | 'production') {
    this.options = options || {}
    this.logger = this.genInstance(type)
  }

  private genInstance(type: 'request' | 'production') {
    const { logPath = 'logs', opLog = false } = this.options
    const logger = createLogger({
      format: format.combine(...formatOptions[isLocal ? 'local' : 'prod']),
      transports: [
        // 生产环境不在 stdout 输出
        new transports.Console({ level: 'debug', silent: !isLocal })
      ],
      exitOnError: false
    })

    if (!isLocal && type === 'request' && opLog) {
      // 运行日志
      const filename = path.resolve(logPath, `./%DATE%-xxl-job-operation.log`)
      logger.add(new DailyRotateFile({
        filename,
        datePattern: `YYYY-MM-DD`,
      }))
    } else if (!isLocal && type === 'production') {
      // 生产日志
      const filename = path.resolve(logPath, `./%DATE%-xxl-job.log`)
      logger.add(new DailyRotateFile({
        filename,
        datePattern: `YYYY-MM-DD`,
      }))
    }

    return logger
  }

  create(ctx?: any) {
    let jobId = 0
    let logId = 0
    try {
      const { request: { body } } = ctx || { request: {} }
      jobId = body?.jobId || 0
      logId = body?.logId || 0
      // eslint-disable-next-line no-empty
    } catch (error) { }

    return {
      info: (...params) => {
        params.push({ jobId, logId })
        // todo return this.logger.info(params)
        // eslint-disable-next-line prefer-spread
        return this.logger.info.apply(this.logger, params as any)
      }, error: (...params) => {
        params.push({ jobId, logId })
        // eslint-disable-next-line prefer-spread
        return this.logger.error.apply(this.logger, params as any)
      }
    } as ExposeLogger
  }
}

export const readLocalLogById = (logInstance: WLogger) => ({ logId, logDateTim, fromLineNum }: IReadLogType) => {
  return new Promise<IReadResponse>(resolve => {
    if (isLocal) {
      return resolve({ content: 'is local fake data', fromLineNum: 1, lineNum: 2, endFlag: true, })
    }
    const { logPath = 'logs' } = logInstance.options
    const filename = path.resolve(logPath, `./${formatDate(logDateTim)}-xxl-job.log`)

    if (!fs.existsSync(filename)) {
      return resolve({ content: `log file not found, logId: ${logId}`, lineNum: fromLineNum - 1, endFlag: true })
    }

    const stream = fs.createReadStream(filename)
    const rl = readline.createInterface({ input: stream })

    let content = ''
    let lineNum = 0
    let errorContent = false
    const defaultPattern = new RegExp(/\s\[XXL-JOB-\d+-\d+\]\s/)
    const logPattern = new RegExp(`\\s\\[XXL-JOB-\\d*-${logId}\\]\\s`)
    const unhandlePattern = new RegExp(/\s\[XXL-JOB-0-0\]\s/)
    const errorPattern = new RegExp(/\s*at\s+/)

    rl.on('line', line => {
      lineNum += 1
      if (logPattern.test(line)) {
        content += `${line}\n`
        errorContent = true
      } else if (defaultPattern.test(line) && !unhandlePattern.test(line)) {
        errorContent = false
      }

      if (errorContent && (errorPattern.test(line) || unhandlePattern.test(line))) {
        content += `${line}\n`
      }
    })
    rl.once('close', () => {
      if (content.length) {
        resolve({ content, fromLineNum, lineNum, endFlag: true })
      } else {
        resolve({ content: 'default text: internal logs are not used or no log output', fromLineNum, lineNum: 1, endFlag: true })
      }
    })
  })
}
