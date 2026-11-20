import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import type { User, UserRole } from '../src/types/index.js';

export const SESSION_COOKIE_NAME = 'mc_session';
export const GUEST_CART_COOKIE_NAME = 'mc_guest_cart';

// Ephemeral fallback secret for token signing if SESSION_SECRET is not provided
const EPHEMERAL_SIGNING_KEY = crypto.randomBytes(32).toString('hex');
function getSigningKey(): string {
  return process.env.SESSION_SECRET || EPHEMERAL_SIGNING_KEY;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', getSigningKey()).update(token).digest('hex');
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function sanitizePlainText(input: string, maxLength = 2000): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = decodeURIComponent(part.slice(0, idx).trim());
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    out[key] = val;
  }
  return out;
}

export function setIframeCookie(res: Response, name: string, value: string, maxAgeSeconds: number) {
  // Emit HttpOnly; Secure; SameSite=None; Partitioned directly so iframe preview works securely
  const encoded = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`;
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', encoded);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, encoded]);
  } else {
    res.setHeader('Set-Cookie', [String(existing), encoded]);
  }
}

export function clearIframeCookie(res: Response, name: string) {
  const encoded = `${encodeURIComponent(name)}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`;
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', encoded);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, encoded]);
  } else {
    res.setHeader('Set-Cookie', [String(existing), encoded]);
  }
}

export function mapUserRow(row: any): User {
  let addresses = [];
  try {
    addresses = row.addresses_json ? JSON.parse(row.addresses_json) : [];
  } catch {
    addresses = [];
  }
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || '',
    role: row.role as UserRole,
    accountStatus: row.account_status,
    emailVerified: Boolean(row.email_verified),
    addresses,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface AuthedRequest extends Request {
  user?: User;
  sessionToken?: string;
}

export function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE_NAME] || null;
}

export function attachAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const rawToken = extractSessionToken(req);
  if (!rawToken) return next();

  const tokenHash = hashToken(rawToken);
  const nowIso = new Date().toISOString();
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ? AND u.account_status = 'active'`
    )
    .get(tokenHash, nowIso);

  if (row) {
    req.user = mapUserRow(row);
    req.sessionToken = rawToken;
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  next();
}

export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this operation.' });
    }
    next();
  };
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path === '/api/payments/webhook') return next();

  const requestedWith = req.headers['x-requested-with'];
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;

  if (requestedWith === 'XMLHttpRequest') return next();
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return next();
    } catch {
      // fall through
    }
  }
  return res.status(403).json({ error: 'CSRF check failed. Missing X-Requested-With or matching Origin.' });
}
