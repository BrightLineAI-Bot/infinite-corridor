// Minimal PNG decoder (8-bit RGB/RGBA/palette/grey, non-interlaced) for sampling a source texture's colours at build time.
import { inflateSync } from 'node:zlib';

export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0, palette = null, trns = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), name = buf.subarray(pos + 4, pos + 8).toString('latin1'), data = buf.subarray(pos + 8, pos + 8 + len);
    if (name === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; interlace = data[12]; }
    else if (name === 'PLTE') palette = data;
    else if (name === 'tRNS') trns = data;
    else if (name === 'IDAT') idat.push(data);
    else if (name === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error('unsupported PNG layout');
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type], raw = inflateSync(Buffer.concat(idat)), stride = w * ch, out = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (type === 3) { const k = cur[x]; out[o] = palette[k * 3]; out[o + 1] = palette[k * 3 + 1]; out[o + 2] = palette[k * 3 + 2]; out[o + 3] = trns && k < trns.length ? trns[k] : 255; }
      else if (ch <= 2) { out[o] = out[o + 1] = out[o + 2] = cur[x * ch]; out[o + 3] = ch === 2 ? cur[x * ch + 1] : 255; }
      else { out[o] = cur[x * ch]; out[o + 1] = cur[x * ch + 1]; out[o + 2] = cur[x * ch + 2]; out[o + 3] = ch === 4 ? cur[x * ch + 3] : 255; }
    }
    [prev, cur] = [cur, prev];
  }
  return { width: w, height: h, pixels: out };
}

export function samplePng(img, u, v) {
  const x = Math.max(0, Math.min(img.width - 1, Math.floor((u - Math.floor(u)) * img.width)));
  const y = Math.max(0, Math.min(img.height - 1, Math.floor((v - Math.floor(v)) * img.height)));
  const o = (y * img.width + x) * 4;
  return [img.pixels[o] / 255, img.pixels[o + 1] / 255, img.pixels[o + 2] / 255];
}
