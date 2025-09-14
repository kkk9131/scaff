// 日本語コメント: 軒の出（外側オフセット）用の単純多角形オフセットユーティリティ
// 前提: モデル座標系（+Y=上）。ポリゴンはCW（時計回り）/CCWどちらでも可。

import type { Vec2 } from '../units'

// ベクトル演算（最小限）
const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })
const mul = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s })
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y
const crossZ = (a: Vec2, b: Vec2) => a.x * b.y - a.y * b.x
const len = (a: Vec2) => Math.hypot(a.x, a.y)
const norm = (a: Vec2): Vec2 => {
  const L = len(a) || 1
  return { x: a.x / L, y: a.y / L }
}
const left = (v: Vec2): Vec2 => ({ x: -v.y, y: v.x })
const right = (v: Vec2): Vec2 => ({ x: v.y, y: -v.x })

export type OffsetOptions = {
  // マイターの長さ制限（miterLength <= miterLimit * offset で許容）。超えたらベベルにフォールバック。
  miterLimit?: number
  // 凹角に対するマイター制限（既定は無制限＝常に交点で結ぶ）
  concaveMiterLimit?: number
}

// 日本語コメント: ポリゴンの署名付き面積（モデル座標 +Y=上）
export function signedArea(points: Vec2[]): number {
  let a = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

// 日本語コメント: 外側オフセット（等距離）。
// - orientation に応じて「外側法線」を自動決定（CW→right, CCW→left）
// - 角の結合: 凸はマイター、凹はベベル（2点追加）
export function offsetPolygonOuter(poly: Vec2[], distance: number, opts: OffsetOptions = {}): Vec2[] {
  // 日本語コメント: 単一距離のヘルパー（可変距離版に委譲）
  const distances = new Array(poly.length).fill(distance)
  return offsetPolygonOuterVariable(poly, distances, opts)
}

// 日本語コメント: 辺ごとに距離が異なる外側オフセット
export function offsetPolygonOuterVariable(poly: Vec2[], distances: number[], opts: OffsetOptions = {}): Vec2[] {
  const n = poly.length
  if (n < 3) return poly.slice()
  const dists = distances.length === n ? distances : new Array(n).fill(distances[0] ?? 0)
  const area = signedArea(poly)
  // 日本語コメント: 外側の向き
  // - CW（面積<0）: 内側は右法線側 → 外側は左法線
  // - CCW（面積>0）: 内側は左法線側 → 外側は右法線
  const outwardNormal = area < 0 ? left : right
  const miterLimit = opts.miterLimit ?? 8
  const concaveMiterLimit = opts.concaveMiterLimit ?? Number.POSITIVE_INFINITY

  // 各辺の平行移動線（無限直線）を準備
  type Line = { p: Vec2; v: Vec2; n: Vec2; aOff: Vec2; bOff: Vec2; dist: number }
  const lines: Line[] = []
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    const v = sub(b, a)
    const u = norm(v)
    const on = norm(outwardNormal(u))
    const di = dists[i] || 0
    const off = mul(on, di)
    const aOff = add(a, off)
    const bOff = add(b, off)
    lines.push({ p: a, v: u, n: on, aOff, bOff, dist: di })
  }

  // 直線同士の交点
  const intersect = (p1: Vec2, v1: Vec2, p2: Vec2, v2: Vec2): Vec2 | null => {
    const denom = crossZ(v1, v2)
    if (Math.abs(denom) < 1e-8) return null // 平行
    const w = sub(p2, p1)
    const t = crossZ(w, v2) / denom
    return add(p1, mul(v1, t))
  }

  const out: Vec2[] = []
  for (let i = 0; i < n; i++) {
    const prev = (i + n - 1) % n
    const Lp = lines[prev]
    const Lc = lines[i]
    // 頂点まわりの曲がりの向きで凸/凹を判定
    const vPrev = sub(poly[i], poly[prev])
    const vCurr = sub(poly[(i + 1) % n], poly[i])
    const z = crossZ(vPrev, vCurr)
    const isConvex = area < 0 ? (z < 0) : (z > 0) // CWでは右折が凸、CCWでは左折が凸

    // すべての角（凸・凹）でまず交点を試みる
    const ip = intersect(Lp.aOff, Lp.v, Lc.aOff, Lc.v)
    if (!ip) {
      // 平行（極端角）→ ベベル
      out.push(Lp.bOff)
      out.push(Lc.aOff)
      continue
    }
    // マイター長チェック（凸と凹でしきい値を変える）
    const mLen = Math.hypot(ip.x - Lc.aOff.x, ip.y - Lc.aOff.y)
    // 日本語コメント: 距離が辺ごとに異なるため、制限には局所距離を採用（安全側でmaxでも可）
    const localD = Math.max(lines[prev].dist, lines[i].dist)
    const limit = (isConvex ? miterLimit : concaveMiterLimit) * localD
    if (mLen > limit) {
      // 過剰なマイターはベベルへフォールバック
      out.push(Lp.bOff)
      out.push(Lc.aOff)
    } else {
      out.push(ip)
    }
  }
  return out
}
