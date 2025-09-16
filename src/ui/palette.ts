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

// 日本語コメント: フロア名称から階数を推定（例: 1F, 2Fバルコニー, B1F 等）
export function parseFloorLevelFromName(name: string): number | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const bf = trimmed.match(/^([Bb])\s*(\d+)\s*(?:F|階)/)
  if (bf) {
    return -Number(bf[2] ?? '0')
  }
  const plain = trimmed.match(/^(-?\d+)\s*(?:F|階)/i)
  if (plain) {
    return Number(plain[1])
  }
  return null
}

// 日本語コメント: 階数が分かる場合にその階で統一される色を返す
export function pickFloorColorsByName(name: string, fallbackIndex: number) {
  const level = parseFloorLevelFromName(name)
  if (level != null) {
    const paletteSize = FLOOR_WALL_COLORS.length
    // 1F→0, 2F→1, B1F(-1)→(paletteSize - 1) など周期的に割り当て
    const idx = ((level - 1) % paletteSize + paletteSize) % paletteSize
    return { walls: FLOOR_WALL_COLORS[idx], eaves: FLOOR_EAVES_COLORS[idx] }
  }
  return pickFloorColors(fallbackIndex)
}
