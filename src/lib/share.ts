import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import type { TierListState, SharedTierData } from "@/types/tier";
import { MAX_SHARE_URL_LENGTH } from "./constants";

/**
 * TierListState → 共有用URL文字列を生成
 * ローカル画像は除外される
 */
export function encodeStateToUrl(state: TierListState): {
  url: string;
  localImageCount: number;
  isOverLimit: boolean;
} {
  let localImageCount = 0;

  const sharedData: SharedTierData = {
    title: state.title,
    tiers: state.tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      color: tier.color,
      items: tier.items
        .filter((item) => {
          if (item.source === "local") {
            localImageCount++;
            return false;
          }
          return true;
        })
        .map(({ id, url, label }) => ({
          id,
          url,
          ...(label ? { label } : {}),
        })),
    })),
    pool: state.pool
      .filter((item) => {
        if (item.source === "local") {
          localImageCount++;
          return false;
        }
        return true;
      })
      .map(({ id, url, label }) => ({ id, url, ...(label ? { label } : {}) })),
  };

  const compressed = compressToEncodedURIComponent(JSON.stringify(sharedData));

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/?data=${compressed}#${compressed}`;
  const isOverLimit = url.length > MAX_SHARE_URL_LENGTH;

  return { url, localImageCount, isOverLimit };
}

/**
 * URL圧縮データ → SharedTierData にデコード
 */
export function decodeUrlToState(compressed: string): SharedTierData | null {
  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;

    const data = JSON.parse(json) as SharedTierData;

    // 基本バリデーション
    if (
      !data.title ||
      !Array.isArray(data.tiers) ||
      !Array.isArray(data.pool)
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * URLからデータを取得（hashまたはqueryパラメータ）
 */
export function getDataFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  // hashから取得を優先
  const hash = window.location.hash.slice(1);
  if (hash) return hash;

  // fallback: queryパラメータ
  const params = new URLSearchParams(window.location.search);
  return params.get("data");
}
