// 日本語コメント: 屋根（RoofUnit）関連の型定義。各階に複数の屋根を持てる前提。
import type { Vec2 } from '@/core/units'

export type RoofType = 'flat' | 'gable' | 'hip' | 'mono'
export type RidgeAxis = 'NS' | 'EW'
export type Cardinal = 'N' | 'S' | 'E' | 'W'

export type RoofFootprint =
  | { kind: 'outer' }
  | { kind: 'polygon'; polygon: Vec2[] }

export type RoofEavesOverride = {
  enabled?: boolean
  amountMm?: number
  perEdge?: Record<number, number>
}

export type RoofComputed = {
  outline: Vec2[]
  ridges: { a: Vec2; b: Vec2 }[]
  valleys: { a: Vec2; b: Vec2 }[]
  // 将来: ラベル位置、最高点座標などを追加
}

export type RoofUnit = {
  id: string
  type: RoofType
  mode?: 'byPitch' | 'byApex'
  pitchSun?: number // 0..15, step 0.5
  ridgeAxis?: RidgeAxis // gable/hip 用
  gableEdges?: number[] // 切妻にする辺index（複数可、全辺可=棟なし）
  monoDownhill?: Cardinal // 片流れの流れ方向（低い側）
  apexHeightMm?: number // hip(byApex) 用
  parapetHeightMm?: number // flat 用
  footprint: RoofFootprint
  eavesOverride?: RoofEavesOverride
  excludeUpperShadows?: boolean // 上階の陰除外（既定ON）
  computed?: RoofComputed
}

