import type { TierRow, TierListState } from "@/types/tier";

export const DEFAULT_TIERS: TierRow[] = [
  { id: "tier-s", name: "S", color: "#FF6B6B", items: [] },
  { id: "tier-a", name: "A", color: "#FFA94D", items: [] },
  { id: "tier-b", name: "B", color: "#FFD43B", items: [] },
  { id: "tier-c", name: "C", color: "#69DB7C", items: [] },
  { id: "tier-d", name: "D", color: "#74C0FC", items: [] },
  { id: "tier-e", name: "E", color: "#B197FC", items: [] },
];

export const DEFAULT_STATE: TierListState = {
  title: "My Tier List",
  tiers: DEFAULT_TIERS.map((t) => ({ ...t, items: [] })),
  pool: [],
};

export const POOL_ID = "pool";

// 制約値
export const MAX_TIERS = 20;
export const MAX_ITEMS = 100;
export const MAX_TIER_NAME_LENGTH = 20;
export const MAX_TITLE_LENGTH = 50;
export const MAX_LABEL_LENGTH = 20;
export const MAX_IMAGE_URL_LENGTH = 2000;
export const MAX_SHARE_URL_LENGTH = 32000;
export const MAX_LOCAL_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Tierに追加する際のデフォルトカラーパレット
export const TIER_COLOR_PRESETS = [
  "#FF6B6B",
  "#FFA94D",
  "#FFD43B",
  "#69DB7C",
  "#74C0FC",
  "#B197FC",
  "#F06595",
  "#868E96",
];
