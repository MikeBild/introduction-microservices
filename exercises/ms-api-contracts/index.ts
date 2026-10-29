// Lektion ms-api-contracts: Der Vertrag gehört dem Service, der ihn anbietet
// Dauer: etwa 20 Minuten
//
// Der Service orders veröffentlicht seinen Vertrag: zod-Schemas aus @werkstatt/contracts
// als Quelle, daraus ein OpenAPI-Dokument für alle, die nicht in TypeScript arbeiten.
//
// Aufgabe:
// 1. openApiDocument(): OpenAPI 3.1 mit POST /orders. Request Body = z.toJSONSchema(PlaceOrderInput),
//    Response 201 = z.toJSONSchema(Order), Response 400 als application/problem+json.
// 2. GET /openapi.json liefert das Dokument.
// 3. POST /orders prüft den Body mit PlaceOrderInput.safeParse. Ungültig → 400 mit Content-Type
//    application/problem+json und { type, title, status, detail } (RFC 9457). Gültig → 201 mit der Order.
//
// Prüfen: npm test -- ms-api-contracts
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
    // Fallstrick: Der Body geht ungeprüft in die Domäne
    res.status(201).json(await place(req.body))
  })

  return app
}
