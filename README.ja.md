 # ２D平面作図エディタ（作業ブランチ）
 
 このリポジトリは作図エディタの要件定義と実装を管理します。現時点ではドキュメント中心ですが、フェーズ2「寸法線＋数値の常時表示（各辺外側）」の実装着手に伴い、アプリコードのスキャフォールドを追加しました。
 
 - 実装ブランチ: `feat/phase2-dimensions-always-visible`
 - 対応項目: docs/開発ロードマップ.md のフェーズ2「寸法線＋数値の常時表示（各辺外側）」
 
 ## プロジェクト構成（抜粋）
 - `docs/` 仕様・設計文書
 - `src/` アプリケーションコード（今回の寸法線ロジックの骨組みを追加）
   - `src/core/dimensions/` 寸法線モデルと計算エンジン
 - `tests/` テスト（最小の雛形）
 - `activity.log` 作業ログ（日本語）
 
## 開発コマンド（暫定）
 ツールチェーンは未導入です。導入後に更新します。
 - Nodeの想定コマンド（予定）
   - 開発: `npm run dev`
   - テスト: `npm test`
   - ビルド: `npm run build`
 - Pythonの想定コマンド（予定）
   - テスト: `uv run pytest -q`
   - 実行: `uv run app.py`
   - フォーマット: `uvx ruff format`
 
## ドキュメント優先
コード変更時は `docs/` を先に更新・同期します。今回の方針は `docs/design/dimensions-always-visible.md` を参照してください。

## 動作確認（デモ）
ビルド不要のブラウザデモを同梱しています。

- ファイルを直接開く: `assets/demo-dimensions/index.html`
  - 矩形の頂点をドラッグすると、各辺の外側に寸法線と数値が常時更新されます。
  - 現状の単位は `px`、小数1桁の表示です。

- UIモジュール統合版（推奨）: `assets/demo-dimensions/index-ui.html`
  - `src/ui/svg/dimension-renderer.js` を利用した構成。オフセット・小数桁・外側判定（自動/CW/CCWに応じた外向き、または手動 左/右）をUIで変更可能。
  - ラベル衝突回避を内蔵（重なり検出時に外側へ段階的にオフセット）。
  - 将来的にエディタへ統合する際のベースとなるAPIです。

注意（ファイル直開きでボタンが反応しない場合）
- 一部ブラウザでは `type="module"` を使うページを `file://` で開くと、モジュール読込がCORS制限で失敗します。
- 対処方法:
  - その1: リポジトリルートで `python3 -m http.server 8000` を実行し、`http://localhost:8000/assets/demo-dimensions/index-ui.html` を開く
  - その2: モジュール不要のインライン版 `assets/demo-dimensions/index-ui-inline.html` を直接開く（file直開き対応）
