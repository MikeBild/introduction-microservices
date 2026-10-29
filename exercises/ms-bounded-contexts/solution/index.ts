// Lösung ms-bounded-contexts
import { z } from 'zod'

// Im Kontext Lager heißt ein Produkt StockItem: Bestand und Reservierungen, kein Preis.
export type StockItem = { productId: string; onHand: number; reserved: number }

// Fremdes Modell des alten Warenwirtschaftssystems (upstream, nicht von uns gepflegt)
const LegacyStockRow = z.object({
  sku: z.string().min(1),
  qty_on_hand: z.coerce.number().int().min(0),
  qty_blocked: z.coerce.number().int().min(0).default(0),
})

/** Anti-Corruption Layer: übersetzt an genau einer Stelle das fremde Modell in die eigene Sprache. */
export const fromLegacyStock = (raw: unknown): StockItem => {
  const row = LegacyStockRow.parse(raw)
  return { productId: row.sku, onHand: row.qty_on_hand, reserved: row.qty_blocked }
}

export const available = (item: StockItem): number => Math.max(0, item.onHand - item.reserved)

// Im Kontext Verkauf ist ein Produkt sichtbar, auch wenn der Bestand null ist.
export type SalesProduct = { id: string; name: string; priceCents: number; deliverable: boolean }

export const toSalesProduct = (
  product: { id: string; name: string; priceCents: number },
  stock: StockItem | undefined,
): SalesProduct => ({ ...product, deliverable: stock !== undefined && available(stock) > 0 })
