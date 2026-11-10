// Lesson ms-docker-compose: Start the whole system with one command
// Duration: about 25 minutes
//
// Docker Compose starts catalog, inventory and orders. So that orders only starts once catalog
// is really ready, the services need health checks – and a clean shutdown.
//
// Task:
// 1. healthRouter(checks, state): GET /health/live always returns 200.
//    GET /health/ready runs all checks: all true and no shutdown → 200, otherwise 503.
//    A check that throws counts as false.
// 2. serve(app, state, { port, drainMs }): starts the server and returns { url, shutdown }.
//    shutdown sets state.draining, waits drainMs and closes the server. In-flight requests run to completion.
// 3. compose.yaml in this folder: add a healthcheck on /health/ready for each service and
//    start orders only when catalog and inventory are healthy (depends_on with condition).
//
// Check: npm test -- ms-docker-compose   and   docker compose -f exercises/ms-docker-compose/compose.yaml config
import { Router, type Express } from 'express'
import type { AddressInfo } from 'node:net'

export type Checks = Record<string, () => boolean | Promise<boolean>>
export type State = { draining: boolean }

export const healthRouter = (checks: Checks, state: State) =>
  Router().get('/health/live', (req, res) => {
    res.json({ status: 'ok' })
  })
// TODO: GET /health/ready

export const serve = (app: Express, state: State, { port = 0, drainMs = 1000 } = {}) =>
  new Promise<{ url: string; shutdown: () => Promise<void> }>((resolve) => {
    const server = app.listen(port, () => {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      // Pitfall: hard stop, in-flight requests are cut off
      const shutdown = async () => {
        void drainMs
        server.closeAllConnections()
        server.close()
      }
      resolve({ url, shutdown })
    })
  })

export const onStopSignal = (shutdown: () => Promise<void>) => {
  for (const signal of ['SIGTERM', 'SIGINT'] as const)
    process.once(signal, () => {
      void shutdown().then(() => process.exit(0))
    })
}
