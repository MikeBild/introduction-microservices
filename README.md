*English · [Deutsch](README.de.md)*

# Exercises: Microservices

Exercise repository for the workshop “Microservices with Node.js, Express 5, and Docker Compose”. For each lesson there is a short exercise with a starting point, tests and a reference solution.
Next to it sits the workshop shop as a running system of three services that you start with Docker Compose.

## What you learn

- Cut services along domain boundaries, each with its own data and its own contract
- Connect services via HTTP and events: outbox, inbox and sagas
- Run and test them robustly: timeouts, retries, trace IDs, contract tests

## Prerequisites

- **Node.js 26** – `nvm use` reads the version from [`.nvmrc`](.nvmrc).
- **Docker** with Compose for the whole system.

## Setup

```bash
git clone https://github.com/MikeBild/introduction-microservices.git
cd introduction-microservices
nvm use
npm ci
npm run check    # typecheck, tests against the reference solutions, system test of the three services
```

The CI runs the same and also checks `compose.yaml` with `docker compose config`.

## How to work on an exercise

1. Open `exercises/<lesson>/index.ts`. The task is at the top, below it the starting point with `TODO`s.
2. Run the tests for this lesson:
   ```bash
   npm test -- ms-sync-http             # once
   npm run test:watch -- ms-sync-http   # again on every change
   ```
   At first the tests are red. You are done when they are green.
3. If you get stuck, look into `exercises/<lesson>/solution/`. The same tests also run against the reference solution:
   ```bash
   npm run test:solution -- ms-sync-http
   ```

How the switch works: the tests import `#ex/<lesson>`. The `imports` in
[`package.json`](package.json) point this to `index.ts`, and with the condition `solution` to the reference solution.
`npm run typecheck` checks the reference solutions, services and tests, `npm run typecheck:start` checks your starting point.

## Exercises

The order follows the workshop. The exercises get harder from top to bottom.

| # | Day | ID | Topic | Folder | Duration |
|---|---|---|---|---|---|
| 1 | Day 1 | `ms-why` | Microservices solve team problems, not code problems | [exercises/ms-why](exercises/ms-why/) | 15 min |
| 2 | Day 1 | `ms-bounded-contexts` | Cut at language boundaries, not tables | [exercises/ms-bounded-contexts](exercises/ms-bounded-contexts/) | 20 min |
| 3 | Day 1 | `ms-modular-monolith` | Modules with clear boundaries before services | [exercises/ms-modular-monolith](exercises/ms-modular-monolith/) | 20 min |
| 4 | Day 1 | `ms-first-service` | One service, one process, one task | [exercises/ms-first-service](exercises/ms-first-service/) | 20 min |
| 5 | Day 1 | `ms-api-contracts` | The contract belongs to the service that offers it | [exercises/ms-api-contracts](exercises/ms-api-contracts/) | 20 min |
| 6 | Day 1 | `ms-sync-http` | A synchronous call couples availability | [exercises/ms-sync-http](exercises/ms-sync-http/) | 20 min |
| 7 | Day 1 | `ms-docker-compose` | Start the whole system with one command | [exercises/ms-docker-compose](exercises/ms-docker-compose/) | 25 min |
| 8 | Day 2 | `ms-data-ownership` | Each service owns its data alone | [exercises/ms-data-ownership](exercises/ms-data-ownership/) | 20 min |
| 9 | Day 2 | `ms-async-events` | Events decouple time and availability | [exercises/ms-async-events](exercises/ms-async-events/) | 25 min |
| 10 | Day 2 | `ms-outbox` | Save and publish in one transaction | [exercises/ms-outbox](exercises/ms-outbox/) | 25 min |
| 11 | Day 2 | `ms-sagas` | Sagas replace distributed transactions | [exercises/ms-sagas](exercises/ms-sagas/) | 25 min |
| 12 | Day 2 | `ms-resilience` | Timeouts, retries, and idempotency belong together | [exercises/ms-resilience](exercises/ms-resilience/) | 25 min |
| 13 | Day 2 | `ms-observability` | One request, one trace ID across all services | [exercises/ms-observability](exercises/ms-observability/) | 20 min |
| 14 | Day 2 | `ms-contract-testing` | Contract tests instead of an end-to-end zoo | [exercises/ms-contract-testing](exercises/ms-contract-testing/) | 25 min |

