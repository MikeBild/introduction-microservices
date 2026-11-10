// Lesson ms-service-auth: Services check who calls them
// Duration: about 25 minutes
//
// orders calls inventory. inventory should only accept calls that provably come from orders
// and are meant for inventory. orders signs a short-lived JWT with its private Ed25519 key,
// inventory verifies it with the public key. No extra package: node:crypto supports EdDSA.
//
// Task: requireServiceToken(options) as middleware.
// 1. Header Authorization: Bearer <header>.<payload>.<signature>. If it is missing → 401.
// 2. kid from the header selects the public key, alg must be EdDSA. Unknown → 401.
// 3. Check the signature with verify(null, Buffer.from(`${header}.${payload}`), key, signature). Wrong → 401.
// 4. iss must match and exp must be in the future (now() in ms) → otherwise 401.
// 5. aud must be audience, sub must be in allowedCallers → otherwise 403. Then res.locals.caller = sub and next().
//
// Check: npm test -- ms-service-auth
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
  // Pitfall: only decoding the token and trusting its content
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
