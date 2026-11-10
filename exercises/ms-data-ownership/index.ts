// Lesson ms-data-ownership: Each service owns its data alone
// Duration: about 20 minutes
//
// orders does not read from the database of catalog. It keeps its own narrow copy
// (product_view) and updates it from ProductChanged events that catalog publishes.
// Events can arrive twice and in the wrong order – the version decides.
//
// Task:
// 1. In createProductReplica, create the table product_view (product_id, name, price_cents, version).
// 2. apply(change): upsert only if change.version is greater than the stored one. Returns whether anything changed.
//    Tip: INSERT … ON CONFLICT (product_id) DO UPDATE SET … WHERE excluded.version > product_view.version
// 3. get(productId): ProductView or undefined.
//
// Check: npm test -- ms-data-ownership
import type { Database } from 'node:sqlite'
import { openDb } from '@werkstatt/kit'

export type ProductChanged = { productId: string; name: string; priceCents: number; version: number }
export type ProductView = { productId: string; name: string; priceCents: number }

export const createProductReplica = (db: Database = openDb(':memory:', '')) => {
  // TODO: create the table product_view
  return {
    apply(change: ProductChanged): boolean {
      throw new Error('TODO: Upsert mit Versionsprüfung')
    },
    get(productId: string): ProductView | undefined {
      throw new Error('TODO: aus product_view lesen')
    },
  }
}
