import { BcScheduleServer } from '../../dist';
import { task } from './task';

const schedule = new BcScheduleServer({
  port: 9501,
  scheduleCenterUrl: '',
  logOption: {
    opLog: true,
    // logPath: 'logs/abc'
  }
})
console.log(schedule.registerTask(task));


process.on('exit', function (a: any, b: any, c: any) {
  console.log('Your process is exiting', a, b, c);
});
