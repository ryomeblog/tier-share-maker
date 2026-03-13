import { type NextRequest, NextResponse } from "next/server";
import { deflateSync, inflateSync } from "zlib";
import * as jpeg from "jpeg-js";

// runtime removed - let OpenNext handle it

interface OgTier {
  name: string;
  color: string;
  items: { id: string; url: string; label?: string }[];
}

// lz-string の decompressFromEncodedURIComponent の最小実装
// Cloudflare Workers で lz-string の import が失敗するため自前実装
function decompressFromEncodedURIComponent(input: string): string | null {
  if (input == null || input === "") return null;
  const keyStr =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
  const baseReverseDic: Record<string, number> = {};
  for (let i = 0; i < keyStr.length; i++) {
    baseReverseDic[keyStr.charAt(i)] = i;
  }

  return _decompress(input.length, 32, (index: number) => {
    return baseReverseDic[input.charAt(index)];
  });
}

function _decompress(
  length: number,
  resetValue: number,
  getNextValue: (index: number) => number,
): string | null {
  const dictionary: string[] = [];
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = "";
  const result: string[] = [];
  let w: string;
  let bits: number;
  let maxpower: number;
  let power: number;
  let c: string;
  let data_val = getNextValue(0);
  let data_position = resetValue;
  let data_index = 1;

  for (let i = 0; i < 3; i++) {
    dictionary[i] = String(i);
  }

  bits = 0;
  maxpower = Math.pow(2, 2);
  power = 1;
  while (power !== maxpower) {
    const resb = data_val & data_position;
    data_position >>= 1;
    if (data_position === 0) {
      data_position = resetValue;
      data_val = getNextValue(data_index++);
    }
    bits |= (resb > 0 ? 1 : 0) * power;
    power <<= 1;
  }

  const next = bits;
  switch (next) {
    case 0:
      bits = 0;
      maxpower = Math.pow(2, 8);
      power = 1;
      while (power !== maxpower) {
        const resb = data_val & data_position;
        data_position >>= 1;
        if (data_position === 0) {
          data_position = resetValue;
          data_val = getNextValue(data_index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      c = String.fromCharCode(bits);
      break;
    case 1:
      bits = 0;
      maxpower = Math.pow(2, 16);
      power = 1;
      while (power !== maxpower) {
        const resb = data_val & data_position;
        data_position >>= 1;
        if (data_position === 0) {
          data_position = resetValue;
          data_val = getNextValue(data_index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      c = String.fromCharCode(bits);
      break;
    case 2:
      return "";
    default:
      return null;
  }

  dictionary[3] = c;
  w = c;
  result.push(c);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (data_index > length) return "";

    bits = 0;
    maxpower = Math.pow(2, numBits);
    power = 1;
    while (power !== maxpower) {
      const resb = data_val & data_position;
      data_position >>= 1;
      if (data_position === 0) {
        data_position = resetValue;
        data_val = getNextValue(data_index++);
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    let cc: number | string = bits;
    switch (cc) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power !== maxpower) {
          const resb = data_val & data_position;
          data_position >>= 1;
          if (data_position === 0) {
            data_position = resetValue;
            data_val = getNextValue(data_index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        cc = dictSize - 1;
        enlargeIn--;
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power !== maxpower) {
          const resb = data_val & data_position;
          data_position >>= 1;
          if (data_position === 0) {
            data_position = resetValue;
            data_val = getNextValue(data_index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        cc = dictSize - 1;
        enlargeIn--;
        break;
      case 2:
        return result.join("");
    }

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits);
      numBits++;
    }

    if (dictionary[cc as number]) {
      entry = dictionary[cc as number];
    } else {
      if (cc === dictSize) {
        entry = w + w.charAt(0);
      } else {
        return null;
      }
    }
    result.push(entry);

    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;

    if (enlargeIn === 0) {
      enlargeIn = Math.pow(2, numBits);
      numBits++;
    }

    w = entry;
  }
}

function decodeData(
  compressed: string,
): { title: string; tiers: OgTier[] } | null {
  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const data = JSON.parse(json);
    if (!data.title || !Array.isArray(data.tiers)) return null;
    return data;
  } catch {
    return null;
  }
}

const DEFAULT_TIERS: OgTier[] = [
  { name: "S", color: "#FF6B6B", items: [] },
  { name: "A", color: "#FFA94D", items: [] },
  { name: "B", color: "#FFD43B", items: [] },
  { name: "C", color: "#69DB7C", items: [] },
  { name: "D", color: "#74C0FC", items: [] },
  { name: "E", color: "#B197FC", items: [] },
];

// --- 画像デコード ---

interface DecodedImage {
  width: number;
  height: number;
  // RGBA pixel data
  data: Uint8Array;
}

// PNG デコーダー (zlib.inflateSync使用)
function decodePng(buf: Uint8Array): DecodedImage | null {
  try {
    // PNG signature check
    if (
      buf[0] !== 137 ||
      buf[1] !== 80 ||
      buf[2] !== 78 ||
      buf[3] !== 71
    ) {
      return null;
    }

    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idatChunks: Uint8Array[] = [];

    while (offset < buf.length) {
      const chunkLen =
        (buf[offset] << 24) |
        (buf[offset + 1] << 16) |
        (buf[offset + 2] << 8) |
        buf[offset + 3];
      const chunkType = String.fromCharCode(
        buf[offset + 4],
        buf[offset + 5],
        buf[offset + 6],
        buf[offset + 7],
      );

      if (chunkType === "IHDR") {
        width =
          (buf[offset + 8] << 24) |
          (buf[offset + 9] << 16) |
          (buf[offset + 10] << 8) |
          buf[offset + 11];
        height =
          (buf[offset + 12] << 24) |
          (buf[offset + 13] << 16) |
          (buf[offset + 14] << 8) |
          buf[offset + 15];
        bitDepth = buf[offset + 16];
        colorType = buf[offset + 17];
      } else if (chunkType === "IDAT") {
        idatChunks.push(buf.slice(offset + 8, offset + 8 + chunkLen));
      } else if (chunkType === "IEND") {
        break;
      }

      offset += 12 + chunkLen;
    }

    if (width === 0 || height === 0 || bitDepth !== 8) return null;

    // Combine IDAT chunks and inflate
    const totalLen = idatChunks.reduce((s, c) => s + c.length, 0);
    const combined = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of idatChunks) {
      combined.set(chunk, pos);
      pos += chunk.length;
    }

    const inflated = new Uint8Array(inflateSync(Buffer.from(combined)));

    // Determine bytes per pixel
    let bpp: number;
    switch (colorType) {
      case 0:
        bpp = 1;
        break; // Grayscale
      case 2:
        bpp = 3;
        break; // RGB
      case 4:
        bpp = 2;
        break; // Grayscale+Alpha
      case 6:
        bpp = 4;
        break; // RGBA
      default:
        return null; // Palette not supported
    }

    const scanlineLen = width * bpp;
    const rgba = new Uint8Array(width * height * 4);

    // Previous row for filter reconstruction
    const prevRow = new Uint8Array(scanlineLen);
    const curRow = new Uint8Array(scanlineLen);

    let inflatedOffset = 0;

    for (let y = 0; y < height; y++) {
      const filterType = inflated[inflatedOffset++];
      const rawRow = inflated.slice(
        inflatedOffset,
        inflatedOffset + scanlineLen,
      );
      inflatedOffset += scanlineLen;

      // Reconstruct filtered row
      for (let x = 0; x < scanlineLen; x++) {
        const a = x >= bpp ? curRow[x - bpp] : 0;
        const b = prevRow[x];
        const c2 = x >= bpp ? prevRow[x - bpp] : 0;
        let val = rawRow[x];

        switch (filterType) {
          case 0:
            break; // None
          case 1:
            val = (val + a) & 0xff;
            break; // Sub
          case 2:
            val = (val + b) & 0xff;
            break; // Up
          case 3:
            val = (val + ((a + b) >> 1)) & 0xff;
            break; // Average
          case 4:
            val = (val + paethPredictor(a, b, c2)) & 0xff;
            break; // Paeth
        }
        curRow[x] = val;
      }

      // Convert to RGBA
      for (let x = 0; x < width; x++) {
        const dstIdx = (y * width + x) * 4;
        switch (colorType) {
          case 0: // Grayscale
            rgba[dstIdx] = rgba[dstIdx + 1] = rgba[dstIdx + 2] = curRow[x];
            rgba[dstIdx + 3] = 255;
            break;
          case 2: // RGB
            rgba[dstIdx] = curRow[x * 3];
            rgba[dstIdx + 1] = curRow[x * 3 + 1];
            rgba[dstIdx + 2] = curRow[x * 3 + 2];
            rgba[dstIdx + 3] = 255;
            break;
          case 4: // Grayscale+Alpha
            rgba[dstIdx] =
              rgba[dstIdx + 1] =
              rgba[dstIdx + 2] =
                curRow[x * 2];
            rgba[dstIdx + 3] = curRow[x * 2 + 1];
            break;
          case 6: // RGBA
            rgba[dstIdx] = curRow[x * 4];
            rgba[dstIdx + 1] = curRow[x * 4 + 1];
            rgba[dstIdx + 2] = curRow[x * 4 + 2];
            rgba[dstIdx + 3] = curRow[x * 4 + 3];
            break;
        }
      }

      prevRow.set(curRow);
    }

    return { width, height, data: rgba };
  } catch {
    return null;
  }
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// JPEG デコーダー (jpeg-js使用)
function decodeJpeg(buf: Uint8Array): DecodedImage | null {
  try {
    const result = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 32 });
    return {
      width: result.width,
      height: result.height,
      data: result.data,
    };
  } catch {
    return null;
  }
}

// 画像バイナリからデコード
function decodeImage(buf: Uint8Array): DecodedImage | null {
  // PNG check
  if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) {
    return decodePng(buf);
  }
  // JPEG check (SOI marker)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    return decodeJpeg(buf);
  }
  return null;
}

// 画像をリサイズしてRGBAピクセルデータを返す (nearest neighbor)
function resizeImage(
  img: DecodedImage,
  targetW: number,
  targetH: number,
): DecodedImage {
  const data = new Uint8Array(targetW * targetH * 4);
  // center crop して resize
  const srcAspect = img.width / img.height;
  const dstAspect = targetW / targetH;
  let srcX = 0,
    srcY = 0,
    srcW = img.width,
    srcH = img.height;

  if (srcAspect > dstAspect) {
    // ソースが横長 → 左右をクロップ
    srcW = Math.floor(img.height * dstAspect);
    srcX = Math.floor((img.width - srcW) / 2);
  } else {
    // ソースが縦長 → 上下をクロップ
    srcH = Math.floor(img.width / dstAspect);
    srcY = Math.floor((img.height - srcH) / 2);
  }

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const sx = srcX + Math.floor((x * srcW) / targetW);
      const sy = srcY + Math.floor((y * srcH) / targetH);
      const srcIdx = (sy * img.width + sx) * 4;
      const dstIdx = (y * targetW + x) * 4;
      data[dstIdx] = img.data[srcIdx];
      data[dstIdx + 1] = img.data[srcIdx + 1];
      data[dstIdx + 2] = img.data[srcIdx + 2];
      data[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }

  return { width: targetW, height: targetH, data };
}

// 外部画像を取得・デコード
async function fetchAndDecodeImage(
  url: string,
): Promise<DecodedImage | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "TierListMaker-OGP/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 5 * 1024 * 1024) return null; // 5MB制限
    return decodeImage(new Uint8Array(arrayBuf));
  } catch {
    return null;
  }
}

// --- PNG生成ユーティリティ ---

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// CRC32テーブル
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const length = data.length;
  const chunk = new Uint8Array(12 + length);
  chunk[0] = (length >>> 24) & 0xff;
  chunk[1] = (length >>> 16) & 0xff;
  chunk[2] = (length >>> 8) & 0xff;
  chunk[3] = length & 0xff;
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const crcInput = new Uint8Array(4 + length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  const crcVal = crc32(crcInput);
  chunk[8 + length] = (crcVal >>> 24) & 0xff;
  chunk[9 + length] = (crcVal >>> 16) & 0xff;
  chunk[10 + length] = (crcVal >>> 8) & 0xff;
  chunk[11 + length] = crcVal & 0xff;
  return chunk;
}

// 5x7 ビットマップフォント
const FONT_5X7: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [4, 4, 4, 4, 0, 0, 4],
  "-": [0, 0, 0, 14, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0, 4],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 2, 4, 8, 31],
  "3": [14, 17, 1, 6, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 19, 17, 17, 14],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 17, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [14, 17, 16, 14, 1, 17, 14],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 10, 10, 4],
  W: [17, 17, 17, 17, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  a: [0, 0, 14, 1, 15, 17, 15],
  b: [16, 16, 22, 25, 17, 17, 30],
  c: [0, 0, 14, 16, 16, 17, 14],
  d: [1, 1, 13, 19, 17, 17, 15],
  e: [0, 0, 14, 17, 31, 16, 14],
  f: [6, 9, 8, 28, 8, 8, 8],
  g: [0, 0, 15, 17, 15, 1, 14],
  h: [16, 16, 22, 25, 17, 17, 17],
  i: [4, 0, 12, 4, 4, 4, 14],
  j: [2, 0, 6, 2, 2, 18, 12],
  k: [16, 16, 18, 20, 24, 20, 18],
  l: [12, 4, 4, 4, 4, 4, 14],
  m: [0, 0, 26, 21, 21, 17, 17],
  n: [0, 0, 22, 25, 17, 17, 17],
  o: [0, 0, 14, 17, 17, 17, 14],
  p: [0, 0, 30, 17, 30, 16, 16],
  q: [0, 0, 15, 17, 15, 1, 1],
  r: [0, 0, 22, 25, 16, 16, 16],
  s: [0, 0, 15, 16, 14, 1, 30],
  t: [8, 8, 28, 8, 8, 9, 6],
  u: [0, 0, 17, 17, 17, 19, 13],
  v: [0, 0, 17, 17, 17, 10, 4],
  w: [0, 0, 17, 17, 21, 21, 10],
  x: [0, 0, 17, 10, 4, 10, 17],
  y: [0, 0, 17, 17, 15, 1, 14],
  z: [0, 0, 31, 2, 4, 8, 31],
};

