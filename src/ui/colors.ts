// 線スタイルの共通カラー定義（UI全体で参照）
// - 壁（主要形状）: ネオンブルー
// - 補助（寸法線・補助線・リーダー線・軸など）: ライトグレー系

export const COLORS = {
  // 壁（主要形状）— ネオン寄りのブルー
  wall: '#35a2ff',

  // 補助線（SVGでのストロークに使用する無彩色）
  helper: '#b0bac5',

  // Canvas用にアルファ含みで少し抑えた補助色
  helperCanvas: 'rgba(176,186,197,0.6)',

  // グリッド（非常に薄い表示）
  grid: 'rgba(255,255,255,0.06)',

  // 中心軸などのガイド
  axis: 'rgba(176,186,197,0.35)'
} as const

export type ColorKeys = keyof typeof COLORS

