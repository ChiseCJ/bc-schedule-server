import { Context, Next } from 'koa'
import { WLogger } from '../logger'
import { ILoggerType } from '../types'

export function opLogger(option: ILoggerType) {
  const logInstance = new WLogger(option, 'request')

  return function exec(ctx: Context, next: Next) {
    if (option?.opLog) {
      const { method, path, query, request: { body } } = ctx
      const logger = logInstance.create(ctx)
      logger.info(`[${method}], ${path}, ${JSON.stringify(query)}, ${JSON.stringify(body)}`)
    }
    return next()
  }
}
