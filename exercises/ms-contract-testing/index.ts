// Lektion ms-contract-testing: Contract Tests statt End-to-End-Zoo
// Dauer: etwa 25 Minuten
//
// Consumer-Driven Contracts: orders (Consumer) schreibt auf, was es von catalog (Provider) braucht.
// Derselbe Vertrag treibt zwei Tests: orders testet gegen einen Stub, catalog prüft seine echte App.
// So merkt catalog vor dem Deployment, wenn es orders bricht – ohne dass alle Services laufen.
//
// Aufgabe:
// 1. Ergänze catalogContract um die Interaktion „unbekanntes Produkt“: GET /products/p-unknown → 404.
// 2. stubFromContract(contract): Express-App, die für jede Interaktion mit status und example antwortet.
//    Prüfe vorher jedes example gegen sein schema – ein falsches Beispiel ist ein Fehler im Vertrag.
// 3. verifyProvider(app, contract): Starte die App (listen aus @werkstatt/kit), spiele jede Interaktion ab
//    und liefere je Interaktion { description, ok, problem? }. Status muss passen, Body zum schema.
//
// Prüfen: npm test -- ms-contract-testing
import express, { type Express } from 'express'
import { z } from 'zod'
import { listen } from '@werkstatt/kit'

export type Interaction = {
  description: string
  request: { method: 'GET' | 'POST'; path: string; body?: unknown }
  response: { status: number; schema?: z.ZodType; example?: unknown }
}
export type Contract = { consumer: string; provider: string; interactions: Interaction[] }

// Der Consumer beschreibt nur, was er wirklich nutzt: id und priceCents, nicht name.
const PriceView = z.object({ id: z.string(), priceCents: z.number().int().min(0) })

export const catalogContract: Contract = {
  consumer: 'orders',
  provider: 'catalog',
  interactions: [
    {
      description: 'liefert Preis eines bekannten Produkts',
      request: { method: 'GET', path: '/products/p-1' },
      response: { status: 200, schema: PriceView, example: { id: 'p-1', name: 'Hammer', priceCents: 1299 } },
    },
    // TODO: unbekanntes Produkt → 404
  ],
}

export const stubFromContract = (contract: Contract): Express => {
  void express
  throw new Error('TODO: Stub aus dem Vertrag')
}

export type Verification = { description: string; ok: boolean; problem?: string }

export const verifyProvider = async (app: Express, contract: Contract): Promise<Verification[]> => {
  void listen
  throw new Error('TODO: Interaktionen gegen den Provider abspielen')
}
