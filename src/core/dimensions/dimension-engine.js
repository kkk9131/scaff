// ブラウザ用の最小JS版エンジン
// 目的: ビルドなしでデモからESMとしてimportできるようにする

// 日本語で意図: TS版（dimension_engine.ts）と同等のAPIを提供する

function add(p, q) { return { x: p.x + q.x, y: p.y + q.y }; }
function sub(p, q) { return { x: p.x - q.x, y: p.y - q.y }; }
function mul(p, s) { return { x: p.x * s, y: p.y * s }; }
function norm(p) { return Math.hypot(p.x, p.y); }
function normalize(p) { const n = norm(p); return n === 0 ? { x: 0, y: 0 } : { x: p.x / n, y: p.y / n }; }
function leftNormal(p) { return { x: -p.y, y: p.x }; }
function rightNormal(p) { return { x: p.y, y: -p.x }; }
function distance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

const DEFAULTS = { outsideIsLeftNormal: true, offset: 16, decimals: 1 };

export class DimensionEngine {
  // 辺配列から寸法線情報を生成（外側=左法線を既定）
  computeForEdges(edges, opts = {}) {
    const cfg = { ...DEFAULTS, ...opts };
    return edges.map((edge) => {
      const v = sub(edge.b, edge.a);
      const n = cfg.outsideIsLeftNormal ? leftNormal(v) : rightNormal(v);
      const u = normalize(n);
      const off = mul(u, cfg.offset);

      const start = add(edge.a, off);
      const end = add(edge.b, off);
      const mid = mul(add(start, end), 0.5);
      const val = Number(distance(edge.a, edge.b).toFixed(cfg.decimals));

      return {
        start,
        end,
        textAnchor: mid,
        value: val,
        edgeId: edge.id,
        offset: cfg.offset,
        side: 'outside',
        units: opts.units ?? 'px',
      };
    });
  }

  // 日本語: 多角形の頂点から向き（CW/CCW）を判定し、外側を自動決定
  computeForPolygon(points, opts = {}) {
    const edges = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      edges.push({ a, b, id: `e${i}` });
    }
    const area = signedArea(points);
    const outsideIsLeftNormal = area < 0; // CW => left outside, CCW => right outside
    return this.computeForEdges(edges, { ...opts, outsideIsLeftNormal });
  }
}

// 署名付き面積（画面座標系）: >0 CCW, <0 CW
export function signedArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}
