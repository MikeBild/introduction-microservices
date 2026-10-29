import { describe, expect, it } from 'vitest'
import { available, fromLegacyStock, toSalesProduct } from '#ex/ms-bounded-contexts'

describe('fromLegacyStock (Anti-Corruption Layer)', () => {
  it('übersetzt die fremde Zeile in die Sprache des Lagers', () => {
    expect(fromLegacyStock({ sku: 'p-1', qty_on_hand: '12', qty_blocked: '2', bin: 'A3' })).toEqual({
      productId: 'p-1',
      onHand: 12,
      reserved: 2,
    })
  })
  it('setzt fehlende Sperrmenge auf 0', () => {
    expect(fromLegacyStock({ sku: 'p-2', qty_on_hand: 5 })).toEqual({ productId: 'p-2', onHand: 5, reserved: 0 })
  })
  it('lässt ungültige Zeilen nicht ins eigene Modell', () => {
    expect(() => fromLegacyStock({ qty_on_hand: 3 })).toThrow()
    expect(() => fromLegacyStock({ sku: 'p-3', qty_on_hand: -1 })).toThrow()
  })
})

describe('available', () => {
  it('zieht Reservierungen ab und bleibt bei 0', () => {
    expect(available({ productId: 'p-1', onHand: 12, reserved: 2 })).toBe(10)
    expect(available({ productId: 'p-1', onHand: 1, reserved: 3 })).toBe(0)
  })
})

describe('toSalesProduct', () => {
  const hammer = { id: 'p-1', name: 'Hammer', priceCents: 1299 }
  it('zeigt Produkte auch ohne Bestand, aber nicht lieferbar', () => {
    expect(toSalesProduct(hammer, { productId: 'p-1', onHand: 0, reserved: 0 })).toEqual({ ...hammer, deliverable: false })
    expect(toSalesProduct(hammer, undefined).deliverable).toBe(false)
    expect(toSalesProduct(hammer, { productId: 'p-1', onHand: 4, reserved: 1 }).deliverable).toBe(true)
  })
})
