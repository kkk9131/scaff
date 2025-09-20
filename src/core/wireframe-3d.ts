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

// 日本語コメント: 内部ユーティリティ — ポリゴンに対する軸平行ラインの交点を抽出（x=const または y=const）
function intersectPolygonWithAxisLine(poly: Vec2[], opt: { xConst?: number; yConst?: number }): Vec2[] {
  const pts: Vec2[] = []
  const n = poly.length
  const hasX = typeof opt.xConst === 'number'
  const hasY = typeof opt.yConst === 'number'
  if (!hasX && !hasY) return pts
  const X = opt.xConst as number
  const Y = opt.yConst as number
  const eps = 1e-6
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    const dx = b.x - a.x
    const dy = b.y - a.y
    if (hasX) {
      const minX = Math.min(a.x, b.x) - eps
      const maxX = Math.max(a.x, b.x) + eps
      if (X < minX || X > maxX) continue
      if (Math.abs(dx) < eps) {
        // 垂直辺が x=X 上に重なる場合は端点を追加（後でソート・重複除去）
        pts.push({ x: X, y: a.y })
        pts.push({ x: X, y: b.y })
      } else {
        const t = (X - a.x) / dx
        if (t >= -eps && t <= 1 + eps) {
          const y = a.y + dy * t
          pts.push({ x: X, y })
        }
      }
    } else if (hasY) {
      const minY = Math.min(a.y, b.y) - eps
      const maxY = Math.max(a.y, b.y) + eps
      if (Y < minY || Y > maxY) continue
      if (Math.abs(dy) < eps) {
        // 水平辺が y=Y 上に重なる場合は端点を追加
        pts.push({ x: a.x, y: Y })
        pts.push({ x: b.x, y: Y })
      } else {
        const t = (Y - a.y) / dy
        if (t >= -eps && t <= 1 + eps) {
          const x = a.x + dx * t
          pts.push({ x, y: Y })
        }
      }
    }
  }
  // 重複除去（量子化）
  const key = (p: Vec2) => `${Math.round((p.x) * 1000)}:${Math.round((p.y) * 1000)}`
  const uniq: Vec2[] = []
  const seen = new Set<string>()
  for (const p of pts) { const k = key(p); if (!seen.has(k)) { seen.add(k); uniq.push(p) } }
  // ソート: x=const のときは y 昇順、y=const のときは x 昇順
  uniq.sort((p, q) => hasX ? (p.y - q.y) : (p.x - q.x))
  return uniq
}

// 日本語コメント: 軒（eaves）反映外周から切妻屋根の稜線（ridge）セグメントを抽出
function ridgeSegmentsForGable(eavePoly: Vec2[], axis: 'NS' | 'EW'): { a: Vec2; b: Vec2 }[] {
  if (eavePoly.length < 3) return []
  // eaves ポリゴンの中心座標（軸に直交する中線）
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of eavePoly) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
  if (axis === 'NS') {
    const xMid = (minX + maxX) / 2
    const pts = intersectPolygonWithAxisLine(eavePoly, { xConst: xMid })
    const segs: { a: Vec2; b: Vec2 }[] = []
    for (let i = 0; i + 1 < pts.length; i += 2) segs.push({ a: pts[i], b: pts[i + 1] })
    return segs
  } else {
    const yMid = (minY + maxY) / 2
    const pts = intersectPolygonWithAxisLine(eavePoly, { yConst: yMid })
    const segs: { a: Vec2; b: Vec2 }[] = []
    for (let i = 0; i + 1 < pts.length; i += 2) segs.push({ a: pts[i], b: pts[i + 1] })
    return segs
  }
}

