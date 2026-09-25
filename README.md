# CCDV-F 学習ノート

Claude Certified Developer – Foundations (CCDV-F) の出題ブループリントを目次にした学習用サイト。
ビルドもサーバも不要で、`docs/index.html` を開けば動く。

## 構成

| 場所 | 内容 |
|---|---|
| `docs/index.html` | トップ（配点・読む順番・公式のブループリント・全項目一覧・参考資料） |
| `docs/01-agents/` 〜 `docs/08-tools/` | ドメインごとの項。ディレクトリ名の番号は公式の Domain 番号 |
| `docs/09-summary/` | まとめ・例題・模擬試験 |
| `docs/assets/` | スタイル・スクリプト・検索インデックス・設問データ |
| `tools/` | 生成と静的チェック・ブラウザ実測 |

**1ファイル＝1項＝1画面。** 読む順は公式の番号順ではなく、前提の少ない順（`tools/site.mjs`）。

## 使い方

`docs/index.html` をブラウザで開くだけ。

- `/` キーまたはヘッダーのボタンで全文検索
- ヘッダーのアイコンでライト / ダーク切替
- 各ページの前後の送り（← → キー）で読み進める。左の目次からも移動できる（狭い画面では開閉式）

## 編集したら

```bash
mise run reindex   # 共通部の書き出し・検索インデックス・?v= の打ち直し（= ./tools/x reindex）
mise run check     # 静的チェック（exit 1 なら要修正）
mise run measure   # ブラウザ実測（見た目を変えたとき）
```

node はホストに入れず、docker 越しに回す（イメージの版は `mise.toml`）。
編集していいのは各節ファイルと `index.html` の `▼ 本文` 〜 `▲ 本文` のあいだだけ。

詳しい規約と過去の失敗は `CLAUDE.md` にある。**触る前に必ず読むこと。**
