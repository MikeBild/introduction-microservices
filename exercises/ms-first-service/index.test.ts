import { describe, expect, it } from 'vitest'
import { listen } from '@werkstatt/kit'
import { createCatalogApp, openCatalogDb, portFromEnv } from '#ex/ms-first-service'

const seeded = () => {
  const db = openCatalogDb()
  const insert = db.prepare('INSERT INTO products (id, name, price_cents) VALUES (?, ?, ?)')
  insert.run('p-2', 'Akkuschrauber', 8999)
  insert.run('p-1', 'Hammer', 1299)
  return db
}

describe('catalog service', () => {
  it('reports itself healthy', async () => {
    await using api = await listen(createCatalogApp({ db: seeded() }))
    const response = await fetch(`${api.url}/health`)
    expect(await response.json()).toEqual({ status: 'ok', service: 'catalog' })
  })

  it('lists products sorted by id with priceCents', async () => {
    await using api = await listen(createCatalogApp({ db: seeded() }))
    const response = await fetch(`${api.url}/products`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      { id: 'p-1', name: 'Hammer', priceCents: 1299 },
      { id: 'p-2', name: 'Akkuschrauber', priceCents: 8999 },
    ])
  })

  it('returns one product or 404', async () => {
    await using api = await listen(createCatalogApp({ db: seeded() }))
    expect(await (await fetch(`${api.url}/products/p-2`)).json()).toEqual({
      id: 'p-2',
      name: 'Akkuschrauber',
      priceCents: 8999,
    })
    const missing = await fetch(`${api.url}/products/p-9`)
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: 'product not found' })
  })
})

describe('portFromEnv', () => {
  it('reads PORT and falls back to 3001', () => {
    expect(portFromEnv({ PORT: '4000' })).toBe(4000)
    expect(portFromEnv({})).toBe(3001)
  })
  it('rejects invalid ports', () => {
    expect(() => portFromEnv({ PORT: 'abc' })).toThrow()
    expect(() => portFromEnv({ PORT: '70000' })).toThrow()
  })
})
