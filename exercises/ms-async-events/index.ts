// Lektion ms-async-events: Events entkoppeln Zeit und Verfügbarkeit
// Dauer: etwa 25 Minuten
//
// inventory empfängt Events per HTTP auf POST /inbox. Zustellung heißt „at least once“:
// Dasselbe Event kann mehrfach ankommen. Die Inbox sorgt dafür, dass es nur einmal wirkt.
//
// Aufgabe:
// 1. POST /inbox prüft den Body mit ShopEvent aus @werkstatt/contracts. Ungültig → 400.
// 2. Merke die Event-ID in der Tabelle inbox. War sie schon da → 200 mit { duplicate: true }, sonst 202.
// 3. Bei OrderPlaced: Reicht der Bestand für alle Positionen, erhöhe reserved je Position
//    und speichere die Reservierung 'reserved', sonst nur 'rejected' – nie eine halbe Reservierung.
// 4. Inbox-Eintrag und Wirkung laufen in einer Transaktion (transaction aus @werkstatt/kit).
//
// Prüfen: npm test -- ms-async-events
import express from 'express'
import { openDb, transaction } from '@werkstatt/kit'
import { ShopEvent } from '@werkstatt/contracts'

const schema = `
  CREATE TABLE IF NOT EXISTS stock (product_id TEXT PRIMARY KEY, on_hand INTEGER NOT NULL, reserved INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS reservations (order_id TEXT PRIMARY KEY, status TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS inbox (event_id TEXT PRIMARY KEY, received_at TEXT NOT NULL);`

export const createInventory = (path = ':memory:') => {
  const db = openDb(path, schema)

  const app = express()
  app.use(express.json())
  app.post('/inbox', (req, res) => {
    void ShopEvent
    void transaction
    // TODO: prüfen, deduplizieren, OrderPlaced verarbeiten
    res.status(202).json({ duplicate: false })
  })

  return {
    app,
    setStock: (productId: string, onHand: number) =>
      db.prepare('INSERT OR REPLACE INTO stock (product_id, on_hand, reserved) VALUES (?, ?, 0)').run(productId, onHand),
    stockOf: (productId: string) =>
      db.prepare('SELECT on_hand AS onHand, reserved FROM stock WHERE product_id = ?').get(productId) as
        | { onHand: number; reserved: number }
        | undefined,
    reservationOf: (orderId: string) =>
      (db.prepare('SELECT status FROM reservations WHERE order_id = ?').get(orderId) as { status: string } | undefined)
        ?.status,
  }
}
