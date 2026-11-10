import express from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { listen } from '@werkstatt/kit'
import { log, parseTraceparent, tracedFetch, tracing } from '#ex/ms-observability'

const traceId = '4bf92f3577b34da6a3ce929d0e0e4736'
const header = `00-${traceId}-00f067aa0ba902b7-01`

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseTraceparent', () => {
  it('reads a valid header', () => {
    expect(parseTraceparent(header)).toEqual({ traceId, spanId: '00f067aa0ba902b7' })
  })
  it('discards invalid headers', () => {
    expect(parseTraceparent(undefined)).toBeUndefined()
    expect(parseTraceparent('kaputt')).toBeUndefined()
    expect(parseTraceparent(`00-${'0'.repeat(32)}-00f067aa0ba902b7-01`)).toBeUndefined()
    expect(parseTraceparent(header.toUpperCase())).toBeUndefined()
  })
})

describe('trace propagation', () => {
  // inventory remembers the traceparent it gets from orders
  const downstream = () => {
    const seen: Array<string | undefined> = []
    const app = express().get('/stock', (req, res) => {
      seen.push(req.get('traceparent'))
      res.json({ ok: true })
    })
    return { app, seen }
  }
  const upstream = (inventoryUrl: string) =>
    express()
      .use(tracing)
      .get('/orders/o-1', async (req, res) => {
        log('info', 'order requested', { orderId: 'o-1' })
        await tracedFetch(`${inventoryUrl}/stock`)
        res.json({ id: 'o-1' })
      })

  it('passes the trace ID of the caller on to the next service', async () => {
    const inventory = downstream()
    await using inv = await listen(inventory.app)
    await using orders = await listen(upstream(inv.url))
    const response = await fetch(`${orders.url}/orders/o-1`, { headers: { traceparent: header } })
    expect(parseTraceparent(response.headers.get('traceparent') ?? '')?.traceId).toBe(traceId)
    const forwarded = parseTraceparent(inventory.seen[0])
    expect(forwarded?.traceId).toBe(traceId)
    expect(forwarded?.spanId).not.toBe('00f067aa0ba902b7')
  })

  it('starts a new trace without a header and logs the trace ID', async () => {
    const lines: string[] = []
    vi.spyOn(console, 'log').mockImplementation((line: string) => void lines.push(line))
    const inventory = downstream()
    await using inv = await listen(inventory.app)
    await using orders = await listen(upstream(inv.url))
    await fetch(`${orders.url}/orders/o-1`)
    const forwarded = parseTraceparent(inventory.seen[0])
    expect(forwarded?.traceId).toMatch(/^[0-9a-f]{32}$/)
    const entry = JSON.parse(lines.find((line) => line.includes('order requested')) ?? '{}')
    expect(entry).toMatchObject({ level: 'info', orderId: 'o-1', trace_id: forwarded?.traceId })
  })
})
