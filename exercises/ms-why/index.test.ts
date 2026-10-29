import { describe, expect, it } from 'vitest'
import { changeCoupling, keepTogether, type Commit } from '#ex/ms-why'

// Ein Ausschnitt aus der Historie des Werkstatt-Shop-Monolithen
const history: Commit[] = [
  { id: 'c1', modules: ['orders', 'pricing'] },
  { id: 'c2', modules: ['orders', 'pricing', 'orders'] },
  { id: 'c3', modules: ['catalog'] },
  { id: 'c4', modules: ['orders', 'pricing'] },
  { id: 'c5', modules: ['inventory', 'orders'] },
  { id: 'c6', modules: ['catalog', 'inventory'] },
  { id: 'c7', modules: ['inventory'] },
  { id: 'c8', modules: ['catalog'] },
]

describe('changeCoupling', () => {
  it('zählt gemeinsame Änderungen je Paar und sortiert nach ratio', () => {
    const couplings = changeCoupling(history)
    expect(couplings[0]).toEqual({ a: 'orders', b: 'pricing', together: 3, ratio: 1 })
    expect(couplings).toContainEqual({ a: 'inventory', b: 'orders', together: 1, ratio: 1 / 3 })
    expect(couplings).toContainEqual({ a: 'catalog', b: 'inventory', together: 1, ratio: 1 / 3 })
    expect(couplings).toHaveLength(3)
  })

  it('liefert für eine leere Historie nichts', () => {
    expect(changeCoupling([])).toEqual([])
  })
})

describe('keepTogether', () => {
  it('nennt Paare, die zusammen in einen Service gehören', () => {
    expect(keepTogether(history)).toEqual([['orders', 'pricing']])
    expect(keepTogether(history, 0.3)).toHaveLength(3)
  })
})
