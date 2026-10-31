// Lektion ms-context-cut: Ein Service je Bounded Context, nicht je Entity
// Dauer: etwa 25 Minuten
//
// Ein Vorschlag für den Werkstatt-Shop liegt vor: ProductService, OrderService, CustomerService –
// ein Service je Entity. Du schneidest neu nach Bounded Contexts und begründest jeden Context.
//
// Fakten aus dem Gespräch mit den Fachleuten:
// - Summe und Status einer Bestellung brauchen Positionen und Preise sofort → Order und OrderItem zusammen.
// - Eine Reservierung ändert den Bestand in derselben Transaktion → StockItem und Reservation zusammen.
// - „Product“ heißt im Verkauf Name und Preis, im Lager Bestand → Price und StockItem getrennt.
// - Eine Sendung hat eine Adresse, aber keinen Preis → Shipment nie beim Price.
//
// Schnitt-Check vor jedem Service:
//
// | Frage                                  | ja              | nein          |
// |----------------------------------------|-----------------|---------------|
// | Kippt an der Grenze ein Wort?          | weiter prüfen   | Modul         |
// | Müssen Regeln sofort gemeinsam gelten? | Modul           | weiter prüfen |
// | Ändert es sich meist im selben Commit? | Modul           | weiter prüfen |
// | Eigenes Team oder eigene Last?         | eigener Service | Modul         |
//
// Aufgabe:
// 1. checkContextMap(map, known): meldet jede Entity aus known ohne oder mit mehreren Besitzern (rule 'owner'),
//    jede Kante über eine gemeinsame Datenbank (rule 'database') und jede Kante zu einem Context,
//    den die Map nicht kennt (rule 'unknown-context'). detail nennt die Entity bzw. die Contexts.
// 2. contextMap: dein Schnitt. Jede Entity aus `entities` gehört genau einem Context, Kanten nur per http oder events.
// 3. decisions/<context>.md: ein kurzes ADR je Context mit den Abschnitten „## Kontext“, „## Entscheidung“
//    und „## Verworfen“ (Vorlage in decisions/_template.md).
//
// Prüfen: npm test -- ms-context-cut
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

export const checkContextMap = (map: ContextMap, known: readonly string[] = entities): Issue[] => {
  throw new Error('TODO: Besitzer je Entity, Kanten über die Datenbank und unbekannte Contexts melden')
}

// TODO: dein Schnitt nach Bounded Contexts – beginn bei der Sprache, nicht bei den Tabellen
export const contextMap: ContextMap = proposal
