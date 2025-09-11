// 日本語コメント: モデル(単位=mm, 原点=中心, +Y=上) と 画面(CSS px, 原点=左上, +Y=下) の相互変換
import { Vec2, DEFAULT_PX_PER_MM } from './units'

export type CanvasSizeCss = { width: number; height: number }

// 日本語コメント: モデル座標(mm) → 画面座標(CSS px)
export function modelToScreen(pMm: Vec2, viewSize: CanvasSizeCss, pxPerMm: number = DEFAULT_PX_PER_MM): Vec2 {
  const cx = viewSize.width / 2
  const cy = viewSize.height / 2
  return {
    x: cx + pMm.x * pxPerMm,
    y: cy - pMm.y * pxPerMm, // +Y(上) を 画面の +Y(下) に合わせて反転
  }
}

// 日本語コメント: モデル長さ(mm) → 画面長さ(CSS px)
export function lengthToScreen(lenMm: number, pxPerMm: number = DEFAULT_PX_PER_MM): number {
  return lenMm * pxPerMm
}

