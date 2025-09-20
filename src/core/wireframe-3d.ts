// 日本語コメント: 平面図（2Dポリゴン）から矩形フラット屋根の3Dワイヤーフレーム（線分群）を生成する最小ロジック
import type { FloorState } from '@/core/floors'
import type { Vec2 } from '@/core/units'
import { outlineRect, outlineL, outlineU, outlineT, outlinePoly, type TemplateKind } from '@/core/model'
import { applyEavesOffset } from '@/core/roofing'
import { buildOffsetLines, adjustedSegmentEndpoints } from '@/core/eaves/helpers'
import { signedArea as signedAreaModel } from '@/core/eaves/offset'

export type Vec3 = { x: number; y: number; z: number }

export type Segment3D = { a: Vec3; b: Vec3 }

// 日本語コメント: フロア形状をポリゴンに解決（mm座標、時計回り）
export function polygonFromFloor(floor: FloorState): Vec2[] {
  const k = (floor.shape?.kind ?? 'rect') as TemplateKind
  const d: any = (floor.shape as any)?.data
  return k === 'rect' ? outlineRect(d)
    : k === 'l' ? outlineL(d)
    : k === 'u' ? outlineU(d)
    : k === 't' ? outlineT(d)
    : outlinePoly(d)
}

// 日本語コメント: 矩形（任意多角形）プリズムのワイヤーフレームを生成
// - 外周の上面/下面（水平線）
// - 各頂点の立ち上がり（垂直線）
// parapetMm が正の場合、上面は壁上端 + parapet 分だけ上げる
export function buildPrismWire(poly: Vec2[], baseZmm: number, wallTopZmm: number, parapetMm = 0): Segment3D[] {
  const n = poly.length
  if (n < 3) return []
  const topZ = wallTopZmm + Math.max(0, parapetMm)
  const segs: Segment3D[] = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const vi = poly[i]
    const vj = poly[j]
    // 下面リング
    segs.push({ a: { x: vi.x, y: vi.y, z: baseZmm }, b: { x: vj.x, y: vj.y, z: baseZmm } })
    // 上面リング（壁上端 + パラペット）
    segs.push({ a: { x: vi.x, y: vi.y, z: topZ }, b: { x: vj.x, y: vj.y, z: topZ } })
    // 垂直
    segs.push({ a: { x: vi.x, y: vi.y, z: baseZmm }, b: { x: vi.x, y: vi.y, z: topZ } })
  }
  return segs
}

// 日本語コメント: 単位変換（mm→m）。three.js では 1 = 1m として扱う。
export function mmToM(v: number): number { return v / 1000 }

// 日本語コメント: フロア情報からフラット屋根のプリズム線分を生成
export function buildFlatRoofWireFromFloor(floor: FloorState): Segment3D[] {
  const poly = polygonFromFloor(floor)
  const base = floor.elevationMm
  const wallTop = floor.elevationMm + floor.heightMm
  // 日本語コメント: フラット屋根（outer footprint）のパラペット高さを探す（なければ0）
  const ru = (Array.isArray(floor.roofUnits) ? floor.roofUnits : []).find(u => u && u.footprint?.kind === 'outer' && u.type === 'flat')
  const parapet = Math.max(0, Number(ru?.parapetHeightMm ?? 0))
  return buildPrismWire(poly, base, wallTop, parapet)
}

// 日本語コメント: フラット屋根のプリズムを「実線」「点線（パラペット立上り部分）」に分離して生成
export function buildFlatRoofWireStyledFromFloor(floor: FloorState): { solid: Segment3D[]; dashed: Segment3D[] } {
  const basePoly = polygonFromFloor(floor)
  const n = basePoly.length
  const base = floor.elevationMm
  const wallTop = floor.elevationMm + floor.heightMm
  const ru = (Array.isArray(floor.roofUnits) ? floor.roofUnits : []).find(u => u && u.footprint?.kind === 'outer' && u.type === 'flat')
  const parapet = Math.max(0, Number(ru?.parapetHeightMm ?? 0))
  const topZ = wallTop + parapet
  const solid: Segment3D[] = []
  const dashed: Segment3D[] = []
  if (n < 3) return { solid, dashed }
  // 日本語コメント: 軒の出が有効な場合は上端リング（天井／パラペット）は外周オフセットを使用
  const eavePoly = applyEavesOffset(basePoly, floor, ru as any)
  // 日本語コメント: per-edge オフセット距離を算出（floor と roof のオーバーライドを反映）
  const nEdges = basePoly.length
  const def = floor.eaves?.amountMm ?? 0
  const perEdge = floor.eaves?.perEdge ?? {}
  const override = (ru as any)?.eavesOverride ?? {}
  const enabled = override.enabled ?? floor.eaves?.enabled ?? false
  const distances: number[] = []
  for (let i = 0; i < nEdges; i++) {
    const ov = override.perEdge?.[i]
    const de = perEdge[i]
    const di = (ov ?? de ?? override.amountMm ?? floor.eaves?.amountMm ?? def) || 0
    distances.push(enabled ? Math.max(0, di) : 0)
  }
  const area = signedAreaModel(basePoly)
  const lines = buildOffsetLines(basePoly as any, distances, area)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const vi = basePoly[i], vj = basePoly[j]
    const ei = eavePoly[i], ej = eavePoly[j]
    const { start, end } = adjustedSegmentEndpoints(lines as any, distances, i)
    // 下面リング（実線）
    solid.push({ a: { x: vi.x, y: vi.y, z: base }, b: { x: vj.x, y: vj.y, z: base } })
    // 天井ライン（壁上端、高さ = wallTop）は常に実線（軒の出ありでも壁天端は壁外周）
    solid.push({ a: { x: vi.x, y: vi.y, z: wallTop }, b: { x: vj.x, y: vj.y, z: wallTop } })
    // パラペット上端（topZ）は点線（parapet>0の時のみ）。軒の出がある場合は 調整済み端点（start→end）に沿う
    if (parapet > 0) {
      dashed.push({ a: { x: start.x, y: start.y, z: topZ }, b: { x: end.x, y: end.y, z: topZ } })
    }
    // 垂直: 壁（ベース→壁上端）は実線、パラペット（壁上端→上端）は点線
    if (wallTop > base) {
      solid.push({ a: { x: vi.x, y: vi.y, z: base }, b: { x: vi.x, y: vi.y, z: wallTop } })
    }
    if (parapet > 0) {
      // 日本語コメント: パラペット下端リングも eaves 調整端点（start→end）で点線として描画
      dashed.push({ a: { x: start.x, y: start.y, z: wallTop }, b: { x: end.x, y: end.y, z: wallTop } })
      // 日本語コメント: パラペットの立上りは軒の出オフセット端点で表現（start/end で両端）
      dashed.push({ a: { x: start.x, y: start.y, z: wallTop }, b: { x: start.x, y: start.y, z: topZ } })
      dashed.push({ a: { x: end.x, y: end.y, z: wallTop }, b: { x: end.x, y: end.y, z: topZ } })
    }
  }
  return { solid, dashed }
}

// 日本語コメント: 線分群のバウンディングボックスを返す（mm）
export function bboxOfSegments(segs: Segment3D[]): { min: Vec3; max: Vec3 } | null {
  if (!segs.length) return null
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const s of segs) {
    const pts = [s.a, s.b]
    for (const p of pts) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
      minZ = Math.min(minZ, p.z)
      maxZ = Math.max(maxZ, p.z)
    }
  }
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } }
}
