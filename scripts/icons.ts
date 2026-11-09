import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Buffer) {
  const type = Buffer.from(name);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([size, type, data, crc]);
}
function rounded(
  x: number,
  y: number,
  left: number,
  top: number,
  width: number,
  height: number,
  r: number,
) {
  const dx = Math.max(left + r - x, 0, x - (left + width - r));
  const dy = Math.max(top + r - y, 0, y - (top + height - r));
  return (
    x >= left &&
    x <= left + width &&
    y >= top &&
    y <= top + height &&
    dx * dx + dy * dy <= r * r
  );
}
export function iconPng(size: number): Buffer {
  const scan = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let alpha = 0,
        white = 0;
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++) {
          const px = (x + (sx + 0.5) / 4) / size,
            py = (y + (sy + 0.5) / 4) / size;
          if (!rounded(px, py, 0.125, 0.125, 0.75, 0.75, 0.16)) continue;
          alpha++;
          const outline =
            rounded(px, py, 0.27, 0.3, 0.46, 0.38, 0.045) &&
            !rounded(px, py, 0.31, 0.34, 0.38, 0.3, 0.01);
          const line = px >= 0.35 && px <= 0.65 && py >= 0.74 && py <= 0.78;
          if (outline || line) white++;
        }
      const at = y * (size * 4 + 1) + 1 + x * 4;
      const color = alpha ? Math.round(32 + (white / alpha) * 223) : 0;
      scan[at] = scan[at + 1] = scan[at + 2] = color;
      scan[at + 3] = Math.round((alpha / 16) * 255);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scan, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
export async function writeIcons(directory: string) {
  await mkdir(directory, { recursive: true });
  for (const size of [16, 32, 48, 128])
    await writeFile(`${directory}/icon-${size}.png`, iconPng(size));
}
