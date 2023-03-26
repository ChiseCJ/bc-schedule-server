import { BcScheduleServer, logger } from '../dist';

const schedule = new BcScheduleServer({
  port: 9501, logOption: {
    opLog: true,
    // logPath: 'logs/abc'
  }, scheduleCenterUrl: ''
})
schedule.registerTask([function test(params) {
  // console.log('\x1b[3m\x1b[34m \nccLog ——> [params] \x1b[0m', params)
  logger.info(params)
}])
