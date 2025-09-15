import React, { useEffect, useRef, useState } from 'react'
import type { FloorState } from '@/core/floors'
import { outlineL, outlineRect, outlineT, outlineU } from '@/core/model'
import { DEFAULT_PX_PER_MM } from '@/core/units'
import { modelToScreen } from '@/core/transform'
import { COLORS, withAlpha } from '@/ui/colors'
import { DimensionEngine } from '@/core/dimensions/dimension_engine'

type Props = {
  floors: FloorState[]
  onClose: () => void
}

// 日本語コメント: プレビュー描画専用のオーバーレイ。編集不可・自動フィットで全階層を合成表示。
const PreviewOverlay: React.FC<Props> = ({ floors, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dimEngineRef = useRef(new DimensionEngine())
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const canvas = canvasRef.current
    const svg = svgRef.current
    if (!canvas || !svg) return
    const ctx = canvas.getContext('2d')!
    const css = canvas.getBoundingClientRect()
    canvas.width = Math.floor(css.width * devicePixelRatio)
    canvas.height = Math.floor(css.height * devicePixelRatio)
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    ctx.clearRect(0, 0, css.width, css.height)

    // 日本語コメント: 全階層の外形からグローバルBBoxを求め、オートフィットのスケールを決定
    type P = { x: number; y: number }
    const polysMm: { floor: FloorState; pts: P[] }[] = []
    for (const f of floors) {
      const k = f.shape?.kind ?? 'rect'
      const d = (f.shape as any)?.data
      const pts = k === 'rect' ? outlineRect(d)
        : k === 'l' ? outlineL(d)
        : k === 'u' ? outlineU(d)
        : outlineT(d)
      polysMm.push({ floor: f, pts })
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const { pts } of polysMm) {
      for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
    }
    const widthMm = Math.max(1, maxX - minX)
    const heightMm = Math.max(1, maxY - minY)
    const wFit = css.width * 0.9 / widthMm
    const hFit = css.height * 0.9 / heightMm
    const fit = Math.min(DEFAULT_PX_PER_MM, wFit, hFit)
    const pxPerMm = Math.max(0.05, Math.min(10, fit * zoom))

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, css.width, css.height)

    // 日本語コメント: オーバーレイ内の描画原点はビューポート中央に調整
    const center = modelToScreen({ x: 0, y: 0 }, { width: css.width, height: css.height }, pxPerMm)

    // SVG初期化
    svg.setAttribute('width', String(css.width))
    svg.setAttribute('height', String(css.height))
    svg.setAttribute('viewBox', `0 0 ${css.width} ${css.height}`)
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    const NS = 'http://www.w3.org/2000/svg'

    // 日本語コメント: 下階→上階の順に描画（重なりは上階が優先）
    const sorted = [...polysMm].sort((a, b) => a.floor.elevationMm - b.floor.elevationMm)

    sorted.forEach(({ floor: f, pts }, idx) => {
      if (!f.visible) return
      const poly = pts.map(p => {
        const s = modelToScreen(p, { width: css.width, height: css.height }, pxPerMm)
        return { x: s.x, y: s.y }
      })

      // 壁: 実線、フロア色
      const col = f.color?.walls ?? COLORS.wall
      ctx.strokeStyle = col
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.beginPath(); poly.forEach((s, i) => { if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y) }); ctx.closePath(); ctx.stroke()

      // 軒の出: 破線（視認用に半透明）
      if (f.eaves?.enabled) {
        const amount = Math.max(f.eaves.amountMm || 0, ...Object.values(f.eaves.perEdge ?? {}))
        if (amount > 0) {
          ctx.setLineDash([6, 4])
          ctx.strokeStyle = withAlpha(col, 0.8)
          ctx.lineWidth = 2
          // 簡易: 各辺の外側法線に一定量オフセットして繋ぐ（個別指定はここでは最大値で近似）
          const n = pts.length
          const area = (() => { let s = 0; for (let i=0;i<n;i++){ const a=pts[i], b=pts[(i+1)%n]; s += a.x*b.y - a.y*b.x } return s/2 })()
          const outward = (vx:number, vy:number) => area < 0 ? { x: -vy, y: vx } : { x: vy, y: -vx }
          const segs: { a:{x:number;y:number}; b:{x:number;y:number}; u:{x:number;y:number}; aOff:{x:number;y:number}; bOff:{x:number;y:number} }[] = []
          for (let i=0;i<n;i++) {
            const a = pts[i], b = pts[(i+1)%n]
            const v = { x: b.x - a.x, y: b.y - a.y }
            const L = Math.hypot(v.x, v.y) || 1
            const u = { x: v.x/L, y: v.y/L }
            const on = outward(u.x, u.y)
            const off = { x: on.x * amount, y: on.y * amount }
            segs.push({ a, b, u, aOff: { x: a.x + off.x, y: a.y + off.y }, bOff: { x: b.x + off.x, y: b.y + off.y } })
          }
          const intersect = (p1:{x:number;y:number}, v1:{x:number;y:number}, p2:{x:number;y:number}, v2:{x:number;y:number}) => {
            const den = v1.x*v2.y - v1.y*v2.x; if (Math.abs(den) < 1e-8) return null
            const w = { x: p2.x - p1.x, y: p2.y - p1.y }; const t = (w.x*v2.y - w.y*v2.x) / den
            return { x: p1.x + v1.x*t, y: p1.y + v1.y*t }
          }
          for (let i=0;i<n;i++) {
            let sA = segs[i].aOff, sB = segs[i].bOff
            const prev = (i+n-1)%n, next = (i+1)%n
            const ip1 = intersect(segs[prev].aOff, segs[prev].u, segs[i].aOff, segs[i].u); if (ip1) sA = ip1
            const ip2 = intersect(segs[i].aOff, segs[i].u, segs[next].aOff, segs[next].u); if (ip2) sB = ip2
            const s1 = modelToScreen(sA, { width: css.width, height: css.height }, pxPerMm)
            const s2 = modelToScreen(sB, { width: css.width, height: css.height }, pxPerMm)
            ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke()
          }
          ctx.setLineDash([])
        }
      }

      // 日本語コメント: 軒の出の値を、壁ラインと軒ラインの間（中間）に小さな丸で表示
      if (f.eaves?.enabled) {
        const n = poly.length
        // 画面座標での多角形面積（外側法線の向き判定）
        let areaS = 0; for (let i=0;i<n;i++){ const a=poly[i], b=poly[(i+1)%n]; areaS += a.x*b.y - a.y*b.x }
        const outward = (ux:number, uy:number) => (areaS < 0 ? { x: -uy, y: ux } : { x: uy, y: -ux })
        for (let i=0;i<n;i++) {
          const a = poly[i]
          const b = poly[(i+1)%n]
          const dv = { x: b.x - a.x, y: b.y - a.y }
          const L = Math.hypot(dv.x, dv.y); if (L < 1e-6) continue
          const u = { x: dv.x / L, y: dv.y / L }
          const on = outward(u.x, u.y)
          const dmm = f.eaves?.perEdge?.[i] ?? f.eaves?.amountMm ?? 0
          if (!dmm || dmm <= 0) continue
          const eavesPx = dmm * pxPerMm
          if (eavesPx < 12) continue // 狭い場合は省略して視認性を確保
          // 配置位置（壁→軒の中間点付近、最小余白考慮）
          const baseMid = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 }
          const minGap = 4
          const placeDist = Math.min(Math.max(eavesPx * 0.5, minGap), Math.max(eavesPx - 6, minGap))
          let cx = baseMid.x + on.x * placeDist
          let cy = baseMid.y + on.y * placeDist
          // テキスト（数値のみ、単位省略）
          const NS = 'http://www.w3.org/2000/svg'
          const tx = document.createElementNS(NS, 'text') as SVGTextElement
          tx.textContent = `${Math.round(dmm)}`
          tx.setAttribute('x', String(cx))
          tx.setAttribute('y', String(cy))
          tx.setAttribute('fill', withAlpha(col, 0.95))
          tx.setAttribute('font-size', '10')
          tx.setAttribute('text-anchor', 'middle')
          tx.setAttribute('dominant-baseline', 'middle')
          svg.appendChild(tx)
          const bb = tx.getBBox()
          let r = Math.ceil(Math.max(7, Math.max(bb.width, bb.height) * 0.5 + 3))
          const maxR = Math.max(8, (eavesPx - 4) * 0.5)
          if (r > maxR) {
            r = Math.floor(maxR)
            const adj = Math.max(r + 3, placeDist - 3)
            cx = baseMid.x + on.x * adj
            cy = baseMid.y + on.y * adj
            tx.setAttribute('x', String(cx))
            tx.setAttribute('y', String(cy))
          }
          if (r < 6) { svg.removeChild(tx); continue }
          const circle = document.createElementNS(NS, 'circle')
          circle.setAttribute('cx', String(cx))
          circle.setAttribute('cy', String(cy))
          circle.setAttribute('r', String(r))
          circle.setAttribute('fill', 'rgba(0,0,0,0.35)')
          circle.setAttribute('stroke', withAlpha(col, 0.8))
          circle.setAttribute('stroke-width', '1')
          svg.insertBefore(circle, tx)
        }
      }

    })

    // 日本語コメント: 寸法線（各面を「全体外側」に統一）。
    // 仕様: 各面（上/下/左/右）ごとに、グローバルBBoxの外側に基準線を1セット用意し、
    //       その基準線上に各階のスパンを「1本線の分割表現（|---長さ---|）」で並べる。
    type Side = 'top' | 'bottom' | 'left' | 'right'
    // 日本語コメント: 寸法基準線は「軒の出」よりさらに外側へ。余白をやや大きめに設定
    const marginPx = 32
    const eavesGapPx = 16
    const rowGapPx = 16 // 同一面で階ごとに縦(横)にずらす量

    // モデル座標→スクリーンへの補助
    const toS = (p: {x:number;y:number}) => modelToScreen(p, { width: css.width, height: css.height }, pxPerMm)
    // 日本語コメント: 画面YはモデルYと反転するため、上下は y=maxY が上端、y=minY が下端
    const globalLeftX = toS({ x: minX, y: 0 }).x
    const globalRightX = toS({ x: maxX, y: 0 }).x
    const globalTopY = toS({ x: 0, y: maxY }).y
    const globalBottomY = toS({ x: 0, y: minY }).y

    // 階ごとの各面のエッジ区間（スクリーン座標での投影）を抽出
    type Seg = { start: number; end: number; lenMm: number; edge: number }
    type FloorSideSegs = { floor: FloorState; segs: Seg[] }
    const bySide: Record<Side, FloorSideSegs[]> = { top: [], bottom: [], left: [], right: [] }
    const sideEavesMaxMm: Record<Side, number> = { top: 0, bottom: 0, left: 0, right: 0 }
    for (const { floor: f, pts } of sorted) {
      const n = pts.length
      // 有向面積で外側法線を決定
      let area = 0; for (let i=0;i<n;i++){ const a=pts[i], b=pts[(i+1)%n]; area += a.x*b.y - a.y*b.x } area *= 0.5
      const outward = (vx:number, vy:number) => area < 0 ? { x: -vy, y: vx } : { x: vy, y: -vx }
      const sideSegs: Record<Side, Seg[]> = { top: [], bottom: [], left: [], right: [] }
      for (let i=0;i<n;i++) {
        const a = pts[i], b = pts[(i+1)%n]
        const v = { x: b.x - a.x, y: b.y - a.y }
        const L = Math.hypot(v.x, v.y)
        if (L < 1e-6) continue
        const u = { x: v.x / L, y: v.y / L }
        const on = outward(u.x, u.y)
        // 面の決定（外側法線の向きで分類）
        let side: Side | null = null
        if (on.y > 0.5) side = 'top'
        else if (on.y < -0.5) side = 'bottom'
        else if (on.x < -0.5) side = 'left'
        else if (on.x > 0.5) side = 'right'
        if (!side) continue
        // この辺の軒の出量（mm）— 階が軒の出を有効にしている場合のみ反映
        const distMm = f.eaves?.enabled ? (f.eaves?.perEdge?.[i] ?? f.eaves?.amountMm ?? 0) : 0
        if (distMm > sideEavesMaxMm[side]) sideEavesMaxMm[side] = distMm
        // スクリーン座標へ投影
        const sa = toS(a), sb = toS(b)
        if (side === 'top' || side === 'bottom') {
          const start = Math.min(sa.x, sb.x)
          const end = Math.max(sa.x, sb.x)
          sideSegs[side].push({ start, end, lenMm: L, edge: i })
        } else {
          const start = Math.min(sa.y, sb.y)
          const end = Math.max(sa.y, sb.y)
          sideSegs[side].push({ start, end, lenMm: L, edge: i })
        }
      }
      ;(['top','bottom','left','right'] as Side[]).forEach(s => {
        bySide[s].push({ floor: f, segs: sideSegs[s] })
      })
    }

    // 描画ユーティリティ（基準線、目盛、ラベル）
    const drawRowTopBottom = (
      side: 'top'|'bottom',
      yBase: number,
      globalStart: number,
      globalEnd: number,
      row: FloorSideSegs,
      rowIndex: number,
      placedGlobal: DOMRect[]
    ) => {
      const col = row.floor.color?.walls ?? COLORS.helper
      // 階ラベル
      const label = document.createElementNS(NS, 'text') as SVGTextElement
      label.textContent = row.floor.name
      label.setAttribute('x', String(globalStart - 36))
      label.setAttribute('y', String(yBase - 4))
      label.setAttribute('fill', col)
      label.setAttribute('font-size', '12')
      label.setAttribute('text-anchor', 'end')
      svg.appendChild(label)
      // 区間ごとに基準線（部分線）＋縦目盛と寸法値（壁が無い区間には線を描かない）
      const eps = 0.5
      const placedRow: DOMRect[] = []
      let lastTickX: number | null = null
      for (const seg of row.segs.sort((a,b)=>a.start-b.start)) {
        // 区間の基準線
        const base = document.createElementNS(NS, 'line')
        base.setAttribute('x1', String(seg.start))
        base.setAttribute('y1', String(yBase))
        base.setAttribute('x2', String(seg.end))
        base.setAttribute('y2', String(yBase))
        base.setAttribute('stroke', col)
        base.setAttribute('stroke-width', '1')
        svg.appendChild(base)
        const t1 = document.createElementNS(NS, 'line')
        t1.setAttribute('x1', String(seg.start))
        t1.setAttribute('y1', String(yBase - 6))
        t1.setAttribute('x2', String(seg.start))
        t1.setAttribute('y2', String(yBase + 6))
        t1.setAttribute('stroke', col)
        t1.setAttribute('stroke-width', '1')
        if (lastTickX == null || Math.abs(seg.start - lastTickX) > eps) svg.appendChild(t1)
        const t2 = document.createElementNS(NS, 'line')
        t2.setAttribute('x1', String(seg.end))
        t2.setAttribute('y1', String(yBase - 6))
        t2.setAttribute('x2', String(seg.end))
        t2.setAttribute('y2', String(yBase + 6))
        t2.setAttribute('stroke', col)
        t2.setAttribute('stroke-width', '1')
        svg.appendChild(t2)
        lastTickX = seg.end
        const mid = (seg.start + seg.end) / 2
        const tx = document.createElementNS(NS, 'text') as SVGTextElement
        // 日本語コメント: mm表記（例: 5000）
        tx.textContent = `${Math.round(seg.lenMm)} mm`
        tx.setAttribute('x', String(mid))
        // 日本語コメント: 初期配置は基準線の外側（topは上方向、bottomは下方向）
        tx.setAttribute('y', String(side === 'top' ? (yBase - 8) : (yBase + 14)))
        tx.setAttribute('fill', col)
        tx.setAttribute('font-size', '12')
        tx.setAttribute('text-anchor', 'middle')
        svg.appendChild(tx)
        // 日本語コメント: 重なり回避—既存ラベルと重なる場合は外側へ段階的に押し出す
        const tryResolve = () => {
          const bbox = tx.getBBox()
          const overlaps = (a: DOMRect, b: DOMRect) => !(a.x + a.width + 2 < b.x || b.x + b.width + 2 < a.x || a.y + a.height + 2 < b.y || b.y + b.height + 2 < a.y)
          let level = 0
          while ((placedRow.some(b => overlaps(b, bbox)) || placedGlobal.some(b => overlaps(b, bbox))) && level < 8) {
            level++
            const y = (side === 'top') ? (yBase - 8 - level * 12) : (yBase + 14 + level * 12)
            tx.setAttribute('y', String(y))
            const nb = tx.getBBox()
            if (!placedRow.some(b => overlaps(b, nb)) && !placedGlobal.some(b => overlaps(b, nb))) { placedRow.push(nb); placedGlobal.push(nb); return }
          }
          const fb = tx.getBBox(); placedRow.push(fb); placedGlobal.push(fb)
        }
        tryResolve()
      }
    }
    const drawRowLeftRight = (
      side: 'left'|'right',
      xBase: number,
      globalStart: number,
      globalEnd: number,
      row: FloorSideSegs,
      rowIndex: number,
      placedGlobal: DOMRect[]
    ) => {
      const col = row.floor.color?.walls ?? COLORS.helper
      // 階ラベル
      const label = document.createElementNS(NS, 'text') as SVGTextElement
      label.textContent = row.floor.name
      label.setAttribute('x', String(xBase))
      label.setAttribute('y', String(globalStart - 12))
      label.setAttribute('fill', col)
      label.setAttribute('font-size', '12')
      label.setAttribute('text-anchor', 'middle')
      svg.appendChild(label)
      // 区間ごとに基準線（部分線）＋横目盛と寸法値（壁が無い区間には線を描かない）
      const eps = 0.5
      const placedRow: DOMRect[] = []
      let lastTickY: number | null = null
      for (const seg of row.segs.sort((a,b)=>a.start-b.start)) {
        // 区間の基準線
        const base = document.createElementNS(NS, 'line')
        base.setAttribute('x1', String(xBase))
        base.setAttribute('y1', String(seg.start))
        base.setAttribute('x2', String(xBase))
        base.setAttribute('y2', String(seg.end))
        base.setAttribute('stroke', col)
        base.setAttribute('stroke-width', '1')
        svg.appendChild(base)
        const t1 = document.createElementNS(NS, 'line')
        t1.setAttribute('x1', String(xBase - 6))
        t1.setAttribute('y1', String(seg.start))
        t1.setAttribute('x2', String(xBase + 6))
        t1.setAttribute('y2', String(seg.start))
        t1.setAttribute('stroke', col)
        t1.setAttribute('stroke-width', '1')
        if (lastTickY == null || Math.abs(seg.start - lastTickY) > eps) svg.appendChild(t1)
        const t2 = document.createElementNS(NS, 'line')
        t2.setAttribute('x1', String(xBase - 6))
        t2.setAttribute('y1', String(seg.end))
        t2.setAttribute('x2', String(xBase + 6))
        t2.setAttribute('y2', String(seg.end))
        t2.setAttribute('stroke', col)
        t2.setAttribute('stroke-width', '1')
        svg.appendChild(t2)
        lastTickY = seg.end
        const mid = (seg.start + seg.end) / 2
        const tx = document.createElementNS(NS, 'text') as SVGTextElement
        // 日本語コメント: mm表記（例: 5000）
        tx.textContent = `${Math.round(seg.lenMm)} mm`
        tx.setAttribute('x', String(side === 'right' ? (xBase + 8) : (xBase - 8)))
        // 日本語コメント: 行間での上下被りを避けるため、行インデックスで基準Yをずらす
        const perRowYOffset = 6
        tx.setAttribute('y', String(mid + 4 + (rowIndex % 2 === 0 ? rowIndex : -rowIndex) * perRowYOffset))
        tx.setAttribute('fill', col)
        tx.setAttribute('font-size', '12')
        tx.setAttribute('text-anchor', side === 'right' ? 'start' : 'end')
        svg.appendChild(tx)
        // 日本語コメント: 重なり回避—既存ラベルと重なる場合は縦方向（上下）へ段階的にずらす。難しい場合は縦書き回転で回避。
        const tryResolve = () => {
          const overlaps = (a: DOMRect, b: DOMRect) => !(a.x + a.width + 4 < b.x || b.x + b.width + 4 < a.x || a.y + a.height + 4 < b.y || b.y + b.height + 4 < a.y)
          const step = 12
          // 0, +1, -1, +2, -2, ... の順でオフセット候補を試す（縦方向にずらす）
          const seq: number[] = []
          for (let i=0;i<12;i++){ if(i===0) seq.push(0); else { seq.push(i); seq.push(-i) } }
          for (const k of seq) {
            const curY = Number(tx.getAttribute('y')) || (mid + 4)
            const y = curY + k * step
            tx.setAttribute('y', String(y))
            const nb = tx.getBBox()
            if (!placedRow.some(b => overlaps(b, nb)) && !placedGlobal.some(b => overlaps(b, nb))) { placedRow.push(nb); placedGlobal.push(nb); return }
          }
          // それでも重なる場合は90°回転し、外側へ少し逃がす
          const baseX = Number(tx.getAttribute('x')) || 0
          const baseY = Number(tx.getAttribute('y')) || (mid + 4)
          const rot = (side === 'right') ? 90 : -90
          const dx = (side === 'right') ? 16 : -16
          tx.setAttribute('transform', `rotate(${rot} ${baseX} ${baseY}) translate(${dx} 0)`)
          // 回転後のBBoxで最終配置
          const fb = tx.getBBox(); placedRow.push(fb); placedGlobal.push(fb)
        }
        tryResolve()
      }
    }

    // 面ごとに行を割り当てて描画（上/下/左/右）
    const topBase = globalTopY - (sideEavesMaxMm.top * pxPerMm) - eavesGapPx - marginPx
    const bottomBase = globalBottomY + (sideEavesMaxMm.bottom * pxPerMm) + eavesGapPx + marginPx
    const leftBase = globalLeftX - (sideEavesMaxMm.left * pxPerMm) - eavesGapPx - marginPx
    const rightBase = globalRightX + (sideEavesMaxMm.right * pxPerMm) + eavesGapPx + marginPx
    const placedTop: DOMRect[] = []
    const placedBottom: DOMRect[] = []
    const placedLeft: DOMRect[] = []
    const placedRight: DOMRect[] = []
    bySide.top.forEach((row, i) => drawRowTopBottom('top', topBase - i*rowGapPx, globalLeftX, globalRightX, row, i, placedTop))
    bySide.bottom.forEach((row, i) => drawRowTopBottom('bottom', bottomBase + i*rowGapPx, globalLeftX, globalRightX, row, i, placedBottom))
    bySide.left.forEach((row, i) => drawRowLeftRight('left', leftBase - i*rowGapPx, globalTopY, globalBottomY, row, i, placedLeft))
    bySide.right.forEach((row, i) => drawRowLeftRight('right', rightBase + i*rowGapPx, globalTopY, globalBottomY, row, i, placedRight))

    // 日本語コメント: 面別の「軒の出」専用基準線（壁寸法の1行外）— 1本線の分割表現で表示
    // 日本語コメント: 軒の出専用の寸法行は一旦撤去（視認性改善のため）。
  }, [floors, zoom])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背面クリックで閉じる */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[var(--panel)] border border-neutral-800 rounded-md shadow-xl w-[min(96vw,1600px)] h-[min(92vh,1000px)] overflow-hidden">
        <div className="h-10 flex items-center justify-between px-3 border-b border-neutral-800 select-none">
          <div className="font-medium">プレビュー（全階層）</div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 text-sm border border-neutral-700 rounded hover:bg-neutral-800" onClick={() => setZoom(z => Math.max(0.2, z/1.1))}>-</button>
            <div className="w-16 text-center text-sm text-neutral-300">{Math.round(zoom*100)}%</div>
            <button className="px-2 py-1 text-sm border border-neutral-700 rounded hover:bg-neutral-800" onClick={() => setZoom(z => Math.min(8, z*1.1))}>+</button>
            <button className="ml-2 px-2 py-1 text-sm border border-neutral-700 rounded hover:bg-neutral-800" onClick={() => setZoom(1)}>フィット</button>
            <button className="ml-3 text-sm text-neutral-300 hover:text-white" onClick={onClose}>閉じる</button>
          </div>
        </div>
        <div
          className="relative w-full h-[calc(100%-2.5rem)]"
          onWheel={(e) => { e.preventDefault(); const dir = e.deltaY > 0 ? -1 : 1; setZoom(z => Math.max(0.2, Math.min(8, z * (dir>0 ? 1.05 : 1/1.05)))) }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        </div>
      </div>
    </div>
  )
}

export default PreviewOverlay
