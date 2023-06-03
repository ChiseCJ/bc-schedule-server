import { LeveledLogMethod } from 'winston'

export interface ILoggerType {
  opLog?: boolean
  logPath?: string
}

export interface IBcScheduleType {
  port: number
  logOption?: ILoggerType
  scheduleCenterUrl: string
  route?: string
  koaOptions?: any
  callback?: (port: number) => {}
}

export interface IExecutorParams {
  jobId: number
  executorHandler: string
  executorParams: string
  executorBlockStrategy: string
  executorTimeout: number
  logId: number
  logDateTime: number
  glueType: string
  glueSource: string
  glueUpdatetime: number
  broadcastIndex: number
  broadcastTotal: number
}

export interface ICallbackType {
  logId: number
  result?: any
  error?: Error
}

export interface ISendResponseData {
  code?: number
  msg?: string
}

export type ITaskItem = (logger: ExposeLogger, params: IExecutorParams) => any
export type ITaskList = ITaskItem[]
export type ITaskOption = { excludeJobId?: true | string[] }

export interface IReadLogType {
  logId: number,
  fromLineNum: number
  logDateTim: number
}

export interface IReadResponse {
  endFlag: boolean,
  content?: string,
  fromLineNum?: number,
  lineNum?: number
}

export type ExposeLogger = Record<'info' | 'error', LeveledLogMethod>
