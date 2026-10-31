// Lektion ms-rest-ddd: Eine REST-API spricht die Sprache ihres Bounded Context
// Dauer: etwa 25 Minuten
//
// Der Context Versand bekommt seine eigene API. Das Aggregate ist die Sendung (Shipment), die Commands
// heißen dispatch (Übergabe an den Paketdienst) und deliver (Zustellung). Der Startpunkt hat ein
// generisches PATCH /shipments/:id, das jeden Status schreibt. Die Regel steht nirgends, also gilt sie nirgends.
//
// | DDD            | REST-API des Context                                  |
// |----------------|-------------------------------------------------------|
// | Aggregate Root | Ressource: GET /shipments/:id                         |
// | Command        | Aktion: POST /shipments/:id/dispatch, …/deliver       |
// | Query          | Read-Modell: GET /shipments?status=preparing          |
// | Regelverstoß   | 409 application/problem+json, ein type je Regel       |
// | Fremder Context| nur die ID: orderId                                   |
//
// Aufgabe:
// 1. dispatch(shipment, { trackingNumber }) und deliver(shipment) als Pure Functions: neue Sendung oder Rejection.
//    dispatch nur aus 'preparing', deliver nur aus 'dispatched'. Die übergebene Sendung bleibt unverändert.
// 2. problem(res, status, code, detail): Problem Details nach RFC 9457 mit type 'urn:werkstatt:problem:<code>',
//    title aus `titles`, status, detail und instance (res.req.originalUrl), Content-Type application/problem+json.
// 3. POST /shipments/:id/dispatch und POST /shipments/:id/deliver: Body mit zod prüfen (400), unbekannte
//    Sendung (404), Regelverstoß (409). Die Antwort auf einen Command ist die Sendung danach.
// 4. GET /shipments?status=preparing als Read-Modell. Entferne PATCH /shipments/:id.
//
// Prüfen: npm test -- ms-rest-ddd
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

/** Problem Details nach RFC 9457 – Fallstrick: type, title und instance fehlen, der Client kann nur raten. */
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

  // Fallstrick: Der Client bestimmt den Status, keine Regel läuft.
  app.patch('/shipments/:id', (req, res) => {
    const shipment = repository.get(req.params.id)
    if (!shipment) return problem(res, 404, 'shipment-not-found', `Sendung ${req.params.id} unbekannt`)
    const updated = { ...shipment, ...(req.body as Partial<Shipment>) }
    repository.save(updated)
    res.json(updated)
  })

  // TODO: POST /shipments/:id/dispatch, POST /shipments/:id/deliver und GET /shipments?status=…

  return app
}
