// Service inventory: Bestand und Reservierungen. Reagiert auf OrderPlaced und OrderCancelled,
// meldet StockReserved oder StockRejected über die eigene Outbox.
import express from 'express'
import { enqueue, firstDelivery, health, messagingSchema, openDb, transaction } from '@werkstatt/kit'
import { ShopEvent, type EventOf } from '@werkstatt/contracts'

const schema = `
  CREATE TABLE IF NOT EXISTS stock (product_id TEXT PRIMARY KEY, on_hand INTEGER NOT NULL, reserved INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS reservations (order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity INTEGER NOT NULL,
    PRIMARY KEY (order_id, product_id));
  ${messagingSchema}`

const seed: Array<[string, number]> = [
  ['p-1', 25],
  ['p-2', 3],
  ['p-3', 0],
]

export const createInventory = ({ dbPath = ':memory:' } = {}) => {
  const db = openDb(dbPath, schema)
  const insert = db.prepare('INSERT OR IGNORE INTO stock (product_id, on_hand) VALUES (?, ?)')
  for (const [productId, onHand] of seed) insert.run(productId, onHand)

  const free = (productId: string) =>
    (db.prepare('SELECT on_hand - reserved AS free FROM stock WHERE product_id = ?').get(productId) as { free: number } | undefined)
      ?.free ?? 0

  const onOrderPlaced = ({ data }: EventOf<'OrderPlaced'>) => {
    const missing = data.items.find((line) => free(line.productId) < line.quantity)
    if (missing) return enqueue(db, 'StockRejected', { orderId: data.orderId, productId: missing.productId })
    for (const line of data.items) {
      db.prepare('UPDATE stock SET reserved = reserved + ? WHERE product_id = ?').run(line.quantity, line.productId)
      db.prepare('INSERT INTO reservations (order_id, product_id, quantity) VALUES (?, ?, ?)').run(data.orderId, line.productId, line.quantity)
    }
    enqueue(db, 'StockReserved', { orderId: data.orderId })
  }

  // Kompensation: Reservierungen einer stornierten Bestellung freigeben
  const onOrderCancelled = ({ data }: EventOf<'OrderCancelled'>) => {
    const lines = db.prepare('SELECT product_id, quantity FROM reservations WHERE order_id = ?').all(data.orderId) as Array<{
      product_id: string
      quantity: number
    }>
    for (const line of lines) db.prepare('UPDATE stock SET reserved = reserved - ? WHERE product_id = ?').run(line.quantity, line.product_id)
    db.prepare('DELETE FROM reservations WHERE order_id = ?').run(data.orderId)
  }

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json())
  app.use(health('inventory'))
  app.get('/stock/:productId', (req, res) => {
    const row = db.prepare('SELECT on_hand AS onHand, reserved FROM stock WHERE product_id = ?').get(req.params.productId)
    if (row) res.json(row)
    else res.status(404).json({ error: 'product not found' })
  })
  app.post('/inbox', (req, res) => {
    const parsed = ShopEvent.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid event' })
      return
    }
    const event = parsed.data
    const fresh = transaction(db, () => {
      if (!firstDelivery(db, event.id)) return false
      if (event.type === 'OrderPlaced') onOrderPlaced(event)
      if (event.type === 'OrderCancelled') onOrderCancelled(event)
      return true
    })
    res.status(fresh ? 202 : 200).json({ duplicate: !fresh })
  })
  return { app, db }
}