function drawText(
  pixels: Uint8Array,
  width: number,
  text: string,
  x: number,
  y: number,
  scale: number,
  r: number,
  g: number,
  b: number,
) {
  let cursorX = x;
  for (const ch of text) {
    const glyph = FONT_5X7[ch];
    if (!glyph) {
      cursorX += 6 * scale;
      continue;
    }
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row] & (1 << (4 - col))) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = cursorX + col * scale + sx;
              const py = y + row * scale + sy;
              if (px >= 0 && px < width && py >= 0) {
                const idx = (py * width + px) * 3;
                pixels[idx] = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
              }
            }
          }
        }
      }
    }
    cursorX += 6 * scale;
  }
}

function fillRect(
  pixels: Uint8Array,
  width: number,
  height: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  r: number,
  g: number,
  b: number,
) {
  for (let y = ry; y < ry + rh && y < height; y++) {
    for (let x = rx; x < rx + rw && x < width; x++) {
      if (x >= 0 && y >= 0) {
        const idx = (y * width + x) * 3;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
      }
    }
  }
}

// RGBA画像をRGBピクセルバッファに合成 (アルファブレンディング)
function compositeImage(
  pixels: Uint8Array,
  canvasWidth: number,
  img: DecodedImage,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const resized = resizeImage(img, dw, dh);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const px = dx + x;
      const py = dy + y;
      if (px < 0 || px >= canvasWidth || py < 0) continue;
      const srcIdx = (y * dw + x) * 4;
      const dstIdx = (py * canvasWidth + px) * 3;
      const alpha = resized.data[srcIdx + 3] / 255;
      if (alpha === 0) continue;
      pixels[dstIdx] = Math.round(
        resized.data[srcIdx] * alpha + pixels[dstIdx] * (1 - alpha),
      );
      pixels[dstIdx + 1] = Math.round(
        resized.data[srcIdx + 1] * alpha + pixels[dstIdx + 1] * (1 - alpha),
      );
      pixels[dstIdx + 2] = Math.round(
        resized.data[srcIdx + 2] * alpha + pixels[dstIdx + 2] * (1 - alpha),
      );
    }
  }
}

