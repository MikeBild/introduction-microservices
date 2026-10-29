// Lösung ms-service-auth
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

/** Kurzlebiges JWT (EdDSA, Ed25519) – signiert mit dem privaten Schlüssel des aufrufenden Services. */
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

/** 401: kein oder ungültiges Token. 403: gültig, aber nicht für uns oder Aufrufer nicht erlaubt. */
export const requireServiceToken = ({ publicKeys, issuer, audience, allowedCallers, now = Date.now }: VerifyOptions): RequestHandler =>
  (req, res, next) => {
    const deny = (status: 401 | 403, error: string) => void res.status(status).json({ error })
    const [scheme, token] = (req.get('authorization') ?? '').split(' ')
    const [header, payload, signature] = scheme === 'Bearer' && token ? token.split('.') : []
    if (!header || !payload || !signature) return deny(401, 'missing token')
    try {
      const { alg, kid } = unb64(header)
      const key = typeof kid === 'string' ? publicKeys[kid] : undefined
      if (alg !== 'EdDSA' || !key) return deny(401, 'unknown key')
      if (!verify(null, Buffer.from(`${header}.${payload}`), key, Buffer.from(signature, 'base64url')))
        return deny(401, 'invalid signature')
      const claims = unb64(payload)
      if (claims.iss !== issuer || typeof claims.exp !== 'number' || claims.exp * 1000 <= now())
        return deny(401, 'expired or foreign token')
      if (claims.aud !== audience) return deny(403, 'wrong audience')
      if (typeof claims.sub !== 'string' || !allowedCallers.includes(claims.sub)) return deny(403, 'caller not allowed')
      res.locals.caller = claims.sub
      next()
    } catch {
      deny(401, 'malformed token')
    }
  }
