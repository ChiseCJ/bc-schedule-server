import { logger } from '../dist';

function test(params: any) {
  // console.log('\x1b[3m\x1b[34m \nccLog ——> [params] \x1b[0m', params)
  logger.info(params)
}

export const task = [test]
