// Reference solution ms-why
export type Commit = { id: string; modules: readonly string[] }
export type Coupling = { a: string; b: string; together: number; ratio: number }

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** How often do two modules change in the same commit? ratio = together / commits of the rarer module */
export const changeCoupling = (commits: readonly Commit[]): Coupling[] => {
  const perModule = new Map<string, number>()
  const perPair = new Map<string, number>()
  for (const commit of commits) {
    const modules = [...new Set(commit.modules)].sort()
    for (const module of modules) perModule.set(module, (perModule.get(module) ?? 0) + 1)
    for (const [i, a] of modules.entries())
      for (const b of modules.slice(i + 1)) perPair.set(pairKey(a, b), (perPair.get(pairKey(a, b)) ?? 0) + 1)
  }
  return [...perPair]
    .map(([key, together]) => {
      const [a = '', b = ''] = key.split('|')
      const ratio = together / Math.min(perModule.get(a) ?? 1, perModule.get(b) ?? 1)
      return { a, b, together, ratio }
    })
    .sort((x, y) => y.ratio - x.ratio || y.together - x.together)
}

/** Modules that mostly change together belong in the same service. */
export const keepTogether = (commits: readonly Commit[], threshold = 0.5): Array<[string, string]> =>
  changeCoupling(commits)
    .filter((coupling) => coupling.ratio >= threshold)
    .map((coupling) => [coupling.a, coupling.b])
