// Lektion ms-resilience: Timeouts, Retries und Idempotenz gehören zusammen
// Dauer: etwa 25 Minuten
//
// Ein Retry ohne Idempotenz bestellt doppelt. Ein Retry ohne Backoff überrollt einen Service,
// der sich gerade erholt. Beides baust du hier.
//
// Aufgabe:
// 1. isRetryable(error): true für HttpError 429, 502, 503, 504, für TypeError (Netzfehler von fetch)
//    und für Errors mit name 'TimeoutError'. Alles andere (z. B. 400, 404) nicht wiederholen.
// 2. withRetry(fn, options): fn(attempt) bis zu retries-mal wiederholen, nur bei isRetryable.
//    Vor Versuch n+1 sleep(Math.round(random() * Math.min(maxMs, baseMs * 2 ** n))) – Full Jitter.
// 3. idempotency(store): Middleware für POST. Header Idempotency-Key gesehen und Body gleich →
//    gespeicherte Antwort mit Header idempotent-replayed: true, ohne den Handler. Anderer Body → 422.
//    Neu → Handler laufen lassen und Status + Body unter dem Schlüssel speichern (nicht bei 5xx).
//
// Prüfen: npm test -- ms-resilience
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
  // Fallstrick: sofort und ohne Grenze wiederholen
  void [retries, baseMs, maxMs, random, sleep]
  return fn(0)
}

type Stored = { fingerprint: string; status: number; body: unknown }

export const idempotency = (store = new Map<string, Stored>()): RequestHandler => (req, res, next) => {
  void createHash
  void store
  // TODO: Idempotency-Key auswerten
  next()
}
