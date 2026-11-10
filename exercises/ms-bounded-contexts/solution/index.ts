// Reference solution ms-bounded-contexts
import { z } from 'zod'

// In the inventory context a product is a StockItem: stock and reservations, no price.
export type StockItem = { productId: string; onHand: number; reserved: number }

// Foreign model of the old inventory management system (upstream, not maintained by us)
const LegacyStockRow = z.object({
  sku: z.string().min(1),
  qty_on_hand: z.coerce.number().int().min(0),
  qty_blocked: z.coerce.number().int().min(0).default(0),
})

/** Anti-Corruption Layer: translates the foreign model into our own language in exactly one place. */
export const fromLegacyStock = (raw: unknown): StockItem => {
  const row = LegacyStockRow.parse(raw)
  return { productId: row.sku, onHand: row.qty_on_hand, reserved: row.qty_blocked }
}

export const available = (item: StockItem): number => Math.max(0, item.onHand - item.reserved)

// In the sales context a product is visible even when the stock is zero.
export type SalesProduct = { id: string; name: string; priceCents: number; deliverable: boolean }

export const toSalesProduct = (
  product: { id: string; name: string; priceCents: number },
  stock: StockItem | undefined,
): SalesProduct => ({ ...product, deliverable: stock !== undefined && available(stock) > 0 })
