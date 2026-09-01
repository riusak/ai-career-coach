/**
 * One-off helper: generates a minimal text-based sample CV PDF for local
 * end-to-end testing of the /api/quick-test pipeline (no dependencies).
 * Simulates a Word-style export: WinAnsi octal escapes (\222 = right single
 * quote) and an embedded TrueType font subset (binary stream) that the
 * extractor must skip. Usage: node scripts/make-sample-cv.mjs [output-path]
 */

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const outPath = process.argv[2] ?? 'sample-cv.pdf';

const lines = [
  'Marie Martin',
  'marie.martin@email.fr - +33 6 98 76 54 32 - linkedin.com/in/mariemartin',
  '',
  'Experience',
  '- Developpe une plateforme e-commerce ayant augmente les ventes de 35%.',
  '- Pilot\\222equipe de 6 personnes et reduit les delais de livraison de 20%.',
  '- Concu et optimise l\\222architecture cloud, reduit les couts de 15%.',
  '- Automatise le deploiement CI/CD et ameliore la frequence de release de 40%.',
  '',
  'Formation',
  'Master Informatique - Universite de Lyon, 2018.',
  '',
  'Competences',
  'TypeScript, React, Node.js, AWS, Docker, Kubernetes.',
  '',
  'Langues',
  'Francais (natif), Anglais (courant).',
];

// Escape parentheses only — backslashes here carry octal escapes (\222).
const esc = (s) => s.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const content = [
  'BT',
  '/F1 12 Tf',
  '72 720 Td',
  '16 TL',
  ...lines.map((l) => `(${esc(l)}) Tj T*`),
  'ET',
].join('\n');

const objects = [
  Buffer.from('<< /Type /Catalog /Pages 2 0 R >>\n', 'latin1'),
  Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n', 'latin1'),
  Buffer.from(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n',
    'latin1'
  ),
  Buffer.from(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\n`, 'latin1'),
  Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n', 'latin1'),
];

// Embedded font subset (FontFile2-like): binary junk with string-looking
// tokens but no BT…ET operators — must be ignored by the extractor.
const fontBinary = Buffer.concat([
  Buffer.from('(\\226junk\\001\\002tokens) Tj <FFFE0102> d0 ', 'latin1'),
  Buffer.from(Array.from({ length: 512 }, (_, i) => (i * 37 + 11) % 256)),
]);
const fontPayload = deflateSync(fontBinary);
objects.push(
  Buffer.concat([
    Buffer.from(
      `<< /Length ${fontPayload.length} /Length1 4096 /Filter /FlateDecode >>\nstream\n`,
      'latin1'
    ),
    fontPayload,
    Buffer.from('\nendstream\n', 'latin1'),
  ])
);

const chunks = [Buffer.from('%PDF-1.4\n', 'latin1')];
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(Buffer.concat(chunks), 'latin1'));
  chunks.push(Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), body, Buffer.from('endobj\n', 'latin1'));
});
const xrefOffset = Buffer.byteLength(Buffer.concat(chunks), 'latin1');
const entries = offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
chunks.push(
  Buffer.from(
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${entries}` +
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    'latin1'
  )
);

const pdf = Buffer.concat(chunks);
writeFileSync(outPath, pdf, 'latin1');
console.info(`Sample CV written to ${outPath} (${pdf.length} bytes)`);