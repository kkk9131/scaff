// スナップ（直角・グリッド）用の純粋関数群
// - 目的: ドラッグ中のポイントを直角方向やグリッドに吸着させる
// - モデル座標系（mm）で処理し、副作用を持たない

export type Point = { x: number; y: number }

export type SnapOptions = {
  // 直角スナップ（水平・垂直）を有効化
  enableOrtho: boolean
  // 直角スナップの角度許容（度）。例: 7.5
  orthoToleranceDeg: number
  // グリッド吸着を有効化
  enableGrid: boolean
  // グリッド間隔（mm）
  gridMm: number
  // 直角判定の基準となるアンカー（通常は始点や図形中心）
  anchor: Point
}

export const SNAP_DEFAULTS: SnapOptions = {
  enableOrtho: true,
  orthoToleranceDeg: 7.5,
  enableGrid: true,
  gridMm: 50, // 50mm グリッド（初期値）
  anchor: { x: 0, y: 0 },
}

// 日本語コメント: 値を指定ステップに丸める（最も近い倍数に吸着）
const quantize = (value: number, step: number) => {
  if (step <= 0) return value
  return Math.round(value / step) * step
}

// 日本語コメント: グリッド吸着
export const snapToGrid = (p: Point, gridMm: number): Point => {
  if (gridMm <= 0) return p
  return {
    x: quantize(p.x, gridMm),
    y: quantize(p.y, gridMm),
  }
}

// 日本語コメント: 直角（水平・垂直）吸着。
// アンカーからのベクトル角度が 0/90/180/270 ± tol に入っていれば、対応する軸へ吸着
export const snapToOrtho = (p: Point, anchor: Point, toleranceDeg: number): Point => {
  const vx = p.x - anchor.x
  const vy = p.y - anchor.y
  const len = Math.hypot(vx, vy)
  if (len === 0) return p
  const ang = Math.atan2(vy, vx) // [-PI, PI]
  const deg = (ang * 180) / Math.PI
  const norm = ((deg % 360) + 360) % 360
  const tol = Math.max(0, toleranceDeg)

  // 0 or 180 → 水平（y をアンカーの y に吸着）
  const near0 = Math.min(Math.abs(norm - 0), Math.abs(norm - 360)) <= tol
  const near180 = Math.abs(norm - 180) <= tol
  if (near0 || near180) {
    return { x: p.x, y: anchor.y }
  }
  // 90 or 270 → 垂直（x をアンカーの x に吸着）
  const near90 = Math.abs(norm - 90) <= tol
  const near270 = Math.abs(norm - 270) <= tol
  if (near90 || near270) {
    return { x: anchor.x, y: p.y }
  }
  return p
}

// 日本語コメント: 複合スナップ（直角→グリッドの順）
export const applySnaps = (p: Point, opts: SnapOptions): Point => {
  let q = p
  if (opts.enableOrtho) {
    q = snapToOrtho(q, opts.anchor, opts.orthoToleranceDeg)
  }
  if (opts.enableGrid) {
    q = snapToGrid(q, opts.gridMm)
  }
  return q
}

