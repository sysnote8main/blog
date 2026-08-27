# newblog

超軽量 TypeScript 静的ブログジェネレーター

## 機能

- Zero Client-Side JavaScript (ブラウザ側 JS 0 バイト)
- Zero External CDN (CSS はセルフホスティング)
- OS ネイティブダークモード (`prefers-color-scheme` 連動)
- Markdown → HTML (ビルド時変換)
- PrismJS シンタックスハイライト (ビルド時適用)
- タグ別ページ自動生成
- RSS 2.0 フィード自動出力

## 使い方

```bash
# 記事を書く (content/*.md)
# フロントマター: title, date, tags (カンマ区切り)

# ビルド
deno task build

# ローカルプレビュー
deno task serve

# ビルド + プレビュー
deno task dev
```

## ディレクトリ構成

```
.
├── content/          # Markdown 記事
│   ├── hello-world.md
│   └── typescript-tips.md
├── dist/             # ビルド出力 (Web サーバー配信ルート)
├── build.ts          # ビルドスクリプト (単一ファイル)
├── deno.json         # タスク定義
└── README.md
```

## 記事の書き方

`content/` 以下に `.md` ファイルを作成。フロントマターは YAML 形式:

```markdown
---
title: 記事タイトル
date: 2024-01-15
tags: typescript, programming
---

# 見出し

本文...
```

`tags` はカンマ区切りで複数指定可能。ビルド時に `dist/tags/` 以下にタグ別ページが自動生成される。
