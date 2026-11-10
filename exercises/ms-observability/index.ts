// Lesson ms-observability: One request, one trace ID across all services
// Duration: about 20 minutes
//
// Without a shared ID you search for an error in three logs at once. The standard for this is
// W3C Trace Context: the header traceparent = 00-<trace-id, 32 hex>-<parent-id, 16 hex>-<flags, 2 hex>.
//
// Task:
// 1. parseTraceparent(header): valid header → { traceId, spanId }, otherwise undefined
//    (wrong format, uppercase letters, only zeros).
// 2. tracing (middleware): take over the trace ID from the caller or create a new one (randomBytes(16)),
//    always a new spanId (randomBytes(8)). Store the context with AsyncLocalStorage for the request,
//    and also set traceparent as a response header.
// 3. log(...): also writes trace_id and span_id from the context into the JSON.
// 4. tracedFetch(url, init): sets traceparent with the same traceId for the next service.
//
// Check: npm test -- ms-observability
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
  // TODO: take over or create the context, pass it on with storage.run(context, next)
  next()
}

export const currentTrace = () => storage.getStore()

export const log = (level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown> = {}) => {
  // TODO: add trace_id and span_id
  console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }))
}

export const tracedFetch = (input: string, init: RequestInit = {}) => {
  // Pitfall: the trace ends at the service boundary
  return fetch(input, init)
}
