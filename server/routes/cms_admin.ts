import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express, { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { hashPassword, mapUserRow, requireRoles, sanitizePlainText } from '../security.js';
import { isSmtpConfigured, notifyAdmin } from '../notifications.js';
import { isStripeConfigured } from '../payments.js';
import { mapOrderRow, mapProductRow } from './shop.js';
import { mapBookingRow } from './workshops.js';

export const cmsAdminRouter = Router();

// PUBLIC CMS & JOURNAL
cmsAdminRouter.get('/content', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM website_content`).all() as any[];
  const sections: Record<string, any> = {};
  for (const r of rows) {
    sections[r.section_id] = {
      sectionId: r.section_id,
      title: r.title,
      subtitle: r.subtitle || '',
      description: r.description || '',
      images: JSON.parse(r.images_json || '[]'),
      content: JSON.parse(r.content_json || '{}'),
      updatedAt: r.updated_at,
    };
  }
  res.json({ sections });
});

cmsAdminRouter.put('/content/:sectionId', requireRoles(['super_admin', 'manager']), (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(300),
    subtitle: z.string().max(200).optional().default(''),
    description: z.string().max(2000).optional().default(''),
    images: z.array(z.string().max(400)).max(10).optional(),
    content: z.record(z.string(), z.any()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid CMS update.' });

  const existing = db.prepare(`SELECT * FROM website_content WHERE section_id = ?`).get(req.params.sectionId) as any;
  if (!existing) return res.status(404).json({ error: 'CMS section not found.' });

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE website_content SET title = ?, subtitle = ?, description = ?, images_json = ?, content_json = ?, updated_at = ? WHERE section_id = ?`
  ).run(
    sanitizePlainText(parsed.data.title, 300),
    sanitizePlainText(parsed.data.subtitle || '', 200),
    sanitizePlainText(parsed.data.description || '', 2000),
    parsed.data.images ? JSON.stringify(parsed.data.images) : existing.images_json,
    parsed.data.content ? JSON.stringify(parsed.data.content) : existing.content_json,
    now,
    req.params.sectionId
  );

  res.json({ ok: true, updatedAt: now });
});

cmsAdminRouter.get('/journal', (_req, res) => {
  const articles = db.prepare(`SELECT * FROM journal_articles ORDER BY published_at DESC`).all() as any[];
  res.json({
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      content: a.content,
      category: a.category,
      imageUrl: a.image_url,
      authorName: a.author_name,
      publishedAt: a.published_at,
    })),
  });
});

// CONTACT & NEWSLETTER
cmsAdminRouter.post('/contact', async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2).max(120),
      email: z.string().email().max(180),
      subject: z.string().min(2).max(160),
      message: z.string().min(10).max(3000),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid enquiry form.' });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const name = sanitizePlainText(parsed.data.name, 120);
  const email = parsed.data.email.trim().toLowerCase();
  const subject = sanitizePlainText(parsed.data.subject, 160);
  const message = sanitizePlainText(parsed.data.message, 3000);

  db.prepare(`INSERT INTO contact_messages (id, name, email, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, 'new', ?)`).run(
    id,
    name,
    email,
    subject,
    message,
    now
  );

  await notifyAdmin(`New Contact Enquiry: ${subject}`, `From ${name} (${email}):\n\n${message}`);
  res.status(201).json({ ok: true, id });
});

