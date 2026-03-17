import sharp from "sharp"

const MAX_WIDTH = 1200
const JPEG_QUALITY = 82
const WEBP_QUALITY = 82

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])

/**
 * Compress image buffer for stock listing photos. Resizes to max width and compresses.
 * Returns compressed buffer and extension (e.g. "webp"). Non-image buffers are returned as-is.
 */
export async function compressImageForStockListing(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; extension: string }> {
  if (!IMAGE_TYPES.has(mimeType)) {
    return { buffer, extension: "bin" }
  }

  try {
    const image = sharp(buffer)
    const meta = await image.metadata()
    const width = meta.width ?? 0
    const needResize = width > MAX_WIDTH

    // Prefer WebP for PNG (smaller); JPEG for others
    if (mimeType === "image/png") {
      const resized = needResize
        ? image.resize(MAX_WIDTH, undefined, { withoutEnlargement: true })
        : image;
      const out = await resized.webp({ quality: WEBP_QUALITY }).toBuffer();
      return { buffer: Buffer.from(out), extension: "webp" };
    }
    const resized = needResize
      ? image.resize(MAX_WIDTH, undefined, { withoutEnlargement: true })
      : image;
    const out = await resized
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    return { buffer: Buffer.from(out), extension: "jpg" };
  } catch (err) {
    console.warn("Image compression failed, using original:", err)
    return { buffer, extension: "jpg" }
  }
}
