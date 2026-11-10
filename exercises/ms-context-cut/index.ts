// Lesson ms-context-cut: One service per Bounded Context, not per entity
// Duration: about 25 minutes
//
// There is a proposal for the workshop shop: ProductService, OrderService, CustomerService –
// one service per entity. You cut again along Bounded Contexts and justify each context.
//
// Facts from the conversation with the domain experts:
// - Total and status of an order need line items and prices immediately → Order and OrderItem together.
// - A reservation changes the stock in the same transaction → StockItem and Reservation together.
// - “Product” means name and price in sales, stock in inventory → Price and StockItem separate.
// - A shipment has an address but no price → Shipment never with Price.
//
// Cut check before each service:
//
// | Question                                  | yes           | no            |
// |-------------------------------------------|---------------|---------------|
// | Does a word change its meaning?           | keep checking | module        |
// | Must rules hold together immediately?     | module        | keep checking |
// | Does it mostly change in the same commit? | module        | keep checking |
// | Own team or own load?                     | own service   | module        |
//
// Task:
// 1. checkContextMap(map, known): reports every entity from known with no owner or several owners (rule 'owner'),
//    every edge through a shared database (rule 'database') and every edge to a context
//    that the map does not know (rule 'unknown-context'). detail names the entity or the contexts.
// 2. contextMap: your cut. Every entity from `entities` belongs to exactly one context, edges only via http or events.
// 3. decisions/<context>.md: a short ADR per context with the sections “## Kontext”, “## Entscheidung”
//    and “## Verworfen” (template in decisions/_template.md).
//
// Check: npm test -- ms-context-cut
import { fileURLToPath } from 'node:url'

export const decisionsDir = fileURLToPath(new URL('./decisions', import.meta.url))

export const entities = [
  'Product',
  'Price',
  'StockItem',
  'Reservation',
  'Order',
  'OrderItem',
  'Customer',
  'BillingContact',
  'Shipment',
  'Address',
] as const
export type Entity = (typeof entities)[number]

export type Edge = { from: string; to: string; via: 'http' | 'events' | 'database' }
export type ContextMap = { contexts: Record<string, { owns: readonly Entity[] }>; edges: readonly Edge[] }
export type Issue = { rule: 'owner' | 'database' | 'unknown-context'; detail: string }

/** The proposal: one service per entity. Everyone needs Reservation, and the OrderService reads the table products directly. */
export const proposal: ContextMap = {
  contexts: {
    ProductService: { owns: ['Product', 'Price', 'StockItem', 'Reservation'] },
    OrderService: { owns: ['Order', 'OrderItem', 'Reservation', 'Shipment'] },
    CustomerService: { owns: ['Customer', 'BillingContact', 'Address'] },
  },
  edges: [
    { from: 'OrderService', to: 'ProductService', via: 'database' },
    { from: 'OrderService', to: 'CustomerService', via: 'http' },
  ],
}

export const checkContextMap = (map: ContextMap, known: readonly string[] = entities): Issue[] => {
  throw new Error('TODO: Besitzer je Entity, Kanten über die Datenbank und unbekannte Contexts melden')
}

// TODO: your cut along Bounded Contexts – start with the language, not with the tables
export const contextMap: ContextMap = proposal
