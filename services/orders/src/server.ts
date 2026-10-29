import { log, startRelay } from '@werkstatt/kit'
import { createOrders } from './app.ts'

const port = Number(process.env.PORT ?? 3002)
const subscribers = (process.env.SUBSCRIBERS ?? '').split(',').filter(Boolean)
const { app, db } = createOrders({
  dbPath: process.env.DB_PATH ?? 'orders.db',
  catalogUrl: process.env.CATALOG_URL ?? 'http://localhost:3001',
})
const stopRelay = startRelay(db, subscribers)
const server = app.listen(port, () => log('info', 'orders listening', { port, subscribers }))

process.once('SIGTERM', () => {
  stopRelay()
  server.close(() => process.exit(0))
})
