 # 寸法線＋数値の常時表示（各辺外側）/ Always-visible Dimension Lines (Outside Each Edge)
 
 本ドキュメントはフェーズ2の実装方針を示します。寸法線と数値を各辺の外側に常時表示し、ユーザーが図形を編集しても自動更新されることを目的とします。
 
 ## 目的 / Goal
 - 各辺の長さを即時に把握できるようにする
 - 図形編集（移動・拡大縮小・頂点移動）に追随して寸法表示を更新
 - 「外側」へのオフセット表示により図形と寸法の視認性を確保
 
 ## スコープ / Scope
 - 入力: 2点で構成される辺（Edge: a→b）配列
 - 出力: 寸法線（始点・終点・テキストアンカー・値・オフセット・向き）
 - UI レイヤではこの出力をキャンバス（例: Canvas/SVG/WebGL）に描画
 
## 幾何・配置の基本 / Geometry & Placement
- 辺ベクトル v = (b - a)
- 法線 n は v を 90°回転したもの（左法線）。外側基準は以下のいずれかで決定:
  - 多角形の頂点順（CW/CCW）から自動判定（画面座標系の署名付き面積）
    - shoelace で面積>0 を CCW、<0 を CW とみなす（SVGのy軸下向きを前提）
    - CCW の場合は外側=右法線、CW の場合は外側=左法線
  - 手動指定も可（左/右法線を明示）。UI から切替可能
 - 寸法線は辺と平行で、位置は a と b を n 方向へ一定オフセット移動
 - テキストアンカーは寸法線の中点 + 追加の微小オフセット
 
 ## 単位と書式 / Units & Formatting
 - 既定単位: `px`（今後 mm/cm へ拡張可能）
 - 小数桁: 0〜2 桁をオプション化（既定: 1）
 
## インターフェース / Interface
- コア: `src/core/dimensions/`
  - `dimension_model.ts`: モデル定義（Point, Edge, DimensionLine）
  - `dimension-engine.ts`: 配列の Edge から寸法線を生成、または `computeForPolygon(points)` で向き自動判定
 - テスト: `tests/core/dimensions/dimension_engine.spec.ts`（雛形）
 
## 次ステップ / Next Steps
- UI 層（`src/ui/`）での描画バインディング（実装済・SVGレンダラ）
- 単位変換・スケール（ズーム）対応
- ラベル衝突回避（実装済・外側方向へ段階オフセット）
 
 ---
 
 This document describes the plan for Phase 2. We will render dimension lines and values outside each edge and keep them updated during edits.
 
 - Input: Edges (a→b)
 - Output: DimensionLine objects (parallel line with offset and label anchor)
 - Default units: px, decimals optionized
 - Outside side: derived from polygon winding or default to left normal, with an option to flip
 
 See code scaffolds under `src/core/dimensions/`.
