// Service orders: nimmt Bestellungen an, holt Preise synchron aus catalog und steuert die Saga
// über Events: OrderPlaced → StockReserved | StockRejected → ggf. OrderCancelled.
import express from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { enqueue, firstDelivery, health, messagingSchema, openDb, transaction } from '@werkstatt/kit'
import { Order, PlaceOrderInput, Product, ShopEvent } from '@werkstatt/contracts'

const schema = `
  CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, body TEXT NOT NULL, stock TEXT NOT NULL DEFAULT 'pending');
  ${messagingSchema}`

const problem = (status: number, title: string, detail?: string) => ({ type: 'about:blank', title, status, detail })

export const createOrders = ({ dbPath = ':memory:', catalogUrl = 'http://localhost:3001', timeoutMs = 500 } = {}) => {
  const db = openDb(dbPath, schema)

  const productOf = async (productId: string) => {
    const response = await fetch(`${catalogUrl}/products/${encodeURIComponent(productId)}`, { signal: AbortSignal.timeout(timeoutMs) })
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error(`catalog answered ${response.status}`)
    return Product.parse(await response.json())
  }

  const load = (orderId: string) => {
    const row = db.prepare('SELECT body, stock FROM orders WHERE id = ?').get(orderId) as { body: string; stock: string } | undefined
    return row && { ...Order.parse(JSON.parse(row.body)), stock: row.stock }
  }

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '100kb' }))
  app.use(health('orders'))

  app.post('/orders', async (req, res) => {
    const parsed = PlaceOrderInput.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).type('application/problem+json').json(problem(400, 'invalid order', z.prettifyError(parsed.error)))
      return
    }
    let products: Array<Product | undefined>
    try {
      products = await Promise.all(parsed.data.items.map((item) => productOf(item.productId)))
    } catch {
      res.status(503).type('application/problem+json').json(problem(503, 'catalog unavailable'))
      return
    }
    const unknown = parsed.data.items.find((item, index) => !products[index])
    if (unknown) {
      res.status(422).type('application/problem+json').json(problem(422, 'unknown product', unknown.productId))
      return
    }
    const order: Order = {
      id: randomUUID(),
      customerId: parsed.data.customerId,
      items: parsed.data.items.map((item, index) => ({ ...item, priceCents: products[index]?.priceCents ?? 0 })),
      status: 'placed',
      createdAt: new Date().toISOString(),
    }
    transaction(db, () => {
      db.prepare('INSERT INTO orders (id, body) VALUES (?, ?)').run(order.id, JSON.stringify(order))
      enqueue(db, 'OrderPlaced', { orderId: order.id, items: parsed.data.items })
    })
    res.status(201).location(`/orders/${order.id}`).json(order)
  })

  app.get('/orders/:orderId', (req, res) => {
    const order = load(req.params.orderId)
    if (order) res.json(order)
    else res.status(404).json({ error: 'order not found' })
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
      if (event.type === 'StockReserved')
        db.prepare("UPDATE orders SET stock = 'reserved' WHERE id = ? AND stock = 'pending'").run(event.data.orderId)
      if (event.type === 'StockRejected') {
        const order = load(event.data.orderId)
        if (order?.status === 'placed') {
          const cancelled = Order.parse({ ...order, status: 'cancelled' })
          db.prepare("UPDATE orders SET body = ?, stock = 'rejected' WHERE id = ?").run(JSON.stringify(cancelled), order.id)
          enqueue(db, 'OrderCancelled', { orderId: order.id, reason: `out of stock: ${event.data.productId}` })
        }
      }
      return true
    })
    res.status(fresh ? 202 : 200).json({ duplicate: !fresh })
  })

  return { app, db }
}
