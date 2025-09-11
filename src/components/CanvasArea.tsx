import React, { useEffect, useRef } from 'react'
// 日本語コメント: 内部モデル（mm単位）と座標変換のユーティリティ
import { DEFAULT_PX_PER_MM } from '@/core/units'
import { bboxOf, outlineOf, TemplateKind } from '@/core/model'
import { lengthToScreen, modelToScreen } from '@/core/transform'

export const CanvasArea: React.FC<{ template?: TemplateKind }> = ({ template = 'rect' }) => {
  // 日本語コメント: 平面図キャンバス。内部モデル(mm)→画面(px)で変換し、初期長方形を描画する。
  const ref = useRef<HTMLCanvasElement | null>(null)

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
      const bb = bboxOf(template)
      const wFit = cssBounds.width * 0.9 / bb.widthMm
      const hFit = cssBounds.height * 0.9 / bb.heightMm
      const pxPerMm = Math.min(DEFAULT_PX_PER_MM, wFit, hFit)

      // 日本語コメント: モデル生成（テンプレートの外形ポリゴン）
      const poly = outlineOf(template)
      const center = modelToScreen({ x: 0, y: 0 }, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
      // 描画
      ctx.strokeStyle = '#35a2ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      poly.forEach((p, i) => {
        const s = modelToScreen(p, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
        if (i === 0) ctx.moveTo(s.x, s.y)
        else ctx.lineTo(s.x, s.y)
      })
      ctx.closePath()
      ctx.stroke()

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
      ctx.fillText(`テンプレート: ${template.toUpperCase()}  W=${bb.widthMm}mm  H=${bb.heightMm}mm`, 10, 34)
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return <canvas ref={ref} className="w-full h-full bg-[#0f1113]" />
}

export default CanvasArea
