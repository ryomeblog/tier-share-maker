# データ設計書

## 1. 型定義

### 1.1 コアデータ型

```typescript
// アイテムのソース種別
type ItemSource = "url" | "local";

// アイテム（Tier表に配置される画像1つ）
interface Item {
  id: string;          // ユニークID（例: "item-xxxx"）nanoid等で生成
  url: string;         // 画像URL（外部URL or blob: or data:）
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
```

---

## 3. Reducer アクション定義

```typescript
type TierListAction =
  | { type: "ADD_ITEM"; payload: { item: Item } }
  | { type: "REMOVE_ITEM"; payload: { itemId: string } }
  | { type: "MOVE_ITEM"; payload: {
      itemId: string;
      from: { containerId: string; index: number };
      to: { containerId: string; index: number };
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
https://domain.com/?data=<圧縮文字列>#<圧縮文字列>
```

### 4.2 デコードフロー

```
URL
  ↓ window.location.hash から "#" 以降を取得
圧縮文字列
  ↓ lz-string decompressFromEncodedURIComponent()
JSON文字列
  ↓ JSON.parse() + バリデーション
SharedTierData
  ↓ source: "url" を付与して変換
TierListState
```

### 4.3 バリデーションルール

```typescript
function validateSharedData(data: unknown): data is SharedTierData {
  // 1. オブジェクトであること
  // 2. title: string（最大50文字）
  // 3. tiers: 配列（最大20行）
  //    - 各tier: id, name(最大20文字), color(HEX), items(配列)
  //    - 各item: id, url(https://のみ, 最大2000文字), label?(最大20文字)
  // 4. pool: 配列
  // 5. 全アイテム合計100個以下
}
```

---

## 5. API エンドポイント

### 5.1 OGP画像生成 `/api/og`

```
GET /api/og?data=<compressedData>

Request:
  Query: data = lz-string圧縮文字列

Response:
  Content-Type: image/png
  Cache-Control: public, max-age=86400
  Body: 1200x630 PNG画像

処理フロー:
  1. query.data を decompressFromEncodedURIComponent()
  2. JSON.parse → SharedTierData
  3. 各アイテムのURLからfetchで画像取得 → Base64変換
  4. Satori で JSXテンプレート → SVG
  5. @resvg/resvg-wasm で SVG → PNG
  6. レスポンス返却
```

### 5.2 CORSプロキシ `/api/proxy-image`

```
GET /api/proxy-image?url=<encodedImageURL>

Request:
  Query: url = encodeURIComponent(画像URL)

Response:
  Content-Type: (元画像のContent-Typeを転送)
  Cache-Control: public, max-age=86400
  Body: 画像バイナリ

バリデーション:
  - url が https:// で始まること
  - Content-Type が image/* であること
  - レスポンスサイズ 5MB 以下
  - 同一IPから毎分60リクエスト以下
```

---

## 6. 制約・上限値一覧

| 項目 | 上限値 | 理由 |
|---|---|---|
| Tier行数 | 20行 | UI表示上限 |
| アイテム合計数 | 100個 | URL長・パフォーマンス |
| Tier名文字数 | 20文字 | UI表示幅 |
| タイトル文字数 | 50文字 | OGP表示幅 |
| ラベル文字数 | 20文字 | カード表示幅 |
| 画像URL長 | 2,000文字 | URL共有上限 |
| 共有URL全体長 | 約8,000文字 | ブラウザ上限 |
| ローカル画像サイズ | 5MB/枚 | メモリ制約 |
| プロキシ画像サイズ | 5MB | Workers制約 |
| プロキシレート | 60 req/min/IP | 悪用防止 |

---

## 7. 画面遷移・状態フロー

```
                    ┌─────────────┐
                    │   初回アクセス  │
                    │  (hash なし)  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  編集モード    │
                    │ (新規作成)    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌────────────┐ ┌────────┐ ┌─────────┐
       │ URLをコピー  │ │ 画像保存 │ │ リセット  │
       │ →クリップ   │ │ →PNG   │ │ →初期化  │
       │  ボード     │ │ ダウン   │ │         │
       └────────────┘ │ ロード   │ └─────────┘
                      └────────┘

        ┌─────────────┐
        │ 共有URLアクセス │
        │ (hash あり)   │
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │  閲覧モード    │───→「コピーして編集」
        │ (読み取り専用) │     → 編集モードへ遷移
        └─────────────┘
```

---

## 8. dnd-kit コンテナ構成

```
DndContext
├── SortableContext (pool)         containerId="pool"
│   └── SortableItem × n
├── SortableContext (tier-s)       containerId="tier-s"
│   └── SortableItem × n
├── SortableContext (tier-a)       containerId="tier-a"
│   └── SortableItem × n
├── ... (各Tier行ごとにSortableContext)
└── DragOverlay
    └── ItemCard (ドラッグ中のプレビュー)
```

### ドラッグイベントハンドラ

```typescript
// onDragStart: ドラッグ開始 → activeId をセット
// onDragOver:  コンテナ間移動 → MOVE_ITEM dispatch（暫定移動）
// onDragEnd:   ドロップ確定 → MOVE_ITEM dispatch（最終位置）
// onDragCancel: キャンセル → 元の位置に戻す
```
