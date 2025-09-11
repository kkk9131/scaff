import React, { useEffect, useRef } from 'react'

export const CanvasArea: React.FC = () => {
  // 日本語コメント: 中央キャンバス。MVP初期はプレースホルダーでリサイズ追従のみ。
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, rect.width, rect.height)

      // 日本語コメント: プレースホルダーのガイド
      ctx.strokeStyle = '#35a2ff'
      ctx.lineWidth = 2
      ctx.strokeRect(40, 40, rect.width - 80, rect.height - 80)
      ctx.fillStyle = '#9aa0a6'
      ctx.fillText('Canvas Placeholder', 50, 30)
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return <canvas ref={ref} className="w-full h-full bg-[#0f1113]" />
}

export default CanvasArea
