import express from 'express'
import { describe, expect, it } from 'vitest'
import { listen } from '@werkstatt/kit'
import { CatalogUnavailable, UnknownProduct, createCatalogClient, priceOrder } from '#ex/ms-sync-http'

const fakeCatalog = () =>
  express()
    .get('/products/slow', async (req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      res.json({ id: 'slow', name: 'Langsam', priceCents: 1 })
    })
    .get('/products/broken', (req, res) => {
      res.status(503).json({ error: 'down' })
    })
    .get('/products/invalid', (req, res) => {
      res.json({ id: 'invalid', name: 'Ohne Preis' })
    })
    .get('/products/:productId', (req, res) => {
      const prices: Record<string, number> = { 'p-1': 1299, 'p-2': 8999 }
      const price = prices[req.params.productId]
      if (price === undefined) res.status(404).json({ error: 'product not found' })
      else res.json({ id: req.params.productId, name: 'Werkzeug', priceCents: price })
    })

describe('catalog client', () => {
  it('liefert ein Produkt oder undefined bei 404', async () => {
    await using catalog = await listen(fakeCatalog())
    const client = createCatalogClient(catalog.url)
    expect(await client.product('p-1')).toEqual({ id: 'p-1', name: 'Werkzeug', priceCents: 1299 })
    expect(await client.product('p-9')).toBeUndefined()
  })

  it('bricht nach dem Timeout ab', async () => {
    await using catalog = await listen(fakeCatalog())
    const client = createCatalogClient(catalog.url, { timeoutMs: 100 })
    const started = Date.now()
    await expect(client.product('slow')).rejects.toBeInstanceOf(CatalogUnavailable)
    expect(Date.now() - started).toBeLessThan(800)
  })

  it('meldet 5xx und nicht erreichbare Services als CatalogUnavailable', async () => {
    await using catalog = await listen(fakeCatalog())
    await expect(createCatalogClient(catalog.url).product('broken')).rejects.toBeInstanceOf(CatalogUnavailable)
    await expect(createCatalogClient('http://127.0.0.1:9').product('p-1')).rejects.toBeInstanceOf(CatalogUnavailable)
  })

  it('prüft die Antwort gegen den Vertrag', async () => {
    await using catalog = await listen(fakeCatalog())
    await expect(createCatalogClient(catalog.url).product('invalid')).rejects.toThrow()
  })
})

describe('priceOrder', () => {
  it('nimmt Preise aus dem Katalog', async () => {
    await using catalog = await listen(fakeCatalog())
    const items = await priceOrder(
      { customerId: 'c-1', items: [{ productId: 'p-1', quantity: 2 }, { productId: 'p-2', quantity: 1 }] },
      createCatalogClient(catalog.url),
    )
    expect(items).toEqual([
      { productId: 'p-1', quantity: 2, priceCents: 1299 },
      { productId: 'p-2', quantity: 1, priceCents: 8999 },
    ])
  })

  it('lehnt unbekannte Produkte ab', async () => {
    await using catalog = await listen(fakeCatalog())
    await expect(
      priceOrder({ customerId: 'c-1', items: [{ productId: 'p-9', quantity: 1 }] }, createCatalogClient(catalog.url)),
    ).rejects.toBeInstanceOf(UnknownProduct)
  })
})
