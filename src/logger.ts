import k from 'kleur'

export interface Logger {
  log: (...msg: any[]) => void
  info: (...msg: any[]) => void
  warn: (...msg: any[]) => void
  error: (...msg: any[]) => void
  success: (...msg: any[]) => void
}

export const createLogger = (): Logger => ({
  log: (...msg: any[]) => {
    console.log(...msg)
  },
  info: (...msg: any[]) => {
    console.log(k.blue('ℹ'), ...msg)
  },
  warn: (...msg: any[]) => {
    console.log(k.yellow('⚠'), ...msg)
  },
  error: (...msg: any[]) => {
    console.log(k.red('✖'), ...msg)
  },
  success: (...msg: any[]) => {
    console.log(k.green('✔'), ...msg)
  },
})
