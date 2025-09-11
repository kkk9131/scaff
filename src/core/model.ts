// 日本語コメント: 内部モデルの最小定義（テンプレート長方形）。単位=mm、座標=中心原点。
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

