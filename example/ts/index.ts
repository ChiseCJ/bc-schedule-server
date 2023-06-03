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
// console.log(schedule.registerTask(task, { excludeJobId: ['testAsync'] }));
// console.log(schedule.registerTask(task, { excludeJobId: true }));


process.on('exit', function (a: any, b: any, c: any) {
  console.log('Your process is exiting', a, b, c);
});
