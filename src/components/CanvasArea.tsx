import React, { useEffect, useRef } from 'react'
// 日本語コメント: 内部モデル（mm単位）と座標変換のユーティリティ
import { DEFAULT_PX_PER_MM } from '@/core/units'
import { INITIAL_RECT } from '@/core/model'
import { lengthToScreen, modelToScreen } from '@/core/transform'

export const CanvasArea: React.FC = () => {
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
      // ただし初期表示で全体が見えるよう、ビューに収まるスケールへ自動調整（上限は既定値）。
      const wFit = cssBounds.width * 0.9 / INITIAL_RECT.widthMm
      const hFit = cssBounds.height * 0.9 / INITIAL_RECT.heightMm
      const pxPerMm = Math.min(DEFAULT_PX_PER_MM, wFit, hFit)

      // 日本語コメント: 初期長方形（中心配置）。モデル(mm)→CSS px に変換して描画
      const wPx = lengthToScreen(INITIAL_RECT.widthMm, pxPerMm)
      const hPx = lengthToScreen(INITIAL_RECT.heightMm, pxPerMm)
      const center = modelToScreen({ x: 0, y: 0 }, { width: cssBounds.width, height: cssBounds.height }, pxPerMm)
      const x = center.x - wPx / 2
      const y = center.y - hPx / 2

      // 日本語コメント: 外形長方形（壁線イメージ）
      ctx.strokeStyle = '#35a2ff'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, wPx, hPx)

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
      ctx.fillText(`W=${INITIAL_RECT.widthMm}mm  H=${INITIAL_RECT.heightMm}mm`, 10, 34)
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return <canvas ref={ref} className="w-full h-full bg-[#0f1113]" />
}

export default CanvasArea
