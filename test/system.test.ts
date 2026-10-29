// Systemtest: die drei Services zusammen, in einem Prozess, ohne Docker.
// Dieselben Apps startet Docker Compose (compose.yaml) als getrennte Container.
import { describe, expect, it } from 'vitest'
import { eventually, listen, startRelay } from '@werkstatt/kit'
import { createCatalog } from '@werkstatt/catalog'
import { createInventory } from '@werkstatt/inventory'
import { createOrders } from '@werkstatt/orders'

const startSystem = async () => {
  const catalog = await listen(createCatalog().app)
  const inventory = createInventory()
  const inventoryApi = await listen(inventory.app)
  const orders = createOrders({ catalogUrl: catalog.url })
  const ordersApi = await listen(orders.app)
  const stops = [
    startRelay(orders.db, [`${inventoryApi.url}/inbox`], 20),
    startRelay(inventory.db, [`${ordersApi.url}/inbox`], 20),
  ]
  return {
    ordersUrl: ordersApi.url,
    inventoryUrl: inventoryApi.url,
    async [Symbol.asyncDispose]() {
      for (const stop of stops) stop()
      await ordersApi[Symbol.asyncDispose]()
      await inventoryApi[Symbol.asyncDispose]()
      await catalog[Symbol.asyncDispose]()
    },
  }
}

const place = (url: string, items: Array<{ productId: string; quantity: number }>) =>
  fetch(`${url}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ customerId: 'c-1', items }),
  })

const orderOf = async (url: string, id: string) => (await (await fetch(`${url}/orders/${id}`)).json()) as { status: string; stock: string }

describe('Werkstatt-Shop als System', () => {
  it('reserviert Bestand für eine Bestellung', async () => {
    await using system = await startSystem()
    const response = await place(system.ordersUrl, [{ productId: 'p-1', quantity: 2 }])
    expect(response.status).toBe(201)
    const order = (await response.json()) as { id: string; items: Array<{ priceCents: number }> }
    expect(order.items[0]?.priceCents).toBe(1299)
    await eventually(async () => (await orderOf(system.ordersUrl, order.id)).stock === 'reserved')
    expect(await (await fetch(`${system.inventoryUrl}/stock/p-1`)).json()).toEqual({ onHand: 25, reserved: 2 })
  })

  it('storniert die Bestellung, wenn der Bestand fehlt (Saga)', async () => {
    await using system = await startSystem()
    const order = (await (await place(system.ordersUrl, [{ productId: 'p-1', quantity: 1 }, { productId: 'p-3', quantity: 1 }])).json()) as {
      id: string
    }
    await eventually(async () => (await orderOf(system.ordersUrl, order.id)).status === 'cancelled')
    expect(await (await fetch(`${system.inventoryUrl}/stock/p-1`)).json()).toEqual({ onHand: 25, reserved: 0 })
  })

  it('lehnt ungültige Bestellungen und unbekannte Produkte ab', async () => {
    await using system = await startSystem()
    expect((await place(system.ordersUrl, [])).status).toBe(400)
    expect((await place(system.ordersUrl, [{ productId: 'p-9', quantity: 1 }])).status).toBe(422)
  })
})
