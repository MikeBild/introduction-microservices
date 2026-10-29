import express from 'express'
import { describe, expect, it } from 'vitest'
import { listen } from '@werkstatt/kit'
import { HttpError, idempotency, isRetryable, withRetry } from '#ex/ms-resilience'

describe('isRetryable', () => {
  it('wiederholt nur vorübergehende Fehler', () => {
    expect(isRetryable(new HttpError(503))).toBe(true)
    expect(isRetryable(new HttpError(429))).toBe(true)
    expect(isRetryable(new TypeError('fetch failed'))).toBe(true)
    expect(isRetryable(Object.assign(new Error('slow'), { name: 'TimeoutError' }))).toBe(true)
    expect(isRetryable(new HttpError(400))).toBe(false)
    expect(isRetryable(new HttpError(404))).toBe(false)
    expect(isRetryable(new Error('bug'))).toBe(false)
  })
})

describe('withRetry', () => {
  it('wartet mit exponentiellem Backoff und hat Erfolg', async () => {
    const waits: number[] = []
    const result = await withRetry(
      async (attempt) => {
        if (attempt < 3) throw new HttpError(503)
        return 'ok'
      },
      { retries: 3, baseMs: 100, maxMs: 2000, random: () => 1, sleep: async (ms) => void waits.push(ms) },
    )
    expect(result).toBe('ok')
    expect(waits).toEqual([100, 200, 400])
  })

  it('begrenzt die Wartezeit und gibt nach retries auf', async () => {
    const waits: number[] = []
    let calls = 0
    await expect(
      withRetry(
        async () => {
          calls++
          throw new HttpError(503)
        },
        { retries: 2, baseMs: 1500, maxMs: 2000, random: () => 1, sleep: async (ms) => void waits.push(ms) },
      ),
    ).rejects.toBeInstanceOf(HttpError)
    expect(calls).toBe(3)
    expect(waits).toEqual([1500, 2000])
  })

  it('wiederholt keine fachlichen Fehler', async () => {
    let calls = 0
    await expect(
      withRetry(async () => {
        calls++
        throw new HttpError(400)
      }, { sleep: async () => undefined }),
    ).rejects.toBeInstanceOf(HttpError)
    expect(calls).toBe(1)
  })
})

describe('idempotency', () => {
  const ordersApp = () => {
    let created = 0
    const app = express()
      .use(express.json())
      .post('/orders', idempotency(), (req, res) => {
        created++
        res.status(201).json({ id: `o-${created}` })
      })
    return { app, created: () => created }
  }
  const post = (url: string, key: string, body: unknown) =>
    fetch(`${url}/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify(body),
    })

  it('liefert bei Wiederholung dieselbe Antwort und legt nichts doppelt an', async () => {
    const orders = ordersApp()
    await using api = await listen(orders.app)
    const body = { customerId: 'c-1', items: [{ productId: 'p-1', quantity: 1 }] }
    const first = await post(api.url, 'k-1', body)
    const second = await post(api.url, 'k-1', body)
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(await second.json()).toEqual(await first.json())
    expect(second.headers.get('idempotent-replayed')).toBe('true')
    expect(orders.created()).toBe(1)
  })

  it('lehnt denselben Schlüssel mit anderem Body ab', async () => {
    const orders = ordersApp()
    await using api = await listen(orders.app)
    await post(api.url, 'k-1', { customerId: 'c-1' })
    expect((await post(api.url, 'k-1', { customerId: 'c-2' })).status).toBe(422)
  })
})
