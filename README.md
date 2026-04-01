# Tier Share Maker

ブラウザ上でTier表（ティアリスト）を作成・共有できるWebアプリケーションです。

ドラッグ&ドロップで画像をTierに配置し、作成したTier表をURLで共有したり、画像として保存できます。

## 主な機能

- **Tier表の作成** — 画像をドラッグ&ドロップでTierに配置
- **画像の追加** — URL入力またはファイルアップロード
- **Tier行のカスタマイズ** — ラベル名・色の変更、行の追加・削除・並び替え
- **URL共有** — 作成したTier表をURLに圧縮して共有（サーバー保存不要）
- **画像保存** — Tier表をPNG画像として書き出し
- **OGP対応** — 共有URLにTier表のプレビュー画像を自動生成
- **レスポンシブ対応** — PC・スマートフォンの両方で操作可能

## 技術スタック

| カテゴリ          | 技術                                              |
| ----------------- | ------------------------------------------------- |
| フレームワーク    | Next.js 16 (App Router) / React 19 / TypeScript 5 |
| スタイリング      | Tailwind CSS v4                                   |
| ドラッグ&ドロップ | dnd-kit (core v6, sortable v10)                   |
| URL圧縮           | lz-string                                         |
| 画像書き出し      | html-to-image                                     |
| デプロイ先        | Cloudflare Workers (@opennextjs/cloudflare)       |

## セットアップ

### 前提条件

- Node.js 22+
- npm

### インストール

```bash
git clone https://github.com/<your-username>/tier-share-maker.git
cd tier-share-maker
npm install
```

### ローカル開発

```bash
npm run dev
```

http://localhost:3000 でアプリが起動します。

## コマンド一覧

| コマンド                   | 説明                                  |
| -------------------------- | ------------------------------------- |
| `npm run dev`              | ローカル開発サーバー起動              |
| `npm run build`            | Next.js プロダクションビルド          |
| `npm run build:cloudflare` | Cloudflare Workers 用ビルド           |
| `npm run preview`          | Cloudflare Workers ローカルプレビュー |
| `npm run deploy`           | Cloudflare Workers へデプロイ         |
| `npm run lint`             | ESLint 実行                           |
| `npm run format`           | Prettier でコードフォーマット         |

## デプロイ

mainブランチへのpushで GitHub Actions 経由で Cloudflare Workers に自動デプロイされます。

### 必要なシークレット

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## プロジェクト構成

```
src/
├── app/
│   ├── page.tsx            # メインページ + 動的OGPメタタグ
│   ├── layout.tsx          # ルートレイアウト
│   ├── globals.css         # Tailwind CSS
│   └── api/og/route.tsx    # OGP画像生成API
├── components/
│   ├── TierListEditor.tsx  # メインコンテナ (状態管理・D&D)
│   ├── TierRowComponent.tsx # Tier行
│   ├── TierLabel.tsx       # Tier名・色編集
│   ├── ItemCard.tsx        # ドラッグ可能なアイテム
│   ├── ItemPool.tsx        # 未配置アイテムプール
│   └── ShareToolbar.tsx    # 共有・保存ツールバー
├── lib/
│   ├── constants.ts        # 定数定義
│   ├── reducer.ts          # useReducer アクション定義
│   └── share.ts            # URL共有 (エンコード/デコード)
└── types/
    └── tier.ts             # 型定義
```
