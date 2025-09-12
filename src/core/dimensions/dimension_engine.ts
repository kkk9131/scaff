// 寸法線を各辺の外側に常時表示するための計算エンジン
// 方針: 辺ベクトルに平行な線分を、法線方向にオフセットして配置する

import { DimensionLine, Edge, Point, Units, distance } from './dimension_model';

export type DimensionEngineOptions = {
  // 外側の定義: 既定は「左法線」を外側とみなす
  outsideIsLeftNormal?: boolean;
  // オフセット量（px）
  offset?: number;
  // ラベル小数桁（UI 側の描画で使用する想定、ここでは伝達のみ）
  decimals?: number;
  // 単位（将来拡張）
  units?: Units;
};

const DEFAULTS: Required<Pick<DimensionEngineOptions, 'outsideIsLeftNormal' | 'offset' | 'decimals'>> = {
  outsideIsLeftNormal: true,
  offset: 16,
  decimals: 1,
};

function add(p: Point, q: Point): Point {
  return { x: p.x + q.x, y: p.y + q.y };
}

function sub(p: Point, q: Point): Point {
  return { x: p.x - q.x, y: p.y - q.y };
}

function mul(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s };
}

function norm(p: Point): number {
  return Math.hypot(p.x, p.y);
}

function normalize(p: Point): Point {
  const n = norm(p);
  if (n === 0) return { x: 0, y: 0 };
  return { x: p.x / n, y: p.y / n };
}

function leftNormal(p: Point): Point {
  // (x, y) を左へ90度回転 => (-y, x)
  return { x: -p.y, y: p.x };
}

function rightNormal(p: Point): Point {
  // (x, y) を右へ90度回転 => (y, -x)
  return { x: p.y, y: -p.x };
}

export class DimensionEngine {
  // 日本語コメント: 辺配列から寸法線情報を生成
  computeForEdges(edges: Edge[], opts: DimensionEngineOptions = {}): DimensionLine[] {
    const { outsideIsLeftNormal, offset, decimals } = { ...DEFAULTS, ...opts };

    return edges.map((edge) => {
      const v = sub(edge.b, edge.a); // 辺ベクトル
      const n = outsideIsLeftNormal ? leftNormal(v) : rightNormal(v); // 外側法線
      const u = normalize(n); // 単位法線
      const off = mul(u, offset ?? DEFAULTS.offset);

      // 寸法線は辺と平行、法線方向にオフセット
      const start = add(edge.a, off);
      const end = add(edge.b, off);

      // ラベルは寸法線の中点
      const mid = mul(add(start, end), 0.5);

      const value = distance(edge.a, edge.b);

      const dim: DimensionLine = {
        start,
        end,
        textAnchor: mid,
        value: Number(value.toFixed(decimals ?? DEFAULTS.decimals)),
        edgeId: edge.id,
        offset: offset ?? DEFAULTS.offset,
        side: 'outside',
        units: opts.units ?? 'px',
      };

      return dim;
    });
  }
}

