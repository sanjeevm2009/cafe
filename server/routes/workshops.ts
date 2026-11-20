import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { AuthedRequest, requireAuth, requireRoles, sanitizePlainText } from '../security.js';
import { isStripeConfigured } from '../payments.js';
import { notifyAdmin, sendNotification } from '../notifications.js';
import type { Booking, Workshop, WorkshopSlot } from '../../src/types/index.js';

export const workshopsRouter = Router();

export function mapWorkshopRow(row: any, slots?: WorkshopSlot[]): Workshop {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    imageUrls: JSON.parse(row.image_urls_json || '[]'),
    duration: row.duration,
    priceCents: row.price_cents,
    level: row.level,
    location: row.location,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    slots,
  };
}

export function mapSlotRow(row: any): WorkshopSlot {
  return {
    id: row.id,
    workshopId: row.workshop_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    maximumParticipants: row.maximum_participants,
    bookedParticipants: row.booked_participants,
    status: row.status,
  };
}

export function mapBookingRow(row: any): Booking {
  return {
    id: row.id,
    bookingNumber: row.booking_number,
    userId: row.user_id,
    workshopId: row.workshop_id,
    workshopTitle: row.workshop_title,
    slotId: row.slot_id,
    slotDate: row.slot_date,
    slotStartTime: row.slot_start_time,
    slotEndTime: row.slot_end_time,
    participantCount: row.participant_count,
    customerDetails: JSON.parse(row.customer_details_json),
    totalAmountCents: row.total_amount_cents,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    bookingStatus: row.booking_status,
    paymentReference: row.payment_reference || null,
    createdAt: row.created_at,
  };
}

workshopsRouter.get('/workshops', (req: AuthedRequest, res) => {
  const isAdmin = req.user && ['super_admin', 'manager', 'staff'].includes(req.user.role);
  const rows = db
    .prepare(isAdmin ? `SELECT * FROM workshops ORDER BY created_at DESC` : `SELECT * FROM workshops WHERE is_active = 1 ORDER BY created_at ASC`)
    .all() as any[];

  const workshops = rows.map((w) => {
    const slotRows = db
      .prepare(`SELECT * FROM workshop_slots WHERE workshop_id = ? ORDER BY date ASC, start_time ASC`)
      .all(w.id) as any[];
    return mapWorkshopRow(w, slotRows.map(mapSlotRow));
  });
  res.json({ workshops });
});

