/**
 * Seed default admin user for local/dev testing.
 *
 * Usage:
 *   node scripts/seed-admin.mjs
 *
 * Environment (read from .env.local or process env):
 *   NEXT_PUBLIC_SUPABASE_URL   — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (bypasses RLS)
 *
 * Creates (if missing) a confirmed admin account with these defaults:
 *   Email    : admin@aicoach.local
 *   Password : Admin1234!
 *   Full name: Platform Admin
 *
 * Idempotent: re-running updates the password and ensures role = 'admin'.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Minimal .env.local loader (no dotenv dependency) ------------------
function loadEnvFile() {
  try {
    const envPath = resolve(__dirname, '..', '.env.local');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional when vars are in the real environment.
  }
}

loadEnvFile();

// --- Config ------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? 'admin@aicoach.local',
  password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!',
  fullName: process.env.SEED_ADMIN_NAME ?? 'Platform Admin',
};

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Set them in .env.local or the environment, then re-run.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('— ForPro AI: seed default admin —');
  console.log('Supabase URL :', SUPABASE_URL);
  console.log('Admin email  :', DEFAULT_ADMIN.email);

  // 1. Find-or-create the auth user.
  const { data: existingList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('listUsers failed:', listErr.message);
    process.exit(1);
  }

  const existing = existingList.users.find((u) => u.email === DEFAULT_ADMIN.email);

  let userId;
  if (existing) {
    userId = existing.id;
    console.log('Auth user exists:', userId);
    // Keep password in sync with the default (convenience for local reset).
    const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
      password: DEFAULT_ADMIN.password,
    });
    if (updErr) {
      console.error('updateUserById failed:', updErr.message);
      process.exit(1);
    }
    console.log('Password refreshed.');
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: DEFAULT_ADMIN.email,
      password: DEFAULT_ADMIN.password,
      email_confirm: true,
      user_metadata: { full_name: DEFAULT_ADMIN.fullName },
    });
    if (createErr) {
      console.error('createUser failed:', createErr.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log('Auth user created:', userId);
  }

  // 2. Ensure the profiles row exists with role = 'admin'.
  //    Service-role bypasses the enforce_profile_role_integrity trigger.
  const { error: upsertErr } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        full_name: DEFAULT_ADMIN.fullName,
        role: 'admin',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (upsertErr) {
    console.error('profiles upsert failed:', upsertErr.message);
    process.exit(1);
  }

  console.log('Profile set to role=admin ✓');
  console.log('');
  console.log('You can now sign in at /login with:');
  console.log('  Email   :', DEFAULT_ADMIN.email);
  console.log('  Password:', DEFAULT_ADMIN.password);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
