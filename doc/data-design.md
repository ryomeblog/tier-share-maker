# データ設計書

**更新日:** 2026年3月13日

## 1. 型定義

### 1.1 コアデータ型

```typescript
// アイテムのソース種別
type ItemSource = "url" | "local";

// アイテム（Tier表に配置される画像1つ）
interface Item {
  id: string;          // ユニークID（nanoidで生成）
  url: string;         // 画像URL（外部URL or blob:）
  label?: string;      // 任意ラベル（最大20文字）
  source: ItemSource;  // "url" = 外部URL, "local" = ローカルファイル
}

// Tier行
interface TierRow {
  id: string;          // ユニークID（例: "tier-s"）
  name: string;        // Tier名（最大20文字、例: "S"）
  color: string;       // 背景色（HEX形式、例: "#FF6B6B"）
  items: Item[];       // このTierに配置されたアイテム（順序あり）
}

// Tier表全体のステート
interface TierListState {
  title: string;       // Tier表タイトル（最大50文字）
  tiers: TierRow[];    // Tier行の配列（上から下への順序）
  pool: Item[];        // 未配置アイテム
}
```

### 1.2 共有用データ型（URL共有でエンコードされる構造）

```typescript
// source: "local" のアイテムを除外した共有用構造
interface SharedTierData {
  title: string;
  tiers: SharedTierRow[];
  pool: SharedItem[];
}

interface SharedTierRow {
  id: string;
  name: string;
  color: string;
  items: SharedItem[];
}

// 共有用アイテム（sourceフィールドなし・URLアイテムのみ）
interface SharedItem {
  id: string;
  url: string;         // 外部URLのみ
  label?: string;
}
```

### 1.3 OGP用データ型

```typescript
// OGPエンドポイント内部で使用（/api/og/route.tsx）
interface OgTier {
  name: string;
  color: string;
  items: { id: string; url: string; label?: string }[];
}

// 画像デコード結果
interface DecodedImage {
  width: number;
  height: number;
  data: Uint8Array;  // RGBA pixel data
}
```

---

## 2. デフォルト値

```typescript
const DEFAULT_TIERS: TierRow[] = [
  { id: "tier-s", name: "S", color: "#FF6B6B", items: [] },
  { id: "tier-a", name: "A", color: "#FFA94D", items: [] },
  { id: "tier-b", name: "B", color: "#FFD43B", items: [] },
  { id: "tier-c", name: "C", color: "#69DB7C", items: [] },
  { id: "tier-d", name: "D", color: "#74C0FC", items: [] },
  { id: "tier-e", name: "E", color: "#B197FC", items: [] },
];

const DEFAULT_STATE: TierListState = {
  title: "My Tier List",
  tiers: DEFAULT_TIERS,
  pool: [],
};

const POOL_ID = "pool";
```

---

## 3. Reducer アクション定義

```typescript
type TierListAction =
  | { type: "ADD_ITEM"; payload: { item: Item } }
  | { type: "REMOVE_ITEM"; payload: { itemId: string } }
  | { type: "MOVE_ITEM"; payload: {
      itemId: string;
      toContainerId: string;
      toIndex: number;
    }}
  | { type: "ADD_TIER"; payload?: { name?: string; color?: string } }
  | { type: "REMOVE_TIER"; payload: { tierId: string } }
  | { type: "RENAME_TIER"; payload: { tierId: string; name: string } }
  | { type: "CHANGE_TIER_COLOR"; payload: { tierId: string; color: string } }
  | { type: "SET_TITLE"; payload: { title: string } }
  | { type: "RESET" }
  | { type: "LOAD_FROM_URL"; payload: { data: SharedTierData } };
```

### コンテナID規則

| 場所 | containerId |
|---|---|
| プール | `"pool"` |
| Tier行 | Tierの `id`（例: `"tier-s"`） |

---

## 4. URL共有エンコード/デコード

### 4.1 エンコードフロー

```
TierListState
  ↓ フィルタリング（source: "local" を除外）
SharedTierData
  ↓ JSON.stringify()
JSON文字列
  ↓ lz-string compressToEncodedURIComponent()
圧縮文字列
  ↓ URL組み立て
https://domain/?data=<圧縮文字列>#<圧縮文字列>
```

### 4.2 デコードフロー（クライアント側）

