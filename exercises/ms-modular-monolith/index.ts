// Lesson ms-modular-monolith: Modules with clear boundaries before services
// Duration: about 20 minutes
//
// A modulith is one deployment with domain modules. Each module has a public
// interface (index.ts) and internals (internal/). You check this rule automatically.
//
// Task:
// 1. checkBoundaries(root): Read all .ts files under <root>/modules recursively (readdirSync with recursive).
//    Find relative imports (from './…' or '../…'). If an import points into another module and not
//    to its index.ts, that is a Violation { file, imports } (paths relative to root).
// 2. Repair the modulith in ./modulith: catalog exports priceOf via index.ts,
//    orders only imports '../catalog/index.ts' from now on.
//
// Check: npm test -- ms-modular-monolith
import { fileURLToPath } from 'node:url'

export const modulithDir = fileURLToPath(new URL('./modulith', import.meta.url))

export type Violation = { file: string; imports: string }

export const checkBoundaries = (root: string): Violation[] => {
  throw new Error('TODO: Imports über Modulgrenzen finden')
}
