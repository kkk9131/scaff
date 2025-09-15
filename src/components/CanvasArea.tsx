import React, { useEffect, useRef, useState } from 'react'
// 日本語コメント: 内部モデル（mm単位）と座標変換のユーティリティ
import { DEFAULT_PX_PER_MM } from '@/core/units'
import { bboxOf, outlineOf, TemplateKind, INITIAL_RECT, outlineRect, INITIAL_L, INITIAL_U, INITIAL_T, outlineL, outlineU, outlineT, bboxOfL, bboxOfU, bboxOfT } from '@/core/model'
import { lengthToScreen, modelToScreen, screenToModel } from '@/core/transform'
import { applySnaps, SNAP_DEFAULTS, type SnapOptions } from '@/core/snap'
import { COLORS } from '@/ui/colors'
// 寸法線エンジン（画面座標の多角形から外側の寸法線を算出）
import { DimensionEngine } from '@/core/dimensions/dimension_engine'
import { offsetPolygonOuterVariable, signedArea as signedAreaModel } from '@/core/eaves/offset'
// 日本語コメント: 辺クリック→寸法入力（mm）に対応
export const CanvasArea: React.FC<{ template?: TemplateKind; snapOptions?: SnapOptions; dimensionOptions?: { show: boolean; outsideMode?: 'auto'|'left'|'right'; offset?: number; offsetUnit?: 'px'|'mm'; decimals?: number; avoidCollision?: boolean }; eavesOptions?: { enabled: boolean; amountMm: number; perEdge?: Record<number, number> }; onUpdateEaves?: (patch: Partial<{ enabled: boolean; amountMm: number; perEdge: Record<number, number> }>) => void }> = ({ template = 'rect', snapOptions, dimensionOptions, eavesOptions, onUpdateEaves }) => {
  // 日本語コメント: 平面図キャンバス。内部モデル(mm)→画面(px)で変換し、初期長方形を描画する。
  const ref = useRef<HTMLCanvasElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dimEngineRef = useRef(new DimensionEngine())
  // 寸法設定は描画クロージャから参照するためRefに保持
  const dimOptsRef = useRef(dimensionOptions)
  const eavesRef = useRef(eavesOptions)
  // 日本語コメント: ズームとパンの状態（px基準）。zoomはオートフィットに対する倍率。
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<{x:number;y:number}>({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const panRef = useRef<{x:number;y:number}>({ x: 0, y: 0 })
  const [rectMm, setRectMm] = useState(INITIAL_RECT)
  const [lMm, setLMm] = useState(INITIAL_L)
  const [uMm, setUMm] = useState(INITIAL_U)
  const [tMm, setTMm] = useState(INITIAL_T)

  // 日本語コメント: 描画やイベント内で最新値を参照するための参照
  const rectRef = useRef(rectMm)
  const lRef = useRef(lMm)
  const uRef = useRef(uMm)
  const tRef = useRef(tMm)
  const templateRef = useRef<TemplateKind>(template)
  const drawRef = useRef<() => void>()
  useEffect(() => { rectRef.current = rectMm }, [rectMm])
  useEffect(() => { lRef.current = lMm }, [lMm])
  useEffect(() => { uRef.current = uMm }, [uMm])
  useEffect(() => { tRef.current = tMm }, [tMm])
  useEffect(() => { templateRef.current = template; drawRef.current?.() }, [template])
  useEffect(() => { dimOptsRef.current = dimensionOptions; drawRef.current?.() }, [dimensionOptions])
  useEffect(() => { eavesRef.current = eavesOptions; drawRef.current?.() }, [eavesOptions])
  useEffect(() => { zoomRef.current = zoom; drawRef.current?.() }, [zoom])
  useEffect(() => { panRef.current = pan; drawRef.current?.() }, [pan])

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const cssBounds = canvas.getBoundingClientRect()

      // 日本語コメント: キャンバスの物理解像度を DPR に合わせ、描画座標は CSS px で扱う
      canvas.width = Math.round(cssBounds.width * dpr)
      canvas.height = Math.round(cssBounds.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // 以後の描画は CSS px 基準

      // 画面クリア
      ctx.clearRect(0, 0, cssBounds.width, cssBounds.height)

      // 日本語コメント: スケール（px/mm）。形状のバウンディングボックスでオートフィットし、ユーザー倍率を適用。
      const kind = templateRef.current
      const bb = kind === 'rect' ? rectRef.current : kind === 'l' ? bboxOfL(lRef.current) : kind === 'u' ? bboxOfU(uRef.current) : bboxOfT(tRef.current)
      const wFit = cssBounds.width * 0.9 / bb.widthMm
      const hFit = cssBounds.height * 0.9 / bb.heightMm
      const basePxPerMm = Math.min(DEFAULT_PX_PER_MM, wFit, hFit)
      const pxPerMm = Math.max(0.05, Math.min(10, basePxPerMm * zoomRef.current))

      // 日本語コメント: パンは画面座標の平行移動量（px）。
      const panNow = panRef.current
      const centerBase = modelToScreen({ x: 0, y: 0 }, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
      const center = { x: centerBase.x + panNow.x, y: centerBase.y + panNow.y }

      const snap = snapOptions ?? SNAP_DEFAULTS
      // 日本語コメント: グリッド描画（スナップ可視化）。薄い線で gridMm 間隔
      if (snap.enableGrid && snap.gridMm > 0) {
        const stepPx = snap.gridMm * pxPerMm
        if (stepPx >= 8) { // 粗すぎる描画を避ける
          // 補助: グリッドは極薄のライトグレー
          ctx.strokeStyle = COLORS.grid
          ctx.lineWidth = 1
          ctx.beginPath()
          // 垂直グリッド
          let x0 = center.x % stepPx
          for (let x = x0; x < cssBounds.width; x += stepPx) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x, cssBounds.height)
          }
          // 水平グリッド
          let y0 = center.y % stepPx
          for (let y = y0; y < cssBounds.height; y += stepPx) {
            ctx.moveTo(0, y)
            ctx.lineTo(cssBounds.width, y)
          }
          ctx.stroke()
        }
      }
      // 日本語コメント: モデル生成（外形ポリゴン, mm）
      const polyMm = kind === 'rect' ? outlineRect(rectRef.current) : kind === 'l' ? outlineL(lRef.current) : kind === 'u' ? outlineU(uRef.current) : outlineT(tRef.current)
      // 画面座標へ変換してCanvasに描画
      // 壁: ネオンブルー
      ctx.strokeStyle = COLORS.wall
      ctx.lineWidth = 2
      ctx.beginPath()
      const polyScreen = polyMm.map(p => {
        const s = modelToScreen(p, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
        return { x: s.x + panNow.x, y: s.y + panNow.y }
      })
      polyScreen.forEach((s, i) => {
        if (i === 0) ctx.moveTo(s.x, s.y)
        else ctx.lineTo(s.x, s.y)
      })
      ctx.closePath()
      ctx.stroke()

      // 日本語コメント: 軒の出（外側オフセット）
      const eaves = eavesRef.current
      if (eaves?.enabled && (eaves.amountMm > 0 || (eaves.perEdge && Object.keys(eaves.perEdge).length > 0))) {
        // オフセット多角形（モデル座標で計算）— 辺ごとに出幅があれば優先
        const perMm = polyMm.map((_, i) => eaves.perEdge?.[i] ?? eaves.amountMm)
        const eavesPolyMm = offsetPolygonOuterVariable(polyMm, perMm, { miterLimit: 8 })
        const eavesPoly = eavesPolyMm.map(p => {
          const s = modelToScreen(p, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
          return { x: s.x + panNow.x, y: s.y + panNow.y }
        })
        // 描画（点線・壁色）— 出幅が0の辺は描画しない
        ctx.strokeStyle = COLORS.wall
        ctx.setLineDash([6, 4])
        ctx.lineWidth = 2
        const areaModel = signedAreaModel(polyMm)
        const isConvexAt = (idx: number) => {
          const n = polyMm.length
          const i0 = (idx + n - 1) % n
          const i1 = idx
          const i2 = (idx + 1) % n
          const v1 = { x: polyMm[i1].x - polyMm[i0].x, y: polyMm[i1].y - polyMm[i0].y }
          const v2 = { x: polyMm[i2].x - polyMm[i1].x, y: polyMm[i2].y - polyMm[i1].y }
          const z = v1.x * v2.y - v1.y * v2.x
          return areaModel < 0 ? (z < 0) : (z > 0)
        }
        // まず各辺のオフセット線分を通常通り描画
        for (let i=0;i<eavesPoly.length;i++) {
          const dHere = perMm[i] ?? 0
          if (dHere <= 0) continue
          const next = (i+1) % eavesPoly.length
          const pOff = eavesPoly[i]
          const qOff = eavesPoly[next]
          ctx.beginPath()
          ctx.moveTo(pOff.x, pOff.y)
          ctx.lineTo(qOff.x, qOff.y)
          ctx.stroke()
        }
        // 片側（隣接辺が0）での接続はL字（水平/垂直）で壁頂点へ結ぶ
        for (let i=0;i<eavesPoly.length;i++) {
          const dHere = perMm[i] ?? 0
          if (dHere <= 0) continue
          const next = (i+1) % eavesPoly.length
          const prev = (i-1+eavesPoly.length) % eavesPoly.length
          const aWall = polyScreen[i]
          const bWall = polyScreen[next]
          const pOff = eavesPoly[i]
          const qOff = eavesPoly[next]
          const isHorizontal = Math.abs(aWall.y - bWall.y) < 1e-6
          // 始点側（前辺が0かつ凸）
          if ((perMm[prev] ?? 0) === 0 && isConvexAt(i)) {
            const elbow = isHorizontal ? { x: aWall.x, y: pOff.y } : { x: pOff.x, y: aWall.y }
            ctx.beginPath()
            ctx.moveTo(pOff.x, pOff.y)
            ctx.lineTo(elbow.x, elbow.y)
            ctx.lineTo(aWall.x, aWall.y)
            ctx.stroke()
          }
          // 終点側（次辺が0かつ凸）
          if ((perMm[next] ?? 0) === 0 && isConvexAt(next)) {
            const elbow = isHorizontal ? { x: bWall.x, y: qOff.y } : { x: qOff.x, y: bWall.y }
            ctx.beginPath()
            ctx.moveTo(qOff.x, qOff.y)
            ctx.lineTo(elbow.x, elbow.y)
            ctx.lineTo(bWall.x, bWall.y)
            ctx.stroke()
          }
        }
        ctx.setLineDash([])

        // ラベル: 元エッジ中点と軒の中点の間に mm 値を配置（簡易）— 出幅0の辺はスキップ
        ctx.fillStyle = COLORS.helper
        ctx.font = '12px ui-sans-serif, system-ui, -apple-system'
        for (let i=0;i<polyScreen.length;i++) {
          const mmVal = perMm[i] ?? 0
          if (mmVal <= 0) continue
          const next = (i+1) % polyScreen.length
          const a0 = polyScreen[i]
          const b0 = polyScreen[next]
          const pOff = eavesPoly[i]
          const qOff = eavesPoly[next]
          const mid0 = { x: (a0.x+b0.x)/2, y: (a0.y+b0.y)/2 }
          const mid1 = { x: (pOff.x+qOff.x)/2, y: (pOff.y+qOff.y)/2 }
          const tx = (mid0.x + mid1.x) / 2
          const ty = (mid0.y + mid1.y) / 2
          ctx.fillText(`${mmVal} mm`, tx + 4, ty - 4)
        }
      }

      // 日本語コメント: 寸法線オーバーレイ（SVG）を更新
      const svg = svgRef.current
      const opts = dimOptsRef.current
      const showDims = opts?.show ?? true
      if (svg && showDims) {
        // サイズとviewBoxをCanvasと一致させる
        svg.setAttribute('width', String(cssBounds.width))
        svg.setAttribute('height', String(cssBounds.height))
        svg.setAttribute('viewBox', `0 0 ${cssBounds.width} ${cssBounds.height}`)
        // クリア
        while (svg.firstChild) svg.removeChild(svg.firstChild)
        // 寸法線を計算（外側=自動/手動）
        const offsetRaw = opts?.offset ?? 16
        let offsetPx = (opts?.offsetUnit === 'mm') ? offsetRaw * pxPerMm : offsetRaw
        // 日本語コメント: 軒の出が有効な場合、寸法線は軒ラインより更に外側へ配置する
        const eaves = eavesRef.current
        if (eaves?.enabled) {
          // 個別指定がある場合は最大値を採用
          const maxMm = Math.max(eaves.amountMm || 0, ...Object.values(eaves.perEdge ?? {}))
          const eavesPx = maxMm * pxPerMm
          const extraGapPx = 12 // 軒ラインから更に離す視認性用の余白
          offsetPx += eavesPx + extraGapPx
        }
        const decimals = opts?.decimals ?? 0
        const mode = opts?.outsideMode ?? 'auto'
        let dims
        if (mode === 'auto') {
          dims = dimEngineRef.current.computeForPolygon(polyScreen, { offset: offsetPx, decimals })
        } else {
          const edges = polyScreen.map((p, i) => ({ a: p, b: polyScreen[(i + 1) % polyScreen.length], id: `e${i}` }))
          dims = dimEngineRef.current.computeForEdges(edges, { offset: offsetPx, decimals, outsideIsLeftNormal: mode === 'left' })
        }
        // ラベル値は内部モデル(mm)に基づいて表示（単位=mm）
        const mmLengths: number[] = []
        for (let i = 0; i < polyMm.length; i++) {
          const a = polyMm[i]
          const b = polyMm[(i + 1) % polyMm.length]
          mmLengths.push(Math.hypot(b.x - a.x, b.y - a.y))
        }
        const NS = 'http://www.w3.org/2000/svg'
        // 補助: 辺の可視化（ライトグレー）
        for (let i = 0; i < polyScreen.length; i++) {
          const a = polyScreen[i]
          const b = polyScreen[(i + 1) % polyScreen.length]
          const le = document.createElementNS(NS, 'line')
          le.setAttribute('x1', String(a.x))
          le.setAttribute('y1', String(a.y))
          le.setAttribute('x2', String(b.x))
          le.setAttribute('y2', String(b.y))
          le.setAttribute('stroke', COLORS.helper)
          le.setAttribute('stroke-width', '1')
        svg.appendChild(le)
      }
      // 寸法線
      for (const d of dims) {
        const dl = document.createElementNS(NS, 'line')
          dl.setAttribute('x1', String(d.start.x))
          dl.setAttribute('y1', String(d.start.y))
          dl.setAttribute('x2', String(d.end.x))
          dl.setAttribute('y2', String(d.end.y))
          // 補助: 寸法線はライトグレー
          dl.setAttribute('stroke', COLORS.helper)
          dl.setAttribute('stroke-width', '1.5')
          dl.setAttribute('fill', 'none')
          svg.appendChild(dl)
        }

        // ラベル（衝突回避に対応）
        const labels: { el: SVGTextElement; dim: typeof dims[number]; baseX: number; baseY: number }[] = []
        for (const d of dims) {
          const tx = document.createElementNS(NS, 'text') as SVGTextElement
          const baseX = d.textAnchor.x
          const baseY = d.textAnchor.y - 4
          tx.setAttribute('x', String(baseX))
          tx.setAttribute('y', String(baseY))
          // 補助: ラベル文字はライトグレー
          tx.setAttribute('fill', COLORS.helper)
          tx.setAttribute('font-size', '12')
          const edgeIdx = Number(d.edgeId?.replace('e', '')) || 0
          const mmVal = mmLengths[edgeIdx] ?? 0
          tx.textContent = `${mmVal.toFixed(decimals)} mm`
          svg.appendChild(tx)
          labels.push({ el: tx, dim: d, baseX, baseY })
        }
        if (opts?.avoidCollision) {
          // 先行配置や辺/寸法線と重なる場合は外側法線方向へ段階的に押し出す
          const step = 10, maxIter = 10
          const buffer = 4 // 線との交差判定の許容量

          const rectExpand = (bb: DOMRect, pad: number) => ({ x: bb.x - pad, y: bb.y - pad, width: bb.width + 2*pad, height: bb.height + 2*pad })
          const ptInRect = (x: number, y: number, r: {x:number;y:number;width:number;height:number}) => (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height)
          const segOverlapsRect = (x1:number,y1:number,x2:number,y2:number, r:{x:number;y:number;width:number;height:number}, pad:number) => {
            // サンプリングで近似（十分に軽量）
            const rr = { x: r.x - pad, y: r.y - pad, width: r.width + 2*pad, height: r.height + 2*pad }
            const n = 16
            for (let i=0;i<=n;i++) {
              const t = i / n
              const x = x1 + (x2 - x1) * t
              const y = y1 + (y2 - y1) * t
              if (ptInRect(x, y, rr)) return true
            }
            return false
          }

          for (let i = 0; i < labels.length; i++) {
            const li = labels[i]
            // 外側法線: 寸法線の中点 - 元エッジ中点（i番目のエッジを対応付け）
            const a = polyScreen[i]
            const b = polyScreen[(i + 1) % polyScreen.length]
            const edgeMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
            const dimMid = { x: (li.dim.start.x + li.dim.end.x) / 2, y: (li.dim.start.y + li.dim.end.y) / 2 }
            let nx = dimMid.x - edgeMid.x, ny = dimMid.y - edgeMid.y
            const nlen = Math.hypot(nx, ny) || 1; nx /= nlen; ny /= nlen
            let moved = 0
            for (let iter = 0; iter < maxIter; iter++) {
              const bboxI = li.el.getBBox()
              let overlap = false
              for (let j = 0; j < i; j++) {
                const bboxJ = labels[j].el.getBBox()
                if (!(bboxI.x + bboxI.width < bboxJ.x || bboxJ.x + bboxJ.width < bboxI.x || bboxI.y + bboxI.height < bboxJ.y || bboxJ.y + bboxJ.height < bboxI.y)) {
                  overlap = true; break
                }
              }
              // 辺（ポリゴン）との交差
              if (!overlap) {
                const rb = rectExpand(bboxI, 0)
                for (let k=0;k<polyScreen.length;k++) {
                  const p1 = polyScreen[k]
                  const p2 = polyScreen[(k+1)%polyScreen.length]
                  if (segOverlapsRect(p1.x, p1.y, p2.x, p2.y, rb, buffer)) { overlap = true; break }
                }
              }
              // 寸法線との交差
              if (!overlap) {
                const rb = rectExpand(bboxI, 0)
                for (const d of dims) {
                  if (segOverlapsRect(d.start.x, d.start.y, d.end.x, d.end.y, rb, buffer)) { overlap = true; break }
                }
              }
              if (!overlap) break
              moved += step
              const x = li.dim.textAnchor.x + nx * moved
              const y = li.dim.textAnchor.y - 4 + ny * moved
              li.el.setAttribute('x', String(x))
              li.el.setAttribute('y', String(y))
            }
          }
        }

        // リーダー線（ラベルが基準位置から一定以上ずれた場合に描画）
        for (const li of labels) {
          const curX = Number(li.el.getAttribute('x') || li.baseX)
          const curY = Number(li.el.getAttribute('y') || li.baseY)
          const dx = curX - li.baseX
          const dy = curY - li.baseY
          if (Math.hypot(dx, dy) > 6) {
            // 寸法線への最近点を求め、そこからラベルへ細い線を引く
            const x1 = li.dim.start.x, y1 = li.dim.start.y
            const x2 = li.dim.end.x, y2 = li.dim.end.y
            const vx = x2 - x1, vy = y2 - y1
            const wx = curX - x1, wy = curY - y1
            const c2 = vx*vx + vy*vy
            const t = c2 === 0 ? 0 : Math.max(0, Math.min(1, (vx*wx + vy*wy) / c2))
            const px = x1 + vx * t
            const py = y1 + vy * t
            const leader = document.createElementNS(NS, 'line')
            leader.setAttribute('x1', String(px))
            leader.setAttribute('y1', String(py))
            leader.setAttribute('x2', String(curX))
            leader.setAttribute('y2', String(curY))
            // 補助: リーダー線はライトグレー
            leader.setAttribute('stroke', COLORS.helper)
            leader.setAttribute('stroke-width', '1')
            leader.setAttribute('stroke-dasharray', '3 2')
            svg.appendChild(leader)
          }
        }
      } else if (svg && !showDims) {
        while (svg.firstChild) svg.removeChild(svg.firstChild)
      }

      // 日本語コメント: 原点と軸の簡易ガイド（座標系の可視化）
      // 補助: 原点軸は薄いライトグレー
      ctx.strokeStyle = COLORS.axis
      ctx.lineWidth = 1
      ctx.beginPath()
      // X軸（中央水平）
      ctx.moveTo(0, center.y)
      ctx.lineTo(cssBounds.width, center.y)
      // Y軸（中央垂直）
      ctx.moveTo(center.x, 0)
      ctx.lineTo(center.x, cssBounds.height)
      ctx.stroke()

      // ラベル
      ctx.fillStyle = '#9aa0a6'
      ctx.font = '12px ui-sans-serif, system-ui, -apple-system'
      ctx.fillText(`スケール: ${pxPerMm.toFixed(3)} px/mm (1px=${(1/pxPerMm).toFixed(1)}mm)`, 10, 18)
      // 日本語コメント: 平面図の方位表現（東西=幅, 南北=奥行）で表示
      ctx.fillText(`テンプレート: ${kind.toUpperCase()}  寸法: 東西=${bb.widthMm}mm  南北=${bb.heightMm}mm`, 10, 34)
      // 日本語コメント: スナップ設定の簡易表示
      ctx.fillText(`Snap: Grid=${snap.enableGrid ? snap.gridMm + 'mm' : 'off'} / Ortho=${snap.enableOrtho ? ('±' + snap.orthoToleranceDeg + '°') : 'off'}` , 10, 50)

      // 日本語コメント: 頂点ハンドルを描画（小さな白丸）
      ctx.fillStyle = '#ffffff'
      const r = 3
      for (const p of polyMm) {
        const s0 = modelToScreen(p, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
        const s = { x: s0.x + panNow.x, y: s0.y + panNow.y }
        ctx.beginPath()
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    drawRef.current = draw

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    // 日本語コメント: クリックで辺をヒットテストし、mm入力で寸法更新（rectのみ）
    const onClick = (ev: MouseEvent) => {
      const cssBounds = canvas.getBoundingClientRect()
      const x = ev.clientX - cssBounds.left
      const y = ev.clientY - cssBounds.top

      // スケールを描画と同様に算出
      const kind = templateRef.current
      const bbNow = kind === 'rect' ? rectRef.current : kind === 'l' ? bboxOfL(lRef.current) : kind === 'u' ? bboxOfU(uRef.current) : bboxOfT(tRef.current)
      const wFit = cssBounds.width * 0.9 / bbNow.widthMm
      const hFit = cssBounds.height * 0.9 / bbNow.heightMm
      const basePxPerMm = Math.min(DEFAULT_PX_PER_MM, wFit, hFit)
      const pxPerMm = Math.max(0.05, Math.min(10, basePxPerMm * zoomRef.current))
      const panNow = panRef.current
      const center = modelToScreen({ x: 0, y: 0 }, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
      center.x += panNow.x; center.y += panNow.y

      // 現在形状のスクリーン座標ポリライン（閉路）を生成
      const polyMm = kind === 'rect' ? outlineRect(rectRef.current) : kind === 'l' ? outlineL(lRef.current) : kind === 'u' ? outlineU(uRef.current) : outlineT(tRef.current)
      const poly = polyMm.map(p => {
        const s = modelToScreen(p, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
        return { x: s.x + panNow.x, y: s.y + panNow.y }
      })
      // エッジ列挙（終点→始点で閉路）
      type EdgeInfo = { a: {x:number;y:number}, b: {x:number;y:number}, key: string }
      const edges: EdgeInfo[] = []
      for (let i=0; i<poly.length; i++) {
        const a = poly[i]
        const b = poly[(i+1) % poly.length]
        edges.push({ a, b, key: `${i}` })
      }

      const pt = { x, y }
      const distToSeg = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        // 日本語コメント: 点と線分の距離
        const vx = x2 - x1, vy = y2 - y1
        const wx = px - x1, wy = py - y1
        const c1 = vx * wx + vy * wy
        if (c1 <= 0) return Math.hypot(px - x1, py - y1)
        const c2 = vx * vx + vy * vy
        if (c2 <= c1) return Math.hypot(px - x2, py - y2)
        const t = c1 / c2
        const projx = x1 + t * vx
        const projy = y1 + t * vy
        return Math.hypot(px - projx, py - projy)
      }

      // まず軒の出ラインを優先してヒットテスト
      const eaves = eavesRef.current
      let best: { idx: number; dist: number } | null = null
      if (eaves?.enabled) {
        const perMm = polyMm.map((_, i) => eaves.perEdge?.[i] ?? eaves.amountMm)
        const eavesPolyMm = offsetPolygonOuterVariable(polyMm, perMm, { miterLimit: 8 })
        const eavesPoly = eavesPolyMm.map(p => {
          const s = modelToScreen(p, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
          return { x: s.x + panNow.x, y: s.y + panNow.y }
        })
        for (let i=0;i<eavesPoly.length;i++) {
          if ((perMm[i] ?? 0) <= 0) continue
          const a = eavesPoly[i]
          const b = eavesPoly[(i+1)%eavesPoly.length]
          const d = distToSeg(x, y, a.x, a.y, b.x, b.y)
          if (!best || d < best.dist) best = { idx: i, dist: d }
        }
        const eavesThreshold = 10
        if (best && best.dist <= eavesThreshold) {
          // 軒の出辺の編集へ
          const edgeIdx = best.idx
          const current = eaves.perEdge?.[edgeIdx] ?? eaves.amountMm
          const cur = prompt(`辺${edgeIdx + 1} の軒の出(mm) を入力（空欄で解除、0で無し）`, String(current))
          if (cur != null) {
            const txt = cur.trim()
            const per = { ...(eaves.perEdge ?? {}) }
            if (txt === '') {
              // 空欄 → 個別設定を解除（デフォルト値に戻す）
              delete per[edgeIdx]
            } else {
              const num = Number(txt)
              if (isNaN(num)) {
                // 数値でない入力は無視（変更なし）
              } else {
                const v = Math.max(0, Math.min(3000, Math.round(num)))
                // 0 は「この辺は無し」（個別0を保存）
                per[edgeIdx] = v
              }
            }
            eavesRef.current = { ...eaves, perEdge: per }
            onUpdateEaves?.({ perEdge: per })
            draw()
            return
          }
        }
        // 軒ラインにヒットしなかった場合のみ、壁ラインのヒットテストへ継続
        best = null
      }

      // 壁ラインに対するヒットテスト
      for (let i=0;i<edges.length;i++) {
        const e = edges[i]
        const d = distToSeg(pt.x, pt.y, e.a.x, e.a.y, e.b.x, e.b.y)
        if (!best || d < best.dist) best = { idx: i, dist: d }
      }
      if (!best) return
      const threshold = 8 // px
      if (best.dist > threshold) return

      // 日本語コメント: テンプレート別に辺→寸法をマッピング
      // 併せて辺の名称を「左上の辺から時計回りで番号 + 外側法線の方位（北/東/南/西）」で表示する
      const edgeIdx = best.idx

      // 軒ラインにヒットしなかった場合は、以降の壁ライン編集（既存の寸法編集など）へフォールバック
      const edgeNum = edgeIdx + 1
      const tang = {
        x: polyMm[(edgeIdx + 1) % polyMm.length].x - polyMm[edgeIdx].x,
        y: polyMm[(edgeIdx + 1) % polyMm.length].y - polyMm[edgeIdx].y,
      }
      // 時計回りポリゴン想定なので、左法線が外向き（モデル座標系: +Y=北）
      const n = { x: -tang.y, y: tang.x }
      const dir = Math.abs(n.x) > Math.abs(n.y)
        ? (n.x > 0 ? '東' : '西')
        : (n.y > 0 ? '北' : '南')
      const edgeLabel = `辺${edgeNum}${dir}`
      if (kind === 'rect') {
        // 辺インデックス: 0=上,1=右,2=下,3=左
        const idx = best.idx % 4
        if (idx === 0 || idx === 2) {
          const val = window.prompt(`${edgeLabel} の長さ（東西方向, mm）を入力`, String(rectMm.widthMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setRectMm(r => { const next = { ...r, widthMm: mm }; rectRef.current = next; return next })
          draw()
        } else {
          const val = window.prompt(`${edgeLabel} の長さ（南北方向, mm）を入力`, String(rectMm.heightMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setRectMm(r => { const next = { ...r, heightMm: mm }; rectRef.current = next; return next })
          draw()
        }
      } else if (kind === 'l') {
        // L: 0=上(左部分:東西→幅), 1=内側縦(南北→切欠高), 2=内側上(東西→切欠幅), 3=右外側縦(南北→外形高), 4=下(東西→外形幅), 5=左外側縦(南北→外形高)
        const idx = best.idx % 6
        if (idx === 0 || idx === 4) {
          const val = window.prompt(`${edgeLabel} の長さ（東西方向, mm）を入力`, String(lMm.widthMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setLMm(p => { const next = { ...p, widthMm: mm }; lRef.current = next; return next })
          draw()
        } else if (idx === 3 || idx === 5) {
          const val = window.prompt(`${edgeLabel} の長さ（南北方向, mm）を入力`, String(lMm.heightMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setLMm(p => { const next = { ...p, heightMm: mm }; lRef.current = next; return next })
          draw()
        } else if (idx === 1) {
          const val = window.prompt(`${edgeLabel} の長さ（切欠きの南北, mm）を入力`, String(lMm.cutHeightMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setLMm(p => { const next = { ...p, cutHeightMm: mm }; lRef.current = next; return next })
          draw()
        } else if (idx === 2) {
          const val = window.prompt(`${edgeLabel} の長さ（切欠きの東西, mm）を入力`, String(lMm.cutWidthMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setLMm(p => { const next = { ...p, cutWidthMm: mm }; lRef.current = next; return next })
          draw()
        }
      } else if (kind === 'u') {
        // U: 0=上(左),1=内側左縦(南北→深さ),2=内側底(東西→開口幅),3=内側右縦(南北→深さ),4=上(右),5=右外側縦(南北→外形高),6=下(東西→外形幅),7=左外側縦(南北→外形高)
        const idx = best.idx % 8
        if (idx === 6 || idx === 0 || idx === 4) {
          const val = window.prompt(`${edgeLabel} の長さ（東西方向, mm）を入力`, String(uMm.widthMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setUMm(p => { const next = { ...p, widthMm: mm }; uRef.current = next; return next })
          draw()
        } else if (idx === 5 || idx === 7) {
          const val = window.prompt(`${edgeLabel} の長さ（南北方向, mm）を入力`, String(uMm.heightMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setUMm(p => { const next = { ...p, heightMm: mm }; uRef.current = next; return next })
          draw()
        } else if (idx === 2) {
          const val = window.prompt(`${edgeLabel} の長さ（開口の東西, mm）を入力`, String(uMm.innerWidthMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setUMm(p => { const next = { ...p, innerWidthMm: mm }; uRef.current = next; return next })
          draw()
        } else if (idx === 1 || idx === 3) {
          const val = window.prompt(`${edgeLabel} の長さ（開口の南北=深さ, mm）を入力`, String(uMm.depthMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setUMm(p => { const next = { ...p, depthMm: mm }; uRef.current = next; return next })
          draw()
        }
      } else if (kind === 't') {
        // T: 0=上バー上辺(東西→バー幅),1=バー右縦(南北→バー厚),2=上部水平(一部),3=柱右縦(南北→柱高),4=柱底(東西→柱幅),5=柱左縦(南北→柱高),6=上部水平(一部),7=バー左縦(南北→バー厚)
        const idx = best.idx % 8
        if (idx === 0) {
          const val = window.prompt(`${edgeLabel} の長さ（バーの東西=幅, mm）を入力`, String(tMm.barWidthMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setTMm(p => { const next = { ...p, barWidthMm: mm }; tRef.current = next; return next })
          draw()
        } else if (idx === 1 || idx === 7) {
          const val = window.prompt(`${edgeLabel} の長さ（バー厚=南北, mm）を入力`, String(tMm.barThickMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setTMm(p => { const next = { ...p, barThickMm: mm }; tRef.current = next; return next })
          draw()
        } else if (idx === 2 || idx === 6) {
          // 日本語コメント: バー下の左右短水平は (バー幅 - 柱幅)/2 に相当。
          const segDefault = Math.max(1, (tMm.barWidthMm - tMm.stemWidthMm) / 2)
          const val = window.prompt(`${edgeLabel} の長さ（東西方向, mm）を入力`, String(segDefault))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          const newBarWidth = tMm.stemWidthMm + 2 * mm
          setTMm(p => { const next = { ...p, barWidthMm: newBarWidth }; tRef.current = next; return next })
          draw()
        } else if (idx === 3 || idx === 5) {
          const val = window.prompt(`${edgeLabel} の長さ（柱の南北=高さ, mm）を入力`, String(tMm.stemHeightMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setTMm(p => { const next = { ...p, stemHeightMm: mm }; tRef.current = next; return next })
          draw()
        } else if (idx === 4) {
          const val = window.prompt(`${edgeLabel} の長さ（柱の東西=幅, mm）を入力`, String(tMm.stemWidthMm))
          if (val == null) return
          const mm = Number(val)
          if (!Number.isFinite(mm) || mm <= 0) return
          setTMm(p => { const next = { ...p, stemWidthMm: mm }; tRef.current = next; return next })
          draw()
        }
      }
    }
    canvas.addEventListener('click', onClick)

    // 日本語コメント: 頂点ドラッグ編集（フェーズ2: まずは矩形に対応）
    let draggingVertexIdx: number | null = null
    let dragPxPerMm: number | null = null
    let dragBounds: { width: number; height: number } | null = null
    const onMouseDown = (ev: MouseEvent) => {
      const cssBounds = canvas.getBoundingClientRect()
      const x = ev.clientX - cssBounds.left
      const y = ev.clientY - cssBounds.top
      const kind = templateRef.current
      const bbNow = kind === 'rect' ? rectRef.current : kind === 'l' ? bboxOfL(lRef.current) : kind === 'u' ? bboxOfU(uRef.current) : bboxOfT(tRef.current)
      const wFit = cssBounds.width * 0.9 / bbNow.widthMm
      const hFit = cssBounds.height * 0.9 / bbNow.heightMm
      const pxPerMm = Math.max(0.05, Math.min(10, Math.min(DEFAULT_PX_PER_MM, wFit, hFit) * zoomRef.current))
      const polyMm = kind === 'rect' ? outlineRect(rectRef.current) : kind === 'l' ? outlineL(lRef.current) : kind === 'u' ? outlineU(uRef.current) : outlineT(tRef.current)
      const thresholdPx = 8
      let hitIdx: number | null = null
      for (let i = 0; i < polyMm.length; i++) {
        const s0 = modelToScreen(polyMm[i], { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
        const s = { x: s0.x + panRef.current.x, y: s0.y + panRef.current.y }
        const dx = s.x - x
        const dy = s.y - y
        if (dx*dx + dy*dy <= thresholdPx*thresholdPx) { hitIdx = i; break }
      }
      if (hitIdx != null) {
        draggingVertexIdx = hitIdx
        dragPxPerMm = pxPerMm
        dragBounds = { width: cssBounds.width, height: cssBounds.height }
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp, { once: true })
      }
    }

    const onMouseMove = (ev: MouseEvent) => {
      if (draggingVertexIdx == null) return
      const cssBounds = canvas.getBoundingClientRect()
      const x = ev.clientX - cssBounds.left
      const y = ev.clientY - cssBounds.top
      const pxPerMm = dragPxPerMm ?? DEFAULT_PX_PER_MM
      const viewSize = dragBounds ?? { width: cssBounds.width, height: cssBounds.height }
      // 日本語コメント: マウス位置（mm）を算出し、スナップ適用
      const rawMm = screenToModel({ x: x - panRef.current.x, y: y - panRef.current.y }, viewSize, pxPerMm)
      const snapApply = snapOptions ?? SNAP_DEFAULTS
      const ptMm = applySnaps(rawMm, { ...snapApply, anchor: { x: 0, y: 0 } })
      const kind = templateRef.current
      if (kind === 'rect') {
        const newW = Math.max(1, Math.abs(ptMm.x) * 2)
        const newH = Math.max(1, Math.abs(ptMm.y) * 2)
        const next = { ...rectRef.current, widthMm: Math.round(newW), heightMm: Math.round(newH) }
        rectRef.current = next
        setRectMm(next)
      } else if (kind === 'l') {
        const cur = lRef.current
        const idx = draggingVertexIdx % 6
        let { widthMm: W, heightMm: H, cutWidthMm: cw, cutHeightMm: ch } = cur
        const hw = W / 2, hh = H / 2
        if (idx === 0) { // (-hw, hh)
          W = Math.max(1, Math.abs(ptMm.x) * 2)
          H = Math.max(1, Math.abs(ptMm.y) * 2)
        } else if (idx === 1) { // (hw - cw, hh)
          cw = Math.max(1, Math.min(W - 1, Math.round(W/2 - ptMm.x)))
          H = Math.max(1, Math.abs(ptMm.y) * 2)
        } else if (idx === 2) { // (hw - cw, hh - ch)
          cw = Math.max(1, Math.min(W - 1, Math.round(W/2 - ptMm.x)))
          ch = Math.max(1, Math.min(H - 1, Math.round(H/2 - ptMm.y)))
        } else if (idx === 3) { // (hw, hh - ch)
          W = Math.max(1, Math.abs(ptMm.x) * 2)
          ch = Math.max(1, Math.min(H - 1, Math.round(H/2 - ptMm.y)))
        } else if (idx === 4) { // (hw, -hh)
          W = Math.max(1, Math.abs(ptMm.x) * 2)
          H = Math.max(1, Math.abs(ptMm.y) * 2)
        } else if (idx === 5) { // (-hw, -hh)
          W = Math.max(1, Math.abs(ptMm.x) * 2)
          H = Math.max(1, Math.abs(ptMm.y) * 2)
        }
        // 整合性のためのクランプ
        cw = Math.min(cw, Math.max(1, Math.round(W - 1)))
        ch = Math.min(ch, Math.max(1, Math.round(H - 1)))
        const next = { widthMm: Math.round(W), heightMm: Math.round(H), cutWidthMm: Math.round(cw), cutHeightMm: Math.round(ch) }
        lRef.current = next
        setLMm(next)
      } else if (kind === 'u') {
        const cur = uRef.current
        const idx = draggingVertexIdx % 8
        let { widthMm: W, heightMm: H, innerWidthMm: iw, depthMm: d } = cur
        if (idx === 0 || idx === 5 || idx === 6 || idx === 7) {
          W = Math.max(1, Math.abs(ptMm.x) * 2)
          H = Math.max(1, Math.abs(ptMm.y) * 2)
        } else if (idx === 1 || idx === 4) { // (±iw/2, hh)
          iw = Math.max(1, Math.min(W - 1, Math.round(Math.abs(ptMm.x) * 2)))
          H = Math.max(1, Math.abs(ptMm.y) * 2)
        } else if (idx === 2 || idx === 3) { // (±iw/2, hh - d)
          iw = Math.max(1, Math.min(W - 1, Math.round(Math.abs(ptMm.x) * 2)))
          d = Math.max(1, Math.min(H - 1, Math.round(H/2 - ptMm.y)))
        }
        const next = { widthMm: Math.round(W), heightMm: Math.round(H), innerWidthMm: Math.round(iw), depthMm: Math.round(d) }
        uRef.current = next
        setUMm(next)
      } else if (kind === 't') {
        const cur = tRef.current
        const idx = draggingVertexIdx % 8
        let { barWidthMm: bw, barThickMm: bt, stemWidthMm: sw, stemHeightMm: sh } = cur
        if (idx === 0 || idx === 1 || idx === 2 || idx === 7) { // バー角
          bw = Math.max(1, Math.round(Math.abs(ptMm.x) * 2))
          bt = Math.max(1, Math.round(Math.abs(ptMm.y) * 2))
        } else if (idx === 3 || idx === 6) { // バー下・柱上の角
          sw = Math.max(1, Math.min(bw - 1, Math.round(Math.abs(ptMm.x) * 2)))
          bt = Math.max(1, Math.round(Math.abs(ptMm.y) * 2))
        } else if (idx === 4 || idx === 5) { // 柱の底
          sw = Math.max(1, Math.min(bw - 1, Math.round(Math.abs(ptMm.x) * 2)))
          // sh は stemBottomY = -(bt/2 + sh) から復元
          sh = Math.max(1, Math.round(-ptMm.y - bt / 2))
        }
        const next = { barWidthMm: bw, barThickMm: bt, stemWidthMm: sw, stemHeightMm: sh }
        tRef.current = next
        setTMm(next)
      }
      draw()
    }

    const onMouseUp = (_ev: MouseEvent) => {
      draggingVertexIdx = null
      window.removeEventListener('mousemove', onMouseMove)
      dragPxPerMm = null
      dragBounds = null
    }

    canvas.addEventListener('mousedown', onMouseDown)

    // 日本語コメント: ホイール/ピンチでズーム（カーソル位置を中心に）。Ctrl+ホイールも対応。
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const cssBounds = canvas.getBoundingClientRect()
      const cx = ev.clientX - cssBounds.left
      const cy = ev.clientY - cssBounds.top
      const kind = templateRef.current
      const bb = kind === 'rect' ? rectRef.current : kind === 'l' ? bboxOfL(lRef.current) : kind === 'u' ? bboxOfU(uRef.current) : bboxOfT(tRef.current)
      const wFit = cssBounds.width * 0.9 / bb.widthMm
      const hFit = cssBounds.height * 0.9 / bb.heightMm
      const basePxPerMm = Math.min(DEFAULT_PX_PER_MM, wFit, hFit)
      const pxPerMmOld = Math.max(0.05, Math.min(10, basePxPerMm * zoomRef.current))
      const scale = Math.pow(1.0015, -ev.deltaY)
      const nextZoom = Math.max(0.1, Math.min(20, zoomRef.current * scale))
      const pxPerMmNew = Math.max(0.05, Math.min(10, basePxPerMm * nextZoom))
      // 画面座標→モデル座標（パンを考慮して逆変換）
      const mmAtCursor = screenToModel({ x: cx - panRef.current.x, y: cy - panRef.current.y }, { width: cssBounds.width, height: cssBounds.height }, pxPerMmOld)
      // 新スケールで同一点がカーソル位置に来るようパンを更新
      const sNew = modelToScreen(mmAtCursor, { width: cssBounds.width, height: cssBounds.height }, pxPerMmNew)
      const newPan = { x: cx - sNew.x, y: cy - sNew.y }
      zoomRef.current = nextZoom
      panRef.current = newPan
      setZoom(nextZoom)
      setPan(newPan)
      draw()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })

    // 日本語コメント: キーボードでズーム（+/-/0）。0でリセット。
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        const cssBounds = canvas.getBoundingClientRect()
        const cx = cssBounds.width / 2, cy = cssBounds.height / 2
        const kind = templateRef.current
        const bb = kind === 'rect' ? rectRef.current : kind === 'l' ? bboxOfL(lRef.current) : kind === 'u' ? bboxOfU(uRef.current) : bboxOfT(tRef.current)
        const basePxPerMm = Math.min(DEFAULT_PX_PER_MM, cssBounds.width * 0.9 / bb.widthMm, cssBounds.height * 0.9 / bb.heightMm)
        const pxPerMmOld = Math.max(0.05, Math.min(10, basePxPerMm * zoomRef.current))
        const nextZoom = Math.min(20, zoomRef.current * 1.1)
        const pxPerMmNew = Math.max(0.05, Math.min(10, basePxPerMm * nextZoom))
        const mmAtCenter = screenToModel({ x: cx - panRef.current.x, y: cy - panRef.current.y }, { width: cssBounds.width, height: cssBounds.height }, pxPerMmOld)
        const sNew = modelToScreen(mmAtCenter, { width: cssBounds.width, height: cssBounds.height }, pxPerMmNew)
        const newPan = { x: cx - sNew.x, y: cy - sNew.y }
        zoomRef.current = nextZoom; panRef.current = newPan
        setZoom(nextZoom); setPan(newPan); draw()
      } else if (e.key === '-') {
        const cssBounds = canvas.getBoundingClientRect()
        const cx = cssBounds.width / 2, cy = cssBounds.height / 2
        const kind = templateRef.current
        const bb = kind === 'rect' ? rectRef.current : kind === 'l' ? bboxOfL(lRef.current) : kind === 'u' ? bboxOfU(uRef.current) : bboxOfT(tRef.current)
        const basePxPerMm = Math.min(DEFAULT_PX_PER_MM, cssBounds.width * 0.9 / bb.widthMm, cssBounds.height * 0.9 / bb.heightMm)
        const pxPerMmOld = Math.max(0.05, Math.min(10, basePxPerMm * zoomRef.current))
        const nextZoom = Math.max(0.1, zoomRef.current / 1.1)
        const pxPerMmNew = Math.max(0.05, Math.min(10, basePxPerMm * nextZoom))
        const mmAtCenter = screenToModel({ x: cx - panRef.current.x, y: cy - panRef.current.y }, { width: cssBounds.width, height: cssBounds.height }, pxPerMmOld)
        const sNew = modelToScreen(mmAtCenter, { width: cssBounds.width, height: cssBounds.height }, pxPerMmNew)
        const newPan = { x: cx - sNew.x, y: cy - sNew.y }
        zoomRef.current = nextZoom; panRef.current = newPan
        setZoom(nextZoom); setPan(newPan); draw()
      } else if (e.key === '0') {
        // リセット（オートフィット）
        zoomRef.current = 1
        panRef.current = { x: 0, y: 0 }
        setZoom(1)
        setPan({ x: 0, y: 0 })
        draw()
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      ro.disconnect()
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <div className="w-full h-full relative">
      <canvas ref={ref} className="w-full h-full bg-[#0f1113]" />
      <svg ref={svgRef} className="absolute inset-0 pointer-events-none" />
      {/* 日本語コメント: ズームUI（右上）。100%表示と±ボタン。*/}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 text-white rounded px-2 py-1 select-none">
        <button
          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
          onClick={() => {
            const el = ref.current!
            const css = el.getBoundingClientRect()
            const cx = css.width / 2, cy = css.height / 2
            const kind = templateRef.current
            const bb = kind === 'rect' ? rectRef.current : kind === 'l' ? bboxOfL(lRef.current) : kind === 'u' ? bboxOfU(uRef.current) : bboxOfT(tRef.current)
            const basePxPerMm = Math.min(DEFAULT_PX_PER_MM, css.width * 0.9 / bb.widthMm, css.height * 0.9 / bb.heightMm)
            const pxPerMmOld = Math.max(0.05, Math.min(10, basePxPerMm * zoomRef.current))
            const nextZoom = Math.max(0.1, zoomRef.current / 1.1)
            const pxPerMmNew = Math.max(0.05, Math.min(10, basePxPerMm * nextZoom))
            const mmAtCenter = screenToModel({ x: cx - panRef.current.x, y: cy - panRef.current.y }, { width: css.width, height: css.height }, pxPerMmOld)
            const sNew = modelToScreen(mmAtCenter, { width: css.width, height: css.height }, pxPerMmNew)
            const newPan = { x: cx - sNew.x, y: cy - sNew.y }
            zoomRef.current = nextZoom; panRef.current = newPan
            setZoom(nextZoom); setPan(newPan)
          }}
        >-</button>
        <div className="min-w-14 text-center tabular-nums">{Math.round(zoom * 100)}%</div>
        <button
          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
          onClick={() => {
            const el = ref.current!
            const css = el.getBoundingClientRect()
            const cx = css.width / 2, cy = css.height / 2
            const kind = templateRef.current
            const bb = kind === 'rect' ? rectRef.current : kind === 'l' ? bboxOfL(lRef.current) : kind === 'u' ? bboxOfU(uRef.current) : bboxOfT(tRef.current)
            const basePxPerMm = Math.min(DEFAULT_PX_PER_MM, css.width * 0.9 / bb.widthMm, css.height * 0.9 / bb.heightMm)
            const pxPerMmOld = Math.max(0.05, Math.min(10, basePxPerMm * zoomRef.current))
            const nextZoom = Math.min(20, zoomRef.current * 1.1)
            const pxPerMmNew = Math.max(0.05, Math.min(10, basePxPerMm * nextZoom))
            const mmAtCenter = screenToModel({ x: cx - panRef.current.x, y: cy - panRef.current.y }, { width: css.width, height: css.height }, pxPerMmOld)
            const sNew = modelToScreen(mmAtCenter, { width: css.width, height: css.height }, pxPerMmNew)
            const newPan = { x: cx - sNew.x, y: cy - sNew.y }
            zoomRef.current = nextZoom; panRef.current = newPan
            setZoom(nextZoom); setPan(newPan)
          }}
        >+</button>
        <button
          className="ml-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20"
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); zoomRef.current = 1; panRef.current = { x: 0, y: 0 } }}
          title="表示をリセット"
        >100%</button>
      </div>
    </div>
  )
}

export default CanvasArea
