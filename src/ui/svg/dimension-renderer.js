// SVG 用の寸法線レンダラ
// 目的: コアエンジンの出力（寸法線）をSVGに描画し、更新に追随させる

import { DimensionEngine } from '../../core/dimensions/dimension-engine.js';

export class DimensionRenderer {
  // svgEl: <svg> 要素
  // options: { showHandles?: boolean, offset?: number, decimals?: number, outsideIsLeftNormal?: boolean }
  constructor(svgEl, options = {}) {
    this.svg = svgEl;
    this.options = { showHandles: true, offset: 16, decimals: 1, outsideIsLeftNormal: true, ...options };
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

    // 寸法線
    const dims = this.engine.computeForEdges(edges, {
      offset: this.options.offset,
      decimals: this.options.decimals,
      outsideIsLeftNormal: this.options.outsideIsLeftNormal,
    });
    for (const d of dims) {
      this.svg.appendChild(this._line(d.start.x, d.start.y, d.end.x, d.end.y, 'dim'));
      const label = `${d.value.toFixed(this.options.decimals)} ${d.units ?? 'px'}`;
      this.svg.appendChild(this._text(d.textAnchor.x, d.textAnchor.y - 4, label, 'label'));
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

