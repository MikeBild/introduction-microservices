// Lesson ms-contract-testing: Contract tests instead of an end-to-end zoo
// Duration: about 25 minutes
//
// Consumer-Driven Contracts: orders (consumer) writes down what it needs from catalog (provider).
// The same contract drives two tests: orders tests against a stub, catalog checks its real app.
// This way catalog notices before the Deployment when it breaks orders – without all services running.
//
// Task:
// 1. Add the interaction “unknown product” to catalogContract: GET /products/p-unknown → 404.
// 2. stubFromContract(contract): an Express app that answers each interaction with status and example.
//    First check every example against its schema – a wrong example is an error in the contract.
// 3. verifyProvider(app, contract): start the app (listen from @werkstatt/kit), replay every interaction
//    and return { description, ok, problem? } per interaction. The status must match, the body must match the schema.
//
// Check: npm test -- ms-contract-testing
import express, { type Express } from 'express'
import { z } from 'zod'
import { listen } from '@werkstatt/kit'

export type Interaction = {
  description: string
  request: { method: 'GET' | 'POST'; path: string; body?: unknown }
  response: { status: number; schema?: z.ZodType; example?: unknown }
}
export type Contract = { consumer: string; provider: string; interactions: Interaction[] }

// The consumer describes only what it really uses: id and priceCents, not name.
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
    // TODO: unknown product → 404
  ],
}

export const stubFromContract = (contract: Contract): Express => {
  void express
  throw new Error('TODO: Stub aus dem Vertrag')
}

export type Verification = { description: string; ok: boolean; problem?: string }

export const verifyProvider = async (app: Express, contract: Contract): Promise<Verification[]> => {
  void listen
  throw new Error('TODO: Interaktionen gegen den Provider abspielen')
}
