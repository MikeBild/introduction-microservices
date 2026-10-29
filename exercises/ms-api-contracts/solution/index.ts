// Lösung ms-api-contracts
import express from 'express'
import { z } from 'zod'
import { Order, PlaceOrderInput } from '@werkstatt/contracts'

const Problem = z.object({ type: z.string(), title: z.string(), status: z.number().int(), detail: z.string().optional() })

/** OpenAPI 3.1 nutzt JSON Schema 2020-12 – genau das erzeugt z.toJSONSchema. */
export const openApiDocument = () => ({
  openapi: '3.1.0',
  info: { title: 'orders', version: '1.0.0' },
  paths: {
    '/orders': {
      post: {
        operationId: 'placeOrder',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: z.toJSONSchema(PlaceOrderInput) } },
        },
        responses: {
          '201': { description: 'Bestellung angelegt', content: { 'application/json': { schema: z.toJSONSchema(Order) } } },
          '400': { description: 'Ungültiger Body', content: { 'application/problem+json': { schema: z.toJSONSchema(Problem) } } },
        },
      },
    },
  },
})

export const createOrdersApi = ({ place }: { place: (input: PlaceOrderInput) => Promise<Order> }) => {
  const app = express()
  app.use(express.json({ limit: '100kb' }))

  app.get('/openapi.json', (req, res) => {
    res.json(openApiDocument())
  })

  app.post('/orders', async (req, res) => {
    const parsed = PlaceOrderInput.safeParse(req.body)
    if (!parsed.success) {
      res
        .status(400)
        .type('application/problem+json')
        .json({ type: 'about:blank', title: 'invalid order', status: 400, detail: z.prettifyError(parsed.error) })
      return
    }
    res.status(201).json(Order.parse(await place(parsed.data)))
  })

  return app
}
