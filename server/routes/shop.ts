import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import {
  AuthedRequest,
  GUEST_CART_COOKIE_NAME,
  parseCookies,
  requireAuth,
  requireRoles,
  sanitizePlainText,
  setIframeCookie,
} from '../security.js';
import { getPublishableKey, getStripeClient, isStripeConfigured } from '../payments.js';
import { notifyAdmin, sendNotification } from '../notifications.js';
import type { CartSummary, Order, Product } from '../../src/types/index.js';

export const shopRouter = Router();

const FREE_DELIVERY_THRESHOLD_CENTS = 3500; // €35.00
const STANDARD_DELIVERY_FEE_CENTS = 450; // €4.50

export function mapProductRow(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    priceCents: row.price_cents,
    imageUrls: JSON.parse(row.image_urls_json || '[]'),
    ingredients: JSON.parse(row.ingredients_json || '[]'),
    allergens: JSON.parse(row.allergens_json || '[]'),
    weight: row.weight,
    stock: row.stock,
    isAvailable: Boolean(row.is_available),
    isFeatured: Boolean(row.is_featured),
    salesCount: row.sales_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOrderRow(row: any): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    customerDetails: JSON.parse(row.customer_details_json),
    deliveryAddress: JSON.parse(row.delivery_address_json),
    items: JSON.parse(row.items_json),
    subtotalCents: row.subtotal_cents,
    deliveryFeeCents: row.delivery_fee_cents,
    discountCents: row.discount_cents,
    discountCode: row.discount_code || null,
    totalCents: row.total_cents,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    paymentReference: row.payment_reference || null,
    internalNotes: row.internal_notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getOrCreateCart(req: AuthedRequest, res: any): { id: string; discountCode: string | null } {
  const now = new Date().toISOString();
  if (req.user) {
    let cart = db.prepare(`SELECT * FROM carts WHERE user_id = ?`).get(req.user.id) as any;
    if (!cart) {
      const id = crypto.randomUUID();
      db.prepare(`INSERT INTO carts (id, user_id, guest_token, discount_code, updated_at) VALUES (?, ?, NULL, NULL, ?)`).run(
        id,
        req.user.id,
        now
      );
      cart = { id, discount_code: null };
    }
    return { id: cart.id, discountCode: cart.discount_code || null };
  }

  const cookies = parseCookies(req);
  let guestToken = cookies[GUEST_CART_COOKIE_NAME];
  if (guestToken) {
    const cart = db.prepare(`SELECT * FROM carts WHERE guest_token = ?`).get(guestToken) as any;
    if (cart) {
      return { id: cart.id, discountCode: cart.discount_code || null };
    }
  }

  guestToken = crypto.randomBytes(24).toString('hex');
  setIframeCookie(res, GUEST_CART_COOKIE_NAME, guestToken, 30 * 24 * 60 * 60);
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO carts (id, user_id, guest_token, discount_code, updated_at) VALUES (?, NULL, ?, NULL, ?)`).run(
    id,
    guestToken,
    now
  );
  return { id, discountCode: null };
}

function calculateDiscount(subtotalCents: number, code: string | null): { discountCents: number; validCode: string | null } {
  if (!code || subtotalCents <= 0) return { discountCents: 0, validCode: null };
  const row = db
    .prepare(`SELECT * FROM discount_codes WHERE UPPER(code) = UPPER(?) AND is_active = 1`)
    .get(code.trim()) as any;
  if (!row || subtotalCents < row.min_subtotal_cents) {
    return { discountCents: 0, validCode: null };
  }
  const discountCents =
    row.type === 'percent' ? Math.round((subtotalCents * row.value) / 100) : Math.min(row.value, subtotalCents);
  return { discountCents, validCode: row.code };
}

function buildCartSummary(cartId: string, discountCode: string | null): CartSummary {
  const rows = db
    .prepare(
      `SELECT ci.id as cart_item_id, ci.quantity, p.*, c.name as category_name, c.slug as category_slug
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE ci.cart_id = ?`
    )
    .all(cartId) as any[];

  const items = rows.map((r) => ({
    id: r.cart_item_id,
    productId: r.id,
    quantity: r.quantity,
    product: mapProductRow(r),
  }));

  const subtotalCents = items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
  const { discountCents, validCode } = calculateDiscount(subtotalCents, discountCode);
  const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
  const deliveryFeeCents =
    items.length === 0 ? 0 : discountedSubtotal >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : STANDARD_DELIVERY_FEE_CENTS;
  const totalCents = discountedSubtotal + deliveryFeeCents;

  return {
    items,
    subtotalCents,
    deliveryFeeCents,
    discountCents,
    discountCode: validCode,
    totalCents,
    freeDeliveryThresholdCents: FREE_DELIVERY_THRESHOLD_CENTS,
  };
}

// CATEGORIES
shopRouter.get('/categories', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC`).all() as any[];
  res.json({
    categories: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      imageUrl: r.image_url,
      isActive: Boolean(r.is_active),
      sortOrder: r.sort_order,
    })),
  });
});

const categorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().min(4).max(400),
  imageUrl: z.string().min(1).max(300),
  sortOrder: z.number().int().min(0).max(100).optional().default(10),
  isActive: z.boolean().optional().default(true),
});

shopRouter.post('/categories', requireRoles(['super_admin', 'manager']), (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid category.' });
  const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
  try {
    db.prepare(
      `INSERT INTO categories (id, name, slug, description, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      sanitizePlainText(parsed.data.name, 80),
      parsed.data.slug,
      sanitizePlainText(parsed.data.description, 400),
      parsed.data.imageUrl,
      parsed.data.isActive ? 1 : 0,
      parsed.data.sortOrder
    );
    res.status(201).json({ id });
  } catch (err: any) {
    res.status(409).json({ error: 'Category slug already exists.' });
  }
});

shopRouter.put('/categories/:id', requireRoles(['super_admin', 'manager']), (req, res) => {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid category payload.' });
  const existing = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Category not found.' });

  db.prepare(`UPDATE categories SET name = ?, slug = ?, description = ?, image_url = ?, is_active = ?, sort_order = ? WHERE id = ?`).run(
    parsed.data.name ? sanitizePlainText(parsed.data.name, 80) : existing.name,
    parsed.data.slug || existing.slug,
    parsed.data.description ? sanitizePlainText(parsed.data.description, 400) : existing.description,
    parsed.data.imageUrl || existing.image_url,
    parsed.data.isActive !== undefined ? (parsed.data.isActive ? 1 : 0) : existing.is_active,
    parsed.data.sortOrder ?? existing.sort_order,
    req.params.id
  );
  res.json({ ok: true });
});

shopRouter.delete('/categories/:id', requireRoles(['super_admin', 'manager']), (req, res) => {
  const linked = db.prepare(`SELECT COUNT(*) as c FROM products WHERE category_id = ?`).get(req.params.id) as { c: number };
  if (linked.c > 0) {
    return res.status(400).json({ error: 'Cannot delete a category that still contains products.' });
  }
  db.prepare(`DELETE FROM categories WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// PRODUCTS
shopRouter.get('/products', (req: AuthedRequest, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim();
  const featured = req.query.featured === 'true';
  const sort = String(req.query.sort || 'popular');
  const includeUnavailable =
    req.query.includeUnavailable === 'true' && req.user && ['super_admin', 'manager', 'staff'].includes(req.user.role);

  let whereClause = includeUnavailable ? 'WHERE 1=1' : 'WHERE p.is_available = 1';
  const params: any[] = [];

  if (category && category !== 'all') {
    whereClause += ' AND (c.slug = ? OR c.id = ?)';
    params.push(category, category);
  }
  if (featured) {
    whereClause += ' AND p.is_featured = 1';
  }
  if (search) {
    whereClause += ' AND (LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.ingredients_json) LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }

  let orderBy = 'ORDER BY p.is_featured DESC, p.sales_count DESC';
  if (sort === 'price_asc') orderBy = 'ORDER BY p.price_cents ASC';
  else if (sort === 'price_desc') orderBy = 'ORDER BY p.price_cents DESC';
  else if (sort === 'newest') orderBy = 'ORDER BY p.created_at DESC';

  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${whereClause}
       ${orderBy}`
    )
    .all(...params) as any[];

  res.json({ products: rows.map(mapProductRow) });
});

shopRouter.get('/products/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? OR p.slug = ?`
    )
    .get(req.params.id, req.params.id) as any;

  if (!row) return res.status(404).json({ error: 'Creation not found.' });

  const relatedRows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id != ? AND p.is_available = 1
       ORDER BY (CASE WHEN p.category_id = ? THEN 0 ELSE 1 END), p.sales_count DESC
       LIMIT 3`
    )
    .all(row.id, row.category_id) as any[];

  res.json({
    product: mapProductRow(row),
    relatedProducts: relatedRows.map(mapProductRow),
  });
});

const productSchema = z.object({
  name: z.string().min(2).max(140),
  slug: z.string().min(2).max(140).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10).max(2000),
  categoryId: z.string().min(1),
  priceCents: z.number().int().min(50).max(500000),
  imageUrls: z.array(z.string().min(1).max(400)).min(1).max(6),
  ingredients: z.array(z.string().min(1).max(120)).min(1).max(25),
  allergens: z.array(z.string().min(1).max(80)).max(15),
  weight: z.string().min(1).max(40),
  stock: z.number().int().min(0).max(10000),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

shopRouter.post('/products', requireRoles(['super_admin', 'manager', 'staff']), (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product payload.' });

  const id = `prod-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO products (id, name, slug, description, category_id, price_cents, image_urls_json, ingredients_json, allergens_json, weight, stock, is_available, is_featured, sales_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(
      id,
      sanitizePlainText(parsed.data.name, 140),
      parsed.data.slug,
      sanitizePlainText(parsed.data.description, 2000),
      parsed.data.categoryId,
      parsed.data.priceCents,
      JSON.stringify(parsed.data.imageUrls),
      JSON.stringify(parsed.data.ingredients.map((s) => sanitizePlainText(s, 120))),
      JSON.stringify(parsed.data.allergens.map((s) => sanitizePlainText(s, 80))),
      sanitizePlainText(parsed.data.weight, 40),
      parsed.data.stock,
      parsed.data.isAvailable ? 1 : 0,
      parsed.data.isFeatured ? 1 : 0,
      now,
      now
    );
    const created = db
      .prepare(`SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`)
      .get(id);
    res.status(201).json({ product: mapProductRow(created) });
  } catch {
    res.status(409).json({ error: 'Product slug already exists or category is invalid.' });
  }
});

shopRouter.put('/products/:id', requireRoles(['super_admin', 'manager', 'staff']), (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product update.' });

  const existing = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Product not found.' });

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE products SET name = ?, slug = ?, description = ?, category_id = ?, price_cents = ?, image_urls_json = ?, ingredients_json = ?, allergens_json = ?, weight = ?, stock = ?, is_available = ?, is_featured = ?, updated_at = ? WHERE id = ?`
  ).run(
    parsed.data.name ? sanitizePlainText(parsed.data.name, 140) : existing.name,
    parsed.data.slug || existing.slug,
    parsed.data.description ? sanitizePlainText(parsed.data.description, 2000) : existing.description,
    parsed.data.categoryId || existing.category_id,
    parsed.data.priceCents ?? existing.price_cents,
    parsed.data.imageUrls ? JSON.stringify(parsed.data.imageUrls) : existing.image_urls_json,
    parsed.data.ingredients ? JSON.stringify(parsed.data.ingredients.map((s) => sanitizePlainText(s, 120))) : existing.ingredients_json,
    parsed.data.allergens ? JSON.stringify(parsed.data.allergens.map((s) => sanitizePlainText(s, 80))) : existing.allergens_json,
    parsed.data.weight ? sanitizePlainText(parsed.data.weight, 40) : existing.weight,
    parsed.data.stock ?? existing.stock,
    parsed.data.isAvailable !== undefined ? (parsed.data.isAvailable ? 1 : 0) : existing.is_available,
    parsed.data.isFeatured !== undefined ? (parsed.data.isFeatured ? 1 : 0) : existing.is_featured,
    now,
    req.params.id
  );

  const updated = db
    .prepare(`SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`)
    .get(req.params.id);
  res.json({ product: mapProductRow(updated) });
});

shopRouter.delete('/products/:id', requireRoles(['super_admin', 'manager']), (req, res) => {
  db.prepare(`DELETE FROM products WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// CART
shopRouter.get('/cart', (req: AuthedRequest, res) => {
  const cart = getOrCreateCart(req, res);
  res.json({ cart: buildCartSummary(cart.id, cart.discountCode) });
});

shopRouter.post('/cart/items', (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).max(50).default(1),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid cart item payload.' });

  const product = db.prepare(`SELECT * FROM products WHERE id = ? AND is_available = 1`).get(parsed.data.productId) as any;
  if (!product) return res.status(404).json({ error: 'Product is currently unavailable.' });
  if (product.stock < parsed.data.quantity) {
    return res.status(400).json({ error: `Only ${product.stock} remaining in today's bake.` });
  }

  const cart = getOrCreateCart(req, res);
  const existing = db
    .prepare(`SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?`)
    .get(cart.id, product.id) as any;

  if (existing) {
    const nextQty = existing.quantity + parsed.data.quantity;
    if (nextQty > product.stock) {
      return res.status(400).json({ error: `Only ${product.stock} available in stock.` });
    }
    db.prepare(`UPDATE cart_items SET quantity = ? WHERE id = ?`).run(nextQty, existing.id);
  } else {
    db.prepare(`INSERT INTO cart_items (id, cart_id, product_id, quantity) VALUES (?, ?, ?, ?)`).run(
      crypto.randomUUID(),
      cart.id,
      product.id,
      parsed.data.quantity
    );
  }

  db.prepare(`UPDATE carts SET updated_at = ? WHERE id = ?`).run(new Date().toISOString(), cart.id);
  res.json({ cart: buildCartSummary(cart.id, cart.discountCode) });
});

shopRouter.put('/cart/items/:id', (req: AuthedRequest, res) => {
  const parsed = z.object({ quantity: z.number().int().min(0).max(50) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid quantity.' });

  const cart = getOrCreateCart(req, res);
  const item = db
    .prepare(`SELECT ci.*, p.stock FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.id = ? AND ci.cart_id = ?`)
    .get(req.params.id, cart.id) as any;

  if (!item) return res.status(404).json({ error: 'Cart item not found.' });

  if (parsed.data.quantity <= 0) {
    db.prepare(`DELETE FROM cart_items WHERE id = ?`).run(item.id);
  } else {
    if (parsed.data.quantity > item.stock) {
      return res.status(400).json({ error: `Only ${item.stock} available in stock.` });
    }
    db.prepare(`UPDATE cart_items SET quantity = ? WHERE id = ?`).run(parsed.data.quantity, item.id);
  }

  db.prepare(`UPDATE carts SET updated_at = ? WHERE id = ?`).run(new Date().toISOString(), cart.id);
  res.json({ cart: buildCartSummary(cart.id, cart.discountCode) });
});

shopRouter.delete('/cart/items/:id', (req: AuthedRequest, res) => {
  const cart = getOrCreateCart(req, res);
  db.prepare(`DELETE FROM cart_items WHERE id = ? AND cart_id = ?`).run(req.params.id, cart.id);
  res.json({ cart: buildCartSummary(cart.id, cart.discountCode) });
});

shopRouter.post('/cart/discount', (req: AuthedRequest, res) => {
  const parsed = z.object({ code: z.string().max(40) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid discount code.' });

  const cart = getOrCreateCart(req, res);
  const code = parsed.data.code.trim().toUpperCase();
  if (!code) {
    db.prepare(`UPDATE carts SET discount_code = NULL WHERE id = ?`).run(cart.id);
    return res.json({ cart: buildCartSummary(cart.id, null) });
  }

  const summaryBefore = buildCartSummary(cart.id, null);
  const discountRow = db.prepare(`SELECT * FROM discount_codes WHERE UPPER(code) = ? AND is_active = 1`).get(code) as any;
  if (!discountRow) {
    return res.status(400).json({ error: 'This promotional code is invalid or expired.' });
  }
  if (summaryBefore.subtotalCents < discountRow.min_subtotal_cents) {
    return res.status(400).json({
      error: `Code ${discountRow.code} requires a minimum order of €${(discountRow.min_subtotal_cents / 100).toFixed(2)}.`,
    });
  }

  db.prepare(`UPDATE carts SET discount_code = ? WHERE id = ?`).run(discountRow.code, cart.id);
  res.json({ cart: buildCartSummary(cart.id, discountRow.code) });
});

// ORDERS & CHECKOUT
const createOrderSchema = z.object({
  customerDetails: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email().max(180),
    phone: z.string().min(6).max(40),
  }),
  deliveryAddress: z.object({
    address: z.string().min(4).max(240),
    city: z.string().min(2).max(100),
    postalCode: z.string().min(3).max(20),
    instructions: z.string().max(300).optional().default(''),
  }),
  paymentMethod: z.enum(['stripe', 'bakery_pickup']),
  idempotencyKey: z.string().min(8).max(120),
});

shopRouter.post('/orders', async (req: AuthedRequest, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid checkout information.' });
  }

  // Prevent duplicate orders using idempotency key
  const existingDup = db.prepare(`SELECT * FROM orders WHERE idempotency_key = ?`).get(parsed.data.idempotencyKey) as any;
  if (existingDup) {
    return res.json({ order: mapOrderRow(existingDup), deduplicated: true });
  }

  if (parsed.data.paymentMethod === 'stripe' && !isStripeConfigured()) {
    return res.status(503).json({
      error: 'Stripe card payments require STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to be configured on the server.',
      requiresConfiguration: true,
    });
  }

  const cart = getOrCreateCart(req, res);
  const summary = buildCartSummary(cart.id, cart.discountCode);
  if (summary.items.length === 0) {
    return res.status(400).json({ error: 'Your basket is empty.' });
  }

  const orderId = crypto.randomUUID();
  const orderNumber = `MC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const customerDetails = {
    fullName: sanitizePlainText(parsed.data.customerDetails.fullName, 120),
    email: parsed.data.customerDetails.email.trim().toLowerCase(),
    phone: sanitizePlainText(parsed.data.customerDetails.phone, 40),
  };
  const deliveryAddress = {
    address: sanitizePlainText(parsed.data.deliveryAddress.address, 240),
    city: sanitizePlainText(parsed.data.deliveryAddress.city, 100),
    postalCode: sanitizePlainText(parsed.data.deliveryAddress.postalCode, 20),
    instructions: sanitizePlainText(parsed.data.deliveryAddress.instructions || '', 300),
  };

  try {
    const createOrderTx = db.transaction(() => {
      const orderItems = [];
      for (const item of summary.items) {
        const freshProd = db.prepare(`SELECT * FROM products WHERE id = ? AND is_available = 1`).get(item.productId) as any;
        if (!freshProd || freshProd.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product.name}.`);
        }
        db.prepare(`UPDATE products SET stock = stock - ?, sales_count = sales_count + ?, updated_at = ? WHERE id = ?`).run(
          item.quantity,
          item.quantity,
          now,
          freshProd.id
        );
        orderItems.push({
          productId: freshProd.id,
          name: freshProd.name,
          slug: freshProd.slug,
          priceCents: freshProd.price_cents,
          quantity: item.quantity,
          imageUrl: JSON.parse(freshProd.image_urls_json)[0] || '',
          weight: freshProd.weight,
        });
      }

      db.prepare(
        `INSERT INTO orders (id, order_number, user_id, customer_details_json, delivery_address_json, items_json, subtotal_cents, delivery_fee_cents, discount_cents, discount_code, total_cents, payment_method, payment_status, order_status, payment_reference, idempotency_key, internal_notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NULL, ?, '', ?, ?)`
      ).run(
        orderId,
        orderNumber,
        req.user?.id || null,
        JSON.stringify(customerDetails),
        JSON.stringify(deliveryAddress),
        JSON.stringify(orderItems),
        summary.subtotalCents,
        summary.deliveryFeeCents,
        summary.discountCents,
        summary.discountCode,
        summary.totalCents,
        parsed.data.paymentMethod,
        parsed.data.idempotencyKey,
        now,
        now
      );

      db.prepare(`DELETE FROM cart_items WHERE cart_id = ?`).run(cart.id);
      db.prepare(`UPDATE carts SET discount_code = NULL, updated_at = ? WHERE id = ?`).run(now, cart.id);
    });

    createOrderTx();
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Could not place order.' });
  }

  const orderRow = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId);
  const order = mapOrderRow(orderRow);

  await sendNotification({
    recipientEmail: customerDetails.email,
    type: 'order_confirmation',
    subject: `MAISON CRUMB — Order ${order.orderNumber} Received`,
    text: `Merci ${customerDetails.fullName}. Order ${order.orderNumber} for €${(order.totalCents / 100).toFixed(2)} has been received.`,
    html: `<p>Merci ${customerDetails.fullName},</p><p>Your Maison Crumb order <strong>${order.orderNumber}</strong> (€${(order.totalCents / 100).toFixed(2)}) has been received.</p>`,
  });

  await notifyAdmin(
    `New Order ${order.orderNumber}`,
    `Customer ${customerDetails.fullName} (${customerDetails.email}) placed order ${order.orderNumber} totaling €${(order.totalCents / 100).toFixed(2)}.`
  );

  res.status(201).json({ order });
});

