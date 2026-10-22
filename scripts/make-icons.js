// Write public/icon-192.png and public/icon-512.png (LED-dot route bullet), no dependencies.
//   node scripts/make-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) raw.set(pixel(x, y), y * (size * 3 + 1) + 1 + x * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 16x16 dot grid; a red route bullet with a white "2" in the middle
const DIGIT = [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"];
function dotColor(cx, cy) {
  const gx = cx - 5, gy = cy - 4;
  if (gx >= 0 && gx < 5 && gy >= 0 && gy < 7 && DIGIT[gy][gx] === "#") return [242, 236, 255];
  const dx = cx - 7.5, dy = cy - 7.5;
  if (dx * dx + dy * dy <= 6.6 * 6.6) return [238, 53, 46];
  return [28, 28, 28];
}

for (const size of [192, 512]) {
  const pitch = size / 16;
  const buf = png(size, (x, y) => {
    const cx = Math.floor(x / pitch), cy = Math.floor(y / pitch);
    const ox = x - (cx + 0.5) * pitch, oy = y - (cy + 0.5) * pitch;
    return ox * ox + oy * oy <= (pitch * 0.42) ** 2 ? dotColor(cx, cy) : [0, 0, 0];
  });
  const file = path.join(__dirname, "..", "public", `icon-${size}.png`);
  fs.writeFileSync(file, buf);
  console.log("wrote", file);
}
