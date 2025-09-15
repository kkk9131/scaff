// 日本語コメント: フロア管理の型とユーティリティ（将来3D対応に備えたZ情報を保持）
import type { TemplateKind, RectTemplate, LTemplate, UTemplate, TTemplate, INITIAL_RECT, INITIAL_L, INITIAL_U, INITIAL_T } from './model'
import { INITIAL_RECT as DEF_RECT, INITIAL_L as DEF_L, INITIAL_U as DEF_U, INITIAL_T as DEF_T } from './model'

export type FloorId = string

// 日本語コメント: 各フロアの壁形状はテンプレート種別＋各パラメータで保持（将来は外周+穴へ変換して保存）
export type FloorShape =
  | { kind: 'rect'; data: RectTemplate }
  | { kind: 'l'; data: LTemplate }
  | { kind: 'u'; data: UTemplate }
  | { kind: 't'; data: TTemplate }

export type FloorColor = { walls?: string; eaves?: string }

export type FloorEaves = { enabled: boolean; amountMm: number; perEdge?: Record<number, number> }

export type FloorState = {
  id: FloorId
  name: string
  elevationMm: number
  heightMm: number
  visible: boolean
  locked: boolean
  color?: FloorColor
  shape: FloorShape
  eaves?: FloorEaves
}

// 日本語コメント: 連番ラベル nF を返す
export function makeFloorName(n: number): string { return `${n}F` }

// 日本語コメント: 新規フロアを作成。既定は直下階のZ+階高で積み上げ、形状と色は引数で上書き可能
export function createFloor(init: Partial<FloorState> & { index?: number; below?: FloorState | null } = {}): FloorState {
  const idx = init.index ?? 1
  const below = init.below ?? null
  const elevation = init.elevationMm ?? (below ? (below.elevationMm + below.heightMm) : 0)
  const height = init.heightMm ?? (below ? below.heightMm : 2800)
  const shape: FloorShape = init.shape ?? { kind: 'rect', data: { ...DEF_RECT } }
  return {
    id: init.id ?? randomId(),
    name: init.name ?? makeFloorName(idx),
    elevationMm: elevation,
    heightMm: height,
    visible: init.visible ?? true,
    locked: init.locked ?? false,
    color: init.color ?? undefined,
    shape,
    eaves: init.eaves ?? { enabled: false, amountMm: 600, perEdge: {} },
  }
}

export function duplicateFloor(src: FloorState, overrides: Partial<FloorState> & { index?: number } = {}): FloorState {
  // 日本語コメント: 壁のみ複製（寸法/ガイド等はなし）。eaves は仕様上複製する（enabledの値もコピー）。
  return createFloor({
    index: overrides.index,
    below: overrides.below as any ?? null,
    elevationMm: overrides.elevationMm ?? src.elevationMm,
    heightMm: overrides.heightMm ?? src.heightMm,
    name: overrides.name,
    visible: overrides.visible ?? true,
    locked: overrides.locked ?? false,
    color: overrides.color ?? src.color,
    shape: JSON.parse(JSON.stringify(src.shape)),
    eaves: overrides.eaves ?? (src.eaves ? JSON.parse(JSON.stringify(src.eaves)) : undefined),
  })
}

export function randomId(): FloorId {
  // 日本語コメント: 簡易ID（UUIDでなくとも一意性があれば十分）
  return 'f_' + Math.random().toString(36).slice(2, 10)
}

// 日本語コメント: 既存名が "\d+F" なら数値を+1、それ以外は "-copy" を付与
export function nextFloorName(current: string): string {
  const m = current.match(/^(\d+)(F)$/i)
  if (m) return `${Number(m[1]) + 1}${m[2]}`
  return current + '-copy'
}
