import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import {
  AuthedRequest,
  GUEST_CART_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  clearIframeCookie,
  generateRawToken,
  hashPassword,
  hashToken,
  mapUserRow,
  parseCookies,
  requireAuth,
  sanitizePlainText,
  setIframeCookie,
  verifyPassword,
} from '../security.js';
import { sendNotification } from '../notifications.js';

export const authRouter = Router();

const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(180),
  password: z.string().min(8).max(128),
  phone: z.string().max(40).optional().default(''),
});

const loginSchema = z.object({
  email: z.string().email().max(180),
  password: z.string().min(1).max(128),
});

const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().max(40).optional().default(''),
  addresses: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        label: z.string().min(1).max(60),
        street: z.string().min(3).max(200),
        city: z.string().min(2).max(100),
        postalCode: z.string().min(3).max(20),
        instructions: z.string().max(240).optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .max(10)
    .optional(),
});

function createSessionForUser(userId: string): string {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`).run(
    crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    new Date().toISOString()
  );
  return rawToken;
}

function mergeGuestCartToUser(req: any, userId: string) {
  const cookies = parseCookies(req);
  const guestToken = cookies[GUEST_CART_COOKIE_NAME];
  if (!guestToken) return;

  const guestCart = db.prepare(`SELECT * FROM carts WHERE guest_token = ?`).get(guestToken) as any;
  if (!guestCart) return;

  let userCart = db.prepare(`SELECT * FROM carts WHERE user_id = ?`).get(userId) as any;
  const now = new Date().toISOString();
  if (!userCart) {
    const newId = crypto.randomUUID();
    db.prepare(`INSERT INTO carts (id, user_id, guest_token, discount_code, updated_at) VALUES (?, ?, NULL, ?, ?)`).run(
      newId,
      userId,
      guestCart.discount_code || null,
      now
    );
    userCart = { id: newId };
  }

  const guestItems = db.prepare(`SELECT * FROM cart_items WHERE cart_id = ?`).all(guestCart.id) as any[];
  for (const item of guestItems) {
    const existing = db
      .prepare(`SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?`)
      .get(userCart.id, item.product_id) as any;
    if (existing) {
      db.prepare(`UPDATE cart_items SET quantity = quantity + ? WHERE id = ?`).run(item.quantity, existing.id);
    } else {
      db.prepare(`INSERT INTO cart_items (id, cart_id, product_id, quantity) VALUES (?, ?, ?, ?)`).run(
        crypto.randomUUID(),
        userCart.id,
        item.product_id,
        item.quantity
      );
    }
  }
  db.prepare(`DELETE FROM carts WHERE id = ?`).run(guestCart.id);
}

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration fields.' });
  }

  const fullName = sanitizePlainText(parsed.data.fullName, 120);
  const email = parsed.data.email.trim().toLowerCase();
  const phone = sanitizePlainText(parsed.data.phone || '', 40);

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const verificationToken = generateRawToken();
  const passwordHash = hashPassword(parsed.data.password);

  db.prepare(
    `INSERT INTO users (id, full_name, email, password_hash, phone, addresses_json, role, account_status, email_verified, verification_token, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '[]', 'customer', 'active', 0, ?, ?, ?)`
  ).run(id, fullName, email, passwordHash, phone, verificationToken, now, now);

  const rawSessionToken = createSessionForUser(id);
  setIframeCookie(res, SESSION_COOKIE_NAME, rawSessionToken, 7 * 24 * 60 * 60);
  mergeGuestCartToUser(req, id);

  const userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  const emailResult = await sendNotification({
    recipientEmail: email,
    type: 'registration',
    subject: 'Welcome to MAISON CRUMB — Paris IX',
    text: `Bonjour ${fullName},\n\nWelcome to Maison Crumb. Your account is now active. Verification code: ${verificationToken.slice(0, 12)}`,
    html: `<p>Bonjour ${fullName},</p><p>Welcome to <strong>MAISON CRUMB</strong>. Your customer account is ready for online bakery orders and workshop reservations.</p>`,
  });

  res.status(201).json({
    user: mapUserRow(userRow),
    sessionToken: rawSessionToken,
    emailNotification: emailResult.status,
  });
});

authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please enter a valid email and password.' });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;

  if (!row || !verifyPassword(parsed.data.password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (row.account_status !== 'active') {
    return res.status(403).json({ error: 'This account has been suspended. Please contact the bakery.' });
  }

  const rawSessionToken = createSessionForUser(row.id);
  setIframeCookie(res, SESSION_COOKIE_NAME, rawSessionToken, 7 * 24 * 60 * 60);
  mergeGuestCartToUser(req, row.id);

  res.json({
    user: mapUserRow(row),
    sessionToken: rawSessionToken,
  });
});

authRouter.post('/logout', (req: AuthedRequest, res) => {
  if (req.sessionToken) {
    db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashToken(req.sessionToken));
  }
  clearIframeCookie(res, SESSION_COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get('/me', (req: AuthedRequest, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  res.json({ user: req.user });
});

authRouter.put('/profile', requireAuth, (req: AuthedRequest, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile data.' });
  }

  const fullName = sanitizePlainText(parsed.data.fullName, 120);
  const phone = sanitizePlainText(parsed.data.phone || '', 40);
  const now = new Date().toISOString();

  const existingRow = db.prepare(`SELECT addresses_json FROM users WHERE id = ?`).get(req.user!.id) as any;
  const addressesJson = parsed.data.addresses
    ? JSON.stringify(
        parsed.data.addresses.map((a) => ({
          id: sanitizePlainText(a.id, 64),
          label: sanitizePlainText(a.label, 60),
          street: sanitizePlainText(a.street, 200),
          city: sanitizePlainText(a.city, 100),
          postalCode: sanitizePlainText(a.postalCode, 20),
          instructions: a.instructions ? sanitizePlainText(a.instructions, 240) : '',
          isDefault: Boolean(a.isDefault),
        }))
      )
    : existingRow.addresses_json;

  db.prepare(`UPDATE users SET full_name = ?, phone = ?, addresses_json = ?, updated_at = ? WHERE id = ?`).run(
    fullName,
    phone,
    addressesJson,
    now,
    req.user!.id
  );

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id);
  res.json({ user: mapUserRow(updated) });
});

authRouter.post('/verify-email', requireAuth, async (req: AuthedRequest, res) => {
  const now = new Date().toISOString();
  db.prepare(`UPDATE users SET email_verified = 1, verification_token = NULL, updated_at = ? WHERE id = ?`).run(
    now,
    req.user!.id
  );
  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id);
  res.json({ user: mapUserRow(updated), verified: true });
});

authRouter.post('/forgot-password', async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const user = db.prepare(`SELECT id, full_name FROM users WHERE email = ?`).get(email) as any;

  let emailStatus: 'sent' | 'not_configured' | 'failed' = 'not_configured';
  if (user) {
    const rawReset = generateRawToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(`UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?`).run(hashToken(rawReset), expires, user.id);
    const baseUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL' ? process.env.APP_URL : '';
    const resetLink = `${baseUrl}/reset-password?token=${rawReset}`;
    const result = await sendNotification({
      recipientEmail: email,
      type: 'password_reset',
      subject: 'MAISON CRUMB — Password Reset Request',
      text: `Bonjour ${user.full_name},\n\nReset your password using this link (valid for 1 hour): ${resetLink}`,
      html: `<p>Bonjour ${user.full_name},</p><p>Click to reset your password (valid for 1 hour): <a href="${resetLink}">${resetLink}</a></p>`,
    });
    emailStatus = result.status;
  }

  res.json({
    message:
      emailStatus === 'sent'
        ? 'If an account matches that email, password reset instructions have been sent.'
        : 'Password reset token recorded. Email delivery requires SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS).',
    emailNotification: emailStatus,
  });
});

authRouter.post('/reset-password', (req, res) => {
  const parsed = z
    .object({
      token: z.string().min(10).max(200),
      newPassword: z.string().min(8).max(128),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password reset request.' });
  }

  const tokenHash = hashToken(parsed.data.token.trim());
  const now = new Date().toISOString();
  const user = db
    .prepare(`SELECT id FROM users WHERE reset_token = ? AND reset_expires_at > ?`)
    .get(tokenHash, now) as any;

  if (!user) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
  }

  db.prepare(`UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL, updated_at = ? WHERE id = ?`).run(
    hashPassword(parsed.data.newPassword),
    now,
    user.id
  );

  res.json({ ok: true, message: 'Password updated successfully. You may now sign in.' });
});

// Admin first-run bootstrap status & claim (never uses hardcoded credentials!)
authRouter.get('/admin/bootstrap-status', (_req, res) => {
  const adminCount = db
    .prepare(`SELECT COUNT(*) as c FROM users WHERE role IN ('super_admin', 'manager', 'staff')`)
    .get() as { c: number };
  const bootstrapRow = db.prepare(`SELECT claimed_at FROM admin_bootstrap WHERE id = 1`).get() as any;
  const envConfigured = Boolean(process.env.ADMIN_BOOTSTRAP_PASSCODE && process.env.ADMIN_BOOTSTRAP_PASSCODE.trim().length > 0);

  res.json({
    hasAdmin: adminCount.c > 0,
    claimed: Boolean(bootstrapRow?.claimed_at),
    envPasscodeConfigured: envConfigured,
  });
});

authRouter.post('/admin/bootstrap', (req, res) => {
  const schema = z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email().max(180),
    password: z.string().min(10).max(128),
    passcode: z.string().max(128).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid admin setup payload.' });
  }

  const envPasscode = process.env.ADMIN_BOOTSTRAP_PASSCODE?.trim();
  const adminCount = db
    .prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'super_admin'`)
    .get() as { c: number };
  const bootstrapRow = db.prepare(`SELECT claimed_at FROM admin_bootstrap WHERE id = 1`).get() as any;

  // If env passcode is configured, verify it; otherwise allow one-time claim only when no super_admin exists
  if (envPasscode) {
    const provided = parsed.data.passcode || '';
    const a = Buffer.from(provided);
    const b = Buffer.from(envPasscode);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ error: 'Invalid server ADMIN_BOOTSTRAP_PASSCODE.' });
    }
  } else if (adminCount.c > 0 || bootstrapRow?.claimed_at) {
    return res.status(403).json({
      error: 'Initial Super Admin has already been claimed. Sign in with your admin credentials or ask a Super Admin to provision your staff account.',
    });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const fullName = sanitizePlainText(parsed.data.fullName, 120);
  const now = new Date().toISOString();
  const passwordHash = hashPassword(parsed.data.password);

  const tx = db.transaction(() => {
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email) as any;
    let userId: string;
    if (existing) {
      userId = existing.id;
      db.prepare(`UPDATE users SET full_name = ?, password_hash = ?, role = 'super_admin', email_verified = 1, updated_at = ? WHERE id = ?`).run(
        fullName,
        passwordHash,
        now,
        userId
      );
    } else {
      userId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO users (id, full_name, email, password_hash, phone, addresses_json, role, account_status, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', '[]', 'super_admin', 'active', 1, ?, ?)`
      ).run(userId, fullName, email, passwordHash, now, now);
    }
    db.prepare(`UPDATE admin_bootstrap SET claimed_by_email = ?, claimed_at = ? WHERE id = 1`).run(email, now);
    return userId;
  });

  const userId = tx();
  const rawSessionToken = createSessionForUser(userId);
  setIframeCookie(res, SESSION_COOKIE_NAME, rawSessionToken, 7 * 24 * 60 * 60);
  const userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);

  res.status(201).json({
    user: mapUserRow(userRow),
    sessionToken: rawSessionToken,
  });
});
