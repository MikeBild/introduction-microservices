// Lösung ms-observability
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomBytes } from 'node:crypto'
import type { RequestHandler } from 'express'

export type TraceContext = { traceId: string; spanId: string }

const storage = new AsyncLocalStorage<TraceContext>()
const hex = (bytes: number) => randomBytes(bytes).toString('hex')

/** W3C Trace Context: version-traceid-parentid-flags, z. B. 00-<32 hex>-<16 hex>-01 */
export const parseTraceparent = (header: string | undefined): TraceContext | undefined => {
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/.exec(header ?? '')
  if (!match?.[1] || !match[2] || /^0+$/.test(match[1]) || /^0+$/.test(match[2])) return undefined
  return { traceId: match[1], spanId: match[2] }
}

export const formatTraceparent = ({ traceId, spanId }: TraceContext) => `00-${traceId}-${spanId}-01`

/** Übernimmt die Trace-ID vom Aufrufer oder beginnt einen neuen Trace. Jeder Service bekommt eine eigene Span-ID. */
export const tracing: RequestHandler = (req, res, next) => {
  const incoming = parseTraceparent(req.get('traceparent'))
  const context = { traceId: incoming?.traceId ?? hex(16), spanId: hex(8) }
  res.set('traceparent', formatTraceparent(context))
  storage.run(context, next)
}

export const currentTrace = () => storage.getStore()

export const log = (level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown> = {}) => {
  const trace = currentTrace()
  console.log(
    JSON.stringify({ time: new Date().toISOString(), level, message, trace_id: trace?.traceId, span_id: trace?.spanId, ...fields }),
  )
}

/** fetch, das den aktuellen Trace an den nächsten Service weitergibt. */
export const tracedFetch = (input: string, init: RequestInit = {}) => {
  const trace = currentTrace()
  const headers = new Headers(init.headers)
  if (trace) headers.set('traceparent', formatTraceparent({ traceId: trace.traceId, spanId: trace.spanId }))
  return fetch(input, { ...init, headers })
}
