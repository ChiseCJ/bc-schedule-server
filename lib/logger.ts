/* eslint-disable lines-between-class-members */
import path from 'path'
import fs from 'fs'
import readline from 'readline'
import { createLogger, format } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { ExposeLogger, ILoggerType, IReadLogType } from './interface'

const { combine, timestamp, printf } = format
const logFormat = printf(({ level, message, timestamp }) => `${timestamp} [XXL-JOB] ${level}: ${message}`)
const MAX_LINE = 10

export class Logger {
  private options: ILoggerType

  constructor(options: ILoggerType) {
    this.options = options
  }

  create() {
    const { logName, logPath } = this.options
    const filename = path.resolve(logPath, `./%DATE%-${logName}.log`)

    const logger = createLogger({
      format: combine(
        format.json(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
      transports: [
        new DailyRotateFile({
          filename,
          datePattern: `YYYY-MM-DD`,
          zippedArchive: true,
        }),
      ],
    })

    return { info: logger.info.bind(logger), error: logger.error.bind(logger) } as ExposeLogger
  }

  readLocalLogById({ logId, logDateTim, fromLineNum }: IReadLogType) {
    return new Promise(resolve => {
      const { logName, logPath } = this.options
      const logFile = path.resolve(logPath, `./${formatDate(logDateTim)}-${logName}.log`)

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
