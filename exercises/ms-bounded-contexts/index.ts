// Lesson ms-bounded-contexts: Cut at language boundaries, not tables
// Duration: about 20 minutes
//
// “Product” means something different in sales than in inventory. Each context gets its own model.
// The old inventory management system delivers rows like { sku: 'p-1', qty_on_hand: '12', qty_blocked: '2', bin: 'A3' }.
//
// Task:
// 1. fromLegacyStock(raw): Anti-Corruption Layer. Validate raw with zod and translate it into a StockItem.
//    Numbers may arrive as strings, qty_blocked is sometimes missing (then 0). Unknown fields are dropped.
//    Invalid rows (no sku, negative stock) throw an error.
// 2. available(item): available stock, never less than 0.
// 3. toSalesProduct(product, stock): the sales view. deliverable is true when something is available.
//
// Check: npm test -- ms-bounded-contexts
import { z } from 'zod'

export type StockItem = { productId: string; onHand: number; reserved: number }
export type SalesProduct = { id: string; name: string; priceCents: number; deliverable: boolean }

// TODO: schema for the foreign row with z.object, z.coerce.number() and .default(0)
void z

export const fromLegacyStock = (raw: unknown): StockItem => {
  // Pitfall: passing the foreign model through unchecked
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
