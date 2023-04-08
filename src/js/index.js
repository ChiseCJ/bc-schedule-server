const { BcScheduleServer } = require('../../dist');
// const { task } = require('./task');
const taskList = require('./task');

const schedule = new BcScheduleServer({
  port: 9501,
  scheduleCenterUrl: '',
  logOption: {
    opLog: true,
    // logPath: 'logs/abc'
  }
})
console.log(schedule.registerTask(taskList));


process.on('exit', function (a, b, c) {
  console.log('Your process is exiting', a, b, c);
});
