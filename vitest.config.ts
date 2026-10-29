import { defineConfig } from 'vitest/config'

// Dieselben Tests laufen gegen deinen Startpunkt oder gegen die Lösung:
//   npm test                 → exercises/<lektion>/index.ts
//   npm run test:solution    → exercises/<lektion>/solution/index.ts
//   npm run test:system      → die drei Services aus services/ zusammen, ohne Docker
// Die Tests importieren '#ex/<lektion>'. Die "imports" in der package.json lösen das über die
// Condition "solution" auf die Lösung auf, sonst auf den Startpunkt.
export default defineConfig(({ mode }) => {
  const solution = process.env.TARGET === 'solution' || mode === 'solution'
  // Ohne 'import': Die Conditions gelten auch für require() in Dependencies (z. B. is-promise in express),
  // dort würde 'import' die ESM-Variante laden.
  const conditions = [...(solution ? ['solution'] : []), 'node', 'default']

  return {
    resolve: { conditions },
    // Nur für Imports, die Vite selbst auflöst (#ex/…). Externe Packages wie express bleiben bei Node,
    // sonst bekäme ein require() die ESM-Variante einer Dependency.
    ssr: { resolve: { conditions } },
    test: {
      env: { TARGET: solution ? 'solution' : 'start' },
      include: mode === 'system' ? ['test/**/*.test.ts'] : ['exercises/*/index.test.ts'],
    },
  }
})
