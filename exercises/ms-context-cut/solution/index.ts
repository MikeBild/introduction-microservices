// Reference solution ms-context-cut
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

/** Three rules a Context Map must follow before it turns into services. */
export const checkContextMap = (map: ContextMap, known: readonly string[] = entities): Issue[] => {
  const names = Object.keys(map.contexts)
  const ownersOf = (entity: string) =>
    names.filter((name) => (map.contexts[name]?.owns as readonly string[]).includes(entity))

  const owner = known
    .filter((entity) => ownersOf(entity).length !== 1)
    .map((entity) => ({ rule: 'owner' as const, detail: `${entity}: ${ownersOf(entity).join(', ') || 'kein Besitzer'}` }))
  const database = map.edges
    .filter((edge) => edge.via === 'database')
    .map((edge) => ({ rule: 'database' as const, detail: `${edge.from} liest die Datenbank von ${edge.to}` }))
  const unknown = map.edges
    .flatMap((edge) => [edge.from, edge.to])
    .filter((name, index, all) => !names.includes(name) && all.indexOf(name) === index)
    .map((name) => ({ rule: 'unknown-context' as const, detail: `${name} ist kein Context der Map` }))

  return [...owner, ...database, ...unknown]
}

// The cut along Bounded Contexts: each context takes the entities whose language it speaks.
// “Product” exists three times – as a catalog entry with a price, as stock in inventory, as a line item in the order.
export const contextMap: ContextMap = {
  contexts: {
    catalog: { owns: ['Product', 'Price'] },
    sales: { owns: ['Customer', 'BillingContact', 'Order', 'OrderItem'] },
    inventory: { owns: ['StockItem', 'Reservation'] },
    shipping: { owns: ['Shipment', 'Address'] },
  },
  edges: [
    { from: 'sales', to: 'catalog', via: 'http' },
    { from: 'sales', to: 'inventory', via: 'events' },
    { from: 'inventory', to: 'sales', via: 'events' },
    { from: 'sales', to: 'shipping', via: 'events' },
  ],
}
