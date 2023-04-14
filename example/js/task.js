const { sleep } = require('./util')

async function test(logger, params) {
  await sleep(1000)
  logger.info(params)
  await sleep(1000)
  logger.info({ msg: 'test info', other: 1, extra: params.executorParams })
  logger.info([1, 2, 3])
  await sleep(1000)
  logger.info(`number -- %d`, 123)
  await sleep(1000)
  logger.info(`json -- %j`, { test: 'balabala' })
  await sleep(1000)
  logger.info('string and object to string %s And %s', { a: 1 }, { b: 2 })
  logger.info(`more info %s | %s`, 'abc', 'other text', 'more...')
}

async function testError(logger) {
  await sleep(2000)
  logger.info('### testError')
  // a
  throw new Error('Error hahah')
}

const task = [test, testError, () => { }, function () { }]

// exports.task = task
module.exports = task
