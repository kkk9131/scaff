// 日本語コメント: 階層別の自動色パレット（視認性の高い配色）
export const FLOOR_WALL_COLORS = [
  '#35a2ff', // ブルー
  '#ff7a59', // コーラル
  '#6bd968', // グリーン
  '#f7c948', // イエロー
  '#b084eb', // パープル
  '#50e3c2', // ティール
] as const

export const FLOOR_EAVES_COLORS = [
  '#35a2ff',
  '#ff9f80',
  '#82e982',
  '#f9d66b',
  '#c7a6ff',
  '#70f0d6',
] as const

export function pickFloorColors(indexZeroBased: number) {
  const i = indexZeroBased % FLOOR_WALL_COLORS.length
  return { walls: FLOOR_WALL_COLORS[i], eaves: FLOOR_EAVES_COLORS[i] }
}

