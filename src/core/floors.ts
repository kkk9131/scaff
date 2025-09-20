// 日本語コメント: フロア管理の型とユーティリティ（将来3D対応に備えたZ情報を保持）
import type { TemplateKind, RectTemplate, LTemplate, UTemplate, TTemplate, PolyTemplate } from './model'
import { INITIAL_RECT as DEF_RECT, INITIAL_L as DEF_L, INITIAL_U as DEF_U, INITIAL_T as DEF_T, INITIAL_POLY as DEF_POLY } from './model'

export type FloorId = string

// 日本語コメント: 各フロアの壁形状はテンプレート種別＋各パラメータで保持（将来は外周+穴へ変換して保存）
export type FloorShape =
  | { kind: 'rect'; data: RectTemplate }
  | { kind: 'l'; data: LTemplate }
  | { kind: 'u'; data: UTemplate }
  | { kind: 't'; data: TTemplate }
  | { kind: 'poly'; data: PolyTemplate }

export type FloorColor = { walls?: string; eaves?: string }

export type FloorEaves = { enabled: boolean; amountMm: number; perEdge?: Record<number, number> }

// 日本語コメント: 形状のディープコピーを生成（JSON経由を避け、型安全に複製）
export function cloneShape(shape: FloorShape): FloorShape {
  switch (shape.kind) {
    case 'rect':
      return { kind: 'rect', data: { ...shape.data } }
    case 'l':
      return { kind: 'l', data: { ...shape.data } }
    case 'u':
      return { kind: 'u', data: { ...shape.data } }
    case 't':
      return { kind: 't', data: { ...shape.data } }
    case 'poly':
      return { kind: 'poly', data: { vertices: shape.data.vertices.map(v => ({ ...v })) } }
    default:
      // 日本語コメント: 列挙外は来ない想定だが安全側で矩形を返す
      return { kind: 'rect', data: { ...DEF_RECT } }
  }
}

// 日本語コメント: テンプレ種別から既定形状を生成
export function createDefaultShape(kind: TemplateKind = 'rect'): FloorShape {
  switch (kind) {
    case 'rect':
      return { kind: 'rect', data: { ...DEF_RECT } }
    case 'l':
      return { kind: 'l', data: { ...DEF_L } }
    case 'u':
      return { kind: 'u', data: { ...DEF_U } }
    case 't':
      return { kind: 't', data: { ...DEF_T } }
    case 'poly':
      return { kind: 'poly', data: { vertices: DEF_POLY.vertices.map(v => ({ ...v })) } }
    default:
      // 日本語コメント: 列挙外は来ない想定だが安全側で矩形を返す
      return { kind: 'rect', data: { ...DEF_RECT } }
  }
}

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
  // 日本語コメント: 屋根（フェーズ3）。各階に複数保持可能。
  roofUnits?: import('./roofing').RoofUnit[]
}

// 日本語コメント: 連番ラベル nF を返す
export function makeFloorName(n: number): string { return `${n}F` }

// 日本語コメント: 新規フロアを作成。既定は直下階のZ+階高で積み上げ、形状と色は引数で上書き可能
export function createFloor(init: Partial<FloorState> & { index?: number; below?: FloorState | null } = {}): FloorState {
  const idx = init.index ?? 1
  const below = init.below ?? null
  const elevation = init.elevationMm ?? (below ? (below.elevationMm + below.heightMm) : 0)
  const height = init.heightMm ?? (below ? below.heightMm : 2800)
  const shape: FloorShape = init.shape ? cloneShape(init.shape) : createDefaultShape()
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
    roofUnits: (init as any).roofUnits ?? [],
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
    shape: cloneShape(src.shape),
    // 日本語コメント: 仕様に合わせて eaves は複製しない（デフォルト無効）。
    eaves: overrides.eaves ?? { enabled: false, amountMm: 600, perEdge: {} },
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