shopRouter.get('/orders', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`)
    .all(req.user!.id) as any[];
  res.json({ orders: rows.map(mapOrderRow) });
});

shopRouter.get('/orders/:id', (req: AuthedRequest, res) => {
  const row = db
    .prepare(`SELECT * FROM orders WHERE id = ? OR order_number = ?`)
    .get(req.params.id, req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Order not found.' });

  const isAdmin = req.user && ['super_admin', 'manager', 'staff'].includes(req.user.role);
  const isOwner = req.user && row.user_id === req.user.id;
  const emailQuery = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
  const customer = JSON.parse(row.customer_details_json);

  if (!isAdmin && !isOwner && emailQuery !== customer.email) {
    return res.status(403).json({ error: 'You are not authorized to view this order.' });
  }

  res.json({ order: mapOrderRow(row) });
});

shopRouter.put('/orders/:id/status', requireRoles(['super_admin', 'manager', 'staff']), async (req, res) => {
  const parsed = z
    .object({
      orderStatus: z.enum(['pending', 'preparing', 'out_for_delivery', 'completed', 'cancelled']).optional(),
      paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
      internalNotes: z.string().max(1000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status update.' });

  const existing = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Order not found.' });

  const now = new Date().toISOString();
  const nextOrderStatus = parsed.data.orderStatus || existing.order_status;
  const nextPaymentStatus = parsed.data.paymentStatus || existing.payment_status;
  const nextNotes =
    parsed.data.internalNotes !== undefined ? sanitizePlainText(parsed.data.internalNotes, 1000) : existing.internal_notes;

  db.prepare(`UPDATE orders SET order_status = ?, payment_status = ?, internal_notes = ?, updated_at = ? WHERE id = ?`).run(
    nextOrderStatus,
    nextPaymentStatus,
    nextNotes,
    now,
    req.params.id
  );

  const updated = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(req.params.id) as any;
  const order = mapOrderRow(updated);

  if (parsed.data.orderStatus && parsed.data.orderStatus !== existing.order_status) {
    await sendNotification({
      recipientEmail: order.customerDetails.email,
      type: 'order_status_update',
      subject: `MAISON CRUMB — Order ${order.orderNumber} Update`,
      text: `Your order ${order.orderNumber} status is now: ${order.orderStatus}.`,
      html: `<p>Your order <strong>${order.orderNumber}</strong> is now marked as <strong>${order.orderStatus.replace(/_/g, ' ')}</strong>.</p>`,
    });
  }

  res.json({ order });
});

// PAYMENTS
shopRouter.get('/payments/config', (_req, res) => {
  res.json({
    stripeConfigured: isStripeConfigured(),
    publishableKey: getPublishableKey(),
    bakeryPickupAvailable: true,
    currency: 'eur',
  });
});

shopRouter.post('/payments/create', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      orderId: z.string().optional(),
      bookingId: z.string().optional(),
    })
    .refine((d) => Boolean(d.orderId || d.bookingId), { message: 'orderId or bookingId is required.' })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid payment request.' });

  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe gateway is not configured. Set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, and STRIPE_WEBHOOK_SECRET in your environment.',
      requiresConfiguration: true,
    });
  }

  let amountCents = 0;
  let description = '';
  const metadata: Record<string, string> = {};

  if (parsed.data.orderId) {
    const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(parsed.data.orderId) as any;
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    amountCents = order.total_cents;
    description = `MAISON CRUMB Order ${order.order_number}`;
    metadata.orderId = order.id;
  } else if (parsed.data.bookingId) {
    const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(parsed.data.bookingId) as any;
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    amountCents = booking.total_amount_cents;
    description = `MAISON CRUMB Workshop ${booking.booking_number}`;
    metadata.bookingId = booking.id;
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      description,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    const paymentId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO payments (id, order_id, booking_id, provider, provider_reference, amount_cents, currency, status, metadata_json, created_at)
       VALUES (?, ?, ?, 'stripe', ?, ?, 'eur', ?, ?, ?)`
    ).run(
      paymentId,
      parsed.data.orderId || null,
      parsed.data.bookingId || null,
      intent.id,
      amountCents,
      intent.status,
      JSON.stringify(metadata),
      new Date().toISOString()
    );

    if (parsed.data.orderId) {
      db.prepare(`UPDATE orders SET payment_reference = ? WHERE id = ?`).run(intent.id, parsed.data.orderId);
    }
    if (parsed.data.bookingId) {
      db.prepare(`UPDATE bookings SET payment_reference = ? WHERE id = ?`).run(intent.id, parsed.data.bookingId);
    }

    res.json({
      paymentId,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amountCents,
      currency: 'eur',
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Stripe PaymentIntent creation failed.' });
  }
});

shopRouter.get('/payments/:id/status', async (req, res) => {
  const row = db.prepare(`SELECT * FROM payments WHERE id = ? OR provider_reference = ?`).get(req.params.id, req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Payment record not found.' });

  const stripe = getStripeClient();
  if (stripe && row.provider === 'stripe') {
    try {
      const intent = await stripe.paymentIntents.retrieve(row.provider_reference);
      return res.json({ status: intent.status, amountCents: intent.amount, currency: intent.currency });
    } catch {
      // fallback to DB record
    }
  }
  res.json({ status: row.status, amountCents: row.amount_cents, currency: row.currency });
});
