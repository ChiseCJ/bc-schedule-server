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

async function aaa() {
  console.log('## a');
  a
}
async function bbb() {
  console.log('## b');
  b
}

async function testError(logger) {
  await sleep(2000)
  logger.info('### testError')
  /**
   * *对于异步的 throw error 需要通过 await 才能获取，要不然进入 UnhandledPromiseRejectionWarning 事件
   * *如果需要多个函数同时执行，可使用 await Promise.all([a(), b(), c()])
   */
  // await Promise.all([aaa(), bbb()])
  // Promise.all([aaa(), bbb()]).catch(e => {
  //   // console.log('\x1b[3m\x1b[34m \nccLog ——> [e] \x1b[0m', e)
  //   throw e
  // })
  // console.log(aaa());
  // console.log(bbb());
  // throw new Error('Error hahah')
  // try {
  aaa()
  await bbb()
  // } catch (error) {
  // console.log('\x1b[3m\x1b[34m \nccLog ——> [error 000] \x1b[0m', error)
  // }
}

const task = [test, testError, () => { }, function () { }]

// exports.task = task
module.exports = task
