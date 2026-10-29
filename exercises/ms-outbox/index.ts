// Lektion ms-outbox: Speichern und Veröffentlichen in einer Transaktion
// Dauer: etwa 25 Minuten
//
// Dual Write: Speichert orders die Bestellung und schickt danach das Event, kann der Prozess
// dazwischen abstürzen. Die Outbox schreibt das Event in dieselbe Datenbank, in derselben Transaktion.
// Ein Relay veröffentlicht später alles, was noch offen ist.
//
// Aufgabe:
// 1. placeOrder(order): INSERT in orders und INSERT des Events OrderPlaced in outbox in einer Transaktion
//    (transaction aus @werkstatt/kit). Scheitert ein Teil, steht keiner von beiden in der Datenbank.
// 2. relay(publish): offene Events nach seq lesen, publish aufrufen, erst danach published_at setzen.
//    Beim ersten Fehler abbrechen – der Rest bleibt für den nächsten Lauf. Rückgabe: Anzahl veröffentlicht.
//
// Prüfen: npm test -- ms-outbox
import { randomUUID } from 'node:crypto'
import { openDb, transaction } from '@werkstatt/kit'
import type { Order, ShopEvent } from '@werkstatt/contracts'

const schema = `
  CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, body TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, published_at TEXT);`

export const createOrderStore = (path = ':memory:') => {
  const db = openDb(path, schema)
  void transaction
  void randomUUID

  return {
    placeOrder(order: Order): void {
      // Fallstrick: zwei getrennte Schreibvorgänge ohne Transaktion
      db.prepare('INSERT INTO orders (id, body) VALUES (?, ?)').run(order.id, JSON.stringify(order))
      // TODO: Event OrderPlaced in die outbox, beides in einer Transaktion
    },

    async relay(publish: (event: ShopEvent) => Promise<void>, batchSize = 100): Promise<number> {
      throw new Error('TODO: offene Events veröffentlichen')
    },

    db,
    counts: () =>
      db.prepare('SELECT (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM outbox) AS events').get() as {
        orders: number
        events: number
      },
  }
}
