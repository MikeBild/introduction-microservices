// Lektion ms-modular-monolith: Erst Module mit klaren Grenzen, dann Services
// Dauer: etwa 20 Minuten
//
// Ein Modulith ist ein Deployment mit fachlichen Modulen. Jedes Modul hat eine öffentliche
// Schnittstelle (index.ts) und Interna (internal/). Diese Regel prüfst du automatisch.
//
// Aufgabe:
// 1. checkBoundaries(root): Lies alle .ts-Dateien unter <root>/modules rekursiv (readdirSync mit recursive).
//    Finde relative Imports (from './…' oder '../…'). Zeigt ein Import in ein anderes Modul und nicht
//    auf dessen index.ts, ist das eine Violation { file, imports } (Pfade relativ zu root).
// 2. Repariere den Modulith in ./modulith: catalog exportiert priceOf über index.ts,
//    orders importiert nur noch '../catalog/index.ts'.
//
// Prüfen: npm test -- ms-modular-monolith
import { fileURLToPath } from 'node:url'

export const modulithDir = fileURLToPath(new URL('./modulith', import.meta.url))

export type Violation = { file: string; imports: string }

export const checkBoundaries = (root: string): Violation[] => {
  throw new Error('TODO: Imports über Modulgrenzen finden')
}