workshopsRouter.get('/workshops/:id', (req, res) => {
  const row = db.prepare(`SELECT * FROM workshops WHERE id = ? OR slug = ?`).get(req.params.id, req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Workshop not found.' });

  const slotRows = db
    .prepare(`SELECT * FROM workshop_slots WHERE workshop_id = ? ORDER BY date ASC, start_time ASC`)
    .all(row.id) as any[];

  res.json({ workshop: mapWorkshopRow(row, slotRows.map(mapSlotRow)) });
});

workshopsRouter.get('/workshops/:id/slots', (req, res) => {
  const row = db.prepare(`SELECT id FROM workshops WHERE id = ? OR slug = ?`).get(req.params.id, req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Workshop not found.' });

  const slots = db
    .prepare(`SELECT * FROM workshop_slots WHERE workshop_id = ? ORDER BY date ASC, start_time ASC`)
    .all(row.id) as any[];
  res.json({ slots: slots.map(mapSlotRow) });
});

const workshopSchema = z.object({
  title: z.string().min(3).max(160),
  slug: z.string().min(3).max(160).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10).max(2500),
  imageUrls: z.array(z.string().min(1).max(400)).min(1).max(6),
  duration: z.string().min(2).max(60),
  priceCents: z.number().int().min(100).max(500000),
  level: z.string().min(2).max(60).default('All Levels'),
  location: z.string().min(3).max(180).default('42 Rue des Martyrs, 75009 Paris'),
  isActive: z.boolean().default(true),
});

workshopsRouter.post('/workshops', requireRoles(['super_admin', 'manager']), (req, res) => {
  const parsed = workshopSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid workshop data.' });

  const id = `ws-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO workshops (id, title, slug, description, image_urls_json, duration, price_cents, level, location, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      sanitizePlainText(parsed.data.title, 160),
      parsed.data.slug,
      sanitizePlainText(parsed.data.description, 2500),
      JSON.stringify(parsed.data.imageUrls),
      sanitizePlainText(parsed.data.duration, 60),
      parsed.data.priceCents,
      sanitizePlainText(parsed.data.level, 60),
      sanitizePlainText(parsed.data.location, 180),
      parsed.data.isActive ? 1 : 0,
      now
    );
    const created = db.prepare(`SELECT * FROM workshops WHERE id = ?`).get(id);
    res.status(201).json({ workshop: mapWorkshopRow(created, []) });
  } catch {
    res.status(409).json({ error: 'Workshop slug already exists.' });
  }
});

workshopsRouter.put('/workshops/:id', requireRoles(['super_admin', 'manager']), (req, res) => {
  const parsed = workshopSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid workshop payload.' });

  const existing = db.prepare(`SELECT * FROM workshops WHERE id = ?`).get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Workshop not found.' });

  db.prepare(
    `UPDATE workshops SET title = ?, slug = ?, description = ?, image_urls_json = ?, duration = ?, price_cents = ?, level = ?, location = ?, is_active = ? WHERE id = ?`
  ).run(
    parsed.data.title ? sanitizePlainText(parsed.data.title, 160) : existing.title,
    parsed.data.slug || existing.slug,
    parsed.data.description ? sanitizePlainText(parsed.data.description, 2500) : existing.description,
    parsed.data.imageUrls ? JSON.stringify(parsed.data.imageUrls) : existing.image_urls_json,
    parsed.data.duration ? sanitizePlainText(parsed.data.duration, 60) : existing.duration,
    parsed.data.priceCents ?? existing.price_cents,
    parsed.data.level ? sanitizePlainText(parsed.data.level, 60) : existing.level,
    parsed.data.location ? sanitizePlainText(parsed.data.location, 180) : existing.location,
    parsed.data.isActive !== undefined ? (parsed.data.isActive ? 1 : 0) : existing.is_active,
    req.params.id
  );
  res.json({ ok: true });
});

workshopsRouter.delete('/workshops/:id', requireRoles(['super_admin', 'manager']), (req, res) => {
  const activeBookings = db
    .prepare(`SELECT COUNT(*) as c FROM bookings WHERE workshop_id = ? AND booking_status IN ('pending', 'confirmed')`)
    .get(req.params.id) as { c: number };
  if (activeBookings.c > 0) {
    return res.status(400).json({ error: 'Cannot delete a workshop with active bookings. Deactivate it instead.' });
  }
  db.prepare(`DELETE FROM workshops WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// SLOTS MANAGEMENT
const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  maximumParticipants: z.number().int().min(1).max(40),
});

workshopsRouter.post('/workshops/:id/slots', requireRoles(['super_admin', 'manager']), (req, res) => {
  const parsed = slotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid slot format.' });

  const ws = db.prepare(`SELECT id FROM workshops WHERE id = ?`).get(req.params.id);
  if (!ws) return res.status(404).json({ error: 'Workshop not found.' });

  const slotId = `slot-${crypto.randomUUID().slice(0, 8)}`;
  db.prepare(
    `INSERT INTO workshop_slots (id, workshop_id, date, start_time, end_time, maximum_participants, booked_participants, status)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'open')`
  ).run(slotId, req.params.id, parsed.data.date, parsed.data.startTime, parsed.data.endTime, parsed.data.maximumParticipants);

  const created = db.prepare(`SELECT * FROM workshop_slots WHERE id = ?`).get(slotId);
  res.status(201).json({ slot: mapSlotRow(created) });
});

workshopsRouter.delete('/workshop-slots/:slotId', requireRoles(['super_admin', 'manager']), (req, res) => {
  const slot = db.prepare(`SELECT booked_participants FROM workshop_slots WHERE id = ?`).get(req.params.slotId) as any;
  if (!slot) return res.status(404).json({ error: 'Slot not found.' });
  if (slot.booked_participants > 0) {
    db.prepare(`UPDATE workshop_slots SET status = 'cancelled' WHERE id = ?`).run(req.params.slotId);
    return res.json({ ok: true, cancelled: true });
  }
  db.prepare(`DELETE FROM workshop_slots WHERE id = ?`).run(req.params.slotId);
  res.json({ ok: true });
});

// BOOKINGS
const bookingSchema = z.object({
  workshopId: z.string().min(1),
  slotId: z.string().min(1),
  participantCount: z.number().int().min(1).max(12),
  paymentMethod: z.enum(['stripe', 'bakery_pickup']),
  customerDetails: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email().max(180),
    phone: z.string().min(6).max(40),
    notes: z.string().max(400).optional().default(''),
  }),
});

