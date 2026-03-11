export type ItemSource = "url" | "local";

export interface Item {
  id: string;
  url: string;
  label?: string;
  source: ItemSource;
}

export interface TierRow {
  id: string;
  name: string;
  color: string;
  items: Item[];
}

export interface TierListState {
  title: string;
  tiers: TierRow[];
  pool: Item[];
}

// URL共有用（source: "local" を除外した構造）
export interface SharedItem {
  id: string;
  url: string;
  label?: string;
}

export interface SharedTierRow {
  id: string;
  name: string;
  color: string;
  items: SharedItem[];
}

export interface SharedTierData {
  title: string;
  tiers: SharedTierRow[];
  pool: SharedItem[];
}