```
URL
  ↓ window.location.hash から "#" 以降を取得（優先）
  ↓ fallback: searchParams.get("data")
圧縮文字列
  ↓ lz-string decompressFromEncodedURIComponent()
JSON文字列
  ↓ JSON.parse() + バリデーション
SharedTierData
  ↓ source: "url" を付与して変換
TierListState
```

### 4.3 デコードフロー（OGPエンドポイント）

```
Request URL
  ↓ 生URLから正規表現で ?data= パラメータ抽出
  ↓ （searchParams.get()は+をスペースに変換するため不使用）
  ↓ decodeURIComponent()
圧縮文字列
  ↓ 自前実装 decompressFromEncodedURIComponent()
  ↓ （CF Workersでlz-string npm importが失敗するため）
JSON文字列
  ↓ JSON.parse() + バリデーション
{ title, tiers: OgTier[] }
```

---

## 5. API エンドポイント

### 5.1 OGP画像生成 `/api/og`

```
GET /api/og?data=<compressedData>

Request:
  Query: data = lz-string圧縮文字列（+は%2Bでエンコード）

Response:
  Content-Type: image/png
  Cache-Control: public, max-age=86400
  Body: 1200x630 PNG画像

処理フロー:
  1. 生URLから正規表現でdataパラメータ抽出 → decodeURIComponent
  2. 自前lz-stringデコンプレッサでJSON復元
  3. 各アイテムのURLからfetch()で画像取得（並列、最大10枚、3秒タイムアウト）
  4. PNG: 自前デコーダ（zlib.inflateSync）/ JPEG: jpeg-jsでデコード
  5. center cropでリサイズ → RGBピクセルバッファに合成
  6. ビットマップフォントでタイトル・ラベル・フッター描画
  7. zlib.deflateSync でPNGエンコード → レスポンス返却

エラー時:
  フォールバック画像（デフォルトTier構成のPNG）を返却
```

---

## 6. 制約・上限値一覧

| 項目 | 上限値 | 定数名 |
|---|---|---|
| Tier行数 | 20行 | MAX_TIERS |
| アイテム合計数 | 100個 | MAX_ITEMS |
| Tier名文字数 | 20文字 | MAX_TIER_NAME_LENGTH |
| タイトル文字数 | 50文字 | MAX_TITLE_LENGTH |
| ラベル文字数 | 20文字 | MAX_LABEL_LENGTH |
| 画像URL長 | 2,000文字 | MAX_IMAGE_URL_LENGTH |
| 共有URL全体長 | 約8,000文字 | MAX_SHARE_URL_LENGTH |
| ローカル画像サイズ | 5MB/枚 | MAX_LOCAL_IMAGE_SIZE |
| OGP画像fetchタイムアウト | 3秒/枚 | ハードコード |
| OGP画像fetchサイズ上限 | 5MB/枚 | ハードコード |
| OGP画像fetch最大枚数 | 10枚 | ハードコード |

---

## 7. dnd-kit コンテナ構成

```
DndContext
  sensors: [MouseSensor(distance:5), TouchSensor(delay:250, tolerance:8), KeyboardSensor]
  collisionDetection: rectIntersection
  ├── useDroppable (tier-s) + SortableContext
  │   └── useSortable(ItemCard) × n  [touch-action: none]
  ├── useDroppable (tier-a) + SortableContext
  │   └── useSortable(ItemCard) × n
  ├── ...
  ├── SortableContext (pool)
  │   └── useSortable(ItemCard) × n
  └── DragOverlay
      └── ItemCard（ドラッグ中プレビュー）
```

### ドラッグイベントハンドラ

- `onDragStart`: activeItemをセット（findItem）
- `onDragOver`: コンテナ間移動 → MOVE_ITEM dispatch
- `onDragEnd`: 同一コンテナ内並び替え → MOVE_ITEM dispatch、activeItemクリア

---

## 8. カラーパレット

### テーマカラー

| 用途 | カラーコード |
|---|---|
| 背景（メイン） | `#1a1a2e` |
| 背景（ヘッダー/フッター） | `#16213e` |
| 背景（Tierコンテンツ） | `#2a2a3e` |
| アクセント | `#e94560` |
| プライマリボタン | `#0f3460` |
| テキスト（メイン） | `#ffffff` |
| テキスト（サブ） | `#aaaaaa` |
| テキスト（プレースホルダー） | `#555555` |
| ボーダー | `#333333` |

### Tier背景色プリセット

`#FF6B6B`, `#FFA94D`, `#FFD43B`, `#69DB7C`, `#74C0FC`, `#B197FC`, `#FF8787`, `#DA77F2`
