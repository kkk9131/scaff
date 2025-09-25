import React, { useMemo } from 'react'
import type { FloorState } from '@/core/floors'
import { computeElevationBounds, computeElevationRects, computeParapetSpansForFloor, computeUpperShadowUnionSpans, subtractSpans, unionSpans, type ElevationBounds, type ElevationDirection } from '@/core/elevation'
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
            {/* NOTE: 壁（実線）は最後に重ね描きして、屋根（点線）より優先表示する */}

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
              // 日本語コメント: 非フラット屋根は、上階の“壁だけではなく屋根（軒の出含む）”で隠れる部分も不可視。
              // フロア設定の excludeUpperShadows が有効な場合、上階のパラペット（= eaves 反映外周の投影）ユニオンをカットとして使用する。
              const targetOuter = (Array.isArray((floor as any).roofUnits) ? (floor as any).roofUnits : []).find((u: any) => u && u.footprint?.kind === 'outer')
              const applyShadows = targetOuter ? (targetOuter.excludeUpperShadows ?? true) : true
              const upperCuts = computeUpperShadowUnionSpans(floors, floor, direction, applyShadows)
              const eaveSpans = subtractSpans(rawEaveSpans, upperCuts)
              const spans = eaveSpans.map(s => ({ start: s.start + axisOffset, end: s.end + axisOffset, base: wallTop, top: wallTop }))
              const ratioFromSun = (sun: number | undefined) => {
                const v = Number(sun)
                if (!Number.isFinite(v) || v <= 0) return 0
                return v / 10 // X寸 = rise:X / run:10
              }
              // 日本語コメント: 壁スパン端点（長方形の左右端）を取得するためのヘルパ
              const wallRectsForFloor = rects.filter(r => r.floorId === floor.id)
              const nearestWallEndpoint = (x: number): number => {
                if (!wallRectsForFloor.length) return x
                const endpoints: number[] = []
                for (const wr of wallRectsForFloor) {
                  const wStart = wr.start + axisOffset
                  const wEnd = wr.end + axisOffset
                  const xs = flip ? (sharedAxisMin + sharedAxisMax - wEnd) : wStart
                  const xe = flip ? (sharedAxisMin + sharedAxisMax - wStart) : wEnd
                  endpoints.push(xs, xe)
                }
                let best = endpoints[0]
                let bestD = Math.abs(x - best)
                for (let k = 1; k < endpoints.length; k++) {
                  const d = Math.abs(x - endpoints[k])
                  if (d < bestD) { bestD = d; best = endpoints[k] }
                }
                return best
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
                // 斜辺の描き分けは一旦無効化（安定化のため）。
                // 日本語コメント: 上階の“屋根影（軒投影のユニオン）”で覆われるXスクリーン位置かを判定
                const coveredByAbove = (x: number): boolean => {
                  for (const c of upperCuts) {
                    const a = toScreen(c.start)
                    const b = toScreen(c.end)
                    const lo = Math.min(a, b)
                    const hi = Math.max(a, b)
                    if (x >= lo - 1e-3 && x <= hi + 1e-3) return true
                  }
                  return false
                }
                let suppressConnectors = false
                // 立面トップ形状
                // 日本語コメント: コネクタ用の端点Y（各端の屋根線の高さ）
                let yLeftEnd = -wallTop
                let yRightEnd = -wallTop
                if (ru.type === 'gable') {
                  const ridgeAxis = ru.ridgeAxis || 'NS'
                  const isSlopeAlongX = ridgeAxis === 'NS' // NS棟→E-W方向に勾配（X軸）
                  const rSun = ratioFromSun(ru.pitchSun)
                  // 日本語コメント: 高さは常に“勾配軸の半幅×勾配”で統一（方向に依存しない）
                  const runSlope = (isSlopeAlongX ? widthX : widthY) / 2
                  const deltaGlobal = runSlope * rSun
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
                    const yEaves = -wallTop
                    const yRidge = -(wallTop + deltaGlobal)
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
                      lines.push(<line key={`gable-tri-${floor.id}-${i}`} x1={sL} y1={yAt(sL)} x2={sR} y2={yAt(sR)} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    } else {
                      lines.push(<line key={`gable-triL-${floor.id}-${i}`} x1={sL} y1={yAt(sL)} x2={xApex} y2={yRidge} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      lines.push(<line key={`gable-triR-${floor.id}-${i}`} x1={xApex} y1={yRidge} x2={sR} y2={yAt(sR)} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    }
                    // 日本語コメント: 壁矩形の水平上端を目立たせないため、背景色で薄く消す
                    lines.push(<line key={`mask-walltop-${floor.id}-${i}`} x1={sL} y1={-wallTop} x2={sR} y2={-wallTop} stroke={COLORS.surface.elevated} strokeWidth={3} vectorEffect="non-scaling-stroke" />)
                    yLeftEnd = yAt(xLeft); yRightEnd = yAt(xRight)
                  } else {
                    // 棟方向に正面（フラットな棟ライン）— この面で有効な eaves スパン（可視スパン）に厳密一致させる
                    const y = -(wallTop + deltaGlobal)
                    const xl2 = Math.min(xLeft, xRight)
                    const xr2 = Math.max(xLeft, xRight)
                    lines.push(<line key={`gable-flat-${floor.id}-${i}`} x1={xl2} y1={y} x2={xr2} y2={y} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    // 壁端→軒端の縦点線（可視スパン端に一致）
                    lines.push(<line key={`gable-flat-vl-${floor.id}-${i}`} x1={xl2} y1={-wallTop} x2={xl2} y2={y} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    lines.push(<line key={`gable-flat-vr-${floor.id}-${i}`} x1={xr2} y1={-wallTop} x2={xr2} y2={y} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    // 日本語コメント: 軒先端と壁端上端の水平補助
                    const wallL = nearestWallEndpoint(xl2)
                    const wallR = nearestWallEndpoint(xr2)
                    if (Math.abs(wallL - xl2) > 0.1) lines.push(<line key={`gable-flat-hconnL-${floor.id}-${i}`} x1={Math.min(wallL, xl2)} y1={-wallTop} x2={Math.max(wallL, xl2)} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    if (Math.abs(wallR - xr2) > 0.1) lines.push(<line key={`gable-flat-hconnR-${floor.id}-${i}`} x1={Math.min(wallR, xr2)} y1={-wallTop} x2={Math.max(wallR, xr2)} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    yLeftEnd = y; yRightEnd = y
                    // 余計な斜めコネクタは出さない
                    suppressConnectors = true
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
                  const pitch = Number(ru.pitchSun ?? 0)
                  const rSun = pitch > 0 ? ratioFromSun(pitch) : 0
                  const apex = Math.max(0, Number(ru.apexHeightMm ?? 0))
                  // 勾配軸: E/W→X, N/S→Y
                  const slopeAxisIsX = ru.monoDownhill === 'E' || ru.monoDownhill === 'W'
                  if ((axisIsX && slopeAxisIsX) || (!axisIsX && !slopeAxisIsX)) {
                    // 残り2面：高い方が頂点の三角形（点線）を描画（軒の出を含む）
                    // 基底eavesスパン（未カット）
                    const sStartAxis = s.start - axisOffset
                    const sEndAxis = s.end - axisOffset
                    const base = rawEaveSpans.find(b => sStartAxis >= b.start - 1e-6 && sEndAxis <= b.end + 1e-6) || { start: sStartAxis, end: sEndAxis }
                    const xl = Math.min(xLeft, xRight)
                    const xr = Math.max(xLeft, xRight)
                    // 高さ差Δ（勾配優先、0ならapex）
                    const runAlongSlope = slopeAxisIsX ? widthX : widthY
                    const delta = rSun > 0 ? (runAlongSlope * rSun) : apex
                    const yHigh = -(wallTop + delta)
                    const yLow = -wallTop
                    // どちら側が低いか（スクリーン左/右）。flipを暗黙に含む direction 判定。
                    const downhill = (ru.monoDownhill as any) as 'N'|'S'|'E'|'W' | undefined
                    // 日本語コメント: 方向に依存しない見え方に統一するため、
                    // 画面座標（左→右）上で「downhill が右向きか」を正規化して判定する。
                    const downhillToRight = (() => {
                      const axX = axisIsX
                      const f = flip
                      switch (downhill) {
                        case 'E': return !f
                        case 'W': return f
                        case 'N': return axX ? null : !f
                        case 'S': return axX ? null : f
                        default: return null
                      }
                    })()
                    const lowOnLeft = downhillToRight === true ? false : true
                    // yAt: sL..sR 間で線形補間（低い側→高い側）
                    const sL = xl, sR = xr
                    const yAt = (x: number) => {
                      const t = (x - sL) / Math.max(1e-6, (sR - sL))
                      return lowOnLeft
                        ? (yLow + (yHigh - yLow) * t)
                        : (yHigh + (yLow - yHigh) * t)
                    }
                    // 屋根斜辺（点線）は壁内を避けて壁外のみ描画（壁は後段で実線上端を描く）
                    const segMin = sL
                    const segMax = sR
                    // 屋根斜辺（eavesスパン）から壁ユニオンを減算して、壁外の点線のみ描画
                    const wallSpans = rects
                      .filter(r => r.floorId === floor.id)
                      .map(r => {
                        const xs = flip ? (sharedAxisMin + sharedAxisMax - (r.end + axisOffset)) : (r.start + axisOffset)
                        const xe = flip ? (sharedAxisMin + sharedAxisMax - (r.start + axisOffset)) : (r.end + axisOffset)
                        return { start: Math.min(xs, xe), end: Math.max(xs, xe) }
                      })
                    const wallUnion = unionSpans(wallSpans)
                    const slopeSpan = [{ start: Math.min(sL, sR), end: Math.max(sL, sR) }]
                    const dashSpans = subtractSpans(slopeSpan, wallUnion)
                    for (const ds of dashSpans) {
                      const a = Math.max(segMin, ds.start)
                      const b = Math.min(segMax, ds.end)
                      if (b - a > 1e-3) {
                        lines.push(
                          <line key={`mono-rem-tri-slope-span-${floor.id}-${direction}-${i}-${a.toFixed(1)}`}
                                x1={a} y1={yAt(a)} x2={b} y2={yAt(b)}
                                stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                        )
                      }
                    }
                    // 日本語コメント: 三角側面の軒先に“縦の落ち”が見えるよう、
                    // 屋根斜線の左右端（軒先端）から壁の斜め上端へ向けた縦点線を追加する。
                    // 壁上端は左→右で yLow→yHigh（lowOnLeft=true）/ 逆（false）。
                    const xlEdge = Math.min(sL, sR)
                    const xrEdge = Math.max(sL, sR)
                    const wallL = nearestWallEndpoint(xlEdge)
                    const wallR = nearestWallEndpoint(xrEdge)
                    const wA = Math.min(wallL, wallR)
                    const wB = Math.max(wallL, wallR)
                    const yWallAt = (x: number) => {
                      if (wB - wA < 1e-6) return yLow
                      const t = (x - wA) / Math.max(1e-6, (wB - wA))
                      return lowOnLeft
                        ? (yLow + (yHigh - yLow) * t)
                        : (yHigh + (yLow - yHigh) * t)
                    }
                    // 左端（壁外に軒が出ている場合のみ縦点線を描く）
                    if (Math.abs(wallL - xlEdge) > 0.1) {
                      lines.push(
                        <line key={`mono-tri-vertical-eave-left-${floor.id}-${direction}-${i}`}
                          x1={xlEdge} y1={yAt(xlEdge)} x2={xlEdge} y2={yWallAt(xlEdge)}
                          stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                      )
                    }
                    // 右端
                    if (Math.abs(wallR - xrEdge) > 0.1) {
                      lines.push(
                        <line key={`mono-tri-vertical-eave-right-${floor.id}-${direction}-${i}`}
                          x1={xrEdge} y1={yAt(xrEdge)} x2={xrEdge} y2={yWallAt(xrEdge)}
                          stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                      )
                    }
                    // 底辺や補助線は描かない（壁上端実線と干渉させない）。
                    yLeftEnd = yLow; yRightEnd = yLow
                    suppressConnectors = true
                  } else {
                    // サイド面（高い/低い）は既存仕様の矩形表現を維持（軒の出を含む）
                    // 最高点の高さは、面の幅ではなく“勾配軸方向の建物寸法”で一貫して算出
                    const runAlongSlopeSide = slopeAxisIsX ? widthX : widthY
                    const delta = rSun > 0 ? runAlongSlopeSide * rSun : apex
                    const yHigh = -(wallTop + delta)
                    const faceCard: 'N'|'S'|'E'|'W' = axisIsX ? (direction==='north'?'N':'S') : (direction==='east'?'E':'W')
                    const opposite = (d: 'N'|'S'|'E'|'W'): 'N'|'S'|'E'|'W' => (d==='N'?'S':d==='S'?'N':d==='E'?'W':'E')
                    const highFace = opposite((ru.monoDownhill as any) || (axisIsX?'E':'N'))
                    const xl = Math.min(xLeft, xRight)
                    const xr = Math.max(xLeft, xRight)
                    if (faceCard === highFace) {
                      // 高い面：壁内は実線、張出しは点線。縦辺は壁端で実線を上へ延長
                      const wallL = nearestWallEndpoint(xLeft)
                      const wallR = nearestWallEndpoint(xRight)
                      const inL = Math.min(wallL, wallR)
                      const inR = Math.max(wallL, wallR)
                      // 天井水平線（壁内）を見せないようマスク
                      lines.push(<line key={`mono-side-high-mask-${floor.id}-${i}`} x1={Math.min(wallL, wallR)} y1={-wallTop} x2={Math.max(wallL, wallR)} y2={-wallTop} stroke={COLORS.surface.elevated} strokeWidth={3} vectorEffect="non-scaling-stroke" />)
                      // 上端：壁内(inL-inR)は実線、壁外(軒の出)は点線
                      if (inR - inL > 1e-3) lines.push(<line key={`mono-side-high-top-solid-${floor.id}-${i}`} x1={inL} y1={yHigh} x2={inR} y2={yHigh} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />)
                      if (inL - xl > 1e-3) lines.push(<line key={`mono-side-high-top-leftDash-${floor.id}-${i}`} x1={xl} y1={yHigh} x2={inL} y2={yHigh} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      if (xr - inR > 1e-3) lines.push(<line key={`mono-side-high-top-rightDash-${floor.id}-${i}`} x1={inR} y1={yHigh} x2={xr} y2={yHigh} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      // 垂直点線（軒先端→天井位置）
                      if (Math.abs(inL - xl) > 1e-3) lines.push(<line key={`mono-side-high-vert-leftDash-${floor.id}-${i}`} x1={xl} y1={yHigh} x2={xl} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      if (Math.abs(xr - inR) > 1e-3) lines.push(<line key={`mono-side-high-vert-rightDash-${floor.id}-${i}`} x1={xr} y1={yHigh} x2={xr} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      // 壁の縦ライン（壁端で実線を上へ延長）
                      lines.push(<line key={`mono-side-high-wallL-${floor.id}-${i}`} x1={inL} y1={-wallTop} x2={inL} y2={yHigh} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />)
                      lines.push(<line key={`mono-side-high-wallR-${floor.id}-${i}`} x1={inR} y1={-wallTop} x2={inR} y2={yHigh} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />)
                      // 軒先端と壁頂点（壁端上端）を水平点線で結ぶ
                      if (Math.abs(wallL - xl) > 0.1) lines.push(<line key={`mono-side-high-hl-${floor.id}-${i}`} x1={Math.min(wallL, xl)} y1={-wallTop} x2={Math.max(wallL, xl)} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      if (Math.abs(wallR - xr) > 0.1) lines.push(<line key={`mono-side-high-hr-${floor.id}-${i}`} x1={Math.min(wallR, xr)} y1={-wallTop} x2={Math.max(wallR, xr)} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    } else {
                      // 低い面：屋根ライン（点線）を“壁内外”で分割。壁外=点線、壁内は後段の壁オーバーレイで実線表示。
                      // 垂直（eaves端）
                      lines.push(<line key={`mono-side-low-vl-${floor.id}-${i}`} x1={xl} y1={-wallTop} x2={xl} y2={yHigh} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      lines.push(<line key={`mono-side-low-vr-${floor.id}-${i}`} x1={xr} y1={-wallTop} x2={xr} y2={yHigh} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      // 壁端点
                      const wallL = nearestWallEndpoint(xLeft)
                      const wallR = nearestWallEndpoint(xRight)
                      const inL = Math.max(xl, Math.min(xr, Math.min(wallL, wallR)))
                      const inR = Math.max(xl, Math.min(xr, Math.max(wallL, wallR)))
                      // 屋根上端（点線）: 壁外の区間のみ
                      if (inL - xl > 1e-3) lines.push(<line key={`mono-side-low-top-leftDash-${floor.id}-${i}`} x1={xl} y1={yHigh} x2={inL} y2={yHigh} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      if (xr - inR > 1e-3) lines.push(<line key={`mono-side-low-top-rightDash-${floor.id}-${i}`} x1={inR} y1={yHigh} x2={xr} y2={yHigh} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      // 壁端→軒先端の水平点線
                      if (Math.abs(wallL - xl) > 0.1) lines.push(<line key={`mono-side-low-hl-${floor.id}-${i}`} x1={Math.min(wallL, xl)} y1={-wallTop} x2={Math.max(wallL, xl)} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                      if (Math.abs(wallR - xr) > 0.1) lines.push(<line key={`mono-side-low-hr-${floor.id}-${i}`} x1={Math.min(wallR, xr)} y1={-wallTop} x2={Math.max(wallR, xr)} y2={-wallTop} stroke={stroke} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />)
                    }
                    yLeftEnd = yHigh; yRightEnd = yHigh
                    suppressConnectors = true
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
                // 日本語コメント: 片流れでズレが見える原因を解消するため、
                // コネクタは「垂直→水平」の2線分で必ず壁上端に正対させる。
                if (!suppressConnectors && !coveredByAbove(xLeft) && Math.abs(nxL - xLeft) > 0.1) {
                  const yConn = yLeftEnd
                  // 垂直（軒先端→壁上端の高さ）
                  lines.push(
                    <line key={`conn-left-v-${floor.id}-${direction}-${i}`}
                      x1={xLeft} y1={yConn} x2={xLeft} y2={-wallTop}
                      stroke={stroke} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                  )
                  // 水平（壁上端で壁端点まで）
                  lines.push(
                    <line key={`conn-left-h-${floor.id}-${direction}-${i}`}
                      x1={Math.min(xLeft, nxL)} y1={-wallTop} x2={Math.max(xLeft, nxL)} y2={-wallTop}
                      stroke={stroke} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                  )
                }
                if (!suppressConnectors && !coveredByAbove(xRight) && Math.abs(nxR - xRight) > 0.1) {
                  const yConn = yRightEnd
                  // 垂直（軒先端→壁上端の高さ）
                  lines.push(
                    <line key={`conn-right-v-${floor.id}-${direction}-${i}`}
                      x1={xRight} y1={yConn} x2={xRight} y2={-wallTop}
                      stroke={stroke} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                  )
                  // 水平（壁上端で壁端点まで）
                  lines.push(
                    <line key={`conn-right-h-${floor.id}-${direction}-${i}`}
                      x1={Math.min(xRight, nxR)} y1={-wallTop} x2={Math.max(xRight, nxR)} y2={-wallTop}
                      stroke={stroke} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
                  )
                }
              })
              return <g key={`roof-shape-${floor.id}-${direction}`}>{lines}</g>
            })}
            {/* 壁アウトライン（優先表示のため最後に重ね）
                - 切妻/片流れのフロアでは「天井の水平実線」を描かない（上端は屋根で表現） */}
            {rects.map((r, idx) => {
              const stroke = r.color ?? COLORS.wall
              const startAligned = r.start + axisOffset
              const endAligned = r.end + axisOffset
              const flip = direction === 'north' || direction === 'west'
              const x1 = flip ? (sharedAxisMin + sharedAxisMax - endAligned) : startAligned
              const x2 = flip ? (sharedAxisMin + sharedAxisMax - startAligned) : endAligned
              const xl = Math.min(x1, x2)
              const xr = Math.max(x1, x2)
              // 対象フロアの屋根タイプを確認
              const floor = floors.find(f => f.id === r.floorId)
              const units: any[] = Array.isArray((floor as any)?.roofUnits) ? (floor as any).roofUnits : []
              const outer = units.find(u => u && u.footprint?.kind === 'outer')
              // 切妻: 三角面（妻側）のときは上辺（天井水平実線）を描かない。棟側では描く。
              // → 判定は屋根描画と同じ条件（axisIsX と ridgeAxis の組み合わせ）を再利用して整合性を担保。
              // 片流れ: 棟面（低い側=monoDownhill）では上辺水平実線を描く。高い側は描かない。
              //         残り2面（流れ面＝勾配軸に直交）は、屋根ラインに平行な壁上端（水平）を描く。
              let noTopLine = false
              const axisIsXHere = direction === 'north' || direction === 'south'
              let isMonoFlowFace = false
              let isMonoTriFace = false
              // 日本語コメント: 上辺描画の最終判定（mono専用の補強用フラグ）。
              let shouldDrawTop = true
              if (outer?.type === 'mono') {
                const downhill = (outer as any).monoDownhill as ('N'|'S'|'E'|'W'|undefined)
                const isDownhillFace = (
                  (downhill === 'N' && direction === 'north') ||
                  (downhill === 'S' && direction === 'south') ||
                  (downhill === 'E' && direction === 'east')  ||
                  (downhill === 'W' && direction === 'west')
                )
                const isUphillFace = (
                  (downhill === 'N' && direction === 'south') ||
                  (downhill === 'S' && direction === 'north') ||
                  (downhill === 'E' && direction === 'west')  ||
                  (downhill === 'W' && direction === 'east')
                )
                const slopeAxisIsX = downhill === 'E' || downhill === 'W'
                const isFlowFace = (!isDownhillFace && !isUphillFace) && (axisIsXHere !== slopeAxisIsX)
                const isTriFace = (!isDownhillFace && !isUphillFace) && (axisIsXHere === slopeAxisIsX)
                // 棟面: 上辺=壁天端で水平線を描く。高面: 上辺なし。流れ面: 屋根ラインに平行（水平）の壁上端を描く。
                noTopLine = !isDownhillFace && !isFlowFace
                isMonoFlowFace = isFlowFace
                isMonoTriFace = isTriFace
                // 日本語コメント: 片流れの四角い面（棟面/流れ面）は必ず上辺を描く。
                // まれに noTopLine 判定が崩れるケースでも確実に描画するための保険。
                shouldDrawTop = isDownhillFace || isFlowFace
                // 流れ面用の専用トップY（屋根ラインに平行=水平、棟高で統一）
                var monoFlowTopY: number | null = null
                // 棟面（低い側）用のトップY（屋根高）
                var monoDownhillTopY: number | null = null
                if (isFlowFace) {
                  // 建物外形の幅から方向非依存の棟高Δを算出
                  const k2 = (floor?.shape?.kind ?? 'rect') as TemplateKind
                  const d2: any = (floor as any)?.shape?.data
                  const pts2 = k2 === 'rect' ? outlineRect(d2)
                    : k2 === 'l' ? outlineL(d2)
                    : k2 === 'u' ? outlineU(d2)
                    : k2 === 't' ? outlineT(d2)
                    : outlinePoly(d2)
                  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
                  for (const p of pts2) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
                  const widthX = Math.max(1, maxX - minX)
                  const widthY = Math.max(1, maxY - minY)
                  const rSun = (() => { const v = Number((outer as any).pitchSun ?? 0); return (Number.isFinite(v) && v > 0) ? v / 10 : 0 })()
                  const apex = Math.max(0, Number((outer as any).apexHeightMm ?? 0))
                  const runSlope = (slopeAxisIsX ? widthX : widthY)
                  const deltaGlobal = rSun > 0 ? (runSlope * rSun) : apex
                  monoFlowTopY = -(r.top + deltaGlobal)
                }
                if (isDownhillFace) {
                  // 低い側（downhill 面）の四角形の上辺は「壁天端（=軒高）」で水平に描くべき。
                  // これまで棟高で描いていたため不自然な段差が出ていた。
                  const k2 = (floor?.shape?.kind ?? 'rect') as TemplateKind
                  const d2: any = (floor as any)?.shape?.data
                  const pts2 = k2 === 'rect' ? outlineRect(d2)
                    : k2 === 'l' ? outlineL(d2)
                    : k2 === 'u' ? outlineU(d2)
                    : k2 === 't' ? outlineT(d2)
                    : outlinePoly(d2)
                  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
                  for (const p of pts2) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
                  const widthX = Math.max(1, maxX - minX)
                  const widthY = Math.max(1, maxY - minY)
                  const rSun = (() => { const v = Number((outer as any).pitchSun ?? 0); return (Number.isFinite(v) && v > 0) ? v / 10 : 0 })()
                  const apex = Math.max(0, Number((outer as any).apexHeightMm ?? 0))
                  const runSlope = (slopeAxisIsX ? widthX : widthY)
                  // 低い側は「壁天端 = -r.top」。勾配Δは使用しない。
                  // 参考: delta は高い側や流れ面の表現にのみ関与する。
                  const _delta = rSun > 0 ? (runSlope * rSun) : apex // 説明用に保持（未使用）
                  monoDownhillTopY = -r.top
                }
                // 描画: 下の共通ルーチンで monoFlowTopY を参照（非nullなら優先）
              } else if (outer?.type === 'gable') {
                const isSlopeAlongX = (outer.ridgeAxis ?? 'NS') === 'NS'
                const isTriangleFace = (axisIsXHere && isSlopeAlongX) || (!axisIsXHere && !isSlopeAlongX)
                noTopLine = isTriangleFace
              }
              return (
                <g key={`overlay-${r.floorId}-${idx}`}>
                  {/* 底辺（地面に接する側） */}
                  <line x1={xl} y1={-r.base} x2={xr} y2={-r.base} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  {/* 左右の立ち上がり */}
                  <line x1={xl} y1={-r.base} x2={xl} y2={-r.top} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  <line x1={xr} y1={-r.base} x2={xr} y2={-r.top} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  {/* 上辺（天井水平線 or 流れ面の水平線） */}
                  {(outer?.type === 'mono' ? shouldDrawTop : !noTopLine) && (
                    <line
                      x1={xl}
                      y1={typeof monoFlowTopY === 'number' ? monoFlowTopY : (typeof monoDownhillTopY === 'number' ? monoDownhillTopY : -r.top)}
                      x2={xr}
                      y2={typeof monoFlowTopY === 'number' ? monoFlowTopY : (typeof monoDownhillTopY === 'number' ? monoDownhillTopY : -r.top)}
                      stroke={stroke}
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {/* 片流れの三角面（正面）: 壁上端も屋根斜辺に“並行”な実線で描く */}
                  {outer?.type === 'mono' && isMonoTriFace && (() => {
                    // eaves スパンのうち、この壁矩形と最大に重なるものを採用（start/endを保持する）
                    const raw = computeParapetSpansForFloor(floor as any, direction)
                    const toScreen = (v: number) => {
                      const aligned = v + axisOffset
                      return (direction === 'north' || direction === 'west') ? (sharedAxisMin + sharedAxisMax - aligned) : aligned
                    }
                    let bestRef: { start: number; end: number } | null = null
                    let bestA = 0, bestB = 0
                    let bestOv = -1
                    for (const s of raw) {
                      const a = toScreen(s.start)
                      const b = toScreen(s.end)
                      const lo = Math.min(a, b), hi = Math.max(a, b)
                      const ov = Math.max(0, Math.min(xr, hi) - Math.max(xl, lo))
                      if (ov > bestOv) { bestOv = ov; bestRef = s; bestA = a; bestB = b }
                    }
                    // start/end のスクリーン座標（未取得時は矩形幅でフォールバック）
                    const bxStart = bestRef ? bestA : xl
                    const bxEnd = bestRef ? bestB : xr
                    // 棟高Δを方向非依存で算出
                    const k2 = (floor?.shape?.kind ?? 'rect') as TemplateKind
                    const d2: any = (floor as any)?.shape?.data
                    const pts2 = k2 === 'rect' ? outlineRect(d2)
                      : k2 === 'l' ? outlineL(d2)
                      : k2 === 'u' ? outlineU(d2)
                      : k2 === 't' ? outlineT(d2)
                      : outlinePoly(d2)
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
                    for (const p of pts2) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
                    const widthX = Math.max(1, maxX - minX)
                    const widthY = Math.max(1, maxY - minY)
                    const slopeAxisIsX2 = ((outer as any).monoDownhill === 'E' || (outer as any).monoDownhill === 'W')
                    const rSun = (() => { const v = Number((outer as any).pitchSun ?? 0); return (Number.isFinite(v) && v > 0) ? v / 10 : 0 })()
                    const apex = Math.max(0, Number((outer as any).apexHeightMm ?? 0))
                    const runSlope = (slopeAxisIsX2 ? widthX : widthY)
                    const delta = rSun > 0 ? (runSlope * rSun) : apex
                    if (delta <= 0) return null
                    // 三角面の壁上端: 左右いずれが低いかを downhill と方向から決定し、直線で描く
                    const downhill = ((outer as any).monoDownhill ?? 'S') as 'N'|'S'|'E'|'W'
                    const yHigh = -(r.top + delta)
                    const yLow = -r.top
                    // 日本語コメント: 方向差を無くすため、画面座標での左右関係に統一
                    const downhillToRight2 = (() => {
                      const axX = axisIsXHere
                      const f = flip
                      switch (downhill) {
                        case 'E': return !f
                        case 'W': return f
                        case 'N': return axX ? null : !f
                        case 'S': return axX ? null : f
                        default: return null
                      }
                    })()
                    const lowOnLeft = downhillToRight2 === true ? false : true
                    const yL = lowOnLeft ? yLow : yHigh
                    const yR = lowOnLeft ? yHigh : yLow
                    return (
                      <g>
                        {/* 壁上端（実線、屋根斜辺と並行） */}
                        <line x1={xl} y1={yL} x2={xr} y2={yR} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                        {/* 左右の壁縦線を上端まで延長（高い側も含む） */}
                        <line x1={xl} y1={-r.base} x2={xl} y2={yL} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                        <line x1={xr} y1={-r.base} x2={xr} y2={yR} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                      </g>
                    )
                  })()}
                  {/* 切妻の妻側: 壁ライン優先のため、上端を三角形（実線）で表現 */}
                  {outer?.type === 'gable' && noTopLine && (() => {
                    // 屋根線（点線）の左右斜辺と「並行」になるよう、妻側の壁上端（三角）を構成
                    // 1) この矩形に対応する eaves スパン（屋根ベース）を取得（スクリーン座標）
                    const raw = computeParapetSpansForFloor(floor as any, direction)
                    const toScreen = (v: number) => {
                      const aligned = v + axisOffset
                      return (direction === 'north' || direction === 'west') ? (sharedAxisMin + sharedAxisMax - aligned) : aligned
                    }
                    let best: { lo: number; hi: number } | null = null
                    let bestOv = -1
                    for (const s of raw) {
                      const a = toScreen(s.start)
                      const b = toScreen(s.end)
                      const lo = Math.min(a, b), hi = Math.max(a, b)
                      const ov = Math.max(0, Math.min(xr, hi) - Math.max(xl, lo))
                      if (ov > bestOv) { bestOv = ov; best = { lo, hi } }
                    }
                    // eavesスパンが取得できない場合は、矩形幅（xl..xr）をフォールバック
                    const bxL = best ? best.lo : xl
                    const bxR = best ? best.hi : xr
                    const xApexRoof = (bxL + bxR) / 2
                    // 2) 屋根の棟高（方向非依存）
                    const k2 = (floor?.shape?.kind ?? 'rect') as TemplateKind
                    const d2: any = (floor as any)?.shape?.data
                    const pts2 = k2 === 'rect' ? outlineRect(d2)
                      : k2 === 'l' ? outlineL(d2)
                      : k2 === 'u' ? outlineU(d2)
                      : k2 === 't' ? outlineT(d2)
                      : outlinePoly(d2)
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
                    for (const p of pts2) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
                    const widthX = Math.max(1, maxX - minX)
                    const widthY = Math.max(1, maxY - minY)
                    const isSlopeAlongX = (outer.ridgeAxis ?? 'NS') === 'NS'
                    const rSun = (() => { const v = Number((outer as any).pitchSun ?? 0); return (Number.isFinite(v) && v > 0) ? v / 10 : 0 })()
                    const runSlope = (isSlopeAlongX ? widthX : widthY) / 2
                    const deltaGlobal = runSlope * rSun
                    const yEaves = -r.top
                    const yRidge = -(r.top + deltaGlobal)
                    if (deltaGlobal <= 0) return null
                    // 3) 屋根斜辺の傾きを取得（左右）
                    const mL = (yRidge - yEaves) / Math.max(1e-6, (xApexRoof - bxL))
                    const mR = (yRidge - yEaves) / Math.max(1e-6, (bxR - xApexRoof))
                    // 4) これらと並行な壁上端の左右斜辺の交点（頂点）を解く
                    const xApexWall = (mL * xl + mR * xr) / Math.max(1e-6, (mL + mR))
                    const yApexWall = yEaves + mL * (xApexWall - xl)
                    return (
                      <g>
                        <line x1={xl} y1={yEaves} x2={xApexWall} y2={yApexWall} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                        <line x1={xApexWall} y1={yApexWall} x2={xr} y2={yEaves} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                      </g>
                    )
                  })()}
                </g>
              )
            })}

            {/* 最高高さライン（方向別の最大高さ） */}
            {(() => {
              const yTop = -actualBounds.topMax
              return (
                <line
                  x1={minX}
                  y1={yTop}
                  x2={minX + width}
                  y2={yTop}
                  stroke={COLORS.helper}
                  strokeWidth={1.5}
                  strokeDasharray="8 6"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.5}
                />
              )
            })()}

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
