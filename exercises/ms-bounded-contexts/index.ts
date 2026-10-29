// Lektion ms-bounded-contexts: Schneide an Sprachgrenzen, nicht an Tabellen
// Dauer: etwa 20 Minuten
//
// „Produkt“ heißt im Verkauf etwas anderes als im Lager. Jeder Kontext bekommt sein eigenes Modell.
// Das alte Warenwirtschaftssystem liefert Zeilen wie { sku: 'p-1', qty_on_hand: '12', qty_blocked: '2', bin: 'A3' }.
//
// Aufgabe:
// 1. fromLegacyStock(raw): Anti-Corruption Layer. Prüfe raw mit zod und übersetze in StockItem.
//    Zahlen dürfen als String kommen, qty_blocked fehlt manchmal (dann 0). Unbekannte Felder fallen weg.
//    Ungültige Zeilen (keine sku, negativer Bestand) werfen einen Fehler.
// 2. available(item): verfügbarer Bestand, nie kleiner als 0.
// 3. toSalesProduct(product, stock): Sicht des Verkaufs. deliverable ist true, wenn etwas verfügbar ist.
//
// Prüfen: npm test -- ms-bounded-contexts
import { z } from 'zod'

export type StockItem = { productId: string; onHand: number; reserved: number }
export type SalesProduct = { id: string; name: string; priceCents: number; deliverable: boolean }

// TODO: Schema für die fremde Zeile mit z.object, z.coerce.number() und .default(0)
void z

export const fromLegacyStock = (raw: unknown): StockItem => {
  // Fallstrick: das fremde Modell ungeprüft durchreichen
  return raw as StockItem
}

export const available = (item: StockItem): number => {
  throw new Error('TODO: onHand minus reserved, mindestens 0')
}

export const toSalesProduct = (
  product: { id: string; name: string; priceCents: number },
  stock: StockItem | undefined,
): SalesProduct => {
  throw new Error('TODO: Sicht des Verkaufs')
}
