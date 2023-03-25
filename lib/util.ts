import { networkInterfaces } from 'os'
import urllib from 'urllib'

const ToString = Object.prototype.toString
const env = process.env.NODE_ENV

export const isPro = env === 'production'
export const isDev = env === 'development'
export const isLocal = env === 'local'
export const isLocalTest = env === 'test'
export const NODE_ENV = env

export function isArray(value: any) {
  return ToString.call(value) === '[object Array]'
}

export function isUndefined(value: any) {
  return value === undefined
}

export function isNull(value: any) {
  return value === null
}

export function isNullOrUndefined(value: any) {
  return isUndefined(value) || isNull(value)
}

export function isString(value: any) {
  return typeof value === 'string'
}

export function isObject(value: any) {
  return typeof value === 'object'
}

export function isFunction(value: any) {
  return typeof value === 'function'
}

export function getLocalIP() {
  const interfaces = networkInterfaces()
  for (const devName in interfaces) {
    const iface = interfaces[devName]
    if (iface === undefined) continue
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i]
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address
      }
    }
  }
  return '0.0.0.0'
}

export function request(url: string, data: { logId: number, handleCode: number, handleMsg: string }) {
  return urllib.request(url, { method: "POST", contentType: "json", data: [data] })
}

export function sleep(wait: number) {
  return new Promise(resolve => setTimeout(resolve, wait))
}
