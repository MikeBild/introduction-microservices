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

  it('lets a clean Context Map pass', () => {
    expect(checkContextMap(clean, ['Order', 'Shipment'])).toEqual([])
  })

  it('reports entities with no owner and with several owners', () => {
    const issues = checkContextMap(
      { contexts: { sales: { owns: ['Order', 'Shipment'] }, shipping: { owns: ['Shipment'] } }, edges: [] },
      ['Order', 'Shipment', 'Address'],
    )
    expect(issues).toHaveLength(2)
    expect(issues).toContainEqual({ rule: 'owner', detail: expect.stringContaining('Shipment') })
    expect(issues).toContainEqual({ rule: 'owner', detail: expect.stringContaining('Address') })
  })

  it('reports a shared database and unknown contexts', () => {
    const edges = [
      { from: 'sales', to: 'shipping', via: 'database' },
      { from: 'sales', to: 'billing', via: 'http' },
    ] as const
    expect(rulesOf({ ...clean, edges }, ['Order', 'Shipment'])).toEqual(['database', 'unknown-context'])
  })

  it('the proposal with entity services fails', () => {
    expect(rulesOf(proposal)).toEqual(['database', 'owner'])
  })
})

describe('your cut', () => {
  it('passes the check for all entities of the workshop shop', () => {
    expect(checkContextMap(contextMap)).toEqual([])
  })

  it('is not one service per entity', () => {
    expect(Object.keys(contextMap.contexts).length).toBeLessThan(entities.length / 2)
  })

  it('keeps together what must hold together immediately', () => {
    expect(ownersOf(contextMap, 'OrderItem')).toEqual(ownersOf(contextMap, 'Order'))
    expect(ownersOf(contextMap, 'Reservation')).toEqual(ownersOf(contextMap, 'StockItem'))
  })

  it('separates what lives in different languages', () => {
    expect(ownersOf(contextMap, 'StockItem')).not.toEqual(ownersOf(contextMap, 'Price'))
    expect(ownersOf(contextMap, 'Shipment')).not.toEqual(ownersOf(contextMap, 'Price'))
  })

  it('justifies each context in an ADR', () => {
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
