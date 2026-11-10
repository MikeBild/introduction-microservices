// Module orders
// Pitfall: the import reaches into the internals of catalog – the boundary exists only in your head.
import { priceOf } from '../catalog/internal/prices.ts'
import { total } from './internal/total.ts'

export const priceItems = (items: ReadonlyArray<{ productId: string; quantity: number }>) => {
  const priced = items.map((item) => ({ ...item, priceCents: priceOf(item.productId) ?? 0 }))
  return { items: priced, totalCents: total(priced) }
}
