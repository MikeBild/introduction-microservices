// Lektion ms-why: Microservices lösen Teamprobleme, keine Codeprobleme
// Dauer: etwa 15 Minuten
//
// Bevor du einen Service abtrennst, schau, was sich gemeinsam ändert. Module, die fast immer
// im selben Commit landen, trennst du besser nicht – sonst wird aus einem Commit ein verteiltes Release.
//
// Aufgabe:
// 1. changeCoupling(commits): Zähle für jedes Modulpaar, wie oft es im selben Commit vorkommt (together).
//    ratio = together / Anzahl Commits des selteneren Moduls. Doppelte Module in einem Commit zählen einmal.
//    Sortiere absteigend nach ratio, bei Gleichstand nach together. Im Paar steht a alphabetisch vor b.
// 2. keepTogether(commits, threshold = 0.5): alle Paare mit ratio >= threshold als [a, b].
//
// Prüfen: npm test -- ms-why
export type Commit = { id: string; modules: readonly string[] }
export type Coupling = { a: string; b: string; together: number; ratio: number }

export const changeCoupling = (commits: readonly Commit[]): Coupling[] => {
  throw new Error('TODO: Modulpaare je Commit zählen')
}

export const keepTogether = (commits: readonly Commit[], threshold = 0.5): Array<[string, string]> => {
  throw new Error('TODO: Paare über dem Schwellwert')
}
