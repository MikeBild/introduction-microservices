import { log, startRelay } from '@werkstatt/kit'
import { createInventory } from './app.ts'

const port = Number(process.env.PORT ?? 3003)
const subscribers = (process.env.SUBSCRIBERS ?? '').split(',').filter(Boolean)
const { app, db } = createInventory({ dbPath: process.env.DB_PATH ?? 'inventory.db' })
const stopRelay = startRelay(db, subscribers)
const server = app.listen(port, () => log('info', 'inventory listening', { port, subscribers }))

process.once('SIGTERM', () => {
  stopRelay()
  server.close(() => process.exit(0))
})
