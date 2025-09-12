// SVG 用の寸法線レンダラ
// 目的: コアエンジンの出力（寸法線）をSVGに描画し、更新に追随させる

import { DimensionEngine } from '../../core/dimensions/dimension-engine.js';

export class DimensionRenderer {
  // svgEl: <svg> 要素
  // options: { showHandles?: boolean, offset?: number, decimals?: number, outsideIsLeftNormal?: boolean, outsideMode?: 'auto' | 'left' | 'right', avoidLabelCollision?: boolean, labelSeparationStep?: number, labelSeparationMaxIter?: number }
  constructor(svgEl, options = {}) {
    this.svg = svgEl;
    this.options = { showHandles: true, offset: 16, decimals: 1, outsideIsLeftNormal: true, outsideMode: 'auto', avoidLabelCollision: true, labelSeparationStep: 10, labelSeparationMaxIter: 10, ...options };
    this.engine = new DimensionEngine();
    this.points = []; // [{x,y}]
    this._drag = null; // { idx, pointerId }
    this._setupEvents();
  }

  setPoints(points) {
    // 日本語: 参照を保持し、描画を更新
    this.points = points.map(p => ({ x: p.x, y: p.y }));
    this.render();
  }

  setOptions(options) {
    this.options = { ...this.options, ...options };
    this.render();
  }

  getEdges() {
    const pts = this.points;
    const edges = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      edges.push({ a, b, id: `e${i}` });
    }
    return edges;
  }

  clear() {
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
  }

  render() {
    this.clear();
    const edges = this.getEdges();
    // 図形の辺
    edges.forEach(e => this.svg.appendChild(this._line(e.a.x, e.a.y, e.b.x, e.b.y, 'edge')));

    // 寸法線（外側: 自動/手動）
    let dims;
    if (this.options.outsideMode === 'auto') {
      dims = this.engine.computeForPolygon(this.points, {
        offset: this.options.offset,
        decimals: this.options.decimals,
      });
    } else {
      const left = this.options.outsideMode === 'left' ? true : false;
      dims = this.engine.computeForEdges(edges, {
        offset: this.options.offset,
        decimals: this.options.decimals,
        outsideIsLeftNormal: left,
      });
    }
    for (const d of dims) {
      this.svg.appendChild(this._line(d.start.x, d.start.y, d.end.x, d.end.y, 'dim'));
    }

    // ラベル配置（衝突回避）
    const edgeById = new Map();
    edges.forEach(e => edgeById.set(e.id, e));
    const labels = [];
    for (let i = 0; i < dims.length; i++) {
      const d = dims[i];
      const labelText = `${d.value.toFixed(this.options.decimals)} ${d.units ?? 'px'}`;
      const textEl = this._text(d.textAnchor.x, d.textAnchor.y - 4, labelText, 'label');
      this.svg.appendChild(textEl); // まず追加してBBox取得を可能にする
      labels.push({ el: textEl, dim: d });
    }

    if (this.options.avoidLabelCollision) {
      const step = this.options.labelSeparationStep;
      const maxIter = this.options.labelSeparationMaxIter;
      for (let i = 0; i < labels.length; i++) {
        const li = labels[i];
        const ei = edgeById.get(li.dim.edgeId);
        const edgeMid = ei ? { x: (ei.a.x + ei.b.x) / 2, y: (ei.a.y + ei.b.y) / 2 } : { x: (li.dim.start.x + li.dim.end.x) / 2, y: (li.dim.start.y + li.dim.end.y) / 2 };
        const dimMid = { x: (li.dim.start.x + li.dim.end.x) / 2, y: (li.dim.start.y + li.dim.end.y) / 2 };
        let nx = dimMid.x - edgeMid.x; let ny = dimMid.y - edgeMid.y;
        const nlen = Math.hypot(nx, ny) || 1; nx /= nlen; ny /= nlen;

        let moved = 0;
        for (let iter = 0; iter < maxIter; iter++) {
          const bboxI = li.el.getBBox();
          let overlap = false;
          for (let j = 0; j < i; j++) {
            const bboxJ = labels[j].el.getBBox();
            if (overlaps(bboxI, bboxJ)) { overlap = true; break; }
          }
          if (!overlap) break;
          moved += step;
          const x = li.dim.textAnchor.x + nx * moved;
          const y = li.dim.textAnchor.y - 4 + ny * moved;
          li.el.setAttribute('x', x);
          li.el.setAttribute('y', y);
        }
      }
    }

    // ハンドル
    if (this.options.showHandles) {
      this.points.forEach((p, idx) => {
        const h = this._circle(p.x, p.y, 6, 'handle');
        h.dataset.idx = String(idx);
        this.svg.appendChild(h);
      });
    }
  }

  // 内部: SVGユーティリティ
  _line(x1, y1, x2, y2, cls) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    el.setAttribute('x1', x1);
    el.setAttribute('y1', y1);
    el.setAttribute('x2', x2);
    el.setAttribute('y2', y2);
    if (cls) el.setAttribute('class', cls);
    return el;
  }

  _circle(cx, cy, r, cls) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    el.setAttribute('cx', cx);
    el.setAttribute('cy', cy);
    el.setAttribute('r', r);
    if (cls) el.setAttribute('class', cls);
    return el;
  }

  _text(x, y, content, cls) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    el.setAttribute('x', x);
    el.setAttribute('y', y);
    if (cls) el.setAttribute('class', cls);
    el.textContent = content;
    return el;
  }

  // ドラッグ操作（SVG座標に正規化）
  _setupEvents() {
    this.svg.addEventListener('pointerdown', (e) => {
      const target = e.target;
      if (target && target.classList && target.classList.contains('handle')) {
        this._drag = { idx: Number(target.dataset.idx), pointerId: e.pointerId };
        target.setPointerCapture(e.pointerId);
      }
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (!this._drag) return;
      const idx = this._drag.idx;
      const pt = this.svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const ctm = this.svg.getScreenCTM();
      if (!ctm) return;
      const inv = ctm.inverse();
      const loc = pt.matrixTransform(inv);
      this.points[idx].x = loc.x;
      this.points[idx].y = loc.y;
      this.render();
    });
    this.svg.addEventListener('pointerup', () => { this._drag = null; });
    this.svg.addEventListener('pointercancel', () => { this._drag = null; });
  }
}

// SVG BBox の交差判定
function overlaps(a, b) {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}
