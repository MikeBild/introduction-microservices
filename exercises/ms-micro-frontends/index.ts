// Lesson ms-micro-frontends: Micro-frontends slice the UI like services
// Duration: about 20 minutes
//
// Each team delivers its piece of the UI as an HTML fragment from its service:
// catalog the product list, orders the cart. A gateway assembles the page.
//
// Task:
// 1. composePage({ template, fragments, timeoutMs }): replace every placeholder <!-- fragment: name -->
//    with the HTML from fragments[name]. Load all fragments in parallel, with AbortSignal.timeout(timeoutMs).
// 2. If a fragment is missing, too slow or does not answer with 2xx, insert a fallback:
//    <div data-fragment="name" data-fallback></div>. The page itself always returns 200.
// 3. createGateway(options): GET / returns the assembled page as text/html.
//
// Check: npm test -- ms-micro-frontends
import express from 'express'

export type GatewayOptions = { template: string; fragments: Record<string, string>; timeoutMs?: number }

export const composePage = async ({ template, fragments, timeoutMs = 300 }: GatewayOptions): Promise<string> => {
  // Pitfall: loading fragments one after another and without a timeout – the slowest team sets the load time
  void [fragments, timeoutMs]
  throw new Error('TODO: Platzhalter durch Fragmente ersetzen')
}

export const createGateway = (options: GatewayOptions) =>
  express().get('/', async (req, res) => {
    res.type('html').send(await composePage(options))
  })
