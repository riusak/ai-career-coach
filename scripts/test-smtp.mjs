/**
 * One-off diagnostic: validates the Brevo SMTP credentials used by the
 * Supabase auth emails (same host/port/user/password as the project config).
 *
 * Usage: node scripts/test-smtp.mjs [to-email]
 */

import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

function loadEnv(name) {
  if (process.env[name]) {
    return process.env[name];
  }
  const envLocal = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const match = envLocal.match(new RegExp(`^${name}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

const SMTP_USER = loadEnv('SMTP_USER') ?? 'ai-career-coach';
const SMTP_PASS = loadEnv('SMTP_PASS');
const TO = process.argv[2] ?? loadEnv('SMTP_ADMIN_EMAIL') ?? 'effoeakolly@gmail.com';

if (!SMTP_PASS) {
  console.error('❌ No SMTP_PASS found (env or .env.local).');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

try {
  await transporter.verify();
  console.info('[test-smtp] AUTH + CONNECTION OK (smtp-relay.brevo.com:587)');
  const info = await transporter.sendMail({
    from: '"ForPro AI" <effoeakolly@gmail.com>',
    to: TO,
    subject: 'Test SMTP — ForPro AI',
    text: 'Configuration SMTP validée. Vous pouvez ignorer cet email.',
  });
  console.info(`[test-smtp] EMAIL SENT — messageId=${info.messageId} → ${TO}`);
} catch (error) {
  console.error('[test-smtp] FAILED:', error?.message ?? error);
  if (error?.response) {
    console.error('server response:', error.response);
  }
  process.exit(1);
}
