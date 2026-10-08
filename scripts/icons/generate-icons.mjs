#!/usr/bin/env node
/**
 * SecondLook icon generator.
 *
 * Renders the brand mark (two overlapping squares — "a second look" — with a
 * lens point) as crisp PNGs for every surface the app needs:
 *
 *   src/app/icon.png             512 × 512   favicon served by the app router
 *   src/app/apple-icon.png       180 × 180   iOS home screen (solid tile)
 *   public/icons/icon-16.png      16 × 16    browser tab
 *   public/icons/icon-32.png      32 × 32    browser tab / retina
 *   public/icons/icon-192.png    192 × 192   PWA / Android
 *   public/icons/icon-512.png    512 × 512   PWA splash
 *   public/icons/icon-maskable-512.png       PWA maskable (safe-zone padding)
 *   public/icons/og-image.png   1200 × 630   social sharing card
 *
 * Usage:  node scripts/icons/generate-icons.mjs
 * Requires the `sharp` package (already a project dependency).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const INK = "#07110e";
const PAPER = "#fbfcf9";
const MINT = "#35d5b4";
const PINE = "#087f71";

/** The brand mark, transparent background, scaled to `size`. */
function markSvg(size, { padding = 0, background = null } = {}) {
  const inner = 64; // viewBox of the mark
  const scale = (size - padding * 2) / inner;
  const offset = padding;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""}
      <g transform="translate(${offset},${offset}) scale(${scale})">
        <rect x="6" y="6" width="34" height="34" fill="none" stroke="${MINT}" stroke-width="5"/>
        <rect x="24" y="24" width="34" height="34" fill="${INK}" stroke="${MINT}" stroke-width="5"/>
        <circle cx="41" cy="41" r="7.5" fill="${MINT}"/>
        <circle cx="43.5" cy="38.5" r="2.4" fill="${INK}"/>
      </g>
    </svg>`,
  );
}

/** Social card: night tile, engineering grid, mark left, accent bars right. */
function ogSvg(width = 1200, height = 630) {
  const grid = [40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 560, 600]
    .map((y) => `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${MINT}" stroke-opacity="0.06" stroke-width="1"/>`)
    .join("");
  const vgr = Array.from({ length: Math.floor(width / 60) }, (_, i) => (i + 1) * 60)
    .map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${MINT}" stroke-opacity="0.06" stroke-width="1"/>`)
    .join("");
  const markSize = 300;
  const mx = 150;
  const my = (height - markSize) / 2;
  const mark = markSvg(64).toString(); // reuse, then rescale below
  void mark;
  const scale = markSize / 64;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${INK}"/>
      ${grid}${vgr}
      <circle cx="${mx + markSize / 2}" cy="${my + markSize / 2}" r="240" fill="${MINT}" fill-opacity="0.08"/>
      <g transform="translate(${mx},${my}) scale(${scale})">
        <rect x="6" y="6" width="34" height="34" fill="none" stroke="${MINT}" stroke-width="5"/>
        <rect x="24" y="24" width="34" height="34" fill="${INK}" stroke="${MINT}" stroke-width="5"/>
        <circle cx="41" cy="41" r="7.5" fill="${MINT}"/>
        <circle cx="43.5" cy="38.5" r="2.4" fill="${INK}"/>
      </g>
      <rect x="560" y="218" width="470" height="10" fill="${MINT}"/>
      <rect x="560" y="252" width="330" height="30" fill="${PAPER}" fill-opacity="0.92"/>
      <rect x="560" y="306" width="410" height="30" fill="${PAPER}" fill-opacity="0.55"/>
      <rect x="560" y="360" width="250" height="30" fill="${PINE}"/>
      <rect x="560" y="420" width="140" height="6" fill="${MINT}" fill-opacity="0.8"/>
    </svg>`,
  );
}

const targets = [
  { file: "src/app/icon.png", size: 512, padding: 72, background: INK },
  { file: "src/app/apple-icon.png", size: 180, padding: 26, background: INK },
  { file: "public/icons/icon-16.png", size: 16, padding: 1, background: null },
  { file: "public/icons/icon-32.png", size: 32, padding: 2, background: null },
  { file: "public/icons/icon-192.png", size: 192, padding: 20, background: INK },
  { file: "public/icons/icon-512.png", size: 512, padding: 72, background: INK },
  // Maskable: extra padding so the mark survives the platform's circular crop.
  { file: "public/icons/icon-maskable-512.png", size: 512, padding: 118, background: INK },
];

for (const t of targets) {
  const out = join(root, t.file);
  mkdirSync(dirname(out), { recursive: true });
  await sharp(markSvg(t.size, { padding: t.padding, background: t.background }), { density: 300 })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`wrote ${t.file} (${t.size}×${t.size})`);
}

const ogOut = join(root, "public/icons/og-image.png");
await sharp(ogSvg(), { density: 144 }).png({ compressionLevel: 9 }).toFile(ogOut);
console.log("wrote public/icons/og-image.png (1200×630)");

const manifest = {
  name: "SecondLook",
  short_name: "SecondLook",
  description: "A standing third-party veto on autonomous payments.",
  start_url: "/",
  display: "standalone",
  background_color: PAPER,
  theme_color: INK,
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
writeFileSync(join(root, "public/manifest.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");
console.log("wrote public/manifest.webmanifest");
console.log("done.");
