// Lösung ms-contract-testing
import express, { type Express } from 'express'
import { z } from 'zod'
import { listen } from '@werkstatt/kit'

export type Interaction = {
  description: string
  request: { method: 'GET' | 'POST'; path: string; body?: unknown }
  response: { status: number; schema?: z.ZodType; example?: unknown }
}
export type Contract = { consumer: string; provider: string; interactions: Interaction[] }

// Der Consumer beschreibt nur, was er wirklich nutzt: id und priceCents, nicht name.
const PriceView = z.object({ id: z.string(), priceCents: z.number().int().min(0) })

export const catalogContract: Contract = {
  consumer: 'orders',
  provider: 'catalog',
  interactions: [
    {
      description: 'liefert Preis eines bekannten Produkts',
      request: { method: 'GET', path: '/products/p-1' },
      response: { status: 200, schema: PriceView, example: { id: 'p-1', name: 'Hammer', priceCents: 1299 } },
    },
    {
      description: 'meldet unbekannte Produkte mit 404',
      request: { method: 'GET', path: '/products/p-unknown' },
      response: { status: 404 },
    },
  ],
}

/** Consumer-Seite: ein Stub, der genau den Vertrag spielt. Beispiele müssen zum Schema passen. */
export const stubFromContract = (contract: Contract): Express => {
  const app = express()
  for (const { request, response } of contract.interactions) {
    if (response.schema && response.example !== undefined) response.schema.parse(response.example)
    app[request.method === 'GET' ? 'get' : 'post'](request.path, (req, res) => {
      res.status(response.status).json(response.example ?? {})
    })
  }
  return app
}

export type Verification = { description: string; ok: boolean; problem?: string }

/** Provider-Seite: jede Interaktion gegen die echte App des Providers abspielen. */
export const verifyProvider = async (app: Express, contract: Contract): Promise<Verification[]> => {
  await using provider = await listen(app)
  const results: Verification[] = []
  for (const { description, request, response } of contract.interactions) {
    const actual = await fetch(`${provider.url}${request.path}`, {
      method: request.method,
      headers: request.body === undefined ? {} : { 'content-type': 'application/json' },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
    })
    if (actual.status !== response.status) {
      results.push({ description, ok: false, problem: `status ${actual.status}, expected ${response.status}` })
      continue
    }
    const parsed = response.schema?.safeParse(await actual.json())
    results.push(parsed && !parsed.success ? { description, ok: false, problem: z.prettifyError(parsed.error) } : { description, ok: true })
  }
  return results
}
