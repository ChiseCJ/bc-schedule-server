/* eslint-disable lines-between-class-members */
import path from 'path'
import fs from 'fs'
import readline from 'readline'
import jsonStringify from 'safe-stable-stringify'
import { createLogger, format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { ExposeLogger, ILoggerType, IReadLogType, IReadResponse } from './types'
import { isLocal, formatDate } from './util'

const logFormat = format.printf(info => {
  const { timestamp, level, message, stack, logId = 0 } = info
  const msgStr = jsonStringify(message, (_, value: any) => ['bigint', 'symbol'].includes(typeof value) ? value.toString() : value)
  if (stack) {
    return `${timestamp} [XXL-JOB-${logId}] ${level}:${stack || ''}`
  }
  return `${timestamp} [XXL-JOB-${logId}] ${level}:${msgStr || ''}`
})

const formatOptions = {
  local: [format.colorize({ all: true }), format.errors({ stack: true }), format.json(), format.splat(), format.simple()],
  prod: [format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.errors({ stack: true }), format.splat(), logFormat]
}

export class WLogger {
  options: ILoggerType

  constructor(options: ILoggerType) {
    this.options = options
  }

  create(params: { logDateTime?: number, logId?: number, isOpLog?: boolean }) {
    const { logPath = 'logs' } = this.options
    const { isOpLog = false, logDateTime, logId } = params

    const logger = createLogger({
      format: format.combine(...formatOptions[isLocal ? 'local' : 'prod']),
      transports: [
        // 生产环境不在 stdout 输出
        new transports.Console({ level: 'debug', silent: !isLocal })
      ],
      exitOnError: false
    })

    // 添加 log 动作
    if (isOpLog) {
      // 运行日志
      const filename = path.resolve(logPath, `./%DATE%-xxl-job-operation.log`)
      logger.add(new DailyRotateFile({
        filename,
        datePattern: `YYYY-MM-DD`,
      }))
    }
    if (!isLocal && logDateTime && logId) {
      // 生产日志
      const filename = path.resolve(logPath, `./%DATE%-xxl-job.log`)
      logger.add(new DailyRotateFile({
        filename,
        datePattern: `YYYY-MM-DD`,
      }))
    }

    return {
      info: (...params) => {
        params.push({ logId: logId || 0 })
        return logger.info.apply(logger, params as any)
      }, error: (...params) => {
        params.push({ logId: logId || 0 })
        return logger.error.apply(logger, params as any)
      }
    } as ExposeLogger
  }
}

export const readLocalLogById = (loggerInstance: WLogger) => ({ logId, logDateTim, fromLineNum }: IReadLogType) => {
  return new Promise<IReadResponse>(resolve => {
    if (isLocal) {
      return resolve({ content: 'is local fake data', fromLineNum: 1, lineNum: 2, endFlag: true, })
    }
    const { logPath = 'logs' } = loggerInstance.options
    const filename = path.resolve(logPath, `./${formatDate(logDateTim)}-xxl-job.log`)

    if (!fs.existsSync(filename)) {
      return resolve({ content: `log file not found, logId: ${logId}`, lineNum: fromLineNum - 1, endFlag: true })
    }

    const stream = fs.createReadStream(filename)
    const rl = readline.createInterface({ input: stream })

    let content = ''
    let lineNum = 0
    const pattern = new RegExp(`\\s\\[XXL-JOB-${logId}\\]\\s`)

    rl.on('line', line => {
      lineNum += 1
      if (pattern.test(line)) {
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
