# Übungen: Microservices

Übungs-Repo zum Workshop „Microservices mit Node.js, Express 5 und Docker Compose“. Zu jeder Lektion gibt es eine kurze Übung mit Startpunkt, Tests und Lösung.
Daneben liegt der Werkstatt-Shop als laufendes System aus drei Services, das du mit Docker Compose startest.

## Was du lernst

- Services an Fachgrenzen schneiden, mit eigenen Daten und eigenem Vertrag
- Services über HTTP und Events verbinden: Outbox, Inbox und Sagas
- Robust betreiben und testen: Timeouts, Retries, Trace-IDs, Contract Tests

## Voraussetzungen

- **Node.js 26** – `nvm use` liest die Version aus [`.nvmrc`](.nvmrc).
- **Docker** mit Compose für das Gesamtsystem.

## Einrichten

```bash
git clone https://github.com/MikeBild/introduction-microservices.git
cd introduction-microservices
nvm use
npm ci
npm run check    # Typecheck, Tests gegen die Lösungen, Systemtest der drei Services
```

Die CI führt dasselbe aus und prüft zusätzlich `compose.yaml` mit `docker compose config`.

## So arbeitest du mit einer Übung

1. Öffne `exercises/<lektion>/index.ts`. Oben steht die Aufgabe, darunter der Startpunkt mit `TODO`s.
2. Starte die Tests für diese Lektion:
   ```bash
   npm test -- ms-sync-http             # einmal
   npm run test:watch -- ms-sync-http   # bei jeder Änderung neu
   ```
   Am Anfang sind die Tests rot. Du bist fertig, wenn sie grün sind.
3. Hängst du fest, schau in `exercises/<lektion>/solution/`. Dieselben Tests laufen auch gegen die Lösung:
   ```bash
   npm run test:solution -- ms-sync-http
   ```

Wie die Umschaltung funktioniert: Die Tests importieren `#ex/<lektion>`. Die `imports` in der
[`package.json`](package.json) zeigen damit auf `index.ts`, mit der Condition `solution` auf die Lösung.
`npm run typecheck` prüft Lösungen, Services und Tests, `npm run typecheck:start` deinen Startpunkt.

## Übungen

Die Reihenfolge folgt dem Workshop, die Übungen werden von oben nach unten schwerer.

| # | Tag | ID | Thema | Ordner | Dauer |
|---|---|---|---|---|---|
| 1 | Tag 1 | `ms-why` | Microservices lösen Teamprobleme, keine Codeprobleme | [exercises/ms-why](exercises/ms-why/) | 15 Min |
| 2 | Tag 1 | `ms-bounded-contexts` | Schneide an Sprachgrenzen, nicht an Tabellen | [exercises/ms-bounded-contexts](exercises/ms-bounded-contexts/) | 20 Min |
| 3 | Tag 1 | `ms-modular-monolith` | Erst Module mit klaren Grenzen, dann Services | [exercises/ms-modular-monolith](exercises/ms-modular-monolith/) | 20 Min |
| 4 | Tag 1 | `ms-first-service` | Ein Service, ein Prozess, eine Aufgabe | [exercises/ms-first-service](exercises/ms-first-service/) | 20 Min |
| 5 | Tag 1 | `ms-api-contracts` | Der Vertrag gehört dem Service, der ihn anbietet | [exercises/ms-api-contracts](exercises/ms-api-contracts/) | 20 Min |
| 6 | Tag 1 | `ms-sync-http` | Ein synchroner Aufruf koppelt die Verfügbarkeit | [exercises/ms-sync-http](exercises/ms-sync-http/) | 20 Min |
| 7 | Tag 1 | `ms-docker-compose` | Das ganze System mit einem Befehl starten | [exercises/ms-docker-compose](exercises/ms-docker-compose/) | 25 Min |
| 8 | Tag 2 | `ms-data-ownership` | Jeder Service besitzt seine Daten allein | [exercises/ms-data-ownership](exercises/ms-data-ownership/) | 20 Min |
| 9 | Tag 2 | `ms-async-events` | Events entkoppeln Zeit und Verfügbarkeit | [exercises/ms-async-events](exercises/ms-async-events/) | 25 Min |
| 10 | Tag 2 | `ms-outbox` | Speichern und Veröffentlichen in einer Transaktion | [exercises/ms-outbox](exercises/ms-outbox/) | 25 Min |
| 11 | Tag 2 | `ms-sagas` | Sagas ersetzen verteilte Transaktionen | [exercises/ms-sagas](exercises/ms-sagas/) | 25 Min |
| 12 | Tag 2 | `ms-resilience` | Timeouts, Retries und Idempotenz gehören zusammen | [exercises/ms-resilience](exercises/ms-resilience/) | 25 Min |
| 13 | Tag 2 | `ms-observability` | Ein Request, eine Trace-ID durch alle Services | [exercises/ms-observability](exercises/ms-observability/) | 20 Min |
| 14 | Tag 2 | `ms-contract-testing` | Contract Tests statt End-to-End-Zoo | [exercises/ms-contract-testing](exercises/ms-contract-testing/) | 25 Min |

