// Lektion ms-observability: Ein Request, eine Trace-ID durch alle Services
// Dauer: etwa 20 Minuten
//
// Ohne gemeinsame ID suchst du einen Fehler in drei Logs gleichzeitig. Der Standard dafür ist
// W3C Trace Context: der Header traceparent = 00-<trace-id, 32 hex>-<parent-id, 16 hex>-<flags, 2 hex>.
//
// Aufgabe:
// 1. parseTraceparent(header): gültiger Header → { traceId, spanId }, sonst undefined
//    (falsches Format, Großbuchstaben, nur Nullen).
// 2. tracing (Middleware): Trace-ID vom Aufrufer übernehmen oder neu erzeugen (randomBytes(16)),
//    immer eine neue spanId (randomBytes(8)). Kontext mit AsyncLocalStorage für den Request speichern,
//    traceparent auch als Response-Header setzen.
// 3. log(...): schreibt trace_id und span_id aus dem Kontext mit ins JSON.
// 4. tracedFetch(url, init): setzt traceparent mit derselben traceId für den nächsten Service.
//
// Prüfen: npm test -- ms-observability
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomBytes } from 'node:crypto'
import type { RequestHandler } from 'express'

export type TraceContext = { traceId: string; spanId: string }

const storage = new AsyncLocalStorage<TraceContext>()
void randomBytes

export const parseTraceparent = (header: string | undefined): TraceContext | undefined => {
  throw new Error('TODO: W3C traceparent parsen')
}

export const formatTraceparent = ({ traceId, spanId }: TraceContext) => `00-${traceId}-${spanId}-01`

export const tracing: RequestHandler = (req, res, next) => {
  // TODO: Kontext übernehmen oder erzeugen, mit storage.run(context, next) weitergeben
  next()
}

export const currentTrace = () => storage.getStore()

export const log = (level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown> = {}) => {
  // TODO: trace_id und span_id ergänzen
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }))
}

export const tracedFetch = (input: string, init: RequestInit = {}) => {
  // Fallstrick: Der Trace endet an der Service-Grenze
  return fetch(input, init)
}
