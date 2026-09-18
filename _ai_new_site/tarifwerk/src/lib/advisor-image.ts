export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageInfo = { contentType: "image/png" | "image/jpeg" | "image/webp"; width: number; height: number };

/** Inspect binary headers instead of trusting names or browser MIME declarations. */
export function inspectProfileImage(data: Buffer): ImageInfo | null {
  if (data.length < 24 || data.length > MAX_PROFILE_IMAGE_BYTES) return null;
  let info: ImageInfo | null = null;
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (data.length < 45 || data.readUInt32BE(8) !== 13 || data.toString("ascii", 12, 16) !== "IHDR" || data.toString("ascii", data.length - 8, data.length - 4) !== "IEND") return null;
    info = { contentType: "image/png", width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  } else if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    if (data[data.length - 2] !== 0xff || data[data.length - 1] !== 0xd9) return null;
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 0xff) return null;
      while (data[offset] === 0xff) offset++;
      const marker = data[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > data.length) return null;
      const length = data.readUInt16BE(offset);
      if (length < 2 || offset + length > data.length) return null;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 8) return null;
        info = { contentType: "image/jpeg", height: data.readUInt16BE(offset + 3), width: data.readUInt16BE(offset + 5) };
        break;
      }
      offset += length;
    }
  } else if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
    if (data.readUInt32LE(4) + 8 !== data.length) return null;
    const chunk = data.toString("ascii", 12, 16);
    const chunkSize = data.readUInt32LE(16);
    if (20 + chunkSize > data.length) return null;
    if (chunk === "VP8X" && chunkSize >= 10 && data.length >= 30) {
      info = { contentType: "image/webp", width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3) };
    } else if (chunk === "VP8 " && data.length >= 30 && data[23] === 0x9d && data[24] === 0x01 && data[25] === 0x2a) {
      info = { contentType: "image/webp", width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
    } else if (chunk === "VP8L" && data.length >= 25 && data[20] === 0x2f) {
      const dimensions = data.readUInt32LE(21);
      info = { contentType: "image/webp", width: 1 + (dimensions & 0x3fff), height: 1 + ((dimensions >>> 14) & 0x3fff) };
    }
  }
  if (!info || info.width < 1 || info.height < 1 || info.width > 8000 || info.height > 8000 || info.width * info.height > 20_000_000) return null;
  return info;
}
