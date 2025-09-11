# Repository Guidelines（日本語）

## プロジェクト構成とモジュール整理
- 現状はドキュメント中心: `docs/`
  - `docs/作図エディタ要件定義書.md`
  - `docs/２D平面作図MVP 要件定義書.md`
  - `docs/開発ロードマップ.md`
- 今後コードを追加する場合は `src/` に実装、`tests/` にテスト、`assets/` に静的資産を配置。
  - 例: `src/core/`, `src/ui/`, `src/io/`

## ビルド・テスト・開発コマンド
- いまはビルド不要。`docs/` はエディタのMarkdownプレビューで確認。
- コード導入時は `README.md` にコマンドを定義。推奨初期値:
  - Node: `npm run dev`（起動）, `npm test`（ユニットテスト）, `npm run build`（本番ビルド）
  - Python: `uv run pytest -q`（テスト）, `uv run app.py`（起動）, `uvx ruff format`（整形）

## コーディング規約と命名
- インデント: JS/TS は2スペース、Python は4スペース。
- ファイル名: Web資産はケバブケース（`drawing-editor.ts`）、Python はスネークケース（`drawing_engine.py`）。
- ファイルは単一責務を徹底。小さく保ち再利用可能に。
- 整形/リンタ（導入後）: Prettier（JS/TS）、Ruff/Black（Python）。

## テスト方針
- テストは `tests/` に配置し、`src/` の構造をミラー。
- 命名: JS/TS は `*.spec.ts`/`*.test.ts`、Python は `test_*.py`。
- カバレッジ目標: 初期 ≥70%、MVP 凍結時 ≥85%。
- 迅速なユニットテストを優先。エディタ操作や幾何処理は結合テストも追加。

## コミットとプルリクエスト
- Conventional Commits を採用:
  - `feat: add rectangle tool`
  - `fix: correct hit-testing precision`
  - `docs: update 開発ロードマップ`
- PR 要件: 目的の説明、関連Issueのリンク、UI変更はスクリーンショット/GIF、テスト更新。
- 1PR は可能なら差分 ~300 行以内。大きい変更は分割。

## アーキテクチャ/ドキュメント優先
- `docs/` を単一の真実源として扱う。仕様更新とコード変更は同時に。
- 参照: `docs/作図エディタ要件定義書.md`（要件/設計）、`docs/２D平面作図MVP 要件定義書.md`（範囲）、`docs/開発ロードマップ.md`（マイルストーン）。

## セキュリティと設定
- 秘密情報をコミットしない。`.env.local` を使用し、`.env.example` を提供。
- `.gitignore` にローカル生成物（キャッシュ/ビルド/環境変数ファイル等）を追加。
