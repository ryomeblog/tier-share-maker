import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

interface OgTier {
  name: string;
  color: string;
  items: { id: string; url: string; label?: string }[];
}

function decodeData(
  compressed: string,
): { title: string; tiers: OgTier[] } | null {
  try {
    // Dynamic import to avoid edge runtime issues
    const { decompressFromEncodedURIComponent } = require("lz-string");
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

    const displayTiers = tiers.slice(0, 6);
    const tierHeight = 63;
    const itemSize = 50;

    return new ImageResponse(
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1a1a2e",
        }}
      >
        {/* タイトル */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "80px",
            paddingTop: "20px",
          }}
        >
          <div
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {title}
          </div>
        </div>

        {/* Tier行 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "10px 60px",
          }}
        >
          {displayTiers.map((tier, tierIndex) => {
            const items = (tier.items || []).slice(0, 10);
            const isLight =
              tier.color === "#FFD43B" || tier.color === "#69DB7C";

            return (
              <div
                key={tierIndex}
                style={{
                  display: "flex",
                  height: `${tierHeight}px`,
                  marginBottom: "4px",
                }}
              >
                {/* ラベル */}
                <div
                  style={{
                    width: "60px",
                    height: `${tierHeight}px`,
                    backgroundColor: tier.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderTopLeftRadius: "4px",
                    borderBottomLeftRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 700,
                      color: isLight ? "#333333" : "#ffffff",
                    }}
                  >
                    {tier.name}
                  </div>
                </div>

                {/* アイテムエリア */}
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    backgroundColor: "#2a2a3e",
                    borderTopRightRadius: "4px",
                    borderBottomRightRadius: "4px",
                    alignItems: "center",
                    paddingLeft: "8px",
                  }}
                >
                  {items.length === 0 ? (
                    <div style={{ color: "#555555", fontSize: "12px" }}>-</div>
                  ) : (
                    items.map((item, itemIndex) => (
                      <img
                        key={itemIndex}
                        src={item.url}
                        width={itemSize}
                        height={itemSize}
                        style={{
                          borderRadius: "4px",
                          objectFit: "cover",
                          marginRight: "6px",
                        }}
                      />
                    ))
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
            height: "70px",
            backgroundColor: "#16213e",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#e94560",
            }}
          >
            Tier List Maker
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch {
    // エラー時はシンプルなフォールバック画像を返す
    return new ImageResponse(
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a2e",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "#e94560",
          }}
        >
          Tier List Maker
        </div>
      </div>,
      { width: 1200, height: 630 },
    );
  }
}
