#!/usr/bin/env node
/**
 * update-supabase-smtp.mjs — Replace the custom SMTP password of a hosted
 * Supabase project (e.g. right after regenerating a Brevo SMTP key).
 *
 * Reads configuration from `.env.local`:
 *   SUPABASE_ACCESS_TOKEN  (Management API token)
 *   SUPABASE_PROJECT_REF   (project reference)
 *   SMTP_PASS              (NEW Brevo SMTP key to upload)
 *   SMTP_ADMIN_EMAIL       (optional override for smtp_admin_email)
 *
 * CLI overrides (highest priority):
 *   node scripts/update-supabase-smtp.mjs --host H --port 465 --user U --pass P --admin E
 *
 * Safety:
 *   1. The new credentials are first validated against the SMTP provider
 *      (nodemailer verify). Nothing is written if authentication fails.
 *   2. The Supabase project config is only then patched (PATCH
 *      /v1/projects/{ref}/config/auth).
 *   3. The final config is re-read and printed with secrets masked.
 */
import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

function loadEnv(name) {
  if (process.env[name]) return process.env[name];
  try {
    const envLocal = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const match = envLocal.match(new RegExp(`^${name}=(.+)$`, 'm'));
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1];
      if (val !== undefined && !val.startsWith('--')) {
        out[key] = val;
        i += 1;
      }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

const accessToken = args.token ?? loadEnv('SUPABASE_ACCESS_TOKEN');
const projectRef = args.ref ?? loadEnv('SUPABASE_PROJECT_REF');

if (!accessToken || !projectRef) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF (env, CLI or .env.local).');
  process.exit(1);
}

async function api(path, method = 'GET', body) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, text };
}

// 1) Fetch current auth config to default smtp_admin_email / sender.
const current = await api(`/projects/${projectRef}/config/auth`);
if (current.status !== 200) {
  console.error(`❌ Cannot fetch auth config (${current.status}):`, (current.text || '').slice(0, 400));
  process.exit(1);
}
const cfg = current.json;

// 2) Resolve the SMTP settings to apply — env/CLI first, Brevo-friendly
//    defaults, and only then the current project config.
const smtpHost = args.host ?? loadEnv('SMTP_HOST') ?? cfg.smtp_host;
const smtpPort = args.port !== undefined ? Number(args.port) : Number(loadEnv('SMTP_PORT') ?? cfg.smtp_port);
const smtpUser = args.user ?? loadEnv('SMTP_USER') ?? cfg.smtp_user;
const smtpPass = args.pass ?? loadEnv('SMTP_PASS') ?? cfg.smtp_pass;
const smtpAdminEmail = args.admin ?? loadEnv('SMTP_ADMIN_EMAIL') ?? cfg.smtp_admin_email ?? smtpUser;
const smtpSenderName = cfg.smtp_sender_name ?? undefined;

console.log('Target project  :', projectRef);
console.log('SMTP settings   :', `${smtpHost}:${smtpPort} login=${smtpUser}`);
console.log('SMTP pass       :', smtpPass ? `set (${String(smtpPass).length} chars)` : 'EMPTY — aborting');
console.log('Sender email    :', smtpAdminEmail);

const finalPass = String(smtpPass ?? '');
if (!finalPass) {
  console.error('❌ No SMTP password available. Set SMTP_PASS in .env.local or pass --pass.');
  process.exit(1);
}

// 3) Validate the new credentials BEFORE writing anything.
console.log('\n⏳ Validating SMTP credentials…');
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: { user: smtpUser, pass: finalPass },
});
try {
  await transporter.verify();
  console.log('✅ SMTP AUTH OK');
} catch (err) {
  console.error('❌ SMTP AUTH FAILED — nothing was modified.');
  console.error('   ', err?.message ?? err);
  if (err?.response) console.error('   server response:', err.response);
  console.error('\n💡 If the key is fresh but auth still fails, check the SMTP *login* in Brevo:');
  console.error('   Settings → Senders & IPs → validate the sender address used as login.');
  process.exit(1);
}

// 4) Patch the Supabase project auth config.
const payload = {
  smtp_host: smtpHost,
  // Management API expects smtp_port as a string ("expected string, received number")
  smtp_port: String(smtpPort),
  smtp_user: smtpUser,
  smtp_pass: finalPass,
  smtp_admin_email: smtpAdminEmail,
};
if (smtpSenderName !== undefined) payload.smtp_sender_name = smtpSenderName;

console.log('\n⏳ Updating Supabase auth config…');
const patch = await api(`/projects/${projectRef}/config/auth`, 'PATCH', payload);
if (patch.status !== 200) {
  console.error(`❌ PATCH failed (${patch.status}):`, (patch.text || '').slice(0, 500));
  process.exit(1);
}

// 5) Re-read and confirm (masked).
const confirm = await api(`/projects/${projectRef}/config/auth`);
const c = confirm.json;
console.log('\n✅ Supabase SMTP updated successfully:');
console.log('   host        :', c.smtp_host);
console.log('   port        :', c.smtp_port);
console.log('   user        :', c.smtp_user);
console.log('   pass        :', c.smtp_pass ? `set (${String(c.smtp_pass).length} chars)` : 'EMPTY — CHECK');
console.log('   admin email :', c.smtp_admin_email);
console.log('\n👉 Retry sign-up and check the recipient inbox (incl. spam).');