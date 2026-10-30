// Lektion ms-data-ownership: Jeder Service besitzt seine Daten allein
// Dauer: etwa 20 Minuten
//
// orders liest nicht in der Datenbank von catalog. Es hält eine eigene, schmale Kopie
// (product_view) und aktualisiert sie aus Events ProductChanged, die catalog veröffentlicht.
// Events können doppelt und in falscher Reihenfolge ankommen – die version entscheidet.
//
// Aufgabe:
// 1. Lege in createProductReplica die Tabelle product_view an (product_id, name, price_cents, version).
// 2. apply(change): Upsert nur, wenn change.version größer ist als die gespeicherte. Rückgabe: ob sich etwas änderte.
//    Tipp: INSERT … ON CONFLICT (product_id) DO UPDATE SET … WHERE excluded.version > product_view.version
// 3. get(productId): ProductView oder undefined.
//
// Prüfen: npm test -- ms-data-ownership
import type { Database } from 'node:sqlite'
import { openDb } from '@werkstatt/kit'

export type ProductChanged = { productId: string; name: string; priceCents: number; version: number }
export type ProductView = { productId: string; name: string; priceCents: number }

export const createProductReplica = (db: Database = openDb(':memory:', '')) => {
  // TODO: Tabelle product_view anlegen
  return {
    apply(change: ProductChanged): boolean {
      throw new Error('TODO: Upsert mit Versionsprüfung')
    },
    get(productId: string): ProductView | undefined {
      throw new Error('TODO: aus product_view lesen')
    },
  }
}
