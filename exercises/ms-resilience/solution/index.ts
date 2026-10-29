// Lösung ms-resilience
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import type { RequestHandler } from 'express'

export class HttpError extends Error {
  override name = 'HttpError'
  readonly status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

/** Nur vorübergehende Fehler wiederholen: Netz, Timeout, 429, 502, 503, 504. */
export const isRetryable = (error: unknown): boolean =>
  error instanceof HttpError
    ? [429, 502, 503, 504].includes(error.status)
    : error instanceof TypeError || (error instanceof Error && error.name === 'TimeoutError')

export type RetryOptions = {
  retries?: number
  baseMs?: number
  maxMs?: number
  random?: () => number
  sleep?: (ms: number) => Promise<unknown>
}

/** Exponential Backoff mit Full Jitter: Wartezeit zufällig zwischen 0 und min(maxMs, baseMs · 2^n). */
export const withRetry = async <T>(
  fn: (attempt: number) => Promise<T>,
  { retries = 3, baseMs = 100, maxMs = 2000, random = Math.random, sleep = delay }: RetryOptions = {},
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw error
      await sleep(Math.round(random() * Math.min(maxMs, baseMs * 2 ** attempt)))
    }
  }
}

type Stored = { fingerprint: string; status: number; body: unknown }

/** Idempotency-Key: derselbe Schlüssel mit demselben Body liefert dieselbe Antwort, ohne erneut zu wirken. */
export const idempotency = (store = new Map<string, Stored>()): RequestHandler => (req, res, next) => {
  const key = req.get('idempotency-key')
  if (!key) return next()
  const fingerprint = createHash('sha256').update(JSON.stringify(req.body ?? null)).digest('hex')
  const seen = store.get(key)
  if (seen) {
    if (seen.fingerprint !== fingerprint) {
      res.status(422).json({ error: 'idempotency key reused with a different body' })
      return
    }
    res.set('idempotent-replayed', 'true').status(seen.status).json(seen.body)
    return
  }
  const json = res.json.bind(res)
  res.json = (body: unknown) => {
    if (res.statusCode < 500) store.set(key, { fingerprint, status: res.statusCode, body })
    return json(body)
  }
  next()
}
