// 日本語コメント: 単位と座標系の基本ユーティリティを定義（画面解像度に依存しないmm基準）

export type Vec2 = { x: number; y: number }

// 日本語コメント: スケール定義。例: 1px = 5mm → pxPerMm = 1/5
export const DEFAULT_PX_PER_MM = 1 / 5 // 1px が 5mm を表す

// 日本語コメント: mm→px 変換（CSSピクセル前提）。描画はDPR補正後にCSS座標で行う。
export const mmToPx = (mm: number, pxPerMm: number = DEFAULT_PX_PER_MM) => mm * pxPerMm

// 日本語コメント: px→mm 変換（CSSピクセル前提）
export const pxToMm = (px: number, pxPerMm: number = DEFAULT_PX_PER_MM) => px / pxPerMm

// 日本語コメント: 座標系の約束事（原点と向き）。
// モデル座標系: 原点=キャンバス中心, +X=右, +Y=上。
export type CoordinateSystem = {
  origin: 'center'
  xPositive: 'right'
  yPositive: 'up'
}

export const DEFAULT_COORD_SYS: CoordinateSystem = {
  origin: 'center',
  xPositive: 'right',
  yPositive: 'up',
}

