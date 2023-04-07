import { Context, Next } from 'koa'
import { WLogger } from '../logger'

export function opLogger(opLog: boolean, loggerInst: WLogger) {
  const logger = loggerInst.create({ isOpLog: true })

  return function exec(ctx: Context, next: Next) {
    if (opLog) {
      const { method, path, query, request: { body } } = ctx
      logger.info(`[${method}], ${path}, ${JSON.stringify(query)}, ${JSON.stringify(body)}`)
    }
    return next()
  }
}