function isLightColor(color: string): boolean {
  return color === "#FFD43B" || color === "#69DB7C";
}

// Tier全体から画像URLを収集 (最大並列fetch数を制限)
async function fetchTierImages(
  tiers: OgTier[],
): Promise<Map<string, DecodedImage>> {
  const imageMap = new Map<string, DecodedImage>();
  const urls: string[] = [];

  for (const tier of tiers.slice(0, 6)) {
    for (const item of (tier.items || []).slice(0, 10)) {
      if (item.url && !urls.includes(item.url)) {
        urls.push(item.url);
      }
    }
  }

  // 最大10枚を並列fetch
  const limited = urls.slice(0, 10);
  const results = await Promise.allSettled(
    limited.map(async (url) => {
      const img = await fetchAndDecodeImage(url);
      if (img) {
        imageMap.set(url, img);
      }
    }),
  );
  // 結果は無視（失敗した画像はプレースホルダーになる）
  void results;

  return imageMap;
}

async function generatePng(title: string, tiers: OgTier[]): Promise<Uint8Array> {
  const width = 1200;
  const height = 630;
  const pixels = new Uint8Array(width * height * 3);

  // 背景色 #1a1a2e
  fillRect(pixels, width, height, 0, 0, width, height, 0x1a, 0x1a, 0x2e);

  // タイトル描画 (中央揃え)
  const titleScale = 5;
  const titleWidth = title.length * 6 * titleScale;
  const titleX = Math.max(0, Math.floor((width - titleWidth) / 2));
  drawText(pixels, width, title, titleX, 20, titleScale, 0xff, 0xff, 0xff);

  // 画像を並列fetch
  const imageMap = await fetchTierImages(tiers);

  // Tier行描画
  const displayTiers = tiers.slice(0, 6);
  const tierHeight = 63;
  const labelWidth = 70;
  const startY = 100;
  const gap = 4;
  const imgSize = tierHeight - 12;
  const imgPadding = 6;
  const imgGap = 4;

  displayTiers.forEach((tier, i) => {
    const y = startY + i * (tierHeight + gap);
    const [lr, lg, lb] = hexToRgb(tier.color);

    // ラベル背景
    fillRect(pixels, width, height, 60, y, labelWidth, tierHeight, lr, lg, lb);

    // ラベルテキスト
    const labelScale = 3;
    const labelTextWidth = tier.name.length * 6 * labelScale;
    const labelX = 60 + Math.floor((labelWidth - labelTextWidth) / 2);
    const labelY = y + Math.floor((tierHeight - 7 * labelScale) / 2);
    const [tr, tg, tb] = isLightColor(tier.color)
      ? [0x33, 0x33, 0x33]
      : [0xff, 0xff, 0xff];
    drawText(pixels, width, tier.name, labelX, labelY, labelScale, tr, tg, tb);

    // コンテンツ領域
    fillRect(
      pixels,
      width,
      height,
      60 + labelWidth,
      y,
      1080 - labelWidth,
      tierHeight,
      0x2a,
      0x2a,
      0x3e,
    );

    // アイテム画像を描画
    const items = (tier.items || []).slice(0, 10);
    items.forEach((item, j) => {
      const imgX = 60 + labelWidth + imgPadding + j * (imgSize + imgGap);
      const imgY = y + imgPadding;
      const decoded = imageMap.get(item.url);

      if (decoded) {
        // 実画像を描画
        compositeImage(pixels, width, decoded, imgX, imgY, imgSize, imgSize);
      } else {
        // プレースホルダー (グレー)
        fillRect(
          pixels,
          width,
          height,
          imgX,
          imgY,
          imgSize,
          imgSize,
          0x44,
          0x44,
          0x55,
        );
        drawText(pixels, width, "?", imgX + 18, imgY + 12, 3, 0x88, 0x88, 0x88);
      }
    });

    if (items.length === 0) {
      drawText(
        pixels,
        width,
        "-",
        60 + labelWidth + 15,
        y + Math.floor((tierHeight - 14) / 2),
        2,
        0x55,
        0x55,
        0x55,
      );
    }
  });

  // フッター
  fillRect(pixels, width, height, 0, 560, width, 70, 0x16, 0x21, 0x3e);
  const footerText = "Tier List Maker";
  const footerScale = 3;
  const footerWidth = footerText.length * 6 * footerScale;
  const footerX = Math.floor((width - footerWidth) / 2);
  drawText(
    pixels,
    width,
    footerText,
    footerX,
    578,
    footerScale,
    0xe9,
    0x45,
    0x60,
  );

  // PNG生成
  return encodePng(width, height, pixels);
}

