// Lesson ms-first-service: One service, one process, one task
// Duration: about 20 minutes
//
// Task: Build the service catalog with Express 5 and node:sqlite.
// 1. GET /health returns { status: 'ok', service: 'catalog' } (already there).
// 2. GET /products returns all products as Product[] (priceCents instead of price_cents), sorted by id.
// 3. GET /products/:productId returns one product or 404 with { error: 'product not found' }.
// 4. portFromEnv reads PORT from the environment (default 3001) and throws on invalid values.
//
// Check: npm test -- ms-first-service
import express from 'express'
import type { Database } from 'node:sqlite'
import { openDb } from '@werkstatt/kit'

export const openCatalogDb = (path = ':memory:') =>
  openDb(path, 'CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, price_cents INTEGER NOT NULL)')

export const createCatalogApp = ({ db }: { db: Database }) => {
  const app = express()
  app.disable('x-powered-by')

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'catalog' })
  })

  // TODO: GET /products and GET /products/:productId with db.prepare(...)
  void db

  return app
}

export const portFromEnv = (env: NodeJS.ProcessEnv = process.env): number => {
  throw new Error('TODO: PORT lesen, Default 3001, ungültige Werte ablehnen')
}
