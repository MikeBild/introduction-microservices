// Lesson ms-why: Microservices solve team problems, not code problems
// Duration: about 15 minutes
//
// Before you split off a service, look at what changes together. Modules that almost always
// land in the same commit are better left together – otherwise one commit turns into a distributed release.
//
// Task:
// 1. changeCoupling(commits): For each pair of modules, count how often it appears in the same commit (together).
//    ratio = together / number of commits of the rarer module. Duplicate modules in one commit count once.
//    Sort descending by ratio, ties by together. In a pair, a comes alphabetically before b.
// 2. keepTogether(commits, threshold = 0.5): all pairs with ratio >= threshold as [a, b].
//
// Check: npm test -- ms-why
export type Commit = { id: string; modules: readonly string[] }
export type Coupling = { a: string; b: string; together: number; ratio: number }

export const changeCoupling = (commits: readonly Commit[]): Coupling[] => {
  throw new Error('TODO: Modulpaare je Commit zählen')
}

export const keepTogether = (commits: readonly Commit[], threshold = 0.5): Array<[string, string]> => {
  throw new Error('TODO: Paare über dem Schwellwert')
}
