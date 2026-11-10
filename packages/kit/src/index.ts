// Small helpers without extra packages: node:http, node:sqlite and console are enough.
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { Database } from 'node:sqlite'
import { Router } from 'express'

export { enqueue, firstDelivery, messagingSchema, relayOnce, startRelay } from './messaging.ts'

/** /health/live and /health/ready – see lesson ms-docker-compose. */
export const health = (service: string, ready: () => boolean = () => true) =>
  Router()
    .get('/health/live', (req, res) => {
      res.json({ status: 'ok', service })
    })
    .get('/health/ready', (req, res) => {
      const ok = ready()
      res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'not ready', service })
    })

type Listenable = { listen: (port: number, callback: () => void) => Server }

export type Running = { url: string; server: Server; [Symbol.asyncDispose]: () => Promise<void> }

/** Starts an app on a free port. With `await using` the server closes itself at the end. */
export const listen = (app: Listenable, port = 0): Promise<Running> =>
  new Promise((resolve) => {
    const server = app.listen(port, () => {
      const { port: actual } = server.address() as AddressInfo
      resolve({
        url: `http://127.0.0.1:${actual}`,
        server,
        [Symbol.asyncDispose]: () =>
          new Promise<void>((done) => {
            server.closeAllConnections()
            server.close(() => done())
          }),
      })
    })
  })

/** Opens a SQLite database (file or ':memory:') and creates the schema. */
export const openDb = (path: string, schema: string): Database => {
  const db = new Database(path)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec(schema)
  return db
}

/** Runs fn in a transaction: all or nothing. */
export const transaction = <T>(db: Database, fn: () => T): T => {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

/** One JSON log per line on stdout – Docker and every log platform read that directly. */
export const log = (level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }))
}

/** Waits until check() returns true (for tests with asynchronous events). */
export const eventually = async (check: () => boolean | Promise<boolean>, timeoutMs = 2000, stepMs = 20) => {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, stepMs))
  }
  throw new Error(`Bedingung nach ${timeoutMs} ms nicht erfüllt. Prüfe, ob das Relay die Events zustellt, oder erhöhe timeoutMs.`)
}
