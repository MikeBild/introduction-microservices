// Kleine Helfer ohne Zusatz-Package: node:http, node:sqlite und console reichen.
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { Router } from 'express'

export { enqueue, firstDelivery, messagingSchema, relayOnce, startRelay } from './messaging.ts'

/** /health/live und /health/ready – siehe Lektion ms-docker-compose. */
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

/** Startet eine App auf einem freien Port. Mit `await using` schließt der Server am Ende selbst. */
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

/** Öffnet eine SQLite-Datenbank (Datei oder ':memory:') und legt das Schema an. */
export const openDb = (path: string, schema: string): DatabaseSync => {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec(schema)
  return db
}

/** Führt fn in einer Transaktion aus: alles oder nichts. */
export const transaction = <T>(db: DatabaseSync, fn: () => T): T => {
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

/** Ein JSON-Log je Zeile auf stdout – Docker und jede Log-Plattform lesen das direkt. */
export const log = (level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }))
}

/** Wartet, bis check() true liefert (für Tests mit asynchronen Events). */
export const eventually = async (check: () => boolean | Promise<boolean>, timeoutMs = 2000, stepMs = 20) => {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, stepMs))
  }
  throw new Error(`Bedingung nicht erfüllt nach ${timeoutMs} ms`)
}
