import express from 'express'
import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { listen } from '@werkstatt/kit'
import { requireServiceToken, signServiceToken } from '#ex/ms-service-auth'

const orders = generateKeyPairSync('ed25519')
const attacker = generateKeyPairSync('ed25519')
const now = () => Date.parse('2026-10-29T09:00:00Z')

const inventoryApp = () =>
  express()
    .use(
      requireServiceToken({
        publicKeys: { 'orders-1': orders.publicKey },
        issuer: 'https://auth.werkstatt.example',
        audience: 'inventory',
        allowedCallers: ['orders'],
        now,
      }),
    )
    .post('/reservations', (req, res) => {
      res.status(201).json({ caller: res.locals.caller })
    })

const token = (overrides: Partial<Parameters<typeof signServiceToken>[0]> = {}) =>
  signServiceToken({
    privateKey: orders.privateKey,
    kid: 'orders-1',
    issuer: 'https://auth.werkstatt.example',
    subject: 'orders',
    audience: 'inventory',
    now,
    ...overrides,
  })

const call = (url: string, bearer?: string) =>
  fetch(`${url}/reservations`, { method: 'POST', headers: bearer ? { authorization: `Bearer ${bearer}` } : {} })

describe('service-to-service auth', () => {
  it('lässt orders mit gültigem Token durch', async () => {
    await using api = await listen(inventoryApp())
    const response = await call(api.url, token())
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ caller: 'orders' })
  })

  it('401 ohne Token, mit fremder Signatur oder abgelaufen', async () => {
    await using api = await listen(inventoryApp())
    expect((await call(api.url)).status).toBe(401)
    expect((await call(api.url, token({ privateKey: attacker.privateKey }))).status).toBe(401)
    expect((await call(api.url, token({ now: () => now() - 120_000 }))).status).toBe(401)
    expect((await call(api.url, token({ kid: 'unknown' }))).status).toBe(401)
    expect((await call(api.url, token({ issuer: 'https://evil.example' }))).status).toBe(401)
  })

  it('401 bei manipuliertem Inhalt', async () => {
    await using api = await listen(inventoryApp())
    const [header, , signature] = token().split('.')
    const forged = Buffer.from(JSON.stringify({ iss: 'https://auth.werkstatt.example', sub: 'orders', aud: 'inventory', exp: 9_999_999_999 })).toString('base64url')
    expect((await call(api.url, `${header}.${forged}.${signature}`)).status).toBe(401)
  })

  it('403, wenn das Token nicht für inventory ist oder der Aufrufer nicht erlaubt', async () => {
    await using api = await listen(inventoryApp())
    expect((await call(api.url, token({ audience: 'payments' }))).status).toBe(403)
    expect((await call(api.url, token({ subject: 'catalog' }))).status).toBe(403)
  })
})
