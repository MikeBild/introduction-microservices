import { describe, expect, it } from 'vitest'
import { listen } from '@werkstatt/kit'
import { createShipmentRepository, createShippingApi, deliver, dispatch, type Shipment } from '#ex/ms-rest-ddd'

const preparing: Shipment = { id: 's-1', orderId: 'o-1', status: 'preparing' }
const dispatched: Shipment = { id: 's-2', orderId: 'o-2', status: 'dispatched', trackingNumber: 'DE-1002' }

const api = () => listen(createShippingApi({ repository: createShipmentRepository([preparing, dispatched]) }))
const headers = { 'content-type': 'application/json' }
const post = (url: string, path: string, body: unknown = {}) =>
  fetch(`${url}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
const get = async (url: string, path: string) => (await fetch(`${url}${path}`)).json()

describe('Aggregate Shipment', () => {
  it('dispatches only from preparing and only with a tracking number', () => {
    expect(dispatch(preparing, { trackingNumber: 'DE-1001' })).toEqual({
      ...preparing,
      status: 'dispatched',
      trackingNumber: 'DE-1001',
    })
    expect(dispatch(dispatched, { trackingNumber: 'DE-1003' })).toMatchObject({ rejected: 'shipment-not-dispatchable' })
  })

  it('delivers only a dispatched shipment', () => {
    expect(deliver(dispatched)).toEqual({ ...dispatched, status: 'delivered' })
    expect(deliver(preparing)).toMatchObject({ rejected: 'shipment-not-deliverable' })
  })

  it('leaves the shipment passed in unchanged', () => {
    const before = structuredClone(preparing)
    dispatch(preparing, { trackingNumber: 'DE-1001' })
    expect(preparing).toEqual(before)
  })
})

describe('Commands as POST on an action', () => {
  it('dispatches the shipment and responds with the resource afterwards', async () => {
    await using server = await api()
    const response = await post(server.url, '/shipments/s-1/dispatch', { trackingNumber: 'DE-1001' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ...preparing, status: 'dispatched', trackingNumber: 'DE-1001' })
    expect(await get(server.url, '/shipments/s-1')).toMatchObject({ status: 'dispatched' })
  })

  it('rejects a body without a tracking number with 400', async () => {
    await using server = await api()
    const response = await post(server.url, '/shipments/s-1/dispatch', {})
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toContain('application/problem+json')
    expect(await response.json()).toMatchObject({ type: 'urn:werkstatt:problem:invalid-input', status: 400 })
  })

  it('reports an unknown shipment with 404 as a problem', async () => {
    await using server = await api()
    const response = await post(server.url, '/shipments/s-9/dispatch', { trackingNumber: 'DE-1009' })
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ type: 'urn:werkstatt:problem:shipment-not-found', status: 404 })
  })

  it('rejects a rule violation with 409 and a domain type', async () => {
    await using server = await api()
    const response = await post(server.url, '/shipments/s-2/dispatch', { trackingNumber: 'DE-1003' })
    expect(response.status).toBe(409)
    expect(response.headers.get('content-type')).toContain('application/problem+json')
    expect(await response.json()).toEqual({
      type: 'urn:werkstatt:problem:shipment-not-dispatchable',
      title: expect.any(String),
      status: 409,
      detail: expect.any(String),
      instance: '/shipments/s-2/dispatch',
    })
    expect(await get(server.url, '/shipments/s-2')).toMatchObject({ status: 'dispatched', trackingNumber: 'DE-1002' })
  })

  it('delivers a dispatched shipment, not a preparing one', async () => {
    await using server = await api()
    expect((await post(server.url, '/shipments/s-2/deliver')).status).toBe(200)
    expect(await get(server.url, '/shipments/s-2')).toMatchObject({ status: 'delivered' })
    const rejected = await post(server.url, '/shipments/s-1/deliver')
    expect(rejected.status).toBe(409)
    expect(await rejected.json()).toMatchObject({ type: 'urn:werkstatt:problem:shipment-not-deliverable' })
  })
})

describe('Queries as GET on a read model', () => {
  it('returns the shipments in preparation', async () => {
    await using server = await api()
    expect(await get(server.url, '/shipments?status=preparing')).toEqual([preparing])
    expect(await get(server.url, '/shipments')).toHaveLength(2)
  })

  it('no longer knows a generic PATCH', async () => {
    await using server = await api()
    const response = await fetch(`${server.url}/shipments/s-1`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'delivered' }),
    })
    expect(response.status).toBe(404)
    expect(await get(server.url, '/shipments/s-1')).toMatchObject({ status: 'preparing' })
  })
})
