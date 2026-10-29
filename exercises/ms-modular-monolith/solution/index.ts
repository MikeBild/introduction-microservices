// Lösung ms-modular-monolith
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const modulithDir = fileURLToPath(new URL('./modulith', import.meta.url))

export type Violation = { file: string; imports: string }

const importPattern = /(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/g

/** Ein Modul darf von einem anderen Modul nur dessen index.ts importieren. */
export const checkBoundaries = (root: string): Violation[] => {
  const modulesDir = join(root, 'modules')
  const moduleOf = (file: string) => relative(modulesDir, file).split(sep)[0]
  const files = readdirSync(modulesDir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => join(modulesDir, file))

  return files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(importPattern)]
      .map((match) => match[1] ?? '')
      .filter((specifier) => specifier.startsWith('.'))
      .map((specifier) => resolve(dirname(file), specifier))
      .filter((target) => moduleOf(target) !== moduleOf(file))
      .filter((target) => relative(join(modulesDir, moduleOf(target) ?? ''), target) !== 'index.ts')
      .map((target) => ({ file: relative(root, file), imports: relative(root, target) })),
  )
}
