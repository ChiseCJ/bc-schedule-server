import { BcScheduleServer } from '../dist';
import { task } from './task';

const schedule = new BcScheduleServer({
  port: 9501, logOption: {
    opLog: true,
    // logPath: 'logs/abc'
  }, scheduleCenterUrl: ''
})
schedule.registerTask(task)
