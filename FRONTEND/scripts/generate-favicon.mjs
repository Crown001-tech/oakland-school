import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function createPng(size, drawPixel) {
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y, size);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const idatChunk = makeChunk('IDAT', zlib.deflateSync(raw));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(numImages, 4);

  let offset = 6 + numImages * 16;
  const entries = [];
  for (const { size, png } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0; // color palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(png.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.png)]);
}

// Oakland crest pixel drawing function
function drawOaklandCrest(x, y, size) {
  const normX = (x / (size - 1)) * 100;
  const normY = (y / (size - 1)) * 100;

  // Rounded rectangle bounds (radius = 20)
  const pad = 4;
  const r = 20;
  const inBox = normX >= pad && normX <= 100 - pad && normY >= pad && normY <= 100 - pad;
  if (!inBox) return [0, 0, 0, 0];

  const dx = normX < pad + r ? (pad + r) - normX : normX > 100 - pad - r ? normX - (100 - pad - r) : 0;
  const dy = normY < pad + r ? (pad + r) - normY : normY > 100 - pad - r ? normY - (100 - pad - r) : 0;
  if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0];

  // Border: gold/crimson accent
  const isBorder = (normX <= pad + 3 || normX >= 100 - pad - 3 || normY <= pad + 3 || normY >= 100 - pad - 3 || (dx * dx + dy * dy >= (r - 3) * (r - 3)));
  if (isBorder) return [180, 83, 9, 255]; // warm gold border

  // Base background: Deep Forest Emerald (#071512)
  let pr = 7, pg = 21, pb = 18;

  // Central Gothic Arch & Diamond
  // Top diamond (x: 41-59, y: 14-36)
  const dDist = Math.abs(normX - 50) + Math.abs(normY - 26);
  if (dDist <= 11) {
    return [220, 38, 38, 255]; // crimson diamond
  }

  // Arch outline
  const inArch = normY >= 30 && normY <= 82 && normX >= 25 && normX <= 75;
  if (inArch) {
    const archDistFromCenter = Math.abs(normX - 50);
    // Outer arch curve
    if (archDistFromCenter >= 18 && archDistFromCenter <= 23 && normY >= 35 && normY <= 75) {
      return [220, 38, 38, 255]; // arch pillar
    }
    // Book spine / pages in center (normX 35-65, normY 52-82)
    if (normY >= 52 && normY <= 82) {
      if (Math.abs(normX - 50) <= 2) {
        return [245, 158, 11, 255]; // gold book spine
      }
      if (normY >= 75 && normY <= 82 && archDistFromCenter <= 22) {
        return [245, 158, 11, 255]; // open pages bottom curve
      }
      if (archDistFromCenter <= 16 && normY >= 56 && normY <= 72) {
        // Inner crimson facet
        if (normY >= 62 && normY <= 66) return [220, 38, 38, 255];
        return [153, 0, 0, 255]; // deep crimson
      }
    }
  }

  return [pr, pg, pb, 255];
}

const png32 = createPng(32, drawOaklandCrest);
const png48 = createPng(48, drawOaklandCrest);
const png64 = createPng(64, drawOaklandCrest);

const icoBuf = createIco([
  { size: 32, png: png32 },
  { size: 48, png: png48 },
]);

// Write output files
const root = path.resolve('FRONTEND');
fs.writeFileSync(path.join(root, 'public', 'favicon.ico'), icoBuf);
fs.writeFileSync(path.join(root, 'src', 'app', 'favicon.ico'), icoBuf);
fs.writeFileSync(path.join(root, 'public', 'icon.png'), png64);
fs.writeFileSync(path.join(root, 'src', 'app', 'icon.png'), png64);

console.log('Successfully generated Oakland favicon.ico and icon.png!');

