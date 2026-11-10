// Lesson ms-rest-ddd: A REST API speaks its Bounded Context language
// Duration: about 25 minutes
//
// The shipping context gets its own API. The Aggregate is the shipment (Shipment), the Commands
// are called dispatch (handover to the parcel carrier) and deliver (delivery). The starting point has a
// generic PATCH /shipments/:id that writes any status. The rule is written down nowhere, so it applies nowhere.
//
// | DDD             | REST API of the context                               |
// |-----------------|-------------------------------------------------------|
// | Aggregate Root  | Resource: GET /shipments/:id                          |
// | Command         | Action: POST /shipments/:id/dispatch, …/deliver       |
// | Query           | Read model: GET /shipments?status=preparing           |
// | Rule violation  | 409 application/problem+json, one type per rule       |
// | Foreign context | only the ID: orderId                                  |
//
// Task:
// 1. dispatch(shipment, { trackingNumber }) and deliver(shipment) as Pure Functions: new shipment or Rejection.
//    dispatch only from 'preparing', deliver only from 'dispatched'. The shipment passed in stays unchanged.
// 2. problem(res, status, code, detail): Problem Details per RFC 9457 with type 'urn:werkstatt:problem:<code>',
//    title from `titles`, status, detail and instance (res.req.originalUrl), Content-Type application/problem+json.
// 3. POST /shipments/:id/dispatch and POST /shipments/:id/deliver: validate the body with zod (400), unknown
//    shipment (404), rule violation (409). The response to a Command is the shipment afterwards.
// 4. GET /shipments?status=preparing as a read model. Remove PATCH /shipments/:id.
//
// Check: npm test -- ms-rest-ddd
import express, { type Response } from 'express'
import { z } from 'zod'

export type ShipmentStatus = 'preparing' | 'dispatched' | 'delivered'
export type Shipment = { id: string; orderId: string; status: ShipmentStatus; trackingNumber?: string }
export type Rejection = { rejected: 'shipment-not-dispatchable' | 'shipment-not-deliverable'; message: string }

export const DispatchInput = z.strictObject({ trackingNumber: z.string().min(1) })
export type DispatchInput = z.infer<typeof DispatchInput>

export const createShipmentRepository = (seed: readonly Shipment[] = []) => {
  const shipments = new Map(seed.map((shipment) => [shipment.id, shipment]))
  return {
    get: (id: string): Shipment | undefined => shipments.get(id),
    save: (shipment: Shipment) => {
      shipments.set(shipment.id, shipment)
    },
    list: (filter: { status?: ShipmentStatus } = {}): Shipment[] =>
      [...shipments.values()].filter((shipment) => !filter.status || shipment.status === filter.status),
  }
}
export type ShipmentRepository = ReturnType<typeof createShipmentRepository>

export const dispatch = (shipment: Shipment, input: DispatchInput): Shipment | Rejection => {
  throw new Error('TODO: nur aus preparing, mit Tracking-Nummer')
}

export const deliver = (shipment: Shipment): Shipment | Rejection => {
  throw new Error('TODO: nur aus dispatched')
}

export const titles: Record<string, string> = {
  'invalid-input': 'Ungültige Eingabe',
  'shipment-not-found': 'Sendung unbekannt',
  'shipment-not-dispatchable': 'Sendung kann nicht übergeben werden',
  'shipment-not-deliverable': 'Sendung kann nicht zugestellt werden',
}

/** Problem Details per RFC 9457 – pitfall: type, title and instance are missing, so the client can only guess. */
export const problem = (res: Response, status: number, code: string, detail: string) => {
  void titles
  res.status(status).type('application/problem+json').json({ status, detail })
}

export const createShippingApi = ({ repository }: { repository: ShipmentRepository }) => {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '100kb' }))

  app.get('/shipments/:id', (req, res) => {
    const shipment = repository.get(req.params.id)
    if (!shipment) return problem(res, 404, 'shipment-not-found', `Sendung ${req.params.id} unbekannt`)
    res.json(shipment)
  })

  // Pitfall: the client sets the status, no rule runs.
  app.patch('/shipments/:id', (req, res) => {
    const shipment = repository.get(req.params.id)
    if (!shipment) return problem(res, 404, 'shipment-not-found', `Sendung ${req.params.id} unbekannt`)
    const updated = { ...shipment, ...(req.body as Partial<Shipment>) }
    repository.save(updated)
    res.json(updated)
  })

  // TODO: POST /shipments/:id/dispatch, POST /shipments/:id/deliver and GET /shipments?status=…

  return app
}
