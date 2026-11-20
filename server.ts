import path from 'path';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase } from './server/db.js';
import { attachAuth, csrfProtection } from './server/security.js';
import { getStripeClient, getWebhookSecret } from './server/payments.js';
import { sendNotification } from './server/notifications.js';
import { authRouter } from './server/routes/auth.js';
import { shopRouter } from './server/routes/shop.js';
import { workshopsRouter } from './server/routes/workshops.js';
import { cmsAdminRouter } from './server/routes/cms_admin.js';

dotenv.config();
initDatabase();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// Secure HTTP headers while allowing AI Studio iframe preview
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
  })
);

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// Stripe Webhook MUST receive raw body before express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripeClient();
  const webhookSecret = getWebhookSecret();
  if (!stripe || !webhookSecret) {
    return res.status(503).json({ error: 'Stripe webhook secret is not configured.' });
  }

  const sig = req.headers['stripe-signature'];
  if (typeof sig !== 'string') {
    return res.status(400).json({ error: 'Missing Stripe-Signature header.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  const now = new Date().toISOString();
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as any;
    const { orderId, bookingId } = intent.metadata || {};
    db.prepare(`UPDATE payments SET status = 'succeeded' WHERE provider_reference = ?`).run(intent.id);

    if (orderId) {
      db.prepare(`UPDATE orders SET payment_status = 'paid', order_status = 'preparing', updated_at = ? WHERE id = ?`).run(now, orderId);
      const order = db.prepare(`SELECT order_number, customer_details_json FROM orders WHERE id = ?`).get(orderId) as any;
      if (order) {
        const customer = JSON.parse(order.customer_details_json);
        await sendNotification({
          recipientEmail: customer.email,
          type: 'payment_confirmation',
          subject: `MAISON CRUMB — Payment Confirmed (${order.order_number})`,
          text: `Your payment for order ${order.order_number} is confirmed.`,
          html: `<p>Your payment for order <strong>${order.order_number}</strong> is confirmed and our bakers are preparing your loaves.</p>`,
        });
      }
    }

    if (bookingId) {
      db.prepare(`UPDATE bookings SET payment_status = 'paid', booking_status = 'confirmed' WHERE id = ?`).run(bookingId);
      const booking = db.prepare(`SELECT booking_number, customer_details_json FROM bookings WHERE id = ?`).get(bookingId) as any;
      if (booking) {
        const customer = JSON.parse(booking.customer_details_json);
        await sendNotification({
          recipientEmail: customer.email,
          type: 'payment_confirmation',
          subject: `MAISON CRUMB — Workshop Payment Confirmed (${booking.booking_number})`,
          text: `Your workshop reservation ${booking.booking_number} is confirmed.`,
          html: `<p>Your workshop reservation <strong>${booking.booking_number}</strong> is confirmed. We look forward to welcoming you at Rue des Martyrs.</p>`,
        });
      }
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as any;
    const { orderId, bookingId } = intent.metadata || {};
    db.prepare(`UPDATE payments SET status = 'failed' WHERE provider_reference = ?`).run(intent.id);
    if (orderId) db.prepare(`UPDATE orders SET payment_status = 'failed', updated_at = ? WHERE id = ?`).run(now, orderId);
    if (bookingId) db.prepare(`UPDATE bookings SET payment_status = 'failed' WHERE id = ?`).run(bookingId);
  }

  res.json({ received: true });
});

// Mount upload route before express.json() so raw binary image buffer is preserved
app.use('/api', apiLimiter);
app.use('/api', attachAuth);
app.use('/api', csrfProtection);

// Mount json parser for standard endpoints
app.use('/api', (req, res, next) => {
  if (req.path === '/admin/upload') return next();
  return express.json({ limit: '1mb' })(req, res, next);
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api', authRouter); // also mounts /api/admin/bootstrap-status & /api/admin/bootstrap
app.use('/api', shopRouter);
app.use('/api', workshopsRouter);
app.use('/api', cmsAdminRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'maison-crumb' });
});

// Serve uploaded product/workshop/CMS images
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MAISON CRUMB server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
