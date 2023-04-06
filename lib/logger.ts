/* eslint-disable lines-between-class-members */
import path from 'path'
import fs from 'fs'
import readline from 'readline'
import jsonStringify from 'safe-stable-stringify'
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston'
// import DailyRotateFile from 'winston-daily-rotate-file'
import { ExposeLogger, ILoggerType, IReadLogType } from './types'
import { isLocal } from './util'

const MAX_LINE = 10

const logFormat = format.printf(params => {
  const { level, message, timestamp, stack } = params
  return `${timestamp} [XXL-JOB] ${level}:${jsonStringify(message, (_, value: any) => ['bigint', 'symbol'].includes(typeof value) ? value.toString() : value)} ${stack || ''}`
})

const formatOptions = {
  local: [format.json(), format.errors(), format.colorize({ all: true }), format.simple()],
  prod: [format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat]
}

/**
 * @expose 对外的 logger
 */
export let logger: ExposeLogger

export class Logger {
  private options: ILoggerType
  private loggerRaw!: WinstonLogger

  constructor(options: ILoggerType) {
    this.options = options

  }

  create() {
    const logger = createLogger({
      format: format.combine(...formatOptions[isLocal ? 'local' : 'prod']),
      transports: [
        // 生产环境不在 stdout 输出
        new transports.Console({ level: 'debug', silent: !isLocal })
      ],
    })
    this.loggerRaw = logger

    return { info: logger.info.bind(logger), error: logger.error.bind(logger) } as ExposeLogger
  }

  addLogFile(logId: number, logDateTime: number) {
    const { logPath = 'logs' } = this.options
    const filename = path.resolve(logPath, `./${formatDate(logDateTime)}-xxl-job-${logId}.log`)
    if (!isLocal) {
      this.loggerRaw.add(new transports.File({ filename, handleExceptions: true, handleRejections: true }))
    }
  }

  readLocalLogById({ logId, logDateTim, fromLineNum }: IReadLogType) {
    return new Promise(resolve => {
      if (isLocal) {
        return resolve({ findFlag: true, endFlag: true, content: 'is local fake data', fromLineNum: 1, lineNum: 2 })
      }


      const { logPath = 'logs' } = this.options
      const logFile = path.resolve(logPath, `./${formatDate(logDateTim)}-xxl-job.log`)

      if (!fs.existsSync(logFile)) {
        resolve({ findFlag: false, endFlag: true })
        return
      }

      const stream = fs.createReadStream(logFile)
      const rl = readline.createInterface({ input: stream })

      let lineNum = 0
      let content = ''
      let findFlag = false
      let endFlag = false

      const start = new RegExp(`running: ${logId}`)
      const end = new RegExp(`finished: ${logId}`)

      rl.on('line', line => {
        if (lineNum > fromLineNum) lineNum = fromLineNum
        if (start.test(line)) findFlag = true
        if (findFlag) {
          content += `${line}\n`
          lineNum += 1
        }
        // 找到结尾，结束读取
        if (end.test(line)) {
          endFlag = true
          rl.close()
        }
        // 连续读取>MAX_LINE还未找到结尾，结束读取
        if (lineNum > (fromLineNum + MAX_LINE)) rl.close()
      })

      rl.once('close', () => {
        // 没找到开头
        if (!findFlag) {
          resolve({ findFlag, endFlag: true })
        } else if (endFlag) {
          resolve({ content, fromLineNum, lineNum, findFlag, endFlag })
        }
      })
    })
  }
}

function formatDate(timestamp: number) {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '00')}-${(d.getDate()).toString().padStart(2, '00')}`
}

export function generateLogger(options: ILoggerType) {
  const logInstance = new Logger(options)
  return {
    logInstance,
    readLog: logInstance.readLocalLogById.bind(logInstance),
    logger: logger = logInstance.create()
  }
}
