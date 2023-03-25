/* eslint-disable lines-between-class-members */
export interface IBcError extends Error {
  status: number
  errorCode: number
}

export class BcError extends Error {
  status: number
  errorCode: number

  constructor(message: string, errorCode?: number, status?: number) {
    super(message)
    this.name = 'manualThrowError'
    this.status = typeof status === 'number' ? status : 200
    this.errorCode = typeof errorCode === 'number' ? errorCode : this.status
  }
}