import { describe, expect, it } from 'vitest'
import { createProductReplica } from '#ex/ms-data-ownership'

describe('product replica in orders', () => {
  it('takes over new product data', () => {
    const replica = createProductReplica()
    expect(replica.apply({ productId: 'p-1', name: 'Hammer', priceCents: 1299, version: 1 })).toBe(true)
    expect(replica.get('p-1')).toEqual({ productId: 'p-1', name: 'Hammer', priceCents: 1299 })
    expect(replica.get('p-9')).toBeUndefined()
  })

  it('updates on a higher version', () => {
    const replica = createProductReplica()
    replica.apply({ productId: 'p-1', name: 'Hammer', priceCents: 1299, version: 1 })
    expect(replica.apply({ productId: 'p-1', name: 'Hammer', priceCents: 1499, version: 2 })).toBe(true)
    expect(replica.get('p-1')?.priceCents).toBe(1499)
  })

  it('ignores duplicate and outdated events', () => {
    const replica = createProductReplica()
    replica.apply({ productId: 'p-1', name: 'Hammer', priceCents: 1499, version: 2 })
    expect(replica.apply({ productId: 'p-1', name: 'Hammer', priceCents: 1499, version: 2 })).toBe(false)
    expect(replica.apply({ productId: 'p-1', name: 'Hammer', priceCents: 1299, version: 1 })).toBe(false)
    expect(replica.get('p-1')?.priceCents).toBe(1499)
  })
})
