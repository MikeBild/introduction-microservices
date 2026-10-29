import { log } from '@werkstatt/kit'
import { createCatalog } from './app.ts'

const port = Number(process.env.PORT ?? 3001)
const { app } = createCatalog({ dbPath: process.env.DB_PATH ?? 'catalog.db' })
const server = app.listen(port, () => log('info', 'catalog listening', { port }))

process.once('SIGTERM', () => server.close(() => process.exit(0)))
