# bc-schedule-server
  将整体的koa服务、常规中间件，以及xxlJob所需api服务等处理逻辑封装在内部。对外暴koa实例、router实例及定时任务注册函数和logger函数。

### 功能说明
  - 支持 xxl-job 心跳监测功能
  - 支持执行结果、异常捕获等内容回调给 xxl-job 后台
  - 支持执行 log 查看（需使用内部的 logger 函数）
  - 暂不支持任务超时配置及单次任务的终止动作

### 其他
  - 注册的函数不能是“箭头函数”和“匿名函数”
  - 本地开发时建议配置 NODE_ENV=local 这样就不会启用 log 文件日志，而是使用在控制台输出

### 使用方式
  - typescript 引入方式 `import { BcScheduleServer } form 'bc-schedule-server'`
  - javascript 引入方式 `const { BcScheduleServer } require('bc-schedule-server')`
  ```
  import { BcScheduleServer } form 'bc-schedule-server'

  const schedule = new BcScheduleServer({ 
    port: 9501,
    scheduleCenterUrl: 'https://xxljob.xxx.com'
  })

  /**
  * 注册待调用的定时任务
  * 注意：不能是 ()=>{} 和 function(){} 方式
  */
  const registered =schedule.registerTask([
    function fn1(logger, xxlJobParams) {
      logger.info('balabal')
    },
    async function fn2(logger, xxlJobParams) {},
  ])
  // 返回已经注册的任务函数列表
  console.log(registered) // [ 'test', 'testError' ]
  ```

### 配置参数
```
{
  port: number, // 服务监听端口
  scheduleCenterUrl: string, // xxl-job 任务执行后的回调域名
  localLog?: { 
    opLog: boolean, // 是否启动访问日志输出
    logPath: string // log日志文件目录
  }
  route?: string, // api 地址前缀
  koaOptions?: any // new Koa() 本身对应的参数
}
```

### api接口信息
  - 任务执行 [POST] /run
  ```
  {
    "jobId": 1, // 任务 id
    "executorHandler": "test", // 当前待执行的任务名称
    "executorParams": "{\"code\": 400, \"msg\": \"123\"}", // 执行时传递的参数
    "executorBlockStrategy": "SERIAL_EXECUTION",
    "executorTimeout": 0, // 超时时间
    "logId": 1, // 日志 id
    "logDateTime": 1679283887584, // 日志时间戳
    "glueType": "BEAN", // 任务模式
    "glueSource": "",
    "glueUpdatetime": 1679283187000,
    "broadcastIndex": 0,
    "broadcastTotal": 1
  }
  ```
  - 日志读取 [POST] /log
  ```
  {
    "logDateTim": 1680925146000,
    "logId": 1,
    "fromLineNum": 1
  }
  ```
