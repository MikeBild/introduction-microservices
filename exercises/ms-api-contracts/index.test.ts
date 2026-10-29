import { describe, expect, it } from 'vitest'
import { listen } from '@werkstatt/kit'
import type { Order, PlaceOrderInput } from '@werkstatt/contracts'
import { createOrdersApi } from '#ex/ms-api-contracts'

const place = async (input: PlaceOrderInput): Promise<Order> => ({
  id: 'o-1',
  customerId: input.customerId,
  items: input.items.map((item) => ({ ...item, priceCents: 1299 })),
  status: 'placed',
  createdAt: '2026-10-29T09:00:00.000Z',
})

const post = (url: string, body: unknown) =>
  fetch(`${url}/orders`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('orders API contract', () => {
  it('veröffentlicht OpenAPI 3.1 aus den zod-Schemas', async () => {
    await using api = await listen(createOrdersApi({ place }))
    const doc: any = await (await fetch(`${api.url}/openapi.json`)).json()
    expect(doc.openapi).toBe('3.1.0')
    const post = doc.paths['/orders'].post
    const schema = post.requestBody.content['application/json'].schema
    expect(schema.required).toEqual(['customerId', 'items'])
    expect(schema.properties.items.minItems).toBe(1)
    expect(post.responses['201'].content['application/json'].schema.properties.status.enum).toContain('placed')
    expect(post.responses['400'].content).toHaveProperty('application/problem+json')
  })

  it('nimmt eine gültige Bestellung an', async () => {
    await using api = await listen(createOrdersApi({ place }))
    const response = await post(api.url, { customerId: 'c-1', items: [{ productId: 'p-1', quantity: 2 }] })
    expect(response.status).toBe(201)
    expect(((await response.json()) as Order).status).toBe('placed')
  })

  it('lehnt ungültige Bodys mit Problem Details ab', async () => {
    await using api = await listen(createOrdersApi({ place }))
    for (const body of [{ customerId: 'c-1', items: [] }, { customerId: 'c-1', items: [{ productId: 'p-1', quantity: 1 }], priceCents: 1 }]) {
      const response = await post(api.url, body)
      expect(response.status).toBe(400)
      expect(response.headers.get('content-type')).toContain('application/problem+json')
      expect(await response.json()).toMatchObject({ status: 400, title: expect.any(String), type: expect.any(String) })
    }
  })
})
