import { describe, expect, it } from 'vitest'
import { listen } from '@werkstatt/kit'
import { createInventory } from '#ex/ms-async-events'

const orderPlaced = (id: string, orderId: string, items: Array<{ productId: string; quantity: number }>) => ({
  id,
  type: 'OrderPlaced',
  occurredAt: '2026-10-29T09:00:00.000Z',
  data: { orderId, items },
})

const deliver = (url: string, event: unknown) =>
  fetch(`${url}/inbox`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) })

describe('inventory inbox', () => {
  it('reserviert Bestand für OrderPlaced', async () => {
    const inventory = createInventory()
    inventory.setStock('p-1', 10)
    await using api = await listen(inventory.app)
    const response = await deliver(api.url, orderPlaced('e-1', 'o-1', [{ productId: 'p-1', quantity: 3 }]))
    expect(response.status).toBe(202)
    expect(inventory.stockOf('p-1')).toEqual({ onHand: 10, reserved: 3 })
    expect(inventory.reservationOf('o-1')).toBe('reserved')
  })

  it('wirkt bei doppelter Zustellung nur einmal', async () => {
    const inventory = createInventory()
    inventory.setStock('p-1', 10)
    await using api = await listen(inventory.app)
    const event = orderPlaced('e-1', 'o-1', [{ productId: 'p-1', quantity: 3 }])
    await deliver(api.url, event)
    const again = await deliver(api.url, event)
    expect(again.status).toBe(200)
    expect(await again.json()).toEqual({ duplicate: true })
    expect(inventory.stockOf('p-1')?.reserved).toBe(3)
  })

  it('reserviert nie nur einen Teil der Bestellung', async () => {
    const inventory = createInventory()
    inventory.setStock('p-1', 10)
    inventory.setStock('p-2', 1)
    await using api = await listen(inventory.app)
    await deliver(api.url, orderPlaced('e-2', 'o-2', [{ productId: 'p-1', quantity: 2 }, { productId: 'p-2', quantity: 5 }]))
    expect(inventory.stockOf('p-1')?.reserved).toBe(0)
    expect(inventory.reservationOf('o-2')).toBe('rejected')
  })

  it('lehnt Bodys ab, die kein Event des Vertrags sind', async () => {
    const inventory = createInventory()
    await using api = await listen(inventory.app)
    expect((await deliver(api.url, { type: 'OrderPlaced', data: {} })).status).toBe(400)
  })
})
