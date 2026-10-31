import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkContextMap, contextMap, decisionsDir, entities, proposal, type ContextMap } from '#ex/ms-context-cut'

const ownersOf = (map: ContextMap, entity: string) =>
  Object.entries(map.contexts)
    .filter(([, context]) => (context.owns as readonly string[]).includes(entity))
    .map(([name]) => name)

const rulesOf = (map: ContextMap, known?: readonly string[]) =>
  checkContextMap(map, known)
    .map((issue) => issue.rule)
    .sort()

describe('checkContextMap', () => {
  const clean: ContextMap = {
    contexts: { sales: { owns: ['Order'] }, shipping: { owns: ['Shipment'] } },
    edges: [{ from: 'sales', to: 'shipping', via: 'events' }],
  }

  it('lässt eine saubere Context Map durch', () => {
    expect(checkContextMap(clean, ['Order', 'Shipment'])).toEqual([])
  })

  it('meldet Entities ohne und mit mehreren Besitzern', () => {
    const issues = checkContextMap(
      { contexts: { sales: { owns: ['Order', 'Shipment'] }, shipping: { owns: ['Shipment'] } }, edges: [] },
      ['Order', 'Shipment', 'Address'],
    )
    expect(issues).toHaveLength(2)
    expect(issues).toContainEqual({ rule: 'owner', detail: expect.stringContaining('Shipment') })
    expect(issues).toContainEqual({ rule: 'owner', detail: expect.stringContaining('Address') })
  })

  it('meldet eine gemeinsame Datenbank und unbekannte Contexts', () => {
    const edges = [
      { from: 'sales', to: 'shipping', via: 'database' },
      { from: 'sales', to: 'billing', via: 'http' },
    ] as const
    expect(rulesOf({ ...clean, edges }, ['Order', 'Shipment'])).toEqual(['database', 'unknown-context'])
  })

  it('der Vorschlag mit Entity-Services fällt durch', () => {
    expect(rulesOf(proposal)).toEqual(['database', 'owner'])
  })
})

describe('dein Schnitt', () => {
  it('besteht den Check für alle Entities des Werkstatt-Shops', () => {
    expect(checkContextMap(contextMap)).toEqual([])
  })

  it('ist kein Service je Entity', () => {
    expect(Object.keys(contextMap.contexts).length).toBeLessThan(entities.length / 2)
  })

  it('hält zusammen, was sofort gemeinsam gelten muss', () => {
    expect(ownersOf(contextMap, 'OrderItem')).toEqual(ownersOf(contextMap, 'Order'))
    expect(ownersOf(contextMap, 'Reservation')).toEqual(ownersOf(contextMap, 'StockItem'))
  })

  it('trennt, was in verschiedenen Sprachen lebt', () => {
    expect(ownersOf(contextMap, 'StockItem')).not.toEqual(ownersOf(contextMap, 'Price'))
    expect(ownersOf(contextMap, 'Shipment')).not.toEqual(ownersOf(contextMap, 'Price'))
  })

  it('begründet jeden Context in einem ADR', () => {
    for (const name of Object.keys(contextMap.contexts)) {
      const file = join(decisionsDir, `${name}.md`)
      expect(existsSync(file), `decisions/${name}.md fehlt`).toBe(true)
      const adr = readFileSync(file, 'utf8')
      for (const section of ['## Kontext', '## Entscheidung', '## Verworfen']) {
        expect(adr, `decisions/${name}.md ohne Abschnitt „${section}“`).toContain(section)
      }
    }
  })
})