function encodePng(
  width: number,
  height: number,
  rgb: Uint8Array,
): Uint8Array {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = new Uint8Array(13);
  ihdrData[0] = (width >>> 24) & 0xff;
  ihdrData[1] = (width >>> 16) & 0xff;
  ihdrData[2] = (width >>> 8) & 0xff;
  ihdrData[3] = width & 0xff;
  ihdrData[4] = (height >>> 24) & 0xff;
  ihdrData[5] = (height >>> 16) & 0xff;
  ihdrData[6] = (height >>> 8) & 0xff;
  ihdrData[7] = height & 0xff;
  ihdrData[8] = 8;
  ihdrData[9] = 2; // RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createPngChunk("IHDR", ihdrData);

  const rawData = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 3)] = 0;
    rawData.set(
      rgb.subarray(y * width * 3, (y + 1) * width * 3),
      y * (1 + width * 3) + 1,
    );
  }
  const compressed = deflateSync(Buffer.from(rawData));
  const idat = createPngChunk("IDAT", new Uint8Array(compressed));

  const iend = createPngChunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(
    signature.length + ihdr.length + idat.length + iend.length,
  );
  let offset = 0;
  png.set(signature, offset);
  offset += signature.length;
  png.set(ihdr, offset);
  offset += ihdr.length;
  png.set(idat, offset);
  offset += idat.length;
  png.set(iend, offset);

  return png;
}

export async function GET(request: NextRequest) {
  try {
    // URLSearchParams.get()は+をスペースに変換するため、生のURLから直接取得
    const url = new URL(request.url);
    const rawQuery = url.search.slice(1); // ?を除去
    const dataMatch = rawQuery.match(/(?:^|&)data=([^&]*)/);
    const compressed = dataMatch ? decodeURIComponent(dataMatch[1]) : null;

    let title = "Tier List";
    let tiers: OgTier[] = DEFAULT_TIERS;

    if (compressed) {
      const decoded = decodeData(compressed);
      if (decoded) {
        title = decoded.title;
        tiers = decoded.tiers;
      }
    }

    const png = await generatePng(title, tiers);

    return new NextResponse(Buffer.from(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    const png = await generatePng("Tier List Maker", DEFAULT_TIERS);
    return new NextResponse(Buffer.from(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