cmsAdminRouter.post('/newsletter/subscribe', (req, res) => {
  const parsed = z.object({ email: z.string().email().max(180) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const email = parsed.data.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const existing = db.prepare(`SELECT id FROM newsletter_subscribers WHERE email = ?`).get(email) as any;

  if (existing) {
    db.prepare(`UPDATE newsletter_subscribers SET status = 'subscribed', subscribed_at = ? WHERE id = ?`).run(now, existing.id);
  } else {
    db.prepare(`INSERT INTO newsletter_subscribers (id, email, status, subscribed_at) VALUES (?, ?, 'subscribed', ?)`).run(
      crypto.randomUUID(),
      email,
      now
    );
  }
  res.status(201).json({ ok: true, email });
});

// ADMIN ANALYTICS & MANAGEMENT
cmsAdminRouter.get('/admin/dashboard', requireRoles(['super_admin', 'manager', 'staff']), (_req, res) => {
  const orderStats = db
    .prepare(
      `SELECT
         COUNT(*) as totalOrders,
         SUM(CASE WHEN order_status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
         SUM(CASE WHEN order_status = 'completed' THEN 1 ELSE 0 END) as completedOrders,
         COALESCE(SUM(CASE WHEN order_status != 'cancelled' THEN total_cents ELSE 0 END), 0) as orderRevenue
       FROM orders`
    )
    .get() as any;

  const bookingRevenueRow = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN booking_status NOT IN ('cancelled', 'refunded') THEN total_amount_cents ELSE 0 END), 0) as bookingRevenue
       FROM bookings`
    )
    .get() as any;

  const totalCustomers = (db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'customer'`).get() as any).c;
  const totalProducts = (db.prepare(`SELECT COUNT(*) as c FROM products`).get() as any).c;
  const lowStockRows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE p.stock <= 5 ORDER BY p.stock ASC LIMIT 10`
    )
    .all() as any[];

  const upcomingWorkshopsCount = (
    db.prepare(`SELECT COUNT(*) as c FROM workshop_slots WHERE date >= date('now') AND status != 'cancelled'`).get() as any
  ).c;

  const recentOrderRows = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 8`).all() as any[];
  const recentBookingRows = db
    .prepare(
      `SELECT b.*, w.title as workshop_title, s.date as slot_date, s.start_time as slot_start_time, s.end_time as slot_end_time
       FROM bookings b JOIN workshops w ON w.id = b.workshop_id JOIN workshop_slots s ON s.id = b.slot_id
       ORDER BY b.created_at DESC LIMIT 6`
    )
    .all() as any[];

  // Weekly revenue (last 7 days from actual DB records)
  const weeklyRevenue: { label: string; revenueCents: number; ordersCount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(total_cents), 0) as rev, COUNT(*) as cnt
         FROM orders WHERE substr(created_at, 1, 10) = ? AND order_status != 'cancelled'`
      )
      .get(dayStr) as any;
    weeklyRevenue.push({ label: dayLabel, revenueCents: row.rev || 0, ordersCount: row.cnt || 0 });
  }

  // Monthly revenue (last 6 months from actual DB records)
  const monthlyRevenue: { label: string; revenueCents: number; ordersCount: number }[] = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    const monthPrefix = d.toISOString().slice(0, 7);
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(total_cents), 0) as rev, COUNT(*) as cnt
         FROM orders WHERE substr(created_at, 1, 7) = ? AND order_status != 'cancelled'`
      )
      .get(monthPrefix) as any;
    monthlyRevenue.push({ label: monthLabel, revenueCents: row.rev || 0, ordersCount: row.cnt || 0 });
  }

  const popularProducts = (
    db.prepare(`SELECT name, sales_count, (sales_count * price_cents) as est_rev FROM products ORDER BY sales_count DESC LIMIT 5`).all() as any[]
  ).map((p) => ({ name: p.name, salesCount: p.sales_count, revenueCents: p.est_rev }));

  res.json({
    stats: {
      totalRevenueCents: (orderStats.orderRevenue || 0) + (bookingRevenueRow.bookingRevenue || 0),
      totalOrders: orderStats.totalOrders || 0,
      pendingOrders: orderStats.pendingOrders || 0,
      completedOrders: orderStats.completedOrders || 0,
      totalCustomers,
      totalProducts,
      lowStockProducts: lowStockRows.map(mapProductRow),
      upcomingWorkshopsCount,
      recentBookings: recentBookingRows.map(mapBookingRow),
      recentOrders: recentOrderRows.map(mapOrderRow),
      weeklyRevenue,
      monthlyRevenue,
      popularProducts,
      smtpConfigured: isSmtpConfigured(),
      stripeConfigured: isStripeConfigured(),
    },
  });
});

cmsAdminRouter.get('/admin/orders', requireRoles(['super_admin', 'manager', 'staff']), (req, res) => {
  const status = String(req.query.status || '');
  const search = String(req.query.search || '').trim().toLowerCase();

  let sql = `SELECT * FROM orders WHERE 1=1`;
  const params: any[] = [];
  if (status && status !== 'all') {
    sql += ` AND order_status = ?`;
    params.push(status);
  }
  if (search) {
    sql += ` AND (LOWER(order_number) LIKE ? OR LOWER(customer_details_json) LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ` ORDER BY created_at DESC`;

  const rows = db.prepare(sql).all(...params) as any[];
  res.json({ orders: rows.map(mapOrderRow) });
});

cmsAdminRouter.get('/admin/bookings', requireRoles(['super_admin', 'manager', 'staff']), (_req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, w.title as workshop_title, s.date as slot_date, s.start_time as slot_start_time, s.end_time as slot_end_time
       FROM bookings b
       JOIN workshops w ON w.id = b.workshop_id
       JOIN workshop_slots s ON s.id = b.slot_id
       ORDER BY b.created_at DESC`
    )
    .all() as any[];
  res.json({ bookings: rows.map(mapBookingRow) });
});

