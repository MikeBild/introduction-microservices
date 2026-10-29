import express from 'express'
import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { listen } from '@werkstatt/kit'
import { catalogContract, stubFromContract, verifyProvider, type Contract } from '#ex/ms-contract-testing'

// Zwei Versionen des Providers catalog
const catalogApp = (render: (product: { id: string; name: string; priceCents: number }) => unknown) =>
  express().get('/products/:productId', (req, res) => {
    if (req.params.productId === 'p-1') res.json(render({ id: 'p-1', name: 'Hammer', priceCents: 1299 }))
    else res.status(404).json({ error: 'product not found' })
  })
const currentCatalog = catalogApp((product) => product)
const breakingCatalog = catalogApp(({ priceCents, ...rest }) => ({ ...rest, price: priceCents / 100 }))
const addingCatalog = catalogApp((product) => ({ ...product, color: 'rot' }))

describe('Vertrag orders → catalog', () => {
  it('beschreibt Treffer und unbekanntes Produkt', () => {
    expect(catalogContract.interactions.map((interaction) => interaction.response.status)).toEqual([200, 404])
  })
})

describe('Consumer-Seite: Stub', () => {
  it('spielt den Vertrag für orders', async () => {
    await using stub = await listen(stubFromContract(catalogContract))
    const hit = await fetch(`${stub.url}/products/p-1`)
    expect(hit.status).toBe(200)
    expect(((await hit.json()) as { priceCents: number }).priceCents).toBe(1299)
    expect((await fetch(`${stub.url}/products/p-unknown`)).status).toBe(404)
  })

  it('lehnt Beispiele ab, die nicht zum Schema passen', () => {
    const broken: Contract = {
      consumer: 'orders',
      provider: 'catalog',
      interactions: [
        {
          description: 'falsches Beispiel',
          request: { method: 'GET', path: '/products/p-1' },
          response: { status: 200, schema: z.object({ priceCents: z.number() }), example: { price: 12.99 } },
        },
      ],
    }
    expect(() => stubFromContract(broken)).toThrow()
  })
})

describe('Provider-Seite: Verifikation', () => {
  it('der aktuelle catalog erfüllt den Vertrag', async () => {
    const results = await verifyProvider(currentCatalog, catalogContract)
    expect(results.every((result) => result.ok)).toBe(true)
    expect(results).toHaveLength(2)
  })

  it('ein zusätzliches Feld bricht den Consumer nicht', async () => {
    expect((await verifyProvider(addingCatalog, catalogContract)).every((result) => result.ok)).toBe(true)
  })

  it('ein umbenanntes Feld bricht den Vertrag', async () => {
    const results = await verifyProvider(breakingCatalog, catalogContract)
    expect(results[0]).toMatchObject({ ok: false, problem: expect.stringContaining('priceCents') })
    expect(results[1]?.ok).toBe(true)
  })
})
