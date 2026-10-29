// Lösung ms-outbox
import { randomUUID } from 'node:crypto'
import { openDb, transaction } from '@werkstatt/kit'
import type { Order, ShopEvent } from '@werkstatt/contracts'

const schema = `
  CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, body TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, published_at TEXT);`

export const createOrderStore = (path = ':memory:') => {
  const db = openDb(path, schema)
  const insertOrder = db.prepare('INSERT INTO orders (id, body) VALUES (?, ?)')
  const insertEvent = db.prepare('INSERT INTO outbox (event) VALUES (?)')
  const pending = db.prepare('SELECT seq, event FROM outbox WHERE published_at IS NULL ORDER BY seq LIMIT ?')
  const markPublished = db.prepare('UPDATE outbox SET published_at = ? WHERE seq = ?')

  return {
    /** Bestellung und Event in einer Transaktion: beides oder nichts. */
    placeOrder(order: Order) {
      const event: ShopEvent = {
        id: randomUUID(),
        type: 'OrderPlaced',
        occurredAt: new Date().toISOString(),
        data: { orderId: order.id, items: order.items.map(({ productId, quantity }) => ({ productId, quantity })) },
      }
      transaction(db, () => {
        insertOrder.run(order.id, JSON.stringify(order))
        insertEvent.run(JSON.stringify(event))
      })
    },

    /** Relay: veröffentlicht in Reihenfolge, markiert erst nach Erfolg, bricht beim ersten Fehler ab. */
    async relay(publish: (event: ShopEvent) => Promise<void>, batchSize = 100): Promise<number> {
      let published = 0
      for (const row of pending.all(batchSize) as Array<{ seq: number; event: string }>) {
        try {
          await publish(JSON.parse(row.event) as ShopEvent)
        } catch {
          break
        }
        markPublished.run(new Date().toISOString(), row.seq)
        published++
      }
      return published
    },

    db,
    counts: () =>
      db.prepare('SELECT (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM outbox) AS events').get() as {
        orders: number
        events: number
      },
  }
}
