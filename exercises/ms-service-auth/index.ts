// Lektion ms-service-auth: Services prüfen, wer sie aufruft
// Dauer: etwa 25 Minuten
//
// orders ruft inventory auf. inventory soll nur Aufrufe annehmen, die nachweislich von orders kommen
// und für inventory bestimmt sind. orders signiert ein kurzlebiges JWT mit seinem privaten Ed25519-Schlüssel,
// inventory prüft es mit dem öffentlichen Schlüssel. Ohne Zusatzpaket: node:crypto kann EdDSA.
//
// Aufgabe: requireServiceToken(options) als Middleware.
// 1. Header Authorization: Bearer <header>.<payload>.<signature>. Fehlt er → 401.
// 2. kid aus dem Header wählt den öffentlichen Schlüssel, alg muss EdDSA sein. Unbekannt → 401.
// 3. Signatur mit verify(null, Buffer.from(`${header}.${payload}`), key, signatur) prüfen. Falsch → 401.
// 4. iss muss passen und exp in der Zukunft liegen (now() in ms) → sonst 401.
// 5. aud muss audience sein, sub in allowedCallers → sonst 403. Danach res.locals.caller = sub und next().
//
// Prüfen: npm test -- ms-service-auth
import { sign, verify, type KeyObject } from 'node:crypto'
import type { RequestHandler } from 'express'

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
const unb64 = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>

export type TokenOptions = {
  privateKey: KeyObject
  kid: string
  issuer: string
  subject: string
  audience: string
  ttlSeconds?: number
  now?: () => number
}

export const signServiceToken = ({ privateKey, kid, issuer, subject, audience, ttlSeconds = 60, now = Date.now }: TokenOptions) => {
  const iat = Math.floor(now() / 1000)
  const input = `${b64({ alg: 'EdDSA', typ: 'JWT', kid })}.${b64({ iss: issuer, sub: subject, aud: audience, iat, exp: iat + ttlSeconds })}`
  return `${input}.${sign(null, Buffer.from(input), privateKey).toString('base64url')}`
}

export type VerifyOptions = {
  publicKeys: Record<string, KeyObject>
  issuer: string
  audience: string
  allowedCallers: readonly string[]
  now?: () => number
}

export const requireServiceToken = (options: VerifyOptions): RequestHandler => (req, res, next) => {
  // Fallstrick: das Token nur decodieren und dem Inhalt glauben
  const token = (req.get('authorization') ?? '').replace('Bearer ', '')
  const payload = token.split('.')[1]
  if (!payload) {
    res.status(401).json({ error: 'missing token' })
    return
  }
  void [verify, options]
  res.locals.caller = unb64(payload).sub
  next()
}
