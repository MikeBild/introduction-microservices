import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkBoundaries, modulithDir } from '#ex/ms-modular-monolith'

const fixture = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), 'modulith-'))
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  return root
}

describe('checkBoundaries', () => {
  it('allows imports via index.ts and within a module', () => {
    const root = fixture({
      'modules/catalog/index.ts': "export { priceOf } from './internal/prices.ts'",
      'modules/catalog/internal/prices.ts': 'export const priceOf = () => 1',
      'modules/orders/index.ts': "import { priceOf } from '../catalog/index.ts'\nimport { total } from './internal/total.ts'",
      'modules/orders/internal/total.ts': 'export const total = () => 0',
    })
    expect(checkBoundaries(root)).toEqual([])
  })

  it('reports reaching into the internals of another module', () => {
    const root = fixture({
      'modules/catalog/index.ts': 'export {}',
      'modules/catalog/internal/prices.ts': 'export const priceOf = () => 1',
      'modules/orders/internal/pricing.ts': "import { priceOf } from '../../catalog/internal/prices.ts'",
    })
    expect(checkBoundaries(root)).toEqual([
      { file: join('modules', 'orders', 'internal', 'pricing.ts'), imports: join('modules', 'catalog', 'internal', 'prices.ts') },
    ])
  })

  it('the workshop modulith keeps its boundaries', () => {
    expect(checkBoundaries(modulithDir)).toEqual([])
  })
})
