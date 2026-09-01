/**
 * Dev-only asset tool: analyzes the ForPro AI brand logos and generates a
 * white monochrome variant (logo-contracted-white.png) for dark surfaces
 * (footer, admin sidebar).
 *
 * The white variant is produced by mapping every non-transparent pixel to
 * opaque white while preserving the original alpha channel.
 */
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';

const brandingDir = new URL('../public/branding/', import.meta.url);

async function analyze(name) {
  const file = new URL(name, brandingDir);
  const image = sharp(file.pathname.replace(/^\//, ''));
  const meta = await image.metadata();
  console.log(`\n=== ${name} ===`);
  console.log(`Size        : ${meta.width}x${meta.height}`);
  console.log(`Has alpha   : ${Boolean(meta.hasAlpha)}`);
  console.log(`Channels    : ${meta.channels}`);
  console.log(`Format      : ${meta.format}`);

  const { data } = await image.raw().toBuffer({ resolveWithObject: true });
  const opaque = [];
  const nonWhite = [];
  let transparent = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) {
      transparent += 1;
      continue;
    }
    if (opaque.length < 6) opaque.push(`rgba(${r},${g},${b},${a})`);
    // "non white" = pixel that is not clearly white on white
    if (r < 240 || g < 240 || b < 240) {
      if (nonWhite.length < 6) nonWhite.push(`rgba(${r},${g},${b},${a})`);
    }
  }
  const total = data.length / 4;
  console.log(`Transparent : ${((transparent / total) * 100).toFixed(1)}%`);
  console.log(`Samples     : ${opaque.join('  ')}`);
  console.log(`Non-white   : ${nonWhite.join('  ')}`);
}

async function generateWhite(name) {
  const file = new URL(name, brandingDir);
  const image = sharp(file.pathname.replace(/^\//, ''));
  const meta = await image.metadata();
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Pixel-by-pixel: keep alpha, force RGB to pure white.
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = a;
  }

  const target = new URL('logo-contracted-white.png', brandingDir);
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(target.pathname.replace(/^\//, ''));

  const outMeta = await sharp(target.pathname.replace(/^\//, '')).metadata();
  console.log(`\nGenerated: public/branding/logo-contracted-white.png`);
  console.log(`  ${outMeta.width}x${outMeta.height} · ${outMeta.format} · hasAlpha=${Boolean(outMeta.hasAlpha)}`);
}

const action = process.argv[2] ?? 'all';
try {
  const files = (await readdir(brandingDir)).filter((f) => f.endsWith('.png'));
  for (const f of files) {
    if (action === 'analyze') await analyze(f);
  }
  if (action === 'all' || action === 'generate') {
    await generateWhite('logo-contracted-light.png');
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}