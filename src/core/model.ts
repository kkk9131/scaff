// 日本語コメント: 内部モデルの最小定義（テンプレート長方形）。単位=mm、座標=中心原点。
<<<<<<< HEAD
import type { Vec2 } from './units'

// 日本語コメント: テンプレート種別
export type TemplateKind = 'rect' | 'l' | 'u' | 't'

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

// 日本語コメント: 初期値（暫定）。用途に応じて将来UIから変更予定。
export const INITIAL_RECT: RectTemplate = { widthMm: 8000, heightMm: 6000 }
export const INITIAL_L: LTemplate = { widthMm: 8000, heightMm: 6000, cutWidthMm: 3000, cutHeightMm: 3000 }
export const INITIAL_U: UTemplate = { widthMm: 9000, heightMm: 6000, innerWidthMm: 4000, depthMm: 3000 }
export const INITIAL_T: TTemplate = { barWidthMm: 9000, barThickMm: 2000, stemWidthMm: 2000, stemHeightMm: 6000 }

// 日本語コメント: ポリゴン（単純多角形）を mm 座標で返す。時計回りで閉路（最後の点は別途 closePath）
export function outlineOf(kind: TemplateKind): Vec2[] {
  switch (kind) {
    case 'rect': {
      const { widthMm: W, heightMm: H } = INITIAL_RECT
      const hw = W / 2, hh = H / 2
      return [
        { x: -hw, y: hh },
        { x: hw, y: hh },
        { x: hw, y: -hh },
        { x: -hw, y: -hh },
      ]
    }
    case 'l': {
      const { widthMm: W, heightMm: H, cutWidthMm: cw, cutHeightMm: ch } = INITIAL_L
      const hw = W / 2, hh = H / 2
      // 右上角を (cw, ch) 切り欠いた L字（上向き前提）
      return [
        { x: -hw, y: hh },
        { x: hw - cw, y: hh },
        { x: hw - cw, y: hh - ch },
        { x: hw, y: hh - ch },
        { x: hw, y: -hh },
        { x: -hw, y: -hh },
      ]
    }
    case 'u': {
      const { widthMm: W, heightMm: H, innerWidthMm: iw, depthMm: d } = INITIAL_U
      const hw = W / 2, hh = H / 2
      // U字（上に開口、中央開き）。上辺の中央 iw 幅を d だけ下に凹ませる
      // 上辺左→開口左→凹み底→開口右→上辺右→右下→左下→戻り
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
    case 't': {
      const { barWidthMm: bw, barThickMm: bt, stemWidthMm: sw, stemHeightMm: sh } = INITIAL_T
      const hbw = bw / 2, hbt = bt / 2, hsw = sw / 2
      // T字（上バーが水平、縦柱が中央下方向）。全高は bt/2 + sh まで下
      // 上バー外周 → 右上→右下→柱右→柱下→柱左→左下→左上
      const topY = hbt // モデルの上端（中心より上）
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
  }
}
=======
export type RectTemplate = {
  widthMm: number
  heightMm: number
  // 原点基準の中心配置とするため、配置座標は (0,0) を原則とする
}

// 日本語コメント: 初期テンプレート（例: 8000mm x 6000mm）
export const INITIAL_RECT: RectTemplate = {
  widthMm: 8000,
  heightMm: 6000,
}

>>>>>>> origin/main
