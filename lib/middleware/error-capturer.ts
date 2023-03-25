import { ExposeLogger } from '../interface'

export function errorCapturer(logger: ExposeLogger) {
  process.on('uncaughtException', (error: any) => {
    logger.error(`uncaughtException: ${error}`)
  })

  process.on('unhandledRejection', (reason: any, promise) => {
    logger.error('unhandledRejection:', promise, 'reason:', reason)
  })
}
