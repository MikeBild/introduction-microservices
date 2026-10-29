// Lösung ms-data-ownership
import type { DatabaseSync } from 'node:sqlite'
import { openDb } from '@werkstatt/kit'

export type ProductChanged = { productId: string; name: string; priceCents: number; version: number }
export type ProductView = { productId: string; name: string; priceCents: number }

/** orders hält eine eigene Kopie der Produktdaten, die es braucht – gefüllt aus Events von catalog. */
export const createProductReplica = (db: DatabaseSync = openDb(':memory:', '')) => {
  db.exec(`CREATE TABLE IF NOT EXISTS product_view (
    product_id TEXT PRIMARY KEY, name TEXT NOT NULL, price_cents INTEGER NOT NULL, version INTEGER NOT NULL)`)
  const upsert = db.prepare(`
    INSERT INTO product_view (product_id, name, price_cents, version) VALUES (?, ?, ?, ?)
    ON CONFLICT (product_id) DO UPDATE SET name = excluded.name, price_cents = excluded.price_cents, version = excluded.version
    WHERE excluded.version > product_view.version`)
  const select = db.prepare('SELECT product_id, name, price_cents FROM product_view WHERE product_id = ?')

  return {
    /** true, wenn die Änderung neuer war als der Stand der Kopie */
    apply(change: ProductChanged): boolean {
      return upsert.run(change.productId, change.name, change.priceCents, change.version).changes > 0
    },
    get(productId: string): ProductView | undefined {
      const row = select.get(productId) as { product_id: string; name: string; price_cents: number } | undefined
      return row && { productId: row.product_id, name: row.name, priceCents: row.price_cents }
    },
  }
}
