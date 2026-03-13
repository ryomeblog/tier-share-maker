# CLAUDE.md — Tier List Maker

## プロジェクト概要

ブラウザ上でTier表を作成・共有できるWebアプリ。Next.js 16 (App Router) + Cloudflare Workers。

## 技術スタック

- **Next.js 16.1.6** (App Router, React 19, TypeScript 5)
- **Tailwind CSS v4** (PostCSS統合)
- **dnd-kit** (core v6, sortable v10) — D&D
- **lz-string** — URL圧縮
- **html-to-image** — PNG書き出し
- **jpeg-js** — OGP用JPEGデコード
- **@opennextjs/cloudflare** — ビルド
- **Cloudflare Workers** — デプロイ先

## ビルド・デプロイ

```bash
npm run dev              # ローカル開発 (localhost:3000)
npm run build            # Next.jsビルド
npm run build:cloudflare # CF Workers用ビルド (.open-next/)
npm run deploy           # wrangler deploy
npm run lint             # ESLint
npm run format           # Prettier
```

- CI/CD: `.github/workflows/deploy.yml` — mainブランチpushでCF Workersへ自動デプロイ
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx          # メインページ + 動的OGPメタタグ(generateMetadata)
│   ├── layout.tsx        # ルートレイアウト + デフォルトOGP
│   ├── globals.css       # Tailwind CSSインポート
│   └── api/og/route.tsx  # OGP画像生成 (純粋JS PNG生成)
├── components/
│   ├── TierListEditor.tsx  # メインコンテナ (DndContext, state管理)
│   ├── TierRowComponent.tsx # Tier行 (useDroppable)
│   ├── TierLabel.tsx       # Tier名編集 + カラーピッカー
│   ├── ItemCard.tsx        # ドラッグ可能アイテム (useSortable)
│   ├── ItemPool.tsx        # 未配置アイテム + URL/ファイル追加
│   └── ShareToolbar.tsx    # URLコピー/画像保存/リセット
├── lib/
│   ├── constants.ts     # 定数 (デフォルトTier, 制限値, カラープリセット)
│   ├── reducer.ts       # useReducer (10アクション)
│   └── share.ts         # URL共有 (encode/decode/getDataFromUrl)
└── types/
    └── tier.ts          # 型定義 (Item, TierRow, TierListState, SharedTierData)
```

## コーディング規約

- **Prettier:** ダブルクォート、セミコロンあり、trailingComma: "all"
- **言語:** UIテキストは日本語のみ
- **スタイル:** Tailwind CSSユーティリティクラス（カスタムCSS最小限）
- **状態管理:** useReducer（Redux不使用）
- **ID生成:** nanoid

## 重要な実装上の注意

### Cloudflare Workers 制約

- **lz-string**: CF Workers上でnpm importが失敗する。`/api/og/route.tsx`内にdecompressを自前実装済み
- **next/og (ImageResponse/Satori)**: CF Workers上で動作しない。純粋JS PNG生成で代替
- **@resvg/resvg-wasm**: Next.jsのWASMバンドルに問題あり。使用不可
- **edge runtime宣言**: `export const runtime = "edge"` を書くと500エラー。OpenNextに任せる

### URL共有の`+`文字問題

lz-stringの出力に`+`が含まれるが、URLクエリパラメータでは`+`=スペースに変換される。

- `page.tsx`: `encodeURIComponent(data)` で`+`→`%2B`にエンコード
- `/api/og/route.tsx`: `searchParams.get()`不使用。生URLから正規表現で抽出→`decodeURIComponent()`

### OGP画像生成

- PNG/JPEGを`fetch()`→デコード→ピクセル合成→PNG出力
- PNGデコード: 自前実装 (zlib.inflateSync + フィルタ復元)
- JPEGデコード: jpeg-js
- テキスト: 5x7ビットマップフォント（ASCIIのみ。日本語非対応）
- 画像fetch: 3秒タイムアウト、5MB上限、最大10枚並列

### D&D (dnd-kit)

- `rectIntersection` 衝突検知（closestCornersだと中央のみ反応する問題があった）
- MouseSensor + TouchSensor + KeyboardSensor を分離（PointerSensorはタッチ時に問題）
- TouchSensor: delay 250ms, tolerance 8px
- アイテムに `touch-action: none` 必須

## ドキュメント

- `計画.md` — アプリケーション仕様書 (v2.0)
- `doc/data-design.md` — データ設計書
- `doc/screen-design.md` — 画面設計書
- `doc/wireframe-*.svg` — ワイヤーフレーム