workshopsRouter.post('/bookings', async (req: AuthedRequest, res) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid booking fields.' });

  if (parsed.data.paymentMethod === 'stripe' && !isStripeConfigured()) {
    return res.status(503).json({
      error: 'Stripe card payments require STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to be configured on the server.',
      requiresConfiguration: true,
    });
  }

  const customerDetails = {
    fullName: sanitizePlainText(parsed.data.customerDetails.fullName, 120),
    email: parsed.data.customerDetails.email.trim().toLowerCase(),
    phone: sanitizePlainText(parsed.data.customerDetails.phone, 40),
    notes: sanitizePlainText(parsed.data.customerDetails.notes || '', 400),
  };

  const bookingId = crypto.randomUUID();
  const bookingNumber = `MC-WS-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  try {
    const tx = db.transaction(() => {
      const workshop = db.prepare(`SELECT * FROM workshops WHERE id = ? AND is_active = 1`).get(parsed.data.workshopId) as any;
      if (!workshop) throw new Error('Selected workshop is unavailable.');

      const slot = db
        .prepare(`SELECT * FROM workshop_slots WHERE id = ? AND workshop_id = ?`)
        .get(parsed.data.slotId, workshop.id) as any;
      if (!slot) throw new Error('Selected date/time slot does not exist.');
      if (slot.status !== 'open') throw new Error('This workshop session is fully booked or closed.');

      const remaining = slot.maximum_participants - slot.booked_participants;
      if (parsed.data.participantCount > remaining) {
        throw new Error(`Only ${remaining} seat(s) remaining for this session.`);
      }

      // Prevent duplicate booking by same email in same slot
      const existingBookings = db
        .prepare(`SELECT customer_details_json FROM bookings WHERE slot_id = ? AND booking_status IN ('pending', 'confirmed')`)
        .all(slot.id) as any[];
      for (const b of existingBookings) {
        const d = JSON.parse(b.customer_details_json);
        if (d.email === customerDetails.email) {
          throw new Error('You already have an active reservation for this session.');
        }
      }

      const nextBooked = slot.booked_participants + parsed.data.participantCount;
      const nextStatus = nextBooked >= slot.maximum_participants ? 'full' : 'open';
      db.prepare(`UPDATE workshop_slots SET booked_participants = ?, status = ? WHERE id = ?`).run(nextBooked, nextStatus, slot.id);

      const totalAmountCents = workshop.price_cents * parsed.data.participantCount;
      const bookingStatus = parsed.data.paymentMethod === 'bakery_pickup' ? 'confirmed' : 'pending';

      db.prepare(
        `INSERT INTO bookings (id, booking_number, user_id, workshop_id, slot_id, participant_count, customer_details_json, total_amount_cents, payment_method, payment_status, booking_status, payment_reference, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NULL, ?)`
      ).run(
        bookingId,
        bookingNumber,
        req.user?.id || null,
        workshop.id,
        slot.id,
        parsed.data.participantCount,
        JSON.stringify(customerDetails),
        totalAmountCents,
        parsed.data.paymentMethod,
        bookingStatus,
        now
      );
    });

    tx();
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Reservation could not be completed.' });
  }

  const row = db
    .prepare(
      `SELECT b.*, w.title as workshop_title, s.date as slot_date, s.start_time as slot_start_time, s.end_time as slot_end_time
       FROM bookings b
       JOIN workshops w ON w.id = b.workshop_id
       JOIN workshop_slots s ON s.id = b.slot_id
       WHERE b.id = ?`
    )
    .get(bookingId) as any;

  const booking = mapBookingRow(row);

  await sendNotification({
    recipientEmail: customerDetails.email,
    type: 'booking_confirmation',
    subject: `MAISON CRUMB — Workshop Reservation ${booking.bookingNumber}`,
    text: `Bonjour ${customerDetails.fullName}, your ${booking.participantCount} seat(s) for ${booking.workshopTitle} on ${booking.slotDate} (${booking.slotStartTime}) are reserved.`,
    html: `<p>Bonjour ${customerDetails.fullName},</p><p>Your reservation <strong>${booking.bookingNumber}</strong> for <strong>${booking.workshopTitle}</strong> on ${booking.slotDate} at ${booking.slotStartTime} is ${booking.bookingStatus}.</p>`,
  });

  await notifyAdmin(
    `New Workshop Booking ${booking.bookingNumber}`,
    `${customerDetails.fullName} reserved ${booking.participantCount} seat(s) for ${booking.workshopTitle} on ${booking.slotDate}.`
  );

  res.status(201).json({ booking });
});

workshopsRouter.get('/bookings', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, w.title as workshop_title, s.date as slot_date, s.start_time as slot_start_time, s.end_time as slot_end_time
       FROM bookings b
       JOIN workshops w ON w.id = b.workshop_id
       JOIN workshop_slots s ON s.id = b.slot_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(req.user!.id) as any[];
  res.json({ bookings: rows.map(mapBookingRow) });
});

workshopsRouter.get('/bookings/:id', requireAuth, (req: AuthedRequest, res) => {
  const row = db
    .prepare(
      `SELECT b.*, w.title as workshop_title, s.date as slot_date, s.start_time as slot_start_time, s.end_time as slot_end_time
       FROM bookings b
       JOIN workshops w ON w.id = b.workshop_id
       JOIN workshop_slots s ON s.id = b.slot_id
       WHERE b.id = ?`
    )
    .get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Booking not found.' });

  const isAdmin = ['super_admin', 'manager', 'staff'].includes(req.user!.role);
  if (!isAdmin && row.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  res.json({ booking: mapBookingRow(row) });
});

workshopsRouter.put('/bookings/:id/cancel', requireAuth, async (req: AuthedRequest, res) => {
  const row = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Booking not found.' });

  const isAdmin = ['super_admin', 'manager', 'staff'].includes(req.user!.role);
  if (!isAdmin && row.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'You cannot cancel another guest’s reservation.' });
  }
  if (row.booking_status === 'cancelled' || row.booking_status === 'completed') {
    return res.status(400).json({ error: `Booking is already ${row.booking_status}.` });
  }

  db.transaction(() => {
    db.prepare(`UPDATE bookings SET booking_status = 'cancelled' WHERE id = ?`).run(row.id);
    const slot = db.prepare(`SELECT * FROM workshop_slots WHERE id = ?`).get(row.slot_id) as any;
    if (slot) {
      const nextBooked = Math.max(0, slot.booked_participants - row.participant_count);
      const nextStatus = slot.status === 'cancelled' ? 'cancelled' : nextBooked < slot.maximum_participants ? 'open' : 'full';
      db.prepare(`UPDATE workshop_slots SET booked_participants = ?, status = ? WHERE id = ?`).run(nextBooked, nextStatus, slot.id);
    }
  })();

  const updated = db
    .prepare(
      `SELECT b.*, w.title as workshop_title, s.date as slot_date, s.start_time as slot_start_time, s.end_time as slot_end_time
       FROM bookings b
       JOIN workshops w ON w.id = b.workshop_id
       JOIN workshop_slots s ON s.id = b.slot_id
       WHERE b.id = ?`
    )
    .get(row.id) as any;
  const booking = mapBookingRow(updated);

  await sendNotification({
    recipientEmail: booking.customerDetails.email,
    type: 'booking_cancellation',
    subject: `MAISON CRUMB — Reservation ${booking.bookingNumber} Cancelled`,
    text: `Your workshop reservation ${booking.bookingNumber} has been cancelled and seats released.`,
    html: `<p>Your workshop reservation <strong>${booking.bookingNumber}</strong> has been cancelled.</p>`,
  });

  res.json({ booking });
});

workshopsRouter.put('/bookings/:id/status', requireRoles(['super_admin', 'manager', 'staff']), (req, res) => {
  const parsed = z
    .object({
      bookingStatus: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'refunded']),
      paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid booking status.' });

  const existing = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Booking not found.' });

  db.transaction(() => {
    // If transitioning into cancelled/refunded from active, restore seats
    if (
      ['cancelled', 'refunded'].includes(parsed.data.bookingStatus) &&
      !['cancelled', 'refunded'].includes(existing.booking_status)
    ) {
      const slot = db.prepare(`SELECT * FROM workshop_slots WHERE id = ?`).get(existing.slot_id) as any;
      if (slot) {
        const nextBooked = Math.max(0, slot.booked_participants - existing.participant_count);
        const nextStatus = slot.status === 'cancelled' ? 'cancelled' : nextBooked < slot.maximum_participants ? 'open' : 'full';
        db.prepare(`UPDATE workshop_slots SET booked_participants = ?, status = ? WHERE id = ?`).run(nextBooked, nextStatus, slot.id);
      }
    }

    db.prepare(`UPDATE bookings SET booking_status = ?, payment_status = ? WHERE id = ?`).run(
      parsed.data.bookingStatus,
      parsed.data.paymentStatus || existing.payment_status,
      existing.id
    );
  })();

  res.json({ ok: true });
});
