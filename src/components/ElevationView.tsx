import React, { useMemo } from 'react'
import type { FloorState } from '@/core/floors'
import { computeElevationBounds, computeElevationRects, computeParapetSpansForFloor, computeUpperShadowUnionSpans, subtractSpans, type ElevationBounds, type ElevationDirection } from '@/core/elevation'
import { COLORS } from '@/ui/colors'
import { outlineRect, outlineL, outlineU, outlineT, outlinePoly, type TemplateKind } from '@/core/model'

const DIRECTION_LABEL: Record<ElevationDirection, string> = {
  north: '北立面',
  south: '南立面',
  east: '東立面',
  west: '西立面',
}

const ElevationPanel: React.FC<{ direction: ElevationDirection; floors: FloorState[]; actualBounds: ElevationBounds; sharedAxisMin: number; sharedAxisMax: number; sharedBaseMin: number; sharedTopMax: number }> = ({ direction, floors, actualBounds, sharedAxisMin, sharedAxisMax, sharedBaseMin, sharedTopMax }) => {
  // 日本語コメント: 階層状態から指定方向の立面データを算出
  const rects = useMemo(() => computeElevationRects(floors, direction), [floors, direction])

  const axisRange = sharedAxisMax - sharedAxisMin
  const verticalRange = sharedTopMax - sharedBaseMin
  const axisMargin = Math.max(axisRange * 0.1, 500)
  const verticalMargin = Math.max(verticalRange * 0.15, 500)
  const minX = sharedAxisMin - axisMargin
  const maxX = sharedAxisMax + axisMargin
  const minY = -(sharedTopMax + verticalMargin)
  const width = maxX - minX
  const height = verticalRange + verticalMargin * 2
  const viewBox = `${minX} ${minY} ${width} ${height}`
  const groundY = -sharedBaseMin
  const axisOffset = sharedAxisMin - actualBounds.axisMin

  return (
    <div className="flex flex-col rounded-xl border border-border-default bg-surface-elevated/80 backdrop-blur-sm shadow-panel overflow-hidden">
      <div className="px-4 py-2 border-b border-border-default text-sm font-semibold text-text-secondary">
        {DIRECTION_LABEL[direction]}
      </div>
      <div className="flex-1">
        {rects.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-tertiary text-sm">
            立面を生成するフロアがありません
          </div>
        ) : (
          <svg className="w-full h-full" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
            {/* 地面ライン */}
            <line x1={minX} y1={groundY} x2={minX + width} y2={groundY} stroke={COLORS.helper} strokeWidth={2} strokeDasharray="24 12" vectorEffect="non-scaling-stroke" />
            {/* 立面輪郭（塗りなしの線画）とスパンのキャッシュ */}
            {rects.map((r, idx) => {
              const stroke = r.color ?? COLORS.wall
              const startAligned = r.start + axisOffset
              const endAligned = r.end + axisOffset
              const flip = direction === 'north' || direction === 'west'
              const x1 = flip ? (sharedAxisMin + sharedAxisMax - endAligned) : startAligned
              const x2 = flip ? (sharedAxisMin + sharedAxisMax - startAligned) : endAligned
              const x = Math.min(x1, x2)
              const spanWidth = Math.max(1, Math.abs(x2 - x1))
              return (
                <rect
                  key={`${r.floorId}-${idx}`}
                  x={x}
                  y={-r.top}
                  width={spanWidth}
                  height={Math.max(1, r.top - r.base)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}

            {/* 折れ（稜線）を示す実線（各階の外形頂点のうち“内側”に相当する軸位置で縦線） */}
            {floors.map((f, idx) => {
              if (!f.visible) return null
              const flip = direction === 'north' || direction === 'west'
              // フロア外形（モデル座標）
              const k = (f.shape?.kind ?? 'rect') as TemplateKind
              const d: any = (f.shape as any)?.data
              const pts = k === 'rect' ? outlineRect(d)
                : k === 'l' ? outlineL(d)
                : k === 'u' ? outlineU(d)
                : k === 't' ? outlineT(d)
                : outlinePoly(d)
              const axisIsX = direction === 'north' || direction === 'south'
              let minV = Infinity, maxV = -Infinity
              for (const p of pts) { const v = axisIsX ? p.x : p.y; minV = Math.min(minV, v); maxV = Math.max(maxV, v) }
              const eps = 1e-3
              const seen = new Set<number>()
              const uniq: number[] = []
              for (const p of pts) {
                const v = axisIsX ? p.x : p.y
                if (Math.abs(v - minV) < eps || Math.abs(v - maxV) < eps) continue // 外周端は除外
                const q = Math.round(v * 1000) // 0.001mm 単位で量子化
                if (!seen.has(q)) { seen.add(q); uniq.push(v) }
              }
              if (!uniq.length) return null
              const stroke = f.color?.walls ?? COLORS.wall
              return (
                <g key={`fold-floor-${f.id}-${direction}-${idx}`}>
                  {uniq.map((v, i2) => {
                    const aligned = v + axisOffset
                    const xPos = flip ? (sharedAxisMin + sharedAxisMax - aligned) : aligned
                    return (
                      <line
                        key={`fold-line-${f.id}-${i2}`}
                        x1={xPos}
                        y1={-f.elevationMm}
                        x2={xPos}
                        y2={-(f.elevationMm + f.heightMm)}
                        stroke={stroke}
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  })}
                </g>
              )
            })}

            {/* フラット屋根: パラペット上端ライン（階色＋点線） */}
            {floors.map((floor) => {
              if (!floor.visible) return null
              const units: any[] = Array.isArray((floor as any).roofUnits) ? (floor as any).roofUnits : []
              const flat = units.find(u => u && u.type === 'flat' && (u.footprint?.kind === 'outer' || !u.footprint))
              if (!flat) return null
              const flip = direction === 'north' || direction === 'west'
              const parapet = Math.max(0, Number(flat.parapetHeightMm ?? 0))
              const wallTop = floor.elevationMm + floor.heightMm
              const yRoof = -(wallTop + parapet)
              const stroke = floor.color?.walls ?? COLORS.wall
              // eaves 反映外周から、この方向で見えるスパンを取得
              const spansBase = computeParapetSpansForFloor(floor, direction)
              // ターゲット階の設定で上階の陰を除外するかどうかを決める
              const targetOuter = (Array.isArray((floor as any).roofUnits) ? (floor as any).roofUnits : []).find((u: any) => u && u.footprint?.kind === 'outer')
              const applyShadows = targetOuter ? (targetOuter.excludeUpperShadows ?? true) : true
              const cut = computeUpperShadowUnionSpans(floors, floor, direction, applyShadows)
              const spans = subtractSpans(spansBase, cut)
              if (!spans.length) return null
              // 壁スパン端点（軒天の頂点）候補を収集（フリップ後のX座標系で）
              const wallRects = rects.filter(r => r.floorId === floor.id)
              const wallEndpoints: number[] = []
              for (const wr of wallRects) {
                const wStart = wr.start + axisOffset
                const wEnd = wr.end + axisOffset
                const xWallStart = flip ? (sharedAxisMin + sharedAxisMax - wEnd) : wStart
                const xWallEnd = flip ? (sharedAxisMin + sharedAxisMax - wStart) : wEnd
                wallEndpoints.push(xWallStart, xWallEnd)
              }
              const nearestEndpoint = (x: number): number => {
                if (wallEndpoints.length === 0) return x
                let best = wallEndpoints[0]
                let bestD = Math.abs(x - best)
                for (let i=1;i<wallEndpoints.length;i++) {
                  const d = Math.abs(x - wallEndpoints[i])
                  if (d < bestD) { bestD = d; best = wallEndpoints[i] }
                }
                return best
              }
              return spans.map((span, i) => {
                const startAligned = span.start + axisOffset
                const endAligned = span.end + axisOffset
                const flip = direction === 'north' || direction === 'west'
                const xSpanStart = flip ? (sharedAxisMin + sharedAxisMax - endAligned) : startAligned
                const xSpanEnd = flip ? (sharedAxisMin + sharedAxisMax - startAligned) : endAligned
                return (
                  <g key={`roof-${floor.id}-${direction}-${i}`}>
                    {/* パラペット上端の水平線（軒の出外形の投影） */}
                    <line x1={xSpanStart} y1={yRoof} x2={xSpanEnd} y2={yRoof} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                    {/* コネクタ（軒先→高さ分下ろして→軒天の頂点へ水平に結ぶ） */}
                    {/* 左端 */}
                    <line x1={xSpanStart} y1={yRoof} x2={xSpanStart} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                    {(() => { const xn = nearestEndpoint(xSpanStart); return Math.abs(xn - xSpanStart) > 0.1 ? (
                      <line x1={xSpanStart} y1={-wallTop} x2={xn} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                    ) : null })()}
                    {/* 右端 */}
                    <line x1={xSpanEnd} y1={yRoof} x2={xSpanEnd} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                    {(() => { const xn = nearestEndpoint(xSpanEnd); return Math.abs(xn - xSpanEnd) > 0.1 ? (
                      <line x1={xSpanEnd} y1={-wallTop} x2={xn} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                    ) : null })()}
                  </g>
                )
              })
            })}

            {/* 非フラット屋根（切妻/寄棟/片流れ）の立面反映 */}
            {floors.map((floor) => {
              if (!floor.visible) return null
              const units: any[] = Array.isArray((floor as any).roofUnits) ? (floor as any).roofUnits : []
              const ru = units.find(u => u && u.footprint?.kind === 'outer' && (u.type === 'gable' || u.type === 'hip' || u.type === 'mono'))
              if (!ru) return null
              const stroke = floor.color?.walls ?? COLORS.wall
              const wallTop = floor.elevationMm + floor.heightMm
              const axisIsX = direction === 'north' || direction === 'south'
              const flip = direction === 'north' || direction === 'west'
              const lines: JSX.Element[] = []
              // 日本語コメント: 棟方向や建物寸法（X/Y幅）を把握するため、外周ポリゴンのバウンディングを取得
              const k = (floor.shape?.kind ?? 'rect') as TemplateKind
              const d: any = (floor.shape as any)?.data
              const pts = k === 'rect' ? outlineRect(d)
                : k === 'l' ? outlineL(d)
                : k === 'u' ? outlineU(d)
                : k === 't' ? outlineT(d)
                : outlinePoly(d)
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
              for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
              const widthX = Math.max(1, maxX - minX)
              const widthY = Math.max(1, maxY - minY)
              const centerX = (minX + maxX) / 2
              const centerY = (minY + maxY) / 2
              // 日本語コメント: 屋根シルエットは「軒の出（eaves）を反映した外周」の投影スパンを基準に描画する
              const rawEaveSpans = computeParapetSpansForFloor(floor as any, direction)
              // 日本語コメント: 非フラット屋根は基本描画するが、上階「壁」に重なる部分は非表示にする
              // 直上階（例: 1Fなら2F）の壁スパンのみをカット対象とする
              const above = floors
                .filter(f => f.visible && f.elevationMm > floor.elevationMm)
                .sort((a,b) => a.elevationMm - b.elevationMm)[0]
              const wallCuts = above
                ? rects.filter(r => r.floorId === above.id).map(r => ({ start: r.start, end: r.end }))
                : []
              const eaveSpans = subtractSpans(rawEaveSpans, wallCuts)
              const spans = eaveSpans.map(s => ({ start: s.start + axisOffset, end: s.end + axisOffset, base: wallTop, top: wallTop }))
              const ratioFromSun = (sun: number | undefined) => {
                const v = Number(sun)
                if (!Number.isFinite(v) || v <= 0) return 0
                return v / 10 // X寸 = rise:X / run:10
              }
              spans.forEach((s, i) => {
                const xA = flip ? (sharedAxisMin + sharedAxisMax - s.end) : s.start
                const xB = flip ? (sharedAxisMin + sharedAxisMax - s.start) : s.end
                const xLeft = Math.min(xA, xB)
                const xRight = Math.max(xA, xB)
                const spanW = Math.max(0, xRight - xLeft)
                const toScreen = (v: number) => {
                  const aligned = v + axisOffset
                  return flip ? (sharedAxisMin + sharedAxisMax - aligned) : aligned
                }
                const coveredByAbove = (x: number): boolean => {
                  for (const c of wallCuts) {
                    const a = toScreen(c.start)
                    const b = toScreen(c.end)
                    const lo = Math.min(a, b)
                    const hi = Math.max(a, b)
                    if (x >= lo - 1e-3 && x <= hi + 1e-3) return true
                  }
                  return false
                }
                // 立面トップ形状
                // 日本語コメント: コネクタ用の端点Y（各端の屋根線の高さ）
                let yLeftEnd = -wallTop
                let yRightEnd = -wallTop
                if (ru.type === 'gable') {
                  const ridgeAxis = ru.ridgeAxis || 'NS'
                  const isSlopeAlongX = ridgeAxis === 'NS' // NS棟→E-W方向に勾配（X軸）
                  const rSun = ratioFromSun(ru.pitchSun)
                  // 基底eavesスパン（未カット）
                  const sStartAxis = s.start - axisOffset
                  const sEndAxis = s.end - axisOffset
                  const base = rawEaveSpans.find(b => sStartAxis >= b.start - 1e-6 && sEndAxis <= b.end + 1e-6) || { start: sStartAxis, end: sEndAxis }
                  const toScreen = (v: number) => {
                    const aligned = v + axisOffset
                    return flip ? (sharedAxisMin + sharedAxisMax - aligned) : aligned
                  }
                  const bx1 = toScreen(base.start)
                  const bx2 = toScreen(base.end)
                  const baseW = Math.max(0, Math.abs(bx2 - bx1))
                  if ((axisIsX && isSlopeAlongX) || (!axisIsX && !isSlopeAlongX)) {
                    // 勾配方向に対して正面（三角形）：元のeavesスパン中央を頂点とする
                    const delta = (baseW / 2) * rSun
                    const yEaves = -wallTop
                    const yRidge = -(wallTop + delta)
                    const xApex = (bx1 + bx2) / 2
                    const yAt = (x: number) => {
                      if (x <= xApex) {
                        const t = (x - Math.min(bx1, bx2)) / Math.max(1e-6, Math.abs(xApex - Math.min(bx1, bx2)))
                        return yEaves + (yRidge - yEaves) * t
                      } else {
                        const t = (x - xApex) / Math.max(1e-6, Math.abs(Math.max(bx1, bx2) - xApex))
                        return yRidge + (yEaves - yRidge) * t
                      }
                    }
                    const sL = Math.min(xLeft, xRight)
                    const sR = Math.max(xLeft, xRight)
                    if (sR <= xApex || sL >= xApex) {
                      lines.push(<line key={`gable-tri-seg-${floor.id}-${i}`} x1={sL} y1={yAt(sL)} x2={sR} y2={yAt(sR)} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    } else {
                      lines.push(<line key={`gable-tri-segL-${floor.id}-${i}`} x1={sL} y1={yAt(sL)} x2={xApex} y2={yRidge} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      lines.push(<line key={`gable-tri-segR-${floor.id}-${i}`} x1={xApex} y1={yRidge} x2={sR} y2={yAt(sR)} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    }
                    yLeftEnd = yAt(xLeft); yRightEnd = yAt(xRight)
                  } else {
                    // 棟方向に正面（フラットな棟ライン）— 代表高さは元のeavesスパン幅から計算
                    const delta = (baseW / 2) * rSun
                    const y = -(wallTop + delta)
                    lines.push(<line key={`gable-flat-${floor.id}-${i}`} x1={xLeft} y1={y} x2={xRight} y2={y} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    yLeftEnd = y; yRightEnd = y
                  }
                } else if (ru.type === 'hip') {
                  // 日本語コメント: 寄棟は全方向で三角形。ただしスパンが壁で分割されても、
                  // 三角形の頂点は「元のeavesスパンの中央」に固定し、分割区間ではそのプロファイルを切り出して描画する。
                  const pitchHip = Number((ru as any).pitchSun ?? 0)
                  const rSunHip = pitchHip > 0 ? ratioFromSun(pitchHip) : 0
                  // 基底eavesスパン（未カット）を取得（この区間内のいずれか）
                  const sStartAxis = s.start - axisOffset
                  const sEndAxis = s.end - axisOffset
                  const base = rawEaveSpans.find(b => sStartAxis >= b.start - 1e-6 && sEndAxis <= b.end + 1e-6) || { start: sStartAxis, end: sEndAxis }
                  const toScreen = (v: number) => {
                    const aligned = v + axisOffset
                    return flip ? (sharedAxisMin + sharedAxisMax - aligned) : aligned
                  }
                  const bx1 = toScreen(base.start)
                  const bx2 = toScreen(base.end)
                  const xApex = (bx1 + bx2) / 2
                  const baseW = Math.max(0, Math.abs(bx2 - bx1))
                  const delta = rSunHip > 0 ? (baseW / 2) * rSunHip : Math.max(0, Number(ru.apexHeightMm ?? 0))
                  const yEaves = -wallTop
                  const yApex = -(wallTop + delta)
                  const yAt = (x: number) => {
                    if (x <= xApex) {
                      const t = (x - Math.min(bx1, bx2)) / Math.max(1e-6, Math.abs(xApex - Math.min(bx1, bx2)))
                      return yEaves + (yApex - yEaves) * t
                    } else {
                      const t = (x - xApex) / Math.max(1e-6, Math.abs(Math.max(bx1, bx2) - xApex))
                      return yApex + (yEaves - yApex) * t
                    }
                  }
                  // 分割区間 s に対して、頂点を跨ぐかで分割して描画
                  const sL = Math.min(xLeft, xRight)
                  const sR = Math.max(xLeft, xRight)
                  if (sR <= xApex || sL >= xApex) {
                    lines.push(<line key={`hip-prof-${floor.id}-${direction}-${i}`} x1={sL} y1={yAt(sL)} x2={sR} y2={yAt(sR)} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                  } else {
                    lines.push(<line key={`hip-profL-${floor.id}-${direction}-${i}`} x1={sL} y1={yAt(sL)} x2={xApex} y2={yApex} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    lines.push(<line key={`hip-profR-${floor.id}-${direction}-${i}`} x1={xApex} y1={yApex} x2={sR} y2={yAt(sR)} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                  }
                  yLeftEnd = yAt(xLeft); yRightEnd = yAt(xRight)
                } else if (ru.type === 'mono') {
                  const rSun = ratioFromSun(ru.pitchSun)
                  // 勾配軸: E/W→X, N/S→Y
                  const slopeAxisIsX = ru.monoDownhill === 'E' || ru.monoDownhill === 'W'
                  if ((axisIsX && slopeAxisIsX) || (!axisIsX && !slopeAxisIsX)) {
                    // 軸方向に勾配が乗る → 端から端へ直線
                    const delta = spanW * rSun
                    // ダウンヒル側が低い
                    let y1 = -wallTop
                    let y2 = -(wallTop + delta)
                    // 軸の正方向とダウンヒル方位で向きを決める
                    // axisIsX: +方向は東、axis=Y: +方向は北
                    const downhillPositive = (axisIsX ? (ru.monoDownhill === 'E') : (ru.monoDownhill === 'N'))
                    if (downhillPositive) {
                      // 右(上)端が低い
                      [y1, y2] = [-(wallTop + delta), -wallTop]
                    }
                    lines.push(<line key={`mono-${floor.id}-${i}`} x1={xLeft} y1={y1} x2={xRight} y2={y2} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    yLeftEnd = y1; yRightEnd = y2
                  } else {
                    // 勾配軸が垂直 → フラットに見える（代表値として高い側の高さで水平線）
                    const delta = (spanW / 2) * rSun // 代表値
                    const y = -(wallTop + delta)
                    lines.push(<line key={`mono-flat-${floor.id}-${i}`} x1={xLeft} y1={y} x2={xRight} y2={y} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    yLeftEnd = y; yRightEnd = y
                  }
                }
                // 日本語コメント: 軒の出の先端（xLeft/xRight）と壁スパンの端点を結ぶ（点線）。
                // 壁端点（X座標）の候補を収集
                const wallRects = rects.filter(r => r.floorId === floor.id)
                const wallEndpoints: number[] = []
                for (const wr of wallRects) {
                  const wStart = wr.start + axisOffset
                  const wEnd = wr.end + axisOffset
                  const xWallStart = flip ? (sharedAxisMin + sharedAxisMax - wEnd) : wStart
                  const xWallEnd = flip ? (sharedAxisMin + sharedAxisMax - wStart) : wEnd
                  wallEndpoints.push(xWallStart, xWallEnd)
                }
                const nearestEndpoint = (x: number): number => {
                  if (wallEndpoints.length === 0) return x
                  let best = wallEndpoints[0]
                  let bestD = Math.abs(x - best)
                  for (let i2=1;i2<wallEndpoints.length;i2++) {
                    const d = Math.abs(x - wallEndpoints[i2])
                    if (d < bestD) { bestD = d; best = wallEndpoints[i2] }
                  }
                  return best
                }
                const nxL = nearestEndpoint(xLeft)
                const nxR = nearestEndpoint(xRight)
                if (!coveredByAbove(xLeft) && Math.abs(nxL - xLeft) > 0.1) {
                  // 同一Yで水平に結ぶ。monoなどで端が高い場合は端のYを採用
                  const yConn = yLeftEnd
                  lines.push(<line key={`conn-left-${floor.id}-${direction}-${i}`} x1={xLeft} y1={yConn} x2={nxL} y2={-wallTop} stroke={stroke} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                }
                if (!coveredByAbove(xRight) && Math.abs(nxR - xRight) > 0.1) {
                  const yConn = yRightEnd
                  lines.push(<line key={`conn-right-${floor.id}-${direction}-${i}`} x1={xRight} y1={yConn} x2={nxR} y2={-wallTop} stroke={stroke} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                }
              })
              return <g key={`roof-shape-${floor.id}-${direction}`}>{lines}</g>
            })}
            {/* 階高目安ライン */}
            {floors.filter(f => f.visible).map(f => {
              const z = -(f.elevationMm + f.heightMm)
              return (
                <line
                  key={`${f.id}-tick-${direction}`}
                  x1={minX}
                  y1={z}
                  x2={minX + width}
                  y2={z}
                  stroke={COLORS.helper}
                  strokeWidth={1}
                  strokeDasharray="200 200"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.4}
                />
              )
            })}

            {/* 寸法線（壁高・屋根頂点高=フラットはパラペット） */}
            {floors.filter(f => f.visible).map((f, i) => {
              const base = f.elevationMm
              const wallTop = f.elevationMm + f.heightMm
              // フラット屋根があればパラペット上端
              const units: any[] = Array.isArray((f as any).roofUnits) ? (f as any).roofUnits : []
              const flat = units.find(u => u && u.type === 'flat')
              const roofTop = flat ? wallTop + Math.max(0, Number(flat.parapetHeightMm ?? 0)) : wallTop
              const xDim = minX + 20 + i * 14 // 階ごとに少しずらす
              const yBase = -base
              const yWallTop = -wallTop
              const yRoofTop = -roofTop
              const txtColor = COLORS.text?.secondary ?? '#cbd5e1'
              const helper = COLORS.helper
              return (
                <g key={`dim-${f.id}-${direction}`}>
                  {/* 壁高（基礎→軒高） */}
                  <line x1={xDim} y1={yBase} x2={xDim} y2={yWallTop} stroke={helper} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  {/* 端の小目盛り */}
                  <line x1={xDim-6} y1={yBase} x2={xDim+6} y2={yBase} stroke={helper} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  <line x1={xDim-6} y1={yWallTop} x2={xDim+6} y2={yWallTop} stroke={helper} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  {/* ラベル */}
                  <text x={xDim - 8} y={(yBase + yWallTop) / 2} fill={txtColor} fontSize={10} textAnchor="end" dominantBaseline="middle">壁高 H={Math.round(f.heightMm)}mm</text>

                  {/* 屋根頂点高（パラペット上端） */}
                  {roofTop > wallTop && (
                    <>
                      <line x1={xDim+12} y1={yBase} x2={xDim+12} y2={yRoofTop} stroke={helper} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                      <line x1={xDim+12-6} y1={yRoofTop} x2={xDim+12+6} y2={yRoofTop} stroke={helper} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                      <text x={xDim + 12 + 8} y={(yBase + yRoofTop) / 2} fill={txtColor} fontSize={10} textAnchor="start" dominantBaseline="middle">屋根頂点高 H={Math.round(roofTop - base)}mm</text>
                    </>
                  )}
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}

const ElevationView: React.FC<{ floors: FloorState[] }> = ({ floors }) => {
  const bounds = useMemo(() => {
    const north = computeElevationBounds(floors, 'north')
    const south = computeElevationBounds(floors, 'south')
    const east = computeElevationBounds(floors, 'east')
    const west = computeElevationBounds(floors, 'west')
    const sharedBaseMin = Math.min(north.baseMin, south.baseMin, east.baseMin, west.baseMin)
    const sharedTopMax = Math.max(north.topMax, south.topMax, east.topMax, west.topMax)
    const sharedAxisMin = Math.min(north.axisMin, south.axisMin, east.axisMin, west.axisMin)
    const sharedAxisMax = Math.max(north.axisMax, south.axisMax, east.axisMax, west.axisMax)
    return { north, south, east, west, sharedBaseMin, sharedTopMax, sharedAxisMin, sharedAxisMax }
  }, [floors])

  // 日本語コメント: 立面ビュー全体を2x2グリッドで表示
  return (
    <div className="h-full w-full overflow-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-full">
        <ElevationPanel
          direction="north"
          floors={floors}
          actualBounds={bounds.north}
          sharedAxisMin={bounds.sharedAxisMin}
          sharedAxisMax={bounds.sharedAxisMax}
          sharedBaseMin={bounds.sharedBaseMin}
          sharedTopMax={bounds.sharedTopMax}
        />
        <ElevationPanel
          direction="east"
          floors={floors}
          actualBounds={bounds.east}
          sharedAxisMin={bounds.sharedAxisMin}
          sharedAxisMax={bounds.sharedAxisMax}
          sharedBaseMin={bounds.sharedBaseMin}
          sharedTopMax={bounds.sharedTopMax}
        />
        <ElevationPanel
          direction="south"
          floors={floors}
          actualBounds={bounds.south}
          sharedAxisMin={bounds.sharedAxisMin}
          sharedAxisMax={bounds.sharedAxisMax}
          sharedBaseMin={bounds.sharedBaseMin}
          sharedTopMax={bounds.sharedTopMax}
        />
        <ElevationPanel
          direction="west"
          floors={floors}
          actualBounds={bounds.west}
          sharedAxisMin={bounds.sharedAxisMin}
          sharedAxisMax={bounds.sharedAxisMax}
          sharedBaseMin={bounds.sharedBaseMin}
          sharedTopMax={bounds.sharedTopMax}
        />
      </div>
    </div>
  )
}

export default ElevationView
