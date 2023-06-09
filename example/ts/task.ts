import { ExposeLogger, IExecutorParams } from '../../dist';
import { sleep } from './util';

const test = (logger: ExposeLogger) => {
  logger.info('# hahah')
}

async function testAsync(logger: ExposeLogger, params: IExecutorParams) {
  // console.log('\x1b[3m\x1b[34m \nccLog ——> [params] \x1b[0m', params)
  await sleep(2000)
  logger.info('### params')
  await sleep(2000)
  logger.info({ msg: 'test info', other: 1, extra: params.executorParams })
  await sleep(2000)
  logger.info(`${[1, 2, 3]} ${params.executorParams}`)
  await sleep(2000)
  logger.info(`balabala -- ${params.executorParams}`);
}

async function testError(logger: ExposeLogger) {
  await sleep(3000)
  logger.info('### testError')
  // throw new Error('a not find')
  // a
}

function noLogger() {}

export const task = [test, testAsync, testError, () => { }, function () { }, noLogger]
