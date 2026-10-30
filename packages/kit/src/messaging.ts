// Outbox, Inbox und Relay für die Services – die Muster aus den Lektionen ms-outbox und ms-async-events.
import { randomUUID } from 'node:crypto'
import type { Database } from 'node:sqlite'
import type { ShopEvent } from '@werkstatt/contracts'

export const messagingSchema = `
  CREATE TABLE IF NOT EXISTS outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, published_at TEXT);
  CREATE TABLE IF NOT EXISTS inbox (event_id TEXT PRIMARY KEY, received_at TEXT NOT NULL);`

type Data<T extends ShopEvent['type']> = Extract<ShopEvent, { type: T }>['data']

/** Legt ein Event in die Outbox. Aufrufen innerhalb der Transaktion, die auch den Zustand ändert. */
export const enqueue = <T extends ShopEvent['type']>(db: Database, type: T, data: Data<T>) => {
  const event = { id: randomUUID(), type, occurredAt: new Date().toISOString(), data }
  db.prepare('INSERT INTO outbox (event) VALUES (?)').run(JSON.stringify(event))
}

/** true, wenn die Event-ID neu ist. Aufrufen innerhalb der Transaktion, die die Wirkung schreibt. */
export const firstDelivery = (db: Database, eventId: string) =>
  db.prepare('INSERT INTO inbox (event_id, received_at) VALUES (?, ?) ON CONFLICT DO NOTHING').run(eventId, new Date().toISOString())
    .changes > 0

/** Veröffentlicht offene Events an alle Subscriber (POST /inbox), in Reihenfolge, at least once. */
export const relayOnce = async (db: Database, subscribers: readonly string[], timeoutMs = 1000) => {
  const rows = db.prepare('SELECT seq, event FROM outbox WHERE published_at IS NULL ORDER BY seq LIMIT 100').all() as Array<{
    seq: number
    event: string
  }>
  let published = 0
  for (const row of rows) {
    try {
      for (const url of subscribers) {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: row.event,
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (!response.ok) throw new Error(`${url} answered ${response.status}`)
      }
    } catch {
      break
    }
    db.prepare('UPDATE outbox SET published_at = ? WHERE seq = ?').run(new Date().toISOString(), row.seq)
    published++
  }
  return published
}

/** Startet das Relay als Intervall. Rückgabe: stop() */
export const startRelay = (db: Database, subscribers: readonly string[], everyMs = 200) => {
  let running = false
  const timer = setInterval(async () => {
    if (running) return
    running = true
    try {
      await relayOnce(db, subscribers)
    } finally {
      running = false
    }
  }, everyMs)
  return () => clearInterval(timer)
}
