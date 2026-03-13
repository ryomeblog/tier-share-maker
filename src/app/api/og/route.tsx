import { type NextRequest, NextResponse } from "next/server";

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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isLightColor(color: string): boolean {
  return color === "#FFD43B" || color === "#69DB7C";
}

function buildSvg(title: string, tiers: OgTier[]): string {
  const displayTiers = tiers.slice(0, 6);
  const tierHeight = 63;
  const labelWidth = 60;
  const startY = 100;

  let tierRows = "";
  displayTiers.forEach((tier, i) => {
    const y = startY + i * (tierHeight + 4);
    const textColor = isLightColor(tier.color) ? "#333333" : "#ffffff";

    tierRows += `<rect x="60" y="${y}" width="${labelWidth}" height="${tierHeight}" rx="4" fill="${tier.color}"/>`;
    tierRows += `<text x="${60 + labelWidth / 2}" y="${y + tierHeight / 2 + 8}" text-anchor="middle" fill="${textColor}" font-size="24" font-weight="bold">${escapeXml(tier.name)}</text>`;
    tierRows += `<rect x="${60 + labelWidth}" y="${y}" width="${1080 - labelWidth}" height="${tierHeight}" fill="#2a2a3e"/>`;

    const items = (tier.items || []).slice(0, 10);
    items.forEach((item, j) => {
      const imgX = 60 + labelWidth + 8 + j * 56;
      const imgY = y + 6;
      const imgSize = tierHeight - 12;
      tierRows += `<image href="${escapeXml(item.url)}" x="${imgX}" y="${imgY}" width="${imgSize}" height="${imgSize}" preserveAspectRatio="xMidYMid slice"/>`;
    });

    if (items.length === 0) {
      tierRows += `<text x="${60 + labelWidth + 20}" y="${y + tierHeight / 2 + 4}" fill="#555555" font-size="12">-</text>`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#1a1a2e"/>
  <text x="600" y="65" text-anchor="middle" fill="#ffffff" font-size="36" font-weight="bold" font-family="sans-serif">${escapeXml(title)}</text>
  ${tierRows}
  <rect x="0" y="560" width="1200" height="70" fill="#16213e"/>
  <text x="600" y="602" text-anchor="middle" fill="#e94560" font-size="20" font-weight="bold" font-family="sans-serif">Tier List Maker</text>
</svg>`;
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

    const svg = buildSvg(title, tiers);

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#1a1a2e"/>
  <text x="600" y="330" text-anchor="middle" fill="#e94560" font-size="48" font-weight="bold" font-family="sans-serif">Tier List Maker</text>
</svg>`;

    return new NextResponse(fallback, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
