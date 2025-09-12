import React, { useEffect, useRef, useState } from 'react'
// 日本語コメント: 内部モデル（mm単位）と座標変換のユーティリティ
import { DEFAULT_PX_PER_MM } from '@/core/units'
import { bboxOf, outlineOf, TemplateKind, INITIAL_RECT, outlineRect, INITIAL_L, INITIAL_U, INITIAL_T, outlineL, outlineU, outlineT, bboxOfL, bboxOfU, bboxOfT } from '@/core/model'
import { lengthToScreen, modelToScreen, screenToModel } from '@/core/transform'
import { applySnaps, SNAP_DEFAULTS, type SnapOptions } from '@/core/snap'
// 寸法線エンジン（画面座標の多角形から外側の寸法線を算出）
import { DimensionEngine } from '@/core/dimensions/dimension_engine'
// 日本語コメント: 辺クリック→寸法入力（mm）に対応
export const CanvasArea: React.FC<{ template?: TemplateKind; snapOptions?: SnapOptions }> = ({ template = 'rect', snapOptions }) => {
  // 日本語コメント: 平面図キャンバス。内部モデル(mm)→画面(px)で変換し、初期長方形を描画する。
  const ref = useRef<HTMLCanvasElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dimEngineRef = useRef(new DimensionEngine())
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

      // 日本語コメント: スケール（px/mm）。例: 1px=5mm → 0.2px/mm
      // 形状のバウンディングボックスでオートフィット（上限は既定値）。
      const kind = templateRef.current
      const bb = kind === 'rect' ? rectRef.current : kind === 'l' ? bboxOfL(lRef.current) : kind === 'u' ? bboxOfU(uRef.current) : bboxOfT(tRef.current)
      const wFit = cssBounds.width * 0.9 / bb.widthMm
      const hFit = cssBounds.height * 0.9 / bb.heightMm
      const pxPerMm = Math.min(DEFAULT_PX_PER_MM, wFit, hFit)

      const center = modelToScreen({ x: 0, y: 0 }, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)

      const snap = snapOptions ?? SNAP_DEFAULTS
      // 日本語コメント: グリッド描画（スナップ可視化）。薄い線で gridMm 間隔
      if (snap.enableGrid && snap.gridMm > 0) {
        const stepPx = snap.gridMm * pxPerMm
        if (stepPx >= 8) { // 粗すぎる描画を避ける
          ctx.strokeStyle = 'rgba(255,255,255,0.06)'
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
      ctx.strokeStyle = '#35a2ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      const polyScreen = polyMm.map(p => modelToScreen(p, { width: cssBounds.width, height: cssBounds.height }, pxPerMm))
      polyScreen.forEach((s, i) => {
        if (i === 0) ctx.moveTo(s.x, s.y)
        else ctx.lineTo(s.x, s.y)
      })
      ctx.closePath()
      ctx.stroke()

      // 日本語コメント: 寸法線オーバーレイ（SVG）を更新
      const svg = svgRef.current
      if (svg) {
        // サイズとviewBoxをCanvasと一致させる
        svg.setAttribute('width', String(cssBounds.width))
        svg.setAttribute('height', String(cssBounds.height))
        svg.setAttribute('viewBox', `0 0 ${cssBounds.width} ${cssBounds.height}`)
        // クリア
        while (svg.firstChild) svg.removeChild(svg.firstChild)
        // 寸法線を計算（外側=自動: CW/CCWで決定）
        const dims = dimEngineRef.current.computeForPolygon(polyScreen, { offset: 16, decimals: 1 })
        const NS = 'http://www.w3.org/2000/svg'
        // 辺の可視化（控えめな青）
        for (let i = 0; i < polyScreen.length; i++) {
          const a = polyScreen[i]
          const b = polyScreen[(i + 1) % polyScreen.length]
          const le = document.createElementNS(NS, 'line')
          le.setAttribute('x1', String(a.x))
          le.setAttribute('y1', String(a.y))
          le.setAttribute('x2', String(b.x))
          le.setAttribute('y2', String(b.y))
          le.setAttribute('stroke', '#0b3b66')
          le.setAttribute('stroke-width', '1')
          svg.appendChild(le)
        }
        // 寸法線とラベル
        for (const d of dims) {
          const dl = document.createElementNS(NS, 'line')
          dl.setAttribute('x1', String(d.start.x))
          dl.setAttribute('y1', String(d.start.y))
          dl.setAttribute('x2', String(d.end.x))
          dl.setAttribute('y2', String(d.end.y))
          dl.setAttribute('stroke', '#0d6efd')
          dl.setAttribute('stroke-width', '1.5')
          dl.setAttribute('fill', 'none')
          svg.appendChild(dl)

          const tx = document.createElementNS(NS, 'text')
          tx.setAttribute('x', String(d.textAnchor.x))
          tx.setAttribute('y', String(d.textAnchor.y - 4))
          tx.setAttribute('fill', '#0d6efd')
          tx.setAttribute('font-size', '12')
          tx.textContent = `${d.value.toFixed(1)} ${d.units ?? 'px'}`
          svg.appendChild(tx)
        }
      }

      // 日本語コメント: 原点と軸の簡易ガイド（座標系の可視化）
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
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
        const s = modelToScreen(p, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
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
      const pxPerMm = Math.min(DEFAULT_PX_PER_MM, wFit, hFit)
      const center = modelToScreen({ x: 0, y: 0 }, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)

      // 現在形状のスクリーン座標ポリライン（閉路）を生成
      const polyMm = kind === 'rect' ? outlineRect(rectRef.current) : kind === 'l' ? outlineL(lRef.current) : kind === 'u' ? outlineU(uRef.current) : outlineT(tRef.current)
      const poly = polyMm.map(p => modelToScreen(p, { width: cssBounds.width, height: cssBounds.height }, pxPerMm))
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

      let best: { idx: number; dist: number } | null = null
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
      const pxPerMm = Math.min(DEFAULT_PX_PER_MM, wFit, hFit)
      const polyMm = kind === 'rect' ? outlineRect(rectRef.current) : kind === 'l' ? outlineL(lRef.current) : kind === 'u' ? outlineU(uRef.current) : outlineT(tRef.current)
      const thresholdPx = 8
      let hitIdx: number | null = null
      for (let i = 0; i < polyMm.length; i++) {
        const s = modelToScreen(polyMm[i], { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
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
      const rawMm = screenToModel({ x, y }, viewSize, pxPerMm)
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

    return () => {
      ro.disconnect()
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <div className="w-full h-full relative">
      <canvas ref={ref} className="w-full h-full bg-[#0f1113]" />
      <svg ref={svgRef} className="absolute inset-0 pointer-events-none" />
    </div>
  )
}

export default CanvasArea
