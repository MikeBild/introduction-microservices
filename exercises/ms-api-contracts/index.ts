// Lesson ms-api-contracts: The contract belongs to the service that offers it
// Duration: about 20 minutes
//
// The service orders publishes its contract: zod schemas from @werkstatt/contracts
// as the source, and from them an OpenAPI document for everyone who does not work in TypeScript.
//
// Task:
// 1. openApiDocument(): OpenAPI 3.1 with POST /orders. Request body = z.toJSONSchema(PlaceOrderInput),
//    response 201 = z.toJSONSchema(Order), response 400 as application/problem+json.
// 2. GET /openapi.json returns the document.
// 3. POST /orders validates the body with PlaceOrderInput.safeParse. Invalid → 400 with Content-Type
//    application/problem+json and { type, title, status, detail } (RFC 9457). Valid → 201 with the Order.
//
// Check: npm test -- ms-api-contracts
import express from 'express'
import { z } from 'zod'
import type { Order, PlaceOrderInput } from '@werkstatt/contracts'

export const openApiDocument = (): Record<string, unknown> => {
  void z
  throw new Error('TODO: OpenAPI 3.1 aus den zod-Schemas')
}

export const createOrdersApi = ({ place }: { place: (input: PlaceOrderInput) => Promise<Order> }) => {
  const app = express()
  app.use(express.json({ limit: '100kb' }))

  // TODO: GET /openapi.json

  app.post('/orders', async (req, res) => {
    // Pitfall: the body goes into the domain unchecked
    res.status(201).json(await place(req.body))
  })

  return app
}
