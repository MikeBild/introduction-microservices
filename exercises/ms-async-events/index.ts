// Lesson ms-async-events: Events decouple time and availability
// Duration: about 25 minutes
//
// inventory receives events via HTTP on POST /inbox. Delivery means “at least once”:
// the same event can arrive more than once. The inbox makes sure it takes effect only once.
//
// Task:
// 1. POST /inbox validates the body with ShopEvent from @werkstatt/contracts. Invalid → 400.
// 2. Remember the event ID in the table inbox. If it was already there → 200 with { duplicate: true }, otherwise 202.
// 3. On OrderPlaced: if the stock covers all line items, increase reserved per line item
//    and store the reservation as 'reserved', otherwise only 'rejected' – never a partial reservation.
// 4. The inbox entry and the effect run in one transaction (transaction from @werkstatt/kit).
//
// Check: npm test -- ms-async-events
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
    // TODO: validate, deduplicate, handle OrderPlaced
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