cmsAdminRouter.get('/admin/customers', requireRoles(['super_admin', 'manager', 'staff']), (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  let sql = `SELECT * FROM users WHERE role = 'customer'`;
  const params: any[] = [];
  if (search) {
    sql += ` AND (LOWER(full_name) LIKE ? OR LOWER(email) LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ` ORDER BY created_at DESC`;

  const rows = db.prepare(sql).all(...params) as any[];
  const customers = rows.map((r) => {
    const orderCount = (db.prepare(`SELECT COUNT(*) as c FROM orders WHERE user_id = ?`).get(r.id) as any).c;
    const bookingCount = (db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE user_id = ?`).get(r.id) as any).c;
    return { ...mapUserRow(r), orderCount, bookingCount };
  });
  res.json({ customers });
});

cmsAdminRouter.put('/admin/customers/:id/status', requireRoles(['super_admin', 'manager']), (req, res) => {
  const parsed = z.object({ accountStatus: z.enum(['active', 'suspended']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status.' });

  const target = db.prepare(`SELECT role FROM users WHERE id = ?`).get(req.params.id) as any;
  if (!target) return res.status(404).json({ error: 'Customer not found.' });
  if (target.role !== 'customer') return res.status(403).json({ error: 'Cannot alter non-customer accounts via this route.' });

  db.prepare(`UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?`).run(
    parsed.data.accountStatus,
    new Date().toISOString(),
    req.params.id
  );
  res.json({ ok: true });
});

// Staff & Manager provisioning (Super Admin only)
cmsAdminRouter.get('/admin/staff', requireRoles(['super_admin']), (_req, res) => {
  const rows = db.prepare(`SELECT * FROM users WHERE role IN ('super_admin', 'manager', 'staff') ORDER BY created_at ASC`).all() as any[];
  res.json({ staff: rows.map(mapUserRow) });
});

cmsAdminRouter.post('/admin/staff', requireRoles(['super_admin']), (req, res) => {
  const parsed = z
    .object({
      fullName: z.string().min(2).max(120),
      email: z.string().email().max(180),
      password: z.string().min(10).max(128),
      role: z.enum(['staff', 'manager']),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid staff payload.' });

  const email = parsed.data.email.trim().toLowerCase();
  if (db.prepare(`SELECT id FROM users WHERE email = ?`).get(email)) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, full_name, email, password_hash, phone, addresses_json, role, account_status, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', '[]', ?, 'active', 1, ?, ?)`
  ).run(id, sanitizePlainText(parsed.data.fullName, 120), email, hashPassword(parsed.data.password), parsed.data.role, now, now);

  const created = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  res.status(201).json({ member: mapUserRow(created) });
});

// Enquiries, Newsletter Subscribers & Notification Logs
cmsAdminRouter.get('/admin/enquiries', requireRoles(['super_admin', 'manager', 'staff']), (_req, res) => {
  const messages = db.prepare(`SELECT * FROM contact_messages ORDER BY created_at DESC`).all();
  res.json({ messages });
});

cmsAdminRouter.put('/admin/enquiries/:id', requireRoles(['super_admin', 'manager', 'staff']), (req, res) => {
  const parsed = z.object({ status: z.enum(['new', 'in_review', 'resolved']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid enquiry status.' });
  db.prepare(`UPDATE contact_messages SET status = ? WHERE id = ?`).run(parsed.data.status, req.params.id);
  res.json({ ok: true });
});

cmsAdminRouter.get('/admin/subscribers', requireRoles(['super_admin', 'manager']), (_req, res) => {
  const subscribers = db.prepare(`SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC`).all();
  res.json({ subscribers });
});

cmsAdminRouter.get('/admin/notifications', requireRoles(['super_admin', 'manager']), (_req, res) => {
  const logs = db.prepare(`SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 50`).all();
  res.json({ logs });
});

// Secure image upload (validates magic bytes & stores with random UUID filename inside /uploads)
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

cmsAdminRouter.post(
  '/admin/upload',
  requireRoles(['super_admin', 'manager', 'staff']),
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '4mb' }),
  (req, res) => {
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length < 16) {
      return res.status(400).json({ error: 'Empty or invalid image payload.' });
    }

    let ext: string | null = null;
    // Check magic bytes
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ext = '.jpg';
    else if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) ext = '.png';
    else if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') ext = '.webp';

    if (!ext) {
      return res.status(400).json({ error: 'Only verified JPEG, PNG, or WEBP images are permitted.' });
    }

    const filename = `${crypto.randomUUID()}${ext}`;
    const targetPath = path.resolve(UPLOADS_DIR, filename);
    if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
      return res.status(400).json({ error: 'Invalid upload destination.' });
    }
    fs.writeFileSync(targetPath, buf);
    res.status(201).json({ url: `/uploads/${filename}` });
  }
);
