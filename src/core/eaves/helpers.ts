// 日本語コメント: 軒の出（外側オフセット）描画のための共通ヘルパ
// 既存のCanvas/Previewの実装からロジックを移設し、挙動は変更しない。

import { intersectLines } from '@/core/geometry/lines'
import { outwardNormalModel } from '@/core/geometry/orientation'

export type Vec2 = { x: number; y: number }

export type OffsetLine = {
  a: Vec2
  b: Vec2
  u: Vec2 // 辺の単位方向ベクトル
  aOff: Vec2 // 外側へ平行移動した始点
  bOff: Vec2 // 外側へ平行移動した終点
  dist: number // 当該辺のオフセット距離
}

// 日本語コメント: 辺ごとのオフセット直線群を構築
export function buildOffsetLines(poly: Vec2[], perDistancesMm: number[], signedArea: number): OffsetLine[] {
  const n = poly.length
  const lines: OffsetLine[] = []
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    const v = { x: b.x - a.x, y: b.y - a.y }
    const L = Math.hypot(v.x, v.y) || 1
    const u = { x: v.x / L, y: v.y / L }
    const on = outwardNormalModel(u, signedArea)
    const d = perDistancesMm[i] || 0
    const off = { x: on.x * d, y: on.y * d }
    lines.push({ a, b, u, aOff: { x: a.x + off.x, y: a.y + off.y }, bOff: { x: b.x + off.x, y: b.y + off.y }, dist: d })
  }
  return lines
}

// 日本語コメント: 隣接辺のオフセット有無に応じて端点を交点で調整
export function adjustedSegmentEndpoints(lines: OffsetLine[], perDistancesMm: number[], index: number): { start: Vec2; end: Vec2 } {
  const n = lines.length
  const prev = (index + n - 1) % n
  const next = (index + 1) % n
  let start = lines[index].aOff
  let end = lines[index].bOff
  if ((perDistancesMm[prev] ?? 0) > 0) {
    const ip = intersectLines(lines[prev].aOff, lines[prev].u, lines[index].aOff, lines[index].u)
    if (ip) start = ip
  }
  if ((perDistancesMm[next] ?? 0) > 0) {
    const ip = intersectLines(lines[index].aOff, lines[index].u, lines[next].aOff, lines[next].u)
    if (ip) end = ip
  }
  return { start, end }
}

