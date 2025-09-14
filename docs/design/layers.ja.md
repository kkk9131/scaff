# 階層管理（レイヤー） 設計メモ（Phase 2）

本ドキュメントはレイヤー（表示ON/OFF・ロック・描画順）の要件・UX・内部設計を示す。

## スコープ
- 最小対象レイヤー: `grid`（グリッド）, `guides`（ガイド）, `walls`（壁）, `eaves`（軒の出）, `dims`（寸法）
- 機能: 表示ON/OFF（目のアイコン）、ロック（編集不可）、描画順（当面固定順）
- 保存: Phase 5 で対応（現段は一時状態）

## 要件（UX/挙動）
- サイドバーに「レイヤー」セクションを追加し、各レイヤーの可視・ロックを切替
- ロック中のレイヤーはヒットテスト対象外（カーソル変更やクリック編集不可）
- 表示OFFのレイヤーは描画されない（寸法・軒の出も非表示）
- 描画順（下→上）: `grid` → `guides` → `walls` → `eaves` → `dims`

## 内部設計
- 状態
  - `layers: { [id in 'grid'|'guides'|'walls'|'eaves'|'dims']: { visible: boolean, locked: boolean } }`
  - 既定: grid=visible, guides=visible, walls=visible, eaves=visible, dims=visible（locked=false）
- Canvas統合
  - 各描画ブロックの先頭で `if (!layers.X.visible) return` を適用
  - ヒットテスト前に `layers.X.locked` を確認しスキップ
  - 既存の描画順序に合わせたセクション配置

## API/イベント（案）
- `onToggleLayer(id, patch)` visible/locked の部分更新
- 将来: レイヤー追加/削除、並べ替え（ドラッグ&ドロップ）

## 受け入れ基準
- レイヤーの表示ON/OFF/ロックが即座にキャンバスと編集挙動に反映される
- 描画順が固定順で安定

## 実装計画（最小）
1. Page に `layers` 状態を追加、Sidebar にレイヤーUI（目/鍵）を追加
2. CanvasArea に `layers` を渡し、描画・ヒットテストの分岐を実装
3. 保存はPhase 5で `layers` をJSONへ（今回対象外）

