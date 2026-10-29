// Lösung ms-micro-frontends
import express from 'express'

export type GatewayOptions = { template: string; fragments: Record<string, string>; timeoutMs?: number }

const placeholder = /<!--\s*fragment:\s*([a-z0-9-]+)\s*-->/g

const fetchFragment = async (url: string, timeoutMs: number): Promise<string | undefined> => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    return response.ok ? await response.text() : undefined
  } catch {
    return undefined
  }
}

/** Serverseitige Komposition: Fragmente parallel laden, ein langsames Team blockiert nicht die Seite. */
export const composePage = async ({ template, fragments, timeoutMs = 300 }: GatewayOptions) => {
  const names = [...new Set([...template.matchAll(placeholder)].map((match) => match[1] ?? ''))]
  const loaded = new Map(
    await Promise.all(
      names.map(async (name) => {
        const url = fragments[name]
        const html = url ? await fetchFragment(url, timeoutMs) : undefined
        return [name, html ?? `<div data-fragment="${name}" data-fallback></div>`] as const
      }),
    ),
  )
  return template.replace(placeholder, (match, name: string) => loaded.get(name) ?? match)
}

export const createGateway = (options: GatewayOptions) =>
  express().get('/', async (req, res) => {
    res.type('html').send(await composePage(options))
  })
