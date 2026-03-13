import { type NextRequest, NextResponse } from "next/server";
import { deflateSync } from "zlib";

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
  // Length (4 bytes big-endian)
  chunk[0] = (length >>> 24) & 0xff;
  chunk[1] = (length >>> 16) & 0xff;
  chunk[2] = (length >>> 8) & 0xff;
  chunk[3] = length & 0xff;
  // Type (4 bytes)
  chunk.set(typeBytes, 4);
  // Data
  chunk.set(data, 8);
  // CRC32 over type + data
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

// 5x7 ビットマップフォント (ASCII 32-90の一部)
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
          // Draw scaled pixel
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

function isLightColor(color: string): boolean {
  return color === "#FFD43B" || color === "#69DB7C";
}

function generatePng(title: string, tiers: OgTier[]): Uint8Array {
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

  // Tier行描画
  const displayTiers = tiers.slice(0, 6);
  const tierHeight = 63;
  const labelWidth = 70;
  const startY = 100;
  const gap = 4;

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

    // アイテム数表示
    const itemCount = (tier.items || []).length;
    if (itemCount > 0) {
      const countText = `${itemCount} items`;
      drawText(
        pixels,
        width,
        countText,
        60 + labelWidth + 15,
        y + Math.floor((tierHeight - 14) / 2),
        2,
        0xaa,
        0xaa,
        0xaa,
      );
    } else {
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
  // PNG署名
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = new Uint8Array(13);
  ihdrData[0] = (width >>> 24) & 0xff;
  ihdrData[1] = (width >>> 16) & 0xff;
  ihdrData[2] = (width >>> 8) & 0xff;
  ihdrData[3] = width & 0xff;
  ihdrData[4] = (height >>> 24) & 0xff;
  ihdrData[5] = (height >>> 16) & 0xff;
  ihdrData[6] = (height >>> 8) & 0xff;
  ihdrData[7] = height & 0xff;
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createPngChunk("IHDR", ihdrData);

  // IDAT - フィルターバイト付きの生ピクセルデータをdeflate圧縮
  const rawData = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 3)] = 0; // filter: none
    rawData.set(
      rgb.subarray(y * width * 3, (y + 1) * width * 3),
      y * (1 + width * 3) + 1,
    );
  }
  const compressed = deflateSync(Buffer.from(rawData));
  const idat = createPngChunk("IDAT", new Uint8Array(compressed));

  // IEND
  const iend = createPngChunk("IEND", new Uint8Array(0));

  // 結合
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
    const { searchParams } = new URL(request.url);
    const compressed = searchParams.get("data");

    let title = "Tier List";
    let tiers: OgTier[] = DEFAULT_TIERS;

    if (compressed) {
      const decoded = decodeData(compressed);
      if (decoded) {
        title = decoded.title;
        tiers = decoded.tiers;
      }
    }

    const png = generatePng(title, tiers);

    return new NextResponse(Buffer.from(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    // フォールバック: シンプルなPNG
    const png = generatePng("Tier List Maker", DEFAULT_TIERS);
    return new NextResponse(Buffer.from(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
