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

  // IDを省略してURL長を削減（ランダムIDは圧縮が効かないため）
  const sharedData: SharedTierData = {
    title: state.title,
    tiers: state.tiers.map((tier) => ({
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
        .map(({ url, label }) => ({
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
      .map(({ url, label }) => ({ url, ...(label ? { label } : {}) })),
  };

  const compressed = compressToEncodedURIComponent(JSON.stringify(sharedData));

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  // hashのみに圧縮データを格納（?data=は不要 — OGPメタタグはpage.tsxのgenerateMetadataでhashから別途付与）
  const url = `${baseUrl}/?data=${compressed}`;
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
 * URLからデータを取得（queryパラメータ ?data= を使用）
 * 旧形式のhashフラグメントもfallbackとしてサポート
 */
export function getDataFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  // queryパラメータから取得（メイン）
  const params = new URLSearchParams(window.location.search);
  const data = params.get("data");
  if (data) return data;

  // fallback: 旧形式のhashフラグメント
  const hash = window.location.hash.slice(1);
  if (hash) return hash;

  return null;
}
