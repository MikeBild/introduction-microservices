// Lösung ms-first-service
import express from 'express'
import type { Database } from 'node:sqlite'
import { openDb } from '@werkstatt/kit'
import type { Product } from '@werkstatt/contracts'

export const openCatalogDb = (path = ':memory:') =>
  openDb(path, 'CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, price_cents INTEGER NOT NULL)')

type Row = { id: string; name: string; price_cents: number }
const toProduct = (row: Row): Product => ({ id: row.id, name: row.name, priceCents: row.price_cents })

export const createCatalogApp = ({ db }: { db: Database }) => {
  const app = express()
  app.disable('x-powered-by')

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'catalog' })
  })

  app.get('/products', (req, res) => {
    const rows = db.prepare('SELECT id, name, price_cents FROM products ORDER BY id').all() as Row[]
    res.json(rows.map(toProduct))
  })

  app.get('/products/:productId', (req, res) => {
    const row = db.prepare('SELECT id, name, price_cents FROM products WHERE id = ?').get(req.params.productId) as
      | Row
      | undefined
    if (row) res.json(toProduct(row))
    else res.status(404).json({ error: 'product not found' })
  })

  return app
}

export const portFromEnv = (env: NodeJS.ProcessEnv = process.env) => {
  const port = Number(env.PORT ?? 3001)
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`invalid PORT: ${env.PORT}`)
  return port
}
