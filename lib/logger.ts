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
  const { timestamp, level, message, stack } = info
  const msgStr = jsonStringify(message, (_, value: any) => ['bigint', 'symbol'].includes(typeof value) ? value.toString() : value)
  if (stack) {
    return `${timestamp} [XXL-JOB] ${level}:${stack || ''}`
  }
  return `${timestamp} [XXL-JOB] ${level}:${msgStr || ''}`
})

const formatOptions = {
  local: [format.colorize({ all: true }), format.errors({ stack: true }), format.json(), format.splat(), format.simple()],
  prod: [format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.errors({ stack: true }), format.splat(), logFormat]
}

// 目录结构：/logs/2023-05-01/123456.log
const getFullFilename = (prefixPath: string, timestampe: number, logId: number) => path.resolve(prefixPath, `./${formatDate(timestampe)}-xxl-job/${logId}.log`)

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

    if (isOpLog) {
      // 运行日志
      const filename = path.resolve(logPath, `./%DATE%-xxl-job-op.log`)
      logger.add(new DailyRotateFile({
        filename,
        datePattern: `YYYY-MM-DD`,
      }))
    } else if (!isLocal && logDateTime && logId) {
      // 生产日志
      const filename = getFullFilename(logPath, logDateTime, logId)
      logger.add(new transports.File({
        filename,
        handleExceptions: true,
      }))
    }

    return { info: logger.info.bind(logger), error: logger.error.bind(logger) } as ExposeLogger
  }
}

export const readLocalLogById = (loggerInstance: WLogger) => ({ logId, logDateTim, fromLineNum }: IReadLogType) => {
  return new Promise<IReadResponse>(resolve => {
    if (isLocal) {
      return resolve({ content: 'is local fake data', fromLineNum: 1, lineNum: 2, endFlag: true, })
    }
    // 按 logId 生成对立文件后，不在通过 running/finished 匹配 log 位置了
    const { logPath = 'logs' } = loggerInstance.options
    const filename = getFullFilename(logPath, logDateTim, logId)

    if (!fs.existsSync(filename)) {
      return resolve({ content: `log not found, logId: ${logId}`, endFlag: true })
    }

    const stream = fs.createReadStream(filename)
    const rl = readline.createInterface({ input: stream })

    let lineNum = 0
    let content = ''

    rl.on('line', line => {
      content += `${line}\n`
      lineNum += 1
    })

    rl.once('close', () => {
      if (content.length) {
        resolve({ content, fromLineNum, lineNum, endFlag: true })
      } else {
        resolve({ content: 'default text: internal logs are not used or no log output', fromLineNum, lineNum, endFlag: true })
      }
    })
  })
}
