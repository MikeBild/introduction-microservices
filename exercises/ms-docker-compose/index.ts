// Lektion ms-docker-compose: Das ganze System mit einem Befehl starten
// Dauer: etwa 25 Minuten
//
// Docker Compose startet catalog, inventory und orders. Damit orders erst startet, wenn catalog
// wirklich bereit ist, brauchen die Services Health Checks – und einen sauberen Shutdown.
//
// Aufgabe:
// 1. healthRouter(checks, state): GET /health/live liefert immer 200.
//    GET /health/ready führt alle checks aus: alle true und kein Shutdown → 200, sonst 503.
//    Ein check, der wirft, zählt als false.
// 2. serve(app, state, { port, drainMs }): startet den Server und liefert { url, shutdown }.
//    shutdown setzt state.draining, wartet drainMs und schließt den Server. Laufende Requests laufen zu Ende.
// 3. compose.yaml in diesem Ordner: Ergänze für jeden Service einen healthcheck auf /health/ready und
//    starte orders erst, wenn catalog und inventory healthy sind (depends_on mit condition).
//
// Prüfen: npm test -- ms-docker-compose   und   docker compose -f exercises/ms-docker-compose/compose.yaml config
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
      // Fallstrick: hart beenden, laufende Requests brechen ab
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
