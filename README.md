# bc-schedule-server
将整体的koa服务、常规中间件，以及xxlJob所需api服务等处理逻辑封装在内部。对外暴koa实例、router实例及定时任务注册函数和logger函数。
其他内容：
  - 支持 xxl-job 心跳监测功能
  - 支持执行结果、异常捕获等内容回调给 xxl-job 后台
  - 支持执行 log 查看（需使用内部的 logger 函数）
  - 暂不支持任务超时配置及单次任务的终止动作
```
// 配置参数
{
  port: number // 服务监听端口
  localLog?: boolean | { logName: string, logPath: string } // 是否启用内部的 logger，不开启则使用 console.info/error 输出
  scheduleCenterUrl: string // xxl-job 任务执行后的回调域名
  route?: string // api 地址前缀
  opLog?: boolean // 是否启动访问日志输出
  koaOptions?: any // new Koa() 本身对应的参数
}

// 基本使用方式
const schedule = new BcScheduleServer({ 
    port: 9501,
    scheduleCenterUrl: 'https://xxljob.xxx.com'
})

// 注册待调用的定时任务
schedule.registerTask([
    function fn1(xxlJobParams, logger) {},
    async function fn2(xxlJobParams, logger) {},
])
```