### Extra chapters

You can do the extra chapters after the workshop.

| # | ID | Topic | Folder | Duration |
|---|---|---|---|---|
| 15 | `ms-kubernetes` | What changes from Compose to Kubernetes? | [exercises/ms-kubernetes](exercises/ms-kubernetes/) | 20 min |
| 16 | `ms-micro-frontends` | Micro-frontends slice the UI like services | [exercises/ms-micro-frontends](exercises/ms-micro-frontends/) | 20 min |
| 17 | `ms-service-auth` | Services check who calls them | [exercises/ms-service-auth](exercises/ms-service-auth/) | 25 min |
| 18 | `ms-context-cut` | One service per Bounded Context, not per entity | [exercises/ms-context-cut](exercises/ms-context-cut/) | 25 min |
| 19 | `ms-rest-ddd` | A REST API speaks its Bounded Context language | [exercises/ms-rest-ddd](exercises/ms-rest-ddd/) | 25 min |

Event Sourcing is an extra chapter of the workshop, taken from the existing architecture material. Its exercise lives in
[introduction-nodejs](https://github.com/MikeBild/introduction-nodejs/tree/HEAD/EXAMPLES/ARCHITECTURE/event-sourcing).

## The workshop shop

The same small domain runs through all workshops. Here it is split across three services:

| Service | Task | Port | Data |
|---|---|---|---|
| `catalog` | Products and prices | 3001 | Own SQLite file |
| `orders` | Orders and the saga of the order | 3002 | Own SQLite file with outbox and inbox |
| `inventory` | Stock and reservations | 3003 | Own SQLite file with outbox and inbox |

- When an order is placed, `orders` asks `catalog` for the prices synchronously via HTTP, with a timeout.
- After that, events take over: `OrderPlaced` → `inventory` reserves → `StockReserved` or `StockRejected` → on rejection `orders` cancels and reports `OrderCancelled`.
- Events travel through an outbox via HTTP to the `POST /inbox` of the receiver. The inbox processes each event exactly once.
- Money is always in whole cents (`priceCents`).

The contracts (zod schemas for APIs and events) live in [`packages/contracts`](packages/contracts/src/index.ts),
small helpers for tests and services in [`packages/kit`](packages/kit/src/index.ts).

Start the system and place an order:

```bash
npm run up       # docker compose up --build --wait
curl -X POST localhost:3002/orders -H 'content-type: application/json' \
  -d '{"customerId":"c-1","items":[{"productId":"p-2","quantity":1}]}'
curl localhost:3003/stock/p-2
npm run down     # stops everything and deletes the volumes
```

Without Docker you start a single service directly, for example `npm run dev -w services/catalog`.
Node.js 26 runs TypeScript without a build step.

## Packages

Every package has to earn its place. You do not need more:

| Package | What for |
|---|---|
| `express` 5 | HTTP services with routes, middleware and error handling |
| `zod` 4 | Validate contracts and generate JSON Schema for OpenAPI 3.1 from them (`z.toJSONSchema`) |
| `vitest` | Tests against the starting point, the reference solution and the whole system |
| `typescript`, `@types/node`, `@types/express` | Type checking |

Deliberately without an extra package: SQLite (`node:sqlite`), HTTP client (`fetch`), tokens (`node:crypto` with Ed25519),
Trace Context (`AsyncLocalStorage`) and messaging (outbox via HTTP instead of a broker). In production you add,
where it pays off, for example OpenTelemetry, a message broker or Pact.

## Workshop and slides

- Workshop (held in German): [“Microservices with Node.js, Express 5, and Docker Compose”](https://workshops.mikebild.dev/w/microservices/remote/)
- Slides: [slides.mikebild.dev/introduction-microservices.en](https://slides.mikebild.dev/introduction-microservices.en.html)
- PDF: [introduction-microservices.en.pdf](https://media.mikebild.dev/site/mikebild/decks/introduction-microservices/introduction-microservices.en.pdf)
- Video: [introduction-microservices.en.mp4](https://media.mikebild.dev/site/mikebild/decks/introduction-microservices/introduction-microservices.en.mp4)

## License

[MIT](LICENSE)
