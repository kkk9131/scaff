// 日本語コメント: 内部モデルの最小定義（テンプレート長方形）。単位=mm、座標=中心原点。
import type { Vec2 } from './units'

// 日本語コメント: テンプレート種別（polyは自由形状を表す）
export type TemplateKind = 'rect' | 'l' | 'u' | 't' | 'poly'

// 日本語コメント: 長方形テンプレートの基本寸法
export type RectTemplate = {
  widthMm: number
  heightMm: number
}

// 日本語コメント: 複合形状の基本寸法（最小実装の仮定）
// L字: 外形 W×H から 右上隅を cw×ch 切り欠く（原点=中心、+Y=上）。
export type LTemplate = RectTemplate & { cutWidthMm: number; cutHeightMm: number }

// U字(コの字): 外形 W×H、上辺中央から内側に depthMm だけ凹ませ、開口幅 innerWidthMm を持つ。
export type UTemplate = RectTemplate & { innerWidthMm: number; depthMm: number }

// T字: 上バー幅 barWidthMm・厚さ barThickMm、縦柱幅 stemWidthMm・高さ stemHeightMm（原点=中心）
export type TTemplate = {
  barWidthMm: number
  barThickMm: number
  stemWidthMm: number
  stemHeightMm: number
}

export type PolyTemplate = {
  vertices: Vec2[]
}

// 日本語コメント: 初期値（暫定）。用途に応じて将来UIから変更予定。
export const INITIAL_RECT: RectTemplate = { widthMm: 8000, heightMm: 6000 }
export const INITIAL_L: LTemplate = { widthMm: 8000, heightMm: 6000, cutWidthMm: 3000, cutHeightMm: 3000 }
export const INITIAL_U: UTemplate = { widthMm: 9000, heightMm: 6000, innerWidthMm: 4000, depthMm: 3000 }
export const INITIAL_T: TTemplate = { barWidthMm: 9000, barThickMm: 2000, stemWidthMm: 2000, stemHeightMm: 6000 }
export const INITIAL_POLY: PolyTemplate = { vertices: outlineRect(INITIAL_RECT) }

// 日本語コメント: ポリゴン（単純多角形）を mm 座標で返す。時計回りで閉路（最後の点は別途 closePath）
export function outlineOf(kind: TemplateKind): Vec2[] {
  switch (kind) {
    case 'rect': {
      return outlineRect(INITIAL_RECT)
    }
    case 'l': {
      return outlineL(INITIAL_L)
    }
    case 'u': {
      return outlineU(INITIAL_U)
    }
    case 't': {
      return outlineT(INITIAL_T)
    }
  }
}

// 日本語コメント: 形状のバウンディングボックス（W×H, mm）
export function bboxOf(kind: TemplateKind): RectTemplate {
  switch (kind) {
    case 'rect': return { ...INITIAL_RECT }
    case 'l': return { widthMm: INITIAL_L.widthMm, heightMm: INITIAL_L.heightMm }
    case 'u': return { widthMm: INITIAL_U.widthMm, heightMm: INITIAL_U.heightMm }
    case 't': {
      const totalH = INITIAL_T.barThickMm + INITIAL_T.stemHeightMm
      return { widthMm: INITIAL_T.barWidthMm, heightMm: totalH }
    }
    case 'poly': {
      const bbox = bboxOfPoly(INITIAL_POLY)
      return bbox
    }
  }
}

// 日本語コメント: パラメータ指定で長方形の外形を返す（編集用）
export function outlineRect(rect: RectTemplate): Vec2[] {
  const { widthMm: W, heightMm: H } = rect
  const hw = W / 2, hh = H / 2
  return [
    { x: -hw, y: hh },
    { x: hw, y: hh },
    { x: hw, y: -hh },
    { x: -hw, y: -hh },
  ]
}

// 日本語コメント: パラメータ指定の L 字外形
export function outlineL(p: LTemplate): Vec2[] {
  const { widthMm: W, heightMm: H, cutWidthMm: cw, cutHeightMm: ch } = p
  const hw = W / 2, hh = H / 2
  return [
    { x: -hw, y: hh },
    { x: hw - cw, y: hh },
    { x: hw - cw, y: hh - ch },
    { x: hw, y: hh - ch },
    { x: hw, y: -hh },
    { x: -hw, y: -hh },
  ]
}

// 日本語コメント: パラメータ指定の U 字外形
export function outlineU(p: UTemplate): Vec2[] {
  const { widthMm: W, heightMm: H, innerWidthMm: iw, depthMm: d } = p
  const hw = W / 2, hh = H / 2
  return [
    { x: -hw, y: hh },
    { x: -iw / 2, y: hh },
    { x: -iw / 2, y: hh - d },
    { x: iw / 2, y: hh - d },
    { x: iw / 2, y: hh },
    { x: hw, y: hh },
    { x: hw, y: -hh },
    { x: -hw, y: -hh },
  ]
}

// 日本語コメント: パラメータ指定の T 字外形
export function outlineT(p: TTemplate): Vec2[] {
  const { barWidthMm: bw, barThickMm: bt, stemWidthMm: sw, stemHeightMm: sh } = p
  const hbw = bw / 2, hbt = bt / 2, hsw = sw / 2
  const topY = hbt
  const barBottomY = -hbt
  const stemBottomY = - (hbt + sh)
  return [
    { x: -hbw, y: topY },
    { x: hbw, y: topY },
    { x: hbw, y: barBottomY },
    { x: hsw, y: barBottomY },
    { x: hsw, y: stemBottomY },
    { x: -hsw, y: stemBottomY },
    { x: -hsw, y: barBottomY },
    { x: -hbw, y: barBottomY },
  ]
}

export function outlinePoly(p: PolyTemplate): Vec2[] {
  return p.vertices.map(v => ({ ...v }))
}

// 日本語コメント: 現在パラメータのバウンディングボックス寸法（東西×南北）
export function bboxOfL(p: LTemplate): RectTemplate { return { widthMm: p.widthMm, heightMm: p.heightMm } }
export function bboxOfU(p: UTemplate): RectTemplate { return { widthMm: p.widthMm, heightMm: p.heightMm } }
export function bboxOfT(p: TTemplate): RectTemplate { return { widthMm: p.barWidthMm, heightMm: p.barThickMm + p.stemHeightMm } }

export function bboxOfPoly(p: PolyTemplate | Vec2[]): RectTemplate {
  const pts = Array.isArray((p as PolyTemplate).vertices) ? (p as PolyTemplate).vertices : (p as Vec2[])
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const v of pts) {
    minX = Math.min(minX, v.x)
    maxX = Math.max(maxX, v.x)
    minY = Math.min(minY, v.y)
    maxY = Math.max(maxY, v.y)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { widthMm: INITIAL_RECT.widthMm, heightMm: INITIAL_RECT.heightMm }
  }
  return { widthMm: Math.max(1, maxX - minX), heightMm: Math.max(1, maxY - minY) }
}
