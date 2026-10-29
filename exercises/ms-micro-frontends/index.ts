// Lektion ms-micro-frontends: Micro-Frontends schneiden das UI wie die Services
// Dauer: etwa 20 Minuten
//
// Jedes Team liefert sein Stück Oberfläche als HTML-Fragment aus seinem Service:
// catalog die Produktliste, orders den Warenkorb. Ein Gateway setzt die Seite zusammen.
//
// Aufgabe:
// 1. composePage({ template, fragments, timeoutMs }): Ersetze jeden Platzhalter <!-- fragment: name -->
//    durch das HTML von fragments[name]. Lade alle Fragmente parallel, mit AbortSignal.timeout(timeoutMs).
// 2. Fehlt ein Fragment, ist es zu langsam oder antwortet es nicht mit 2xx, setze einen Fallback ein:
//    <div data-fragment="name" data-fallback></div>. Die Seite selbst liefert immer 200.
// 3. createGateway(options): GET / liefert die zusammengesetzte Seite als text/html.
//
// Prüfen: npm test -- ms-micro-frontends
import express from 'express'

export type GatewayOptions = { template: string; fragments: Record<string, string>; timeoutMs?: number }

export const composePage = async ({ template, fragments, timeoutMs = 300 }: GatewayOptions): Promise<string> => {
  // Fallstrick: Fragmente nacheinander und ohne Timeout laden – das langsamste Team bestimmt die Ladezeit
  void [fragments, timeoutMs]
  throw new Error('TODO: Platzhalter durch Fragmente ersetzen')
}

export const createGateway = (options: GatewayOptions) =>
  express().get('/', async (req, res) => {
    res.type('html').send(await composePage(options))
  })
