import express from 'express'
import { describe, expect, it } from 'vitest'
import { listen } from '@werkstatt/kit'
import { createGateway } from '#ex/ms-micro-frontends'

const template = `<main><!-- fragment: product-list --><!-- fragment: cart --></main>`

const teams = () =>
  express()
    .get('/catalog/fragment', (req, res) => {
      res.type('html').send('<ul class="products"><li>Hammer</li></ul>')
    })
    .get('/orders/fragment', (req, res) => {
      res.type('html').send('<aside class="cart">2 Artikel</aside>')
    })
    .get('/orders/slow', async (req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      res.type('html').send('<aside>zu spät</aside>')
    })
    .get('/orders/broken', (req, res) => {
      res.status(500).send('boom')
    })

describe('gateway', () => {
  it('setzt die Seite aus den Fragmenten der Teams zusammen', async () => {
    await using services = await listen(teams())
    await using gateway = await listen(
      createGateway({
        template,
        fragments: { 'product-list': `${services.url}/catalog/fragment`, cart: `${services.url}/orders/fragment` },
      }),
    )
    const response = await fetch(gateway.url)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toBe(
      '<main><ul class="products"><li>Hammer</li></ul><aside class="cart">2 Artikel</aside></main>',
    )
  })

  it('zeigt einen Fallback, wenn ein Fragment zu langsam ist', async () => {
    await using services = await listen(teams())
    await using gateway = await listen(
      createGateway({
        template,
        fragments: { 'product-list': `${services.url}/catalog/fragment`, cart: `${services.url}/orders/slow` },
        timeoutMs: 100,
      }),
    )
    const started = Date.now()
    const response = await fetch(gateway.url)
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(Date.now() - started).toBeLessThan(800)
    expect(html).toContain('<li>Hammer</li>')
    expect(html).toContain('<div data-fragment="cart" data-fallback></div>')
  })

  it('zeigt einen Fallback bei Fehlern und unbekannten Fragmenten', async () => {
    await using services = await listen(teams())
    await using gateway = await listen(
      createGateway({ template, fragments: { cart: `${services.url}/orders/broken` } }),
    )
    const html = await (await fetch(gateway.url)).text()
    expect(html).toBe(
      '<main><div data-fragment="product-list" data-fallback></div><div data-fragment="cart" data-fallback></div></main>',
    )
  })
})
