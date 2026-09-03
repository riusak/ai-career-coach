import { execSync, spawn } from 'node:child_process';
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const BASE = 'http://localhost:3000';
const pdfPath = join(tmpdir(), 'forpro-smoke-cv.pdf');

let serverPid = null;
let spawnedByUs = false;

async function isUp() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(2500) });
    return res.status > 0;
  } catch {
    return false;
  }
}

// 1) Server up? If not, spawn `npm run dev` detached and wait for readiness.
if (!(await isUp())) {
  console.log('dev server NOT running — starting one…');
  const child = spawn('npm.cmd', ['run', 'dev'], {
    cwd: ROOT,
    env: process.env,
    detached: true,
    stdio: 'ignore',
    shell: true,
  });
  serverPid = child.pid;
  spawnedByUs = true;
  child.unref();
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await isUp()) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (!(await isUp())) {
    throw new Error('dev server did not become ready in time');
  }
  console.log('dev server ready (pid', serverPid + ')');
} else {
  console.log('dev server already running on :3000 — reusing it');
}

try {
  // 2) Generate the sample CV PDF (text-based, Word-export-like).
  execSync(`node scripts/make-sample-cv.mjs "${pdfPath}"`, { cwd: ROOT, stdio: 'inherit' });
  const buf = readFileSync(pdfPath);
  console.log('sample CV:', buf.length, 'bytes');

  // 3) POST it and timestamp every NDJSON line as it arrives (same parser as the funnel).
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'application/pdf' }), 'cv-marie-martin.pdf');

  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/quick-test`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  console.log('HTTP', res.status, '|', res.headers.get('content-type'));

  if (!res.body) throw new Error('no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  const seen = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      const at = `+${String(Date.now() - t0).padStart(5)}ms`;
      if (msg.type === 'progress') {
        seen.push(`  ${at}  progress → ${msg.stage}`);
      } else if (msg.type === 'result') {
        seen.push(
          `  ${at}  result   → source=${msg.source}, score=${msg.analysis.score}, ` +
            `dimensions=${msg.analysis.scoreBreakdown?.length}, recommandations=${msg.analysis.recommendations?.length}`
        );
      } else if (msg.type === 'error') {
        seen.push(`  ${at}  error    → code=${msg.code}, kind=${msg.documentKind ?? '-'}`);
      }
    }
  }
  console.log('--- flux NDJSON reçu ---');
  for (const line of seen) console.log(line);
  console.log('------------------------');

  const order = seen.map((l) => l.trim().split('→')[1]?.trim());
  const progressStages = seen
    .filter((l) => l.includes('progress'))
    .map((l) => l.split('→')[1].trim());
  const terminal = seen.length > 0 && seen[seen.length - 1].includes('progress') === false;
  console.log(
    progressStages.length >= 2 && terminal
      ? '✅ SMOKETEST OK — stades diffusés avant la ligne terminale (sync confirmée).'
      : '❌ SMOKETEST — séquence inattendue, à investiguer.'
  );
} finally {
  // 4) Cleanup: temp PDF + dev server if we spawned it.
  try {
    if (existsSync(pdfPath)) rmSync(pdfPath);
  } catch {}
  if (spawnedByUs && serverPid) {
    try {
      execSync(`taskkill /PID ${serverPid} /T /F`, { stdio: 'ignore' });
      console.log('dev server stopped (pid', serverPid + ')');
    } catch {}
  }
}
