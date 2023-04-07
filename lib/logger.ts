/* eslint-disable lines-between-class-members */
import path from 'path'
import fs from 'fs'
import readline from 'readline'
import jsonStringify from 'safe-stable-stringify'
import { createLogger, format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { ExposeLogger, ILoggerType, IReadLogType, IReadResponse } from './types'
import { isLocal, formatDate } from './util'

const MAX_LINE = 10

const logFormat = format.printf(params => {
  const { level, message, timestamp, stack } = params
  return `${timestamp} [XXL-JOB] ${level}:${jsonStringify(message, (_, value: any) => ['bigint', 'symbol'].includes(typeof value) ? value.toString() : value)} ${stack || ''}`
})

const formatOptions = {
  local: [format.json(), format.errors(), format.colorize({ all: true }), format.simple()],
  prod: [format.errors(), format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat]
}

export class WLogger {
  options: ILoggerType

  constructor(options: ILoggerType) {
    this.options = options
  }

  create(params: { fileName?: string, isOpLog?: boolean }) {
    const { logPath = 'logs' } = this.options
    const { fileName, isOpLog = false } = params

    const logger = createLogger({
      format: format.combine(...formatOptions[isLocal ? 'local' : 'prod']),
      transports: [
        // 生产环境不在 stdout 输出
        new transports.Console({ level: 'debug', silent: !isLocal })
      ],
      exitOnError: false
    })

    if (isOpLog) {
      const filename = path.resolve(logPath, `./%DATE%-xxl-job-op.log`)
      logger.add(new DailyRotateFile({
        filename,
        datePattern: `YYYY-MM-DD`,
        zippedArchive: true,
      }))
    } else if (!isLocal) {
      const allFilename = path.resolve(logPath, `./${fileName}.log`)
      logger.add(new transports.File({
        filename: allFilename,
        handleExceptions: true,
      }))
    }

    return { info: logger.info.bind(logger), error: logger.error.bind(logger) } as ExposeLogger
  }
}

export const readLocalLogById = (loggerInstance: WLogger) => ({ logId, logDateTim, fromLineNum }: IReadLogType) => {
  return new Promise<IReadResponse>(resolve => {
    if (isLocal) {
      return resolve({ findFlag: true, endFlag: true, content: 'is local fake data', fromLineNum: 1, lineNum: 2 })
    }

    const { logPath = 'logs' } = loggerInstance.options
    const logFile = path.resolve(logPath, `./${formatDate(logDateTim)}-xxl-job-${logId}.log`)

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
