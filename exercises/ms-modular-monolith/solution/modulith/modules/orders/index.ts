// Module orders: uses catalog only via its index.ts
import { priceOf } from '../catalog/index.ts'
import { total } from './internal/total.ts'

export const priceItems = (items: ReadonlyArray<{ productId: string; quantity: number }>) => {
  const priced = items.map((item) => ({ ...item, priceCents: priceOf(item.productId) ?? 0 }))
  return { items: priced, totalCents: total(priced) }
}
