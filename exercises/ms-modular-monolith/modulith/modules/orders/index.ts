// Modul orders
// Fallstrick: Der Import greift in die Interna von catalog – die Grenze existiert nur im Kopf.
import { priceOf } from '../catalog/internal/prices.ts'
import { total } from './internal/total.ts'

export const priceItems = (items: ReadonlyArray<{ productId: string; quantity: number }>) => {
  const priced = items.map((item) => ({ ...item, priceCents: priceOf(item.productId) ?? 0 }))
  return { items: priced, totalCents: total(priced) }
}
