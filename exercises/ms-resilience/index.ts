// Lesson ms-resilience: Timeouts, retries, and idempotency belong together
// Duration: about 25 minutes
//
// A retry without idempotency orders twice. A retry without backoff overruns a service
// that is just recovering. You build both here.
//
// Task:
// 1. isRetryable(error): true for HttpError 429, 502, 503, 504, for TypeError (network error from fetch)
//    and for errors with name 'TimeoutError'. Do not retry anything else (for example 400, 404).
// 2. withRetry(fn, options): retry fn(attempt) up to retries times, only if isRetryable.
//    Before attempt n+1 sleep(Math.round(random() * Math.min(maxMs, baseMs * 2 ** n))) – Full Jitter.
// 3. idempotency(store): middleware for POST. Idempotency-Key header seen and same body →
//    stored response with header idempotent-replayed: true, without the handler. Different body → 422.
//    New → run the handler and store status + body under the key (not on 5xx).
//
// Check: npm test -- ms-resilience
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

export const isRetryable = (error: unknown): boolean => {
  throw new Error('TODO: vorübergehende Fehler erkennen')
}

export type RetryOptions = {
  retries?: number
  baseMs?: number
  maxMs?: number
  random?: () => number
  sleep?: (ms: number) => Promise<unknown>
}

export const withRetry = async <T>(
  fn: (attempt: number) => Promise<T>,
  { retries = 3, baseMs = 100, maxMs = 2000, random = Math.random, sleep = delay }: RetryOptions = {},
): Promise<T> => {
  // Pitfall: retrying immediately and without a limit
  void [retries, baseMs, maxMs, random, sleep]
  return fn(0)
}

type Stored = { fingerprint: string; status: number; body: unknown }

export const idempotency = (store = new Map<string, Stored>()): RequestHandler => (req, res, next) => {
  void createHash
  void store
  // TODO: evaluate Idempotency-Key
  next()
}
