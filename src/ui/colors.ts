// 線スタイルの共通カラー定義（UI全体で参照）
// 2026年モダンデザイン：グレーベースの建築プロ仕様カラーパレット

export const COLORS = {
  // 壁（主要形状）— 建築図面に適した高品質ブルー
  wall: '#3b82f6',

  // 補助線（SVGでのストロークに使用）— 洗練されたグレー
  helper: '#94a3b8',

  // Canvas用にアルファ含みで少し抑えた補助色
  helperCanvas: 'rgba(148,163,184,0.7)',

  // グリッド（非常に薄い表示）— より繊細な表現
  grid: 'rgba(248,250,252,0.04)',

  // 中心軸などのガイド — 品のあるグレー
  axis: 'rgba(148,163,184,0.4)',

  // アクティブ状態のアクセント
  accent: '#3b82f6',
  accentHover: '#2563eb',

  // 状態カラー
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // UI表面カラー
  surface: {
    canvas: '#0f1113',
    panel: '#18191b', 
    elevated: '#1f2023',
    hover: '#2a2b2e',
  },

  // ボーダーカラー
  border: {
    default: '#2a2b2e',
    subtle: '#1a1b1e',
    accent: '#3b82f6',
  },

  // テキストカラー
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    tertiary: '#94a3b8',
    muted: '#64748b',
  }
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
