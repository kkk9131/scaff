// 寸法線機能の基本モデル定義
// 日本語で意図を説明: 図形の辺と、その外側に並行配置する寸法線を表す

export type Point = {
  x: number;
  y: number;
};

export type Edge = {
  // 辺の始点・終点（エディタ内部座標）
  a: Point;
  b: Point;
  // 任意ID（UI 側の対応付けに使用）
  id?: string;
};

export type Units = 'px' | 'mm' | 'cm';

export type DimensionLine = {
  // 寸法線の表示位置（辺と平行、外側にオフセット）
  start: Point;
  end: Point;
  // ラベル（数値）のアンカー（テキストの基準点）
  textAnchor: Point;
  // 実測値（座標系上の長さ）。UI 側で書式化して描画しても良い
  value: number;
  // 寸法線の対象となる辺ID（あれば）
  edgeId?: string;
  // 外側へのオフセット量
  offset: number;
  // 現フェーズでは常に outside を採用
  side: 'outside';
  // 単位（将来拡張用。既定は px）
  units?: Units;
};

// ユーティリティ: 2点間距離
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

