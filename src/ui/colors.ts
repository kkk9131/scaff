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

// 日本語コメント: HEX(#RRGGBB)にアルファを適用してrgba()文字列を返す
export function withAlpha(hex: string, alpha: number): string {
  const m = hex.trim().match(/^#([0-9a-fA-F]{6})$/)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
