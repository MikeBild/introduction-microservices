// Lektion ms-first-service: Ein Service, ein Prozess, eine Aufgabe
// Dauer: etwa 20 Minuten
//
// Aufgabe: Baue den Service catalog mit Express 5 und node:sqlite.
// 1. GET /health liefert { status: 'ok', service: 'catalog' } (gibt es schon).
// 2. GET /products liefert alle Produkte als Product[] (priceCents statt price_cents), sortiert nach id.
// 3. GET /products/:productId liefert ein Produkt oder 404 mit { error: 'product not found' }.
// 4. portFromEnv liest PORT aus der Umgebung (Default 3001) und wirft bei ungültigen Werten.
//
// Prüfen: npm test -- ms-first-service
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

  // TODO: GET /products und GET /products/:productId mit db.prepare(...)
  void db

  return app
}

export const portFromEnv = (env: NodeJS.ProcessEnv = process.env): number => {
  throw new Error('TODO: PORT lesen, Default 3001, ungültige Werte ablehnen')
}
