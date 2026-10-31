// Lösung ms-context-cut
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

/** Der Vorschlag: ein Service je Entity. Reservation braucht jeder, und der OrderService liest die Tabelle products direkt. */
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

/** Drei Regeln, die eine Context Map einhalten muss, bevor daraus Services werden. */
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

// Der Schnitt nach Bounded Contexts: Jeder Context nimmt die Entities mit, deren Sprache er spricht.
// „Product“ gibt es dreimal – als Katalogeintrag mit Preis, als Bestand im Lager, als Position in der Bestellung.
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
