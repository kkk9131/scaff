import { outlineL, outlinePoly, outlineRect, outlineT, outlineU, type TemplateKind } from './model'
import type { FloorShape, FloorState } from './floors'
import type { Vec2 } from './units'
import { outwardNormalModel, signedArea2D } from './geometry/orientation'

// 日本語コメント: 立面図の向きを列挙（東西南北）。UIとロジックの双方で共有する。
export type ElevationDirection = 'north' | 'south' | 'east' | 'west'

// 日本語コメント: 立面図に描画する矩形片（水平スパン＋高さ範囲）。
export type ElevationRect = {
  floorId: string
  direction: ElevationDirection
  start: number
  end: number
  base: number
  top: number
  color?: string
}

// 日本語コメント: 立面図に必要な軸の範囲（水平と鉛直）。
export type ElevationBounds = {
  axisMin: number
  axisMax: number
  baseMin: number
  topMax: number
}

const DIR_VECTOR: Record<ElevationDirection, Vec2> = {
  north: { x: 0, y: 1 },
  south: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
}

// 日本語コメント: 立面方向ごとの水平軸を判定（北/南→X軸、東/西→Y軸）。
function axisForDirection(direction: ElevationDirection): 'x' | 'y' {
  return direction === 'north' || direction === 'south' ? 'x' : 'y'
}

// 日本語コメント: FloorShape から外周ポリゴンを取り出す。
function outlineFromShape(shape: FloorShape): Vec2[] {
  switch (shape.kind as TemplateKind) {
    case 'rect':
      return outlineRect(shape.data)
    case 'l':
      return outlineL(shape.data)
    case 'u':
      return outlineU(shape.data)
    case 't':
      return outlineT(shape.data)
    case 'poly':
      return outlinePoly(shape.data)
    default:
      return outlineRect({ widthMm: 8000, heightMm: 6000 })
  }
}

// 日本語コメント: モデル座標のポリゴンから、指定方向へ正対する辺を矩形スパンへ変換する。
export function computeElevationRectsForFloor(floor: FloorState, direction: ElevationDirection): ElevationRect[] {
  if (!floor.visible) return []
  const outline = outlineFromShape(floor.shape)
  if (!outline.length) return []
  const area = signedArea2D(outline)
  const dir = DIR_VECTOR[direction]
  const axis = axisForDirection(direction)
  const spans: Array<{ start: number; end: number }> = []

  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]
    const b = outline[(i + 1) % outline.length]
    const edge = { x: b.x - a.x, y: b.y - a.y }
    const normal = outwardNormalModel(edge, area)
    const dot = normal.x * dir.x + normal.y * dir.y
    if (dot > 1e-6) {
      const start = axis === 'x' ? Math.min(a.x, b.x) : Math.min(a.y, b.y)
      const end = axis === 'x' ? Math.max(a.x, b.x) : Math.max(a.y, b.y)
      if (Math.abs(end - start) > 1e-3) spans.push({ start, end })
    }
  }

  if (!spans.length) return []
  spans.sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = []
  for (const span of spans) {
    const last = merged[merged.length - 1]
    if (last && span.start <= last.end + 1e-3) {
      last.end = Math.max(last.end, span.end)
    } else {
      merged.push({ ...span })
    }
  }

  const base = floor.elevationMm
  const top = base + floor.heightMm
  return merged.map(span => ({
    floorId: floor.id,
    direction,
    start: span.start,
    end: span.end,
    base,
    top,
    color: floor.color?.walls,
  }))
}

// 日本語コメント: 複数階の立面矩形をまとめて計算。
export function computeElevationRects(floors: FloorState[], direction: ElevationDirection): ElevationRect[] {
  return floors.flatMap(f => computeElevationRectsForFloor(f, direction))
}

// 日本語コメント: 指定方向に対する水平軸と高さの範囲を求める。描画スケール計算に使用。
export function computeElevationBounds(floors: FloorState[], direction: ElevationDirection): ElevationBounds {
  const axis = axisForDirection(direction)
  let axisMin = Number.POSITIVE_INFINITY
  let axisMax = Number.NEGATIVE_INFINITY
  let baseMin = Number.POSITIVE_INFINITY
  let topMax = Number.NEGATIVE_INFINITY

  for (const floor of floors) {
    if (!floor.visible) continue
    const outline = outlineFromShape(floor.shape)
    for (const p of outline) {
      const value = axis === 'x' ? p.x : p.y
      axisMin = Math.min(axisMin, value)
      axisMax = Math.max(axisMax, value)
    }
    baseMin = Math.min(baseMin, floor.elevationMm)
    topMax = Math.max(topMax, floor.elevationMm + floor.heightMm)
  }

  if (!Number.isFinite(axisMin) || !Number.isFinite(axisMax)) {
    axisMin = -4000
    axisMax = 4000
  }
  if (!Number.isFinite(baseMin) || !Number.isFinite(topMax)) {
    baseMin = 0
    topMax = 3000
  }

  // 日本語コメント: 高さ範囲がゼロにならないよう最小幅を与える。
  if (Math.abs(axisMax - axisMin) < 1e-3) {
    axisMin -= 1000
    axisMax += 1000
  }
  if (Math.abs(topMax - baseMin) < 1e-3) {
    topMax = baseMin + 3000
  }

  return { axisMin, axisMax, baseMin, topMax }
}
