import { WLogger } from "../logger"

export function errorCapturer(logInstance: WLogger) {
  const logger = logInstance.create()
  process.on('uncaughtException', (error: any) => {
    logger.error(error, { errorType: 'uncaughtException' })
  })
  process.on('unhandledRejection', (reason: any) => {
    logger.error(reason, { errorType: 'unhandledRejection' })
  })
}
