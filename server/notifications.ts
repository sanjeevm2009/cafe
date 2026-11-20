import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { db } from './db.js';

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

interface NotificationPayload {
  recipientEmail: string;
  type:
    | 'registration'
    | 'order_confirmation'
    | 'payment_confirmation'
    | 'order_status_update'
    | 'booking_confirmation'
    | 'booking_cancellation'
    | 'password_reset'
    | 'admin_alert';
  subject: string;
  text: string;
  html: string;
}

export async function sendNotification(payload: NotificationPayload): Promise<{ status: 'sent' | 'not_configured' | 'failed'; message?: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  if (!isSmtpConfigured()) {
    db.prepare(
      `INSERT INTO notification_logs (id, recipient_email, type, subject, status, error_message, created_at)
       VALUES (?, ?, ?, ?, 'not_configured', ?, ?)`
    ).run(
      id,
      payload.recipientEmail,
      payload.type,
      payload.subject,
      'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured.',
      now
    );
    return {
      status: 'not_configured',
      message: 'Email provider credentials are not configured in environment variables.',
    };
  }

  try {
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'MAISON CRUMB <bonjour@maisoncrumb.fr>',
      to: payload.recipientEmail,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    db.prepare(
      `INSERT INTO notification_logs (id, recipient_email, type, subject, status, error_message, created_at)
       VALUES (?, ?, ?, ?, 'sent', NULL, ?)`
    ).run(id, payload.recipientEmail, payload.type, payload.subject, now);

    return { status: 'sent' };
  } catch (err: any) {
    const errMsg = err?.message || 'SMTP delivery failed';
    db.prepare(
      `INSERT INTO notification_logs (id, recipient_email, type, subject, status, error_message, created_at)
       VALUES (?, ?, ?, ?, 'failed', ?, ?)`
    ).run(id, payload.recipientEmail, payload.type, payload.subject, errMsg, now);

    return { status: 'failed', message: errMsg };
  }
}

export async function notifyAdmin(subject: string, text: string) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'atelier@maisoncrumb.fr';
  return sendNotification({
    recipientEmail: adminEmail,
    type: 'admin_alert',
    subject: `[MAISON CRUMB Admin] ${subject}`,
    text,
    html: `<div style="font-family: Georgia, serif; color: #292722; padding: 24px; background: #F8F6F1;">
      <h2 style="margin-bottom: 12px;">MAISON CRUMB — Atelier Notification</h2>
      <p style="font-family: sans-serif; line-height: 1.6;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>`,
  });
}
