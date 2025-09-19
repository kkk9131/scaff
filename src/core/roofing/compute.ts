// 日本語コメント: 屋根形状の計算（外形・棟/谷の骨組み）。初期はフラット対応とスケルトンのみ。
import type { FloorState } from '@/core/floors'
import { outlineRect, outlineL, outlineU, outlineT, outlinePoly } from '@/core/model'
import type { Vec2 } from '@/core/units'
import { offsetPolygonOuterVariable, signedArea as signedAreaModel } from '@/core/eaves/offset'
import type { RoofUnit } from './types'

// 日本語コメント: footprint から基準外形（eaves 未反映）を取得
export function resolveFootprintPolygon(floor: FloorState, roof: RoofUnit): Vec2[] {
  if (roof.footprint.kind === 'polygon') {
    return roof.footprint.polygon.map(p => ({ ...p }))
  }
  const k = floor.shape.kind
  const d: any = (floor.shape as any).data
  return k === 'rect' ? outlineRect(d)
    : k === 'l' ? outlineL(d)
    : k === 'u' ? outlineU(d)
    : k === 't' ? outlineT(d)
    : outlinePoly(d)
}

// 日本語コメント: eaves を反映した外形を生成（辺別の perEdge を尊重）。外周=CCW に正規化。
export function applyEavesOffset(base: Vec2[], floor: FloorState, roof?: RoofUnit): Vec2[] {
  const n = base.length
  if (n < 3) return base.slice()
  const def = floor.eaves?.amountMm ?? 0
  const perEdge = floor.eaves?.perEdge ?? {}
  const override = roof?.eavesOverride ?? {}
  const enabled = override.enabled ?? floor.eaves?.enabled ?? false
  if (!enabled) return normalizeCCW(base)
  const distances: number[] = []
  for (let i = 0; i < n; i++) {
    const ov = override.perEdge?.[i]
    const de = perEdge[i]
    const di = (ov ?? de ?? override.amountMm ?? floor.eaves?.amountMm ?? def) || 0
    distances.push(Math.max(0, di))
  }
  const out = offsetPolygonOuterVariable(base, distances, { miterLimit: 8 })
  return normalizeCCW(out)
}

// 日本語コメント: CCW化（モデル座標 +Y=上）
export function normalizeCCW(poly: Vec2[]): Vec2[] {
  const a = signedAreaModel(poly)
  return a >= 0 ? poly.slice() : poly.slice().reverse()
}

// 日本語コメント: フラット屋根の計算（外形のみ）。棟/谷は空。
export function computeFlatRoof(floor: FloorState, roof: RoofUnit) {
  const base = resolveFootprintPolygon(floor, roof)
  const outline = applyEavesOffset(base, floor, roof)
  return {
    outline,
    ridges: [] as { a: Vec2; b: Vec2 }[],
    valleys: [] as { a: Vec2; b: Vec2 }[],
  }
}

// 日本語コメント: 片流れ/切妻/寄棟用のスケルトン（実装は後続ステップ）
export function computeGableRoof(/* floor: FloorState, roof: RoofUnit */) {
  // TODO: 切妻の棟線初期化（ridgeAxis に平行な最大内接線）と外形生成
  return { outline: [] as Vec2[], ridges: [] as { a: Vec2; b: Vec2 }[], valleys: [] as { a: Vec2; b: Vec2 }[] }
}

export function computeHipRoof(/* floor: FloorState, roof: RoofUnit */) {
  // TODO: byApex（最高点）から放射状の面構成と外形生成
  return { outline: [] as Vec2[], ridges: [] as { a: Vec2; b: Vec2 }[], valleys: [] as { a: Vec2; b: Vec2 }[] }
}

export function computeMonoRoof(/* floor: FloorState, roof: RoofUnit */) {
  // TODO: 流れ方向（monoDownhill）に沿った一様傾斜の高さ場から谷線抽出
  return { outline: [] as Vec2[], ridges: [] as { a: Vec2; b: Vec2 }[], valleys: [] as { a: Vec2; b: Vec2 }[] }
}

