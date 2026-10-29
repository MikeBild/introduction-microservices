import { describe, expect, it } from 'vitest'
import type { Order, ShopEvent } from '@werkstatt/contracts'
import { createOrderStore } from '#ex/ms-outbox'

const order = (id: string): Order => ({
  id,
  customerId: 'c-1',
  items: [{ productId: 'p-1', quantity: 2, priceCents: 1299 }],
  status: 'placed',
  createdAt: '2026-10-29T09:00:00.000Z',
})

describe('outbox', () => {
  it('schreibt Bestellung und Event gemeinsam', () => {
    const store = createOrderStore()
    store.placeOrder(order('o-1'))
    expect(store.counts()).toEqual({ orders: 1, events: 1 })
  })

  it('schreibt nichts, wenn ein Teil scheitert', () => {
    const store = createOrderStore()
    store.db.exec("CREATE TRIGGER disk_full BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'disk full'); END")
    expect(() => store.placeOrder(order('o-1'))).toThrow('disk full')
    expect(store.counts()).toEqual({ orders: 0, events: 0 })
  })

  it('veröffentlicht OrderPlaced in Reihenfolge und nur einmal', async () => {
    const store = createOrderStore()
    store.placeOrder(order('o-1'))
    store.placeOrder(order('o-2'))
    const published: ShopEvent[] = []
    expect(await store.relay(async (event) => void published.push(event))).toBe(2)
    expect(published.map((event) => event.type)).toEqual(['OrderPlaced', 'OrderPlaced'])
    expect(published.map((event) => event.data.orderId)).toEqual(['o-1', 'o-2'])
    expect(await store.relay(async (event) => void published.push(event))).toBe(0)
    expect(published).toHaveLength(2)
  })

  it('lässt nach einem Fehler den Rest für den nächsten Lauf liegen', async () => {
    const store = createOrderStore()
    for (const id of ['o-1', 'o-2', 'o-3']) store.placeOrder(order(id))
    const seen: string[] = []
    let calls = 0
    const flaky = async (event: ShopEvent) => {
      if (++calls === 2) throw new Error('inventory down')
      seen.push(event.data.orderId)
    }
    expect(await store.relay(flaky)).toBe(1)
    expect(await store.relay(flaky)).toBe(2)
    expect(seen).toEqual(['o-1', 'o-2', 'o-3'])
  })
})
