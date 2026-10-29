// Lösung ms-async-events
import express from 'express'
import { openDb, transaction } from '@werkstatt/kit'
import { ShopEvent, type EventOf } from '@werkstatt/contracts'

const schema = `
  CREATE TABLE IF NOT EXISTS stock (product_id TEXT PRIMARY KEY, on_hand INTEGER NOT NULL, reserved INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS reservations (order_id TEXT PRIMARY KEY, status TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS inbox (event_id TEXT PRIMARY KEY, received_at TEXT NOT NULL);`

export const createInventory = (path = ':memory:') => {
  const db = openDb(path, schema)
  const available = db.prepare('SELECT on_hand - reserved AS free FROM stock WHERE product_id = ?')
  const reserve = db.prepare('UPDATE stock SET reserved = reserved + ? WHERE product_id = ?')
  const remember = db.prepare('INSERT INTO inbox (event_id, received_at) VALUES (?, ?) ON CONFLICT DO NOTHING')
  const decide = db.prepare('INSERT INTO reservations (order_id, status) VALUES (?, ?)')

  const onOrderPlaced = (event: EventOf<'OrderPlaced'>) => {
    const enough = event.data.items.every(
      (line) => ((available.get(line.productId) as { free: number } | undefined)?.free ?? 0) >= line.quantity,
    )
    if (enough) for (const line of event.data.items) reserve.run(line.quantity, line.productId)
    decide.run(event.data.orderId, enough ? 'reserved' : 'rejected')
  }

  const app = express()
  app.use(express.json())
  app.post('/inbox', (req, res) => {
    const parsed = ShopEvent.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid event' })
      return
    }
    const event = parsed.data
    // Inbox: Event-ID merken und Wirkung in derselben Transaktion – so wirkt jedes Event genau einmal.
    const duplicate = transaction(db, () => {
      if (remember.run(event.id, new Date().toISOString()).changes === 0) return true
      if (event.type === 'OrderPlaced') onOrderPlaced(event)
      return false
    })
    res.status(duplicate ? 200 : 202).json({ duplicate })
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
