import { Context, Next } from 'koa'
import { ExposeLogger } from '../interface'

export function opLogger(opLog: boolean, logger: ExposeLogger) {
  return function exec(ctx: Context, next: Next) {
    if (opLog) {
      const { method, path, query, request: { body } } = ctx
      logger.info(`[${method}], ${path}, ${JSON.stringify(query)}, ${JSON.stringify(body)}`)
    }
    return next()
  }
}
