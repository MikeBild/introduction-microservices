// Service catalog: Produkte und Preise. Besitzt seine Daten allein (eigene SQLite-Datei).
import express from 'express'
import { health, openDb } from '@werkstatt/kit'
import type { Product } from '@werkstatt/contracts'

const seed: Product[] = [
  { id: 'p-1', name: 'Hammer', priceCents: 1299 },
  { id: 'p-2', name: 'Akkuschrauber', priceCents: 8999 },
  { id: 'p-3', name: 'Wasserwaage', priceCents: 2499 },
]

type Row = { id: string; name: string; price_cents: number }
const toProduct = (row: Row): Product => ({ id: row.id, name: row.name, priceCents: row.price_cents })

export const createCatalog = ({ dbPath = ':memory:' } = {}) => {
  const db = openDb(dbPath, 'CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, price_cents INTEGER NOT NULL)')
  const insert = db.prepare('INSERT OR IGNORE INTO products (id, name, price_cents) VALUES (?, ?, ?)')
  for (const product of seed) insert.run(product.id, product.name, product.priceCents)

  const app = express()
  app.disable('x-powered-by')
  app.use(health('catalog'))
  app.get('/products', (req, res) => {
    res.json((db.prepare('SELECT id, name, price_cents FROM products ORDER BY id').all() as Row[]).map(toProduct))
  })
  app.get('/products/:productId', (req, res) => {
    const row = db.prepare('SELECT id, name, price_cents FROM products WHERE id = ?').get(req.params.productId) as Row | undefined
    if (row) res.json(toProduct(row))
    else res.status(404).json({ error: 'product not found' })
  })
  return { app, db }
}
