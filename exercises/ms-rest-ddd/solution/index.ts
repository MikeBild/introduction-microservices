// Reference solution ms-rest-ddd
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

// The Aggregate as Pure Functions: shipment in, new shipment or rejection out. No HTTP, no database.
export const dispatch = (shipment: Shipment, input: DispatchInput): Shipment | Rejection =>
  shipment.status === 'preparing'
    ? { ...shipment, status: 'dispatched', trackingNumber: input.trackingNumber }
    : { rejected: 'shipment-not-dispatchable', message: `Sendung ${shipment.id} ist schon ${shipment.status}.` }

export const deliver = (shipment: Shipment): Shipment | Rejection =>
  shipment.status === 'dispatched'
    ? { ...shipment, status: 'delivered' }
    : { rejected: 'shipment-not-deliverable', message: `Sendung ${shipment.id} ist ${shipment.status}, nicht unterwegs.` }

export const titles: Record<string, string> = {
  'invalid-input': 'Ungültige Eingabe',
  'shipment-not-found': 'Sendung unbekannt',
  'shipment-not-dispatchable': 'Sendung kann nicht übergeben werden',
  'shipment-not-deliverable': 'Sendung kann nicht zugestellt werden',
}

/** Problem Details per RFC 9457: type is the stable identifier per rule, instance is the affected request. */
export const problem = (res: Response, status: number, code: string, detail: string) => {
  res
    .status(status)
    .type('application/problem+json')
    .json({ type: `urn:werkstatt:problem:${code}`, title: titles[code] ?? code, status, detail, instance: res.req.originalUrl })
}

const ListFilter = z.object({ status: z.enum(['preparing', 'dispatched', 'delivered']).optional() })

export const createShippingApi = ({ repository }: { repository: ShipmentRepository }) => {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '100kb' }))

  // Query: the read model with a filter
  app.get('/shipments', (req, res) => {
    const filter = ListFilter.safeParse(req.query)
    if (!filter.success) return problem(res, 400, 'invalid-input', z.prettifyError(filter.error))
    res.json(repository.list(filter.data))
  })

  // Aggregate Root as a resource
  app.get('/shipments/:id', (req, res) => {
    const shipment = repository.get(req.params.id)
    if (!shipment) return problem(res, 404, 'shipment-not-found', `Sendung ${req.params.id} unbekannt`)
    res.json(shipment)
  })

  // Command: the route translates, the Pure Function decides, the response is the resource afterwards.
  const command = (decide: (shipment: Shipment, body: unknown) => Shipment | Rejection | { invalid: string }) =>
    (req: express.Request, res: Response) => {
      const shipment = repository.get(req.params.id as string)
      if (!shipment) return problem(res, 404, 'shipment-not-found', `Sendung ${req.params.id} unbekannt`)
      const result = decide(shipment, req.body)
      if ('invalid' in result) return problem(res, 400, 'invalid-input', result.invalid)
      if ('rejected' in result) return problem(res, 409, result.rejected, result.message)
      repository.save(result)
      res.json(result)
    }

  app.post(
    '/shipments/:id/dispatch',
    command((shipment, body) => {
      const input = DispatchInput.safeParse(body)
      return input.success ? dispatch(shipment, input.data) : { invalid: z.prettifyError(input.error) }
    }),
  )
  app.post('/shipments/:id/deliver', command((shipment) => deliver(shipment)))

  return app
}
