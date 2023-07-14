# bc-schedule-server
  将整体的koa服务、常规中间件，以及xxlJob所需api服务等处理逻辑封装在内部。对外暴koa实例、router实例及定时任务注册函数和logger函数。

### 功能说明
  - 支持 xxl-job 心跳监测功能
  - 支持执行结果、异常捕获等内容回调给 xxl-job 后台
    - 执行结果需要在任务函数内 return xxx 才能被接收（用于“执行备注”内查看）
    - 异常错误会被捕获进 log 日志内
  - 支持执行 log 查看（需使用内部的 logger 函数）
    - 默认按照 logs/YYYY-MM-DD-xxl-job.log 目录结构存储
  - 支持跳过执行任务限制
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
  const fn = (logger: ExposeLogger) => {
    logger.info('# hahah')

    // 返回的信息可在“执行备注”中查看
    return 'change rows: 3'
  }
  const registered = schedule.registerTask([
    fn,
    function fn2(logger, xxlJobParams) {
      logger.info('balabal')
    },
    async function fn3(logger, xxlJobParams) {},
  ])
  // 返回已经注册的任务函数列表
  console.log(registered) // [ 'fn', 'fn2', 'fn3' ]
  ```

### logger 使用
```
// info:balabala
logger.info('balabala')
// info:{"extra":"","msg":"test info","other":1}
logger.info({ msg: 'test info', other: 1 })
// info:[1,2,3]
logger.info([1, 2, 3])
// info:"number -- 123"
logger.info(`number -- %d`, 123)
// info:"json -- {\"test\":\"balabala\"}"
logger.info(`json -- %j`, { test: 'balabala' })
// info:"string and object to string { a: 1 } And { b: 2 }"
logger.info('string and object to string %s And %s', { a: 1 }, { b: 2 })
// info:"more info abc | other text"
logger.info(`more info %s | %s`, 'abc', 'other text', 'more...')
```

### 配置参数
```
// BcScheduleServer 配置
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
// registerTask 配置
schedule.registerTask([...tasks], {
  excludeJobId: true | string[] // 配置 true 所有任务都不加执行限制；string[] 只对配置了的任务明跳过限制
})

// 基本使用方式
import { BcScheduleServer } form 'bc-schedule-server'

const schedule = new BcScheduleServer({ 
  port: 9501,
  scheduleCenterUrl: 'https://xxljob.xxx.com'
})

// 注册待调用的定时任务
schedule.registerTask([
  function fn1(logger, xxlJobParams) {
    logger.info('balabal')
    // logger 支持对象形式
    logger.info({msg: 'heihei', params: {a:1, b:2}})
  },
  async function fn2(logger, xxlJobParams) {},
])
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

