import express from 'express'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { healthRouter, serve, type State } from '#ex/ms-docker-compose'

const composeFile = new URL(process.env.TARGET === 'solution' ? './solution/compose.yaml' : './compose.yaml', import.meta.url)

const app = (checks: Parameters<typeof healthRouter>[0], state: State) =>
  express()
    .use(healthRouter(checks, state))
    .get('/slow', async (req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 150))
      res.json({ done: true })
    })

describe('health checks', () => {
  it('live ist immer 200, ready hängt an den Checks', async () => {
    let dbUp = false
    const state = { draining: false }
    const { url, shutdown } = await serve(app({ db: () => dbUp, cache: () => true }, state), state, { drainMs: 0 })
    expect((await fetch(`${url}/health/live`)).status).toBe(200)
    expect((await fetch(`${url}/health/ready`)).status).toBe(503)
    dbUp = true
    expect((await fetch(`${url}/health/ready`)).status).toBe(200)
    await shutdown()
  })

  it('ein Check, der wirft, macht den Service nicht ready', async () => {
    const state = { draining: false }
    const failing = async () => {
      throw new Error('db down')
    }
    const { url, shutdown } = await serve(app({ db: failing }, state), state, { drainMs: 0 })
    expect((await fetch(`${url}/health/ready`)).status).toBe(503)
    await shutdown()
  })
})

describe('graceful shutdown', () => {
  it('meldet sich beim Shutdown nicht mehr ready und beendet laufende Requests', async () => {
    const state = { draining: false }
    const { url, shutdown } = await serve(app({}, state), state, { drainMs: 100 })
    const inFlight = fetch(`${url}/slow`)
    await new Promise((resolve) => setTimeout(resolve, 20))
    const stopped = shutdown()
    expect((await fetch(`${url}/health/ready`)).status).toBe(503)
    expect((await inFlight).status).toBe(200)
    await stopped
  })
})

describe('compose.yaml', () => {
  const compose = readFileSync(composeFile, 'utf8').replace(/#.*$/gm, '')
  it('hat für jeden Service einen Health Check auf /health/ready', () => {
    for (const port of [3001, 3002, 3003]) expect(compose).toContain(`localhost:${port}/health/ready`)
  })
  it('startet orders erst, wenn catalog und inventory healthy sind', () => {
    expect(compose.match(/condition:\s*service_healthy/g)).toHaveLength(2)
  })
  it('nutzt die Compose Specification ohne version', () => {
    expect(compose).not.toMatch(/^version:/m)
  })
})
