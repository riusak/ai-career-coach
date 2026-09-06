// One-shot: repairs double-encoded UTF-8 sequences (Windows-1252 mojibake)
// that leaked into a few source files (em dashes, bullets, accented literals).
// Run: node scripts/fix-mojibake.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'src/app/api/resume/match/route.ts',
  'src/app/dashboard/matching/MatchingReport.tsx',
  'src/app/reset-password/page.tsx',
  'src/app/verify/page.tsx',
];

/** Ordered longest-first: cp1252-mojibake sequence -> intended character. */
const PAIRS = [
  ['â€”', '—'],
  ['â€¢', '•'],
  ['â€™', '’'],
  ['â€¦', '…'],
  ['â€œ', '“'],
  ['â€\u009d', '”'],
  ['â€“', '–'],
  ['â†’', '→'],
  ['Ã©', 'é'],
  ['Ã¨', 'è'],
  ['Ãª', 'ê'],
  ['Ã«', 'ë'],
  ['Ã§', 'ç'],
  ['Ã¢', 'â'],
  ['Ã´', 'ô'],
  ['Ã»', 'û'],
  ['Ã¹', 'ù'],
  ['Ã®', 'î'],
  ['Ã¯', 'ï'],
  ['Ã‰', 'É'],
  ['Ãˆ', 'È'],
  ['ÃŠ', 'Ê'],
  ['Ã‡', 'Ç'],
  ['Ã\u00a0', 'à'],
];

for (const file of FILES) {
  let content = readFileSync(file, 'utf8');
  const before = content;
  for (const [from, to] of PAIRS) {
    content = content.split(from).join(to);
  }
  if (content !== before) {
    writeFileSync(file, content, 'utf8');
    console.log(`${file}: mojibake repaired`);
  } else {
    console.log(`${file}: nothing to fix`);
  }
}