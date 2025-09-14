// 日本語コメント: 軒の出（外側オフセット）ユーティリティの最小テスト
import { offsetPolygonOuter, offsetPolygonOuterVariable } from '../../../src/core/eaves/offset'

describe('offsetPolygonOuter', () => {
  it('expands rectangle outward by constant mm', () => {
    const hw = 4000, hh = 3000
    const rect = [
      { x: -hw, y: hh },
      { x: hw, y: hh },
      { x: hw, y: -hh },
      { x: -hw, y: -hh },
    ]
    const d = 600
    const out = offsetPolygonOuter(rect, d)
    // 角数は4（マイター合流）
    expect(out.length).toBe(4)
    // 座標が d だけ外側へ拡張されていること（概ね）
    // 左上
    expect(out[0].x).toBeLessThanOrEqual(-hw - d + 1)
    expect(out[0].y).toBeGreaterThanOrEqual(hh + d - 1)
  })

  it('handles concave U shape with bevel at inner corners', () => {
    const W = 9000, H = 6000, iw = 4000, depth = 3000
    const hw = W/2, hh = H/2
    const poly = [
      { x: -hw, y: hh },
      { x: -iw / 2, y: hh },
      { x: -iw / 2, y: hh - depth },
      { x: iw / 2, y: hh - depth },
      { x: iw / 2, y: hh },
      { x: hw, y: hh },
      { x: hw, y: -hh },
      { x: -hw, y: -hh },
    ]
    const out = offsetPolygonOuter(poly, 500)
    expect(out.length).toBeGreaterThanOrEqual(poly.length) // 凹部でベベルにより頂点増加
  })

  it('supports per-edge distances on rectangle', () => {
    const hw = 4000, hh = 3000
    const rect = [
      { x: -hw, y: hh },
      { x: hw, y: hh },
      { x: hw, y: -hh },
      { x: -hw, y: -hh },
    ]
    // 上=1000, 右=500, 下=200, 左=800
    const dists = [1000, 500, 200, 800]
    const out = offsetPolygonOuterVariable(rect, dists)
    expect(out.length).toBe(4)
    // 上頂点のyはおおむね hh + 1000 付近
    expect(out[0].y).toBeGreaterThanOrEqual(hh + 1000 - 1)
    // 右上側はxが hw + 500 付近
    expect(out[1].x).toBeGreaterThanOrEqual(hw + 500 - 1)
  })
})
