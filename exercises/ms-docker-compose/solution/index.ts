// Lösung ms-docker-compose
import { Router, type Express } from 'express'
import type { AddressInfo } from 'node:net'
import { setTimeout as sleep } from 'node:timers/promises'

export type Checks = Record<string, () => boolean | Promise<boolean>>
export type State = { draining: boolean }

/** live: der Prozess läuft. ready: er kann Requests bedienen (Abhängigkeiten da, kein Shutdown). */
export const healthRouter = (checks: Checks, state: State) =>
  Router()
    .get('/health/live', (req, res) => {
      res.json({ status: 'ok' })
    })
    .get('/health/ready', async (req, res) => {
      const results = Object.fromEntries(
        await Promise.all(Object.entries(checks).map(async ([name, check]) => [name, await Promise.resolve().then(check).catch(() => false)])),
      )
      const ready = !state.draining && Object.values(results).every(Boolean)
      res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not ready', draining: state.draining, checks: results })
    })

/** Graceful Shutdown: erst nicht mehr ready melden, dann laufende Requests beenden lassen. */
export const serve = (app: Express, state: State, { port = 0, drainMs = 1000 } = {}) =>
  new Promise<{ url: string; shutdown: () => Promise<void> }>((resolve) => {
    const server = app.listen(port, () => {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      const shutdown = async () => {
        state.draining = true
        await sleep(drainMs)
        await new Promise<void>((done) => {
          server.close(() => done())
          server.closeIdleConnections()
        })
      }
      resolve({ url, shutdown })
    })
  })

/** Docker stoppt Container mit SIGTERM. Ohne Handler wartet es 10 s und schickt dann SIGKILL. */
export const onStopSignal = (shutdown: () => Promise<void>) => {
  for (const signal of ['SIGTERM', 'SIGINT'] as const)
    process.once(signal, () => {
      void shutdown().then(() => process.exit(0))
    })
}
