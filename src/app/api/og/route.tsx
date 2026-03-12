import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { decompressFromEncodedURIComponent } from "lz-string";
import type { SharedTierData } from "@/types/tier";

export const runtime = "edge";

const DEFAULT_TIERS = [
  { name: "S", color: "#FF6B6B" },
  { name: "A", color: "#FFA94D" },
  { name: "B", color: "#FFD43B" },
  { name: "C", color: "#69DB7C" },
  { name: "D", color: "#74C0FC" },
  { name: "E", color: "#B197FC" },
];

function decodeData(compressed: string): SharedTierData | null {
  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const data = JSON.parse(json) as SharedTierData;
    if (!data.title || !Array.isArray(data.tiers)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const compressed = searchParams.get("data");

  let data: SharedTierData | null = null;
  if (compressed) {
    data = decodeData(compressed);
  }

  const title = data?.title ?? "Tier List";
  const tiers =
    data?.tiers ?? DEFAULT_TIERS.map((t) => ({ ...t, id: t.name, items: [] }));

  // Tier行ごとの最大表示アイテム数
  const MAX_ITEMS_PER_TIER = 10;
  // 表示するTier行数の上限
  const MAX_TIERS_DISPLAY = 6;
  const displayTiers = tiers.slice(0, MAX_TIERS_DISPLAY);

  // Tier行の高さを計算
  const tierHeight = Math.min(70, Math.floor(380 / displayTiers.length));
  const itemSize = tierHeight - 12;
  const labelWidth = 60;

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1a1a2e",
        fontFamily: "sans-serif",
      }}
    >
      {/* タイトル */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 80,
          paddingTop: 20,
        }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          {title}
        </span>
      </div>

      {/* Tier行 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: "10px 60px",
          flex: 1,
        }}
      >
        {displayTiers.map((tier) => {
          const items = ("items" in tier ? tier.items : []).slice(
            0,
            MAX_ITEMS_PER_TIER,
          );
          const isLight = tier.color === "#FFD43B" || tier.color === "#69DB7C";

          return (
            <div
              key={tier.name}
              style={{
                display: "flex",
                height: tierHeight,
              }}
            >
              {/* ラベル */}
              <div
                style={{
                  width: labelWidth,
                  height: tierHeight,
                  backgroundColor: tier.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px 0 0 4px",
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: isLight ? "#333" : "#fff",
                  }}
                >
                  {tier.name}
                </span>
              </div>

              {/* アイテムエリア */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: "#2a2a3e",
                  borderRadius: "0 4px 4px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  paddingLeft: 8,
                  paddingRight: 8,
                }}
              >
                {items.map((item) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.url}
                    alt=""
                    width={itemSize}
                    height={itemSize}
                    style={{
                      borderRadius: 4,
                      objectFit: "cover",
                    }}
                  />
                ))}
                {items.length === 0 && (
                  <span style={{ color: "#555", fontSize: 12 }}>-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* フッター */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 70,
          backgroundColor: "#16213e",
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#e94560",
          }}
        >
          Tier List Maker
        </span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
