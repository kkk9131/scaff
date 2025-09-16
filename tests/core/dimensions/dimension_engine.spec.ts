// 寸法線エンジンの最小テスト雛形（実行環境は今後追加）
// 目的: APIの形と基本ベクトル計算の前提を固定化する

import { DimensionEngine } from '../../../src/core/dimensions/dimension-engine';

describe('DimensionEngine', () => {
  it('generates dimension lines outside each edge (left normal by default)', () => {
    const engine = new DimensionEngine();
    const edges = [
      { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, id: 'e1' }, // 横方向（右）
    ];

    const dims = engine.computeForEdges(edges, { offset: 10 });
    expect(dims).toHaveLength(1);

    const d = dims[0];
    // 左法線 => 上方向へオフセットされる想定
    expect(d.start.y).toBeCloseTo(10, 5);
    expect(d.end.y).toBeCloseTo(10, 5);
    expect(d.value).toBeCloseTo(100, 5);
    expect(d.side).toBe('outside');
    expect(d.edgeId).toBe('e1');
  });
});