// 日本語コメント: 切妻屋根（gable）のワイヤーフレームを生成（実線=壁、点線=屋根線）
export function buildGableRoofWireStyledFromFloor(floor: FloorState): { solid: Segment3D[]; dashed: Segment3D[] } {
  const basePoly = polygonFromFloor(floor)
  const n = basePoly.length
  const base = floor.elevationMm
  const wallTop = floor.elevationMm + floor.heightMm
  const units: any[] = Array.isArray((floor as any).roofUnits) ? (floor as any).roofUnits : []
  const ru = units.find(u => u && u.footprint?.kind === 'outer' && u.type === 'gable')
  const solid: Segment3D[] = []
  const dashed: Segment3D[] = []
  if (n < 3 || !ru) {
    // 屋根指定がなければ壁プリズムのみ
    return { solid: buildPrismWire(basePoly, base, wallTop, 0), dashed }
  }
  // 実線: 壁プリズム（ベースリング、壁上端リング、垂直）
  solid.push(...buildPrismWire(basePoly, base, wallTop, 0))

  // eaves 反映外周を算出（屋根線はこの外周に沿う）
  const eavePoly = applyEavesOffset(basePoly, floor, ru as any)
  // per-edge eaves 距離（既定/上書きを反映）
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

  // 点線: 軒の出に沿った外周リング（高さ=壁上端）
  for (let i = 0; i < n; i++) {
    const { start, end } = adjustedSegmentEndpoints(lines as any, distances, i)
    dashed.push({ a: { x: start.x, y: start.y, z: wallTop }, b: { x: end.x, y: end.y, z: wallTop } })
  }

  // 棟線の高さを算出（寸→勾配比。NSならX半幅、EWならY半幅）
  const pitch = Math.max(0, Number((ru as any).pitchSun ?? 0))
  const r = pitch / 10
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of eavePoly) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
  const axis: 'NS' | 'EW' = (ru.ridgeAxis ?? 'NS')
  const run = axis === 'NS' ? (maxX - minX) / 2 : (maxY - minY) / 2
  const topZ = wallTop + Math.max(0, run * r)

  // 点線: 棟線（eaves外周との交差区間を抽出して z=topZ に配置）
  const ridgeSegs2D = ridgeSegmentsForGable(eavePoly, axis)
  for (const seg of ridgeSegs2D) {
    dashed.push({ a: { x: seg.a.x, y: seg.a.y, z: topZ }, b: { x: seg.b.x, y: seg.b.y, z: topZ } })
  }

  // ユーティリティ: 指定Yでの内側区間（xの偶数/奇数ペア）から、xを含むペア端点を返す
  const containingIntervalAtY = (y: number, x: number): { xL: number; xR: number } | null => {
    const xs = intersectPolygonWithAxisLine(eavePoly, { yConst: y }).map(p => p.x).sort((a, b) => a - b)
    if (xs.length < 2) return null
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = xs[i], x1 = xs[i + 1]
      if (x >= x0 - 1e-6 && x <= x1 + 1e-6) return { xL: x0, xR: x1 }
    }
    // 含まれない場合は最も近い区間へクランプ
    let best: { xL: number; xR: number } | null = null
    let bestDist = Infinity
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = xs[i], x1 = xs[i + 1]
      const d = x < x0 ? (x0 - x) : (x > x1 ? (x - x1) : 0)
      if (d < bestDist) { bestDist = d; best = { xL: x0, xR: x1 } }
    }
    return best
  }
  const containingIntervalAtX = (x: number, y: number): { yB: number; yT: number } | null => {
    const ys = intersectPolygonWithAxisLine(eavePoly, { xConst: x }).map(p => p.y).sort((a, b) => a - b)
    if (ys.length < 2) return null
    for (let i = 0; i + 1 < ys.length; i += 2) {
      const y0 = ys[i], y1 = ys[i + 1]
      if (y >= y0 - 1e-6 && y <= y1 + 1e-6) return { yB: y0, yT: y1 }
    }
    let best: { yB: number; yT: number } | null = null
    let bestDist = Infinity
    for (let i = 0; i + 1 < ys.length; i += 2) {
      const y0 = ys[i], y1 = ys[i + 1]
      const d = y < y0 ? (y0 - y) : (y > y1 ? (y - y1) : 0)
      if (d < bestDist) { bestDist = d; best = { yB: y0, yT: y1 } }
    }
    return best
  }

  // 点線: 非妻面の各「軒端点」から棟へ向かう斜めライン（エッジ両端→棟線へ直交投影）
  const gableEdges: number[] | undefined = Array.isArray((ru as any).gableEdges) ? (ru as any).gableEdges : undefined
  const isGableEdge = (i: number): boolean => {
    if (gableEdges && gableEdges.length) return gableEdges.includes(i)
    const a = basePoly[i]; const b = basePoly[(i + 1) % n]
    const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y)
    return axis === 'NS' ? (dy < dx) : (dx < dy)
  }
  const xMid = (minX + maxX) / 2
  const yMid = (minY + maxY) / 2
  for (let i = 0; i < n; i++) {
    if (isGableEdge(i)) continue
    const { start, end } = adjustedSegmentEndpoints(lines as any, distances, i)
    const endpoints = [start, end]
    for (const ep of endpoints) {
      let target: Vec2 = axis === 'NS' ? { x: xMid, y: ep.y } : { x: ep.x, y: yMid }
      // 棟線セグメント範囲へクランプ
      if (ridgeSegs2D.length) {
        if (axis === 'NS') {
          // ep.y を含む内側区間の端点範囲で clamp
          const ints = containingIntervalAtY(ep.y, xMid)
          if (ints) {
            const yClamp = ridgeSegs2D.reduce((acc, s) => {
              const y0 = Math.min(s.a.y, s.b.y), y1 = Math.max(s.a.y, s.b.y)
              if (ep.y >= y0 - 1e-6 && ep.y <= y1 + 1e-6) return ep.y
              // 近い端へ
              const d0 = Math.abs(ep.y - y0), d1 = Math.abs(ep.y - y1)
              const yNear = d0 < d1 ? y0 : y1
              return Math.abs(yNear - acc) < Math.abs(ep.y - acc) ? acc : yNear
            }, ep.y)
            target = { x: xMid, y: yClamp }
          }
        } else {
          const ints = containingIntervalAtX(ep.x, yMid)
          if (ints) {
            const xClamp = ridgeSegs2D.reduce((acc, s) => {
              const x0 = Math.min(s.a.x, s.b.x), x1 = Math.max(s.a.x, s.b.x)
              if (ep.x >= x0 - 1e-6 && ep.x <= x1 + 1e-6) return ep.x
              const d0 = Math.abs(ep.x - x0), d1 = Math.abs(ep.x - x1)
              const xNear = d0 < d1 ? x0 : x1
              return Math.abs(xNear - acc) < Math.abs(ep.x - acc) ? acc : xNear
            }, ep.x)
            target = { x: xClamp, y: yMid }
          }
        }
      }
      dashed.push({ a: { x: ep.x, y: ep.y, z: wallTop }, b: { x: target.x, y: target.y, z: topZ } })
    }
  }

  // 点線: 妻面（gable）側の「破風（rake）」— 棟端点→同一スライスの軒端点（左右）
  for (const seg of ridgeSegs2D) {
    const ends = [seg.a, seg.b]
    for (const re of ends) {
      if (axis === 'NS') {
        const ints = intersectPolygonWithAxisLine(eavePoly, { yConst: re.y }).map(p => p.x).sort((a,b)=>a-b)
        if (ints.length >= 2) {
          // re.x（中心xMid）を含む区間を探す
          let pair: [number, number] | null = null
          for (let i = 0; i + 1 < ints.length; i += 2) {
            const x0 = ints[i], x1 = ints[i + 1]
            if (xMid >= x0 - 1e-6 && xMid <= x1 + 1e-6) { pair = [x0, x1]; break }
          }
          if (!pair) pair = [ints[0], ints[ints.length - 1]]
          const pL = { x: pair[0], y: re.y }
          const pR = { x: pair[1], y: re.y }
          dashed.push({ a: { x: re.x, y: re.y, z: topZ }, b: { x: pL.x, y: pL.y, z: wallTop } })
          dashed.push({ a: { x: re.x, y: re.y, z: topZ }, b: { x: pR.x, y: pR.y, z: wallTop } })
        }
      } else {
        const ints = intersectPolygonWithAxisLine(eavePoly, { xConst: re.x }).map(p => p.y).sort((a,b)=>a-b)
        if (ints.length >= 2) {
          let pair: [number, number] | null = null
          for (let i = 0; i + 1 < ints.length; i += 2) {
            const y0 = ints[i], y1 = ints[i + 1]
            if (yMid >= y0 - 1e-6 && yMid <= y1 + 1e-6) { pair = [y0, y1]; break }
          }
          if (!pair) pair = [ints[0], ints[ints.length - 1]]
          const pB = { x: re.x, y: pair[0] }
          const pT = { x: re.x, y: pair[1] }
          dashed.push({ a: { x: re.x, y: re.y, z: topZ }, b: { x: pB.x, y: pB.y, z: wallTop } })
          dashed.push({ a: { x: re.x, y: re.y, z: topZ }, b: { x: pT.x, y: pT.y, z: wallTop } })
        }
      }
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

// ===== 上階壁ボリュームとの交差クリッピング（屋根線の自然化） =====

// 日本語コメント: 点がポリゴン内にあるか（境界含む）— 射線法 + 境界判定
function pointInPolygon2D(p: Vec2, poly: Vec2[]): boolean {
  const n = poly.length
  if (n < 3) return false
  const eps = 1e-9
  // 境界上チェック
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n]
    const bax = b.x - a.x, bay = b.y - a.y
    const pax = p.x - a.x, pay = p.y - a.y
    const cross = bax * pay - bay * pax
    if (Math.abs(cross) <= eps) {
      const dot = pax * (b.x - a.x) + pay * (b.y - a.y)
      if (dot >= -eps) {
        const len2 = bax * bax + bay * bay
        if (dot <= len2 + eps) return true
      }
    }
  }
  // 射線法: x正方向へレイを飛ばす
  let inside = false
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi + 1e-20) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// 日本語コメント: 上階の壁ボリューム（XY=壁外周, Z=階のベース→壁上端）に“入っている”屋根線分を取り除く。
// 近似手法: 線分を一定ステップで分割し、各小区間の中点が上階ボリューム内ならその区間を捨てる。
export function cullSegmentsByUpperWalls(allFloors: FloorState[], current: FloorState, segs: Segment3D[]): Segment3D[] {
  if (!segs.length) return segs
  const occluders = allFloors
    .filter(f => f.visible && f.elevationMm > current.elevationMm)
    .map(f => ({
      poly: polygonFromFloor(f),
      zMin: f.elevationMm,
      zMax: f.elevationMm + f.heightMm,
    }))
    .filter(o => o.poly.length >= 3)
  if (!occluders.length) return segs

  const out: Segment3D[] = []
  for (const s of segs) {
    const dx = s.b.x - s.a.x
    const dy = s.b.y - s.a.y
    const dz = s.b.z - s.a.z
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const steps = Math.max(4, Math.min(256, Math.ceil(len / 800))) // おおよそ 0.8m ごとに分割（最大256）
    let curStart: Vec3 | null = null
    const at = (t: number): Vec3 => ({ x: s.a.x + dx * t, y: s.a.y + dy * t, z: s.a.z + dz * t })
    const isOccludedMid = (t0: number, t1: number): boolean => {
      const tm = (t0 + t1) / 2
      const p = at(tm)
      for (const o of occluders) {
        if (p.z >= o.zMin - 1e-3 && p.z <= o.zMax + 1e-3) {
          if (pointInPolygon2D({ x: p.x, y: p.y }, o.poly)) return true
        }
      }
      return false
    }
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps
      const t1 = (i + 1) / steps
      const occluded = isOccludedMid(t0, t1)
      if (!occluded) {
        if (curStart === null) curStart = at(t0)
      } else {
        if (curStart) {
          const end = at(t0)
          if (Math.abs(end.x - curStart.x) + Math.abs(end.y - curStart.y) + Math.abs(end.z - curStart.z) > 1e-6) {
            out.push({ a: curStart, b: end })
          }
          curStart = null
        }
      }
    }
    if (curStart) {
      const end = at(1)
      if (Math.abs(end.x - curStart.x) + Math.abs(end.y - curStart.y) + Math.abs(end.z - curStart.z) > 1e-6) {
        out.push({ a: curStart, b: end })
      }
    }
  }
  return out
}