### Zusatzkapitel

Die Zusatzkapitel kannst du nach dem Workshop machen.

| # | ID | Thema | Ordner | Dauer |
|---|---|---|---|---|
| 15 | `ms-kubernetes` | Was ändert sich von Compose zu Kubernetes? | [exercises/ms-kubernetes](exercises/ms-kubernetes/) | 20 Min |
| 16 | `ms-micro-frontends` | Micro-Frontends schneiden das UI wie die Services | [exercises/ms-micro-frontends](exercises/ms-micro-frontends/) | 20 Min |
| 17 | `ms-service-auth` | Services prüfen, wer sie aufruft | [exercises/ms-service-auth](exercises/ms-service-auth/) | 25 Min |

Event Sourcing steht im Workshop als Zusatzkapitel aus dem Architektur-Bestand. Die Übung dazu liegt in
[introduction-nodejs](https://github.com/MikeBild/introduction-nodejs/tree/HEAD/EXAMPLES/ARCHITECTURE/event-sourcing).

## Der Werkstatt-Shop

Dieselbe kleine Domäne zieht sich durch alle Workshops. Hier ist sie auf drei Services verteilt:

| Service | Aufgabe | Port | Daten |
|---|---|---|---|
| `catalog` | Produkte und Preise | 3001 | eigene SQLite-Datei |
| `orders` | Bestellungen und die Saga der Bestellung | 3002 | eigene SQLite-Datei mit Outbox und Inbox |
| `inventory` | Bestand und Reservierungen | 3003 | eigene SQLite-Datei mit Outbox und Inbox |

- `orders` fragt beim Bestellen `catalog` synchron per HTTP nach den Preisen, mit Timeout.
- Danach laufen Events: `OrderPlaced` → `inventory` reserviert → `StockReserved` oder `StockRejected` → bei Ablehnung storniert `orders` und meldet `OrderCancelled`.
- Events gehen über eine Outbox per HTTP an `POST /inbox` des Empfängers. Die Inbox verarbeitet jedes Event genau einmal.
- Geld steht immer in ganzen Cent (`priceCents`).

Die Verträge (zod-Schemas für APIs und Events) liegen in [`packages/contracts`](packages/contracts/src/index.ts),
kleine Helfer für Tests und Services in [`packages/kit`](packages/kit/src/index.ts).

Das System starten und eine Bestellung aufgeben:

```bash
npm run up       # docker compose up --build --wait
curl -X POST localhost:3002/orders -H 'content-type: application/json' \
  -d '{"customerId":"c-1","items":[{"productId":"p-2","quantity":1}]}'
curl localhost:3003/stock/p-2
npm run down     # stoppt alles und löscht die Volumes
```

Ohne Docker startest du einen Service direkt, zum Beispiel `npm run dev -w services/catalog`.
Node.js 26 führt TypeScript ohne Build-Schritt aus.

## Pakete

Jedes Paket muss seinen Platz verdienen. Mehr brauchst du nicht:

| Paket | Wofür |
|---|---|
| `express` 5 | HTTP-Services mit Routen, Middleware und Fehlerbehandlung |
| `zod` 4 | Verträge prüfen und daraus JSON Schema für OpenAPI 3.1 erzeugen (`z.toJSONSchema`) |
| `vitest` | Tests gegen Startpunkt, Lösung und das Gesamtsystem |
| `typescript`, `@types/node`, `@types/express` | Typprüfung |

Bewusst ohne Zusatzpaket: SQLite (`node:sqlite`), HTTP-Client (`fetch`), Tokens (`node:crypto` mit Ed25519),
Trace Context (`AsyncLocalStorage`) und Messaging (Outbox per HTTP statt Broker). Im Produktivbetrieb ergänzt du dort,
wo es trägt, zum Beispiel OpenTelemetry, einen Message Broker oder Pact.

## Workshop und Folien

- Workshop: [„Microservices mit Node.js, Express 5 und Docker Compose“](https://workshops.mikebild.dev/w/microservices/remote/)
- Folien: [slides.mikebild.dev/introduction-microservices](https://slides.mikebild.dev/introduction-microservices.html)
