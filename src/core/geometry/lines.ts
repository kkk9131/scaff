// 日本語コメント: 線分・直線ユーティリティ
// 無限直線の交点（2D）。方向ベクトルが平行に近い場合は null を返す。

export type Vec2 = { x: number; y: number }

export function crossZ(a: Vec2, b: Vec2): number { return a.x * b.y - a.y * b.x }

export function intersectLines(p1: Vec2, v1: Vec2, p2: Vec2, v2: Vec2, eps = 1e-8): Vec2 | null {
  const denom = crossZ(v1, v2)
  if (Math.abs(denom) < eps) return null
  const w = { x: p2.x - p1.x, y: p2.y - p1.y }
  const t = crossZ(w, v2) / denom
  return { x: p1.x + v1.x * t, y: p1.y + v1.y * t }
}

