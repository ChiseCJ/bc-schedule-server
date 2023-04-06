import { BcScheduleServer } from '../dist';
import { task } from './task';

const schedule = new BcScheduleServer({
  port: 9501,
  scheduleCenterUrl: '',
  logOption: {
    opLog: true,
    // logPath: 'logs/abc'
  }
})
schedule.registerTask(task)
