import { defineConfig } from 'vitest/config'

// The same tests run against your starting point or against the reference solution:
//   npm test                 → exercises/<lesson>/index.ts
//   npm run test:solution    → exercises/<lesson>/solution/index.ts
//   npm run test:system      → the three services from services/ together, without Docker
// The tests import '#ex/<lesson>'. The imports in package.json resolve this to the reference solution
// via the condition solution, otherwise to the starting point.
export default defineConfig(({ mode }) => {
  const solution = process.env.TARGET === 'solution' || mode === 'solution'
  // Without 'import': the conditions also apply to require() in dependencies (for example is-promise in express),
  // where 'import' would load the ESM variant.
  const conditions = [...(solution ? ['solution'] : []), 'node', 'default']

  return {
    resolve: { conditions },
    // Only for imports that Vite resolves itself (#ex/…). External packages like express stay with Node,
    // otherwise a require() would get the ESM variant of a dependency.
    ssr: { resolve: { conditions } },
    test: {
      env: { TARGET: solution ? 'solution' : 'start' },
      include: mode === 'system' ? ['test/**/*.test.ts'] : ['exercises/*/index.test.ts'],
    },
  }
})
