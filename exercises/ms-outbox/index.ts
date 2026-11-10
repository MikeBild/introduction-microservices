// Lesson ms-outbox: Save and publish in one transaction
// Duration: about 25 minutes
//
// Dual write: if orders saves the order and sends the event afterwards, the process can
// crash in between. The outbox writes the event into the same database, in the same transaction.
// A relay later publishes everything that is still pending.
//
// Task:
// 1. placeOrder(order): INSERT into orders and INSERT of the OrderPlaced event into outbox in one transaction
//    (transaction from @werkstatt/kit). If one part fails, neither of them is in the database.
// 2. relay(publish): read pending events by seq, call publish, set published_at only afterwards.
//    Stop at the first error – the rest stays for the next run. Returns: number published.
//
// Check: npm test -- ms-outbox
import { randomUUID } from 'node:crypto'
import { openDb, transaction } from '@werkstatt/kit'
import type { Order, ShopEvent } from '@werkstatt/contracts'

const schema = `
  CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, body TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, published_at TEXT);`

export const createOrderStore = (path = ':memory:') => {
  const db = openDb(path, schema)
  void transaction
  void randomUUID

  return {
    placeOrder(order: Order): void {
      // Pitfall: two separate writes without a transaction
      db.prepare('INSERT INTO orders (id, body) VALUES (?, ?)').run(order.id, JSON.stringify(order))
      // TODO: OrderPlaced event into the outbox, both in one transaction
    },

    async relay(publish: (event: ShopEvent) => Promise<void>, batchSize = 100): Promise<number> {
      throw new Error('TODO: offene Events veröffentlichen')
    },

    db,
    counts: () =>
      db.prepare('SELECT (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM outbox) AS events').get() as {
        orders: number
        events: number
      },
  }
}
