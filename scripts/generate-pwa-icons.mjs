/**
 * One-shot: generates public/icons/*.png from public/favicon-light.svg for PWA manifest.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public/favicon-light.svg");
const outDir = join(root, "public/icons");

await mkdir(outDir, { recursive: true });

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(svgPath)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(join(outDir, `icon-${size}.png`));
}

// Maskable: extra padding for safe zone
const maskSize = 512;
const pad = Math.round(maskSize * 0.1);
const inner = maskSize - pad * 2;
await sharp(svgPath)
  .resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .extend({
    top: pad,
    bottom: pad,
    left: pad,
    right: pad,
    background: { r: 0, g: 48, b: 73, alpha: 1 },
  })
  .png()
  .toFile(join(outDir, "icon-maskable-512.png"));

console.log("Wrote icons to public/icons/");
