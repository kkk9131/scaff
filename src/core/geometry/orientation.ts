// 日本語コメント: 2D幾何の基本ユーティリティ（向き/法線）を集約
// 目的: 画面座標/モデル座標における外側法線の決定や署名付き面積の重複実装を解消する

export type Vec2 = { x: number; y: number }

// 正規化
export function normalize(v: Vec2): Vec2 {
  const L = Math.hypot(v.x, v.y)
  if (L === 0) return { x: 0, y: 0 }
  return { x: v.x / L, y: v.y / L }
}

// 左/右法線（+90° / -90°）
export const leftNormal = (u: Vec2): Vec2 => ({ x: -u.y, y: u.x })
export const rightNormal = (u: Vec2): Vec2 => ({ x: u.y, y: -u.x })

// 署名付き面積（y軸の向きに依存せず、渡された座標系の定義に従う）
export function signedArea2D(points: Vec2[]): number {
  let a = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

// 画面座標（+Y=下）での外側法線: 面積<0（CW）→ 左法線, 面積>0（CCW）→ 右法線
export function outwardNormalScreen(u: Vec2, polygonArea: number): Vec2 {
  return polygonArea < 0 ? leftNormal(u) : rightNormal(u)
}

// モデル座標（+Y=上）での外側法線: 面積<0（CW）→ 左法線, 面積>0（CCW）→ 右法線
export function outwardNormalModel(u: Vec2, polygonArea: number): Vec2 {
  return polygonArea < 0 ? leftNormal(u) : rightNormal(u)
}

// 便宜関数: 画面座標用の面積（エイリアス）
export const signedAreaScreen = signedArea2D

