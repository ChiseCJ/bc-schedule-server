export function errorCapturer() {
  process.on('uncaughtException', (error: any) => {
    console.error('uncaughtException:', error)
  })

  process.on('unhandledRejection', (reason: any, promise) => {
    console.error('unhandledRejection:', promise, 'reason:', reason)
  })
}
