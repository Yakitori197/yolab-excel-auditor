/**
 * Rasterize the Open Graph banner (public/og-image.svg) into a 1200×630 PNG,
 * which social platforms (Facebook / Twitter / LinkedIn) prefer over SVG.
 *
 * Run with `npm run generate:og`. Deterministic: same SVG in, same PNG out.
 * Uses sharp (a dev-only dependency; it is not part of the deployed bundle).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = join(root, 'public', 'og-image.svg');
const pngPath = join(root, 'public', 'og-image.png');

const svg = readFileSync(svgPath);
// Render the SVG at 2× density for crispness, then normalize to exactly 1200×630.
const png = await sharp(svg, { density: 144 })
  .resize(1200, 630, { fit: 'fill' })
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(pngPath, png);

const meta = await sharp(png).metadata();
console.log(`Wrote public/og-image.png — ${meta.width}×${meta.height}, ${png.length} bytes`);
