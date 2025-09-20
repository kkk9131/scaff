// 日本語コメント: フェーズ5 データ管理（保存/読み込み/ローカル永続化）
// 依存を増やさず、最小の型ガードとシリアライザ/デシリアライザを提供する。

import { createFloor, cloneShape, type FloorState, type FloorShape } from '@/core/floors'
import { outlineRect, outlineL, outlineU, outlineT, outlinePoly, INITIAL_RECT } from '@/core/model'
import { signedArea as signedAreaModel } from '@/core/eaves/offset'

// 保存フォーマット（MVP）
export type PersistVec2 = { x: number; y: number }
export type PersistEaves = { enabled: boolean; amountMm: number; perEdge?: Record<number, number> }
export type PersistColor = { walls?: string; eaves?: string }
export type PersistWalls = { outer: PersistVec2[]; holes?: PersistVec2[][] }
export type PersistRoofUnit = {
  id: string
  type: 'flat' | 'gable' | 'hip' | 'mono'
  mode?: 'byPitch' | 'byApex'
  pitchSun?: number
  ridgeAxis?: 'NS' | 'EW'
  gableEdges?: number[]
  monoDownhill?: 'N' | 'S' | 'E' | 'W'
  apexHeightMm?: number
  parapetHeightMm?: number
  footprint: { kind: 'outer' } | { kind: 'polygon'; polygon: PersistVec2[] }
  eavesOverride?: { enabled?: boolean; amountMm?: number; perEdge?: Record<number, number> }
  excludeUpperShadows?: boolean
}

export type PersistFloor = {
  id: string
  name: string
  elevationMm: number
  heightMm: number
  color?: PersistColor
  walls: PersistWalls
  eaves?: PersistEaves
  // エディタ再現用のオプション（将来、変換に移行可能）
  shape?: { kind: 'rect'|'l'|'u'|'t'|'poly'; data: any }
  visible?: boolean
  locked?: boolean
  roofUnits?: PersistRoofUnit[]
}
export type SaveFile = {
  app: 'scaff'
  version: 1
  floors: PersistFloor[]
  activeFloorId?: string
}

// 日本語コメント: FloorState → PersistFloor 変換
export function floorToPersist(f: FloorState): PersistFloor {
  const outer = f.shape.kind === 'rect' ? outlineRect(f.shape.data)
    : f.shape.kind === 'l' ? outlineL(f.shape.data)
    : f.shape.kind === 'u' ? outlineU(f.shape.data)
    : f.shape.kind === 't' ? outlineT(f.shape.data)
    : outlinePoly(f.shape.data)
  // 外周=反時計回り（CCW）に正規化
  const area = signedAreaModel(outer)
  const outerCCW = area >= 0 ? outer.slice() : outer.slice().reverse()
  return {
    id: f.id,
    name: f.name,
    elevationMm: f.elevationMm,
    heightMm: f.heightMm,
    color: f.color ? { ...f.color } : undefined,
    walls: { outer: outerCCW },
    eaves: f.eaves ? { enabled: !!f.eaves.enabled, amountMm: f.eaves.amountMm, perEdge: f.eaves.perEdge && Object.keys(f.eaves.perEdge).length ? { ...f.eaves.perEdge } : undefined } : undefined,
    shape: f.shape ? { kind: f.shape.kind, data: f.shape.kind === 'poly' ? { vertices: outerCCW.map(p => ({ ...p })) } : { ...f.shape.data } } : undefined,
    visible: f.visible,
    locked: f.locked,
    roofUnits: Array.isArray(f.roofUnits) ? f.roofUnits.map(ru => ({
      id: ru.id,
      type: ru.type,
      mode: ru.mode,
      pitchSun: ru.pitchSun,
      ridgeAxis: ru.ridgeAxis,
      gableEdges: ru.gableEdges,
      monoDownhill: ru.monoDownhill,
      apexHeightMm: ru.apexHeightMm,
      parapetHeightMm: ru.parapetHeightMm,
      footprint: ru.footprint.kind === 'outer' ? { kind: 'outer' } : { kind: 'polygon', polygon: (ru.footprint as any).polygon.map((p: any) => ({ x: p.x, y: p.y })) },
      eavesOverride: ru.eavesOverride ? { enabled: ru.eavesOverride.enabled, amountMm: ru.eavesOverride.amountMm, perEdge: ru.eavesOverride.perEdge } : undefined,
      excludeUpperShadows: ru.excludeUpperShadows,
    })) : undefined,
  }
}

// 日本語コメント: PersistFloor から FloorState を生成
export function persistFloorToState(pf: PersistFloor): FloorState {
  const shape = normalizePersistShape(pf)
  const eaves = pf.eaves
    ? { enabled: !!pf.eaves.enabled, amountMm: pf.eaves.amountMm, perEdge: pf.eaves.perEdge ? { ...pf.eaves.perEdge } : {} }
    : { enabled: false, amountMm: 600, perEdge: {} }
  return createFloor({
    id: pf.id,
    name: pf.name,
    elevationMm: pf.elevationMm,
    heightMm: pf.heightMm,
    visible: pf.visible ?? true,
    locked: pf.locked ?? false,
    color: pf.color,
    shape,
    eaves,
    roofUnits: Array.isArray(pf.roofUnits) ? pf.roofUnits.map(ru => ({
      id: ru.id,
      type: ru.type as any,
      mode: ru.mode as any,
      pitchSun: ru.pitchSun,
      ridgeAxis: ru.ridgeAxis as any,
      gableEdges: Array.isArray(ru.gableEdges) ? ru.gableEdges.slice() : undefined,
      monoDownhill: ru.monoDownhill as any,
      apexHeightMm: ru.apexHeightMm,
      parapetHeightMm: ru.parapetHeightMm,
      footprint: ru.footprint.kind === 'outer' ? { kind: 'outer' } : { kind: 'polygon', polygon: (ru.footprint as any).polygon.map((p: any) => ({ x: p.x, y: p.y })) },
      eavesOverride: ru.eavesOverride ? { enabled: ru.eavesOverride.enabled, amountMm: ru.eavesOverride.amountMm, perEdge: ru.eavesOverride.perEdge } : undefined,
      excludeUpperShadows: ru.excludeUpperShadows ?? true,
    })) : [],
  })
}

function normalizePersistShape(pf: PersistFloor): FloorShape {
  if (pf.shape) {
    return cloneShape(pf.shape as FloorShape)
  }
  const rect = inferRectFromOuter(pf.walls?.outer)
  return { kind: 'rect', data: rect }
}

// 日本語コメント: 外周情報から矩形テンプレ寸法を推定（shape欠損時のフォールバック）
export function inferRectFromOuter(outer: PersistVec2[] | undefined) {
  if (!outer || outer.length < 3) {
    return { ...INITIAL_RECT }
  }
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of outer) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  return {
    widthMm: Math.max(1, maxX - minX),
    heightMm: Math.max(1, maxY - minY),
  }
}

// 日本語コメント: 型ガード（最低限）
function isNum(v: any): v is number { return typeof v === 'number' && Number.isFinite(v) }
function isStr(v: any): v is string { return typeof v === 'string' }
function isVec2(v: any): v is PersistVec2 { return v && isNum(v.x) && isNum(v.y) }

function validatePersistFloor(obj: any): obj is PersistFloor {
  if (!obj || !isStr(obj.id) || !isStr(obj.name)) return false
  if (!isNum(obj.elevationMm) || !isNum(obj.heightMm)) return false
  if (!obj.walls || !Array.isArray(obj.walls.outer) || obj.walls.outer.length < 3) return false
  if (!obj.walls.outer.every(isVec2)) return false
  if (obj.walls.holes && (!Array.isArray(obj.walls.holes) || !obj.walls.holes.every((h: any) => Array.isArray(h) && h.every(isVec2)))) return false
  if (obj.eaves) {
    if (typeof obj.eaves.enabled !== 'boolean' || !isNum(obj.eaves.amountMm)) return false
    if (obj.eaves.perEdge && typeof obj.eaves.perEdge !== 'object') return false
  }
  if (obj.shape) {
    const kinds = ['rect','l','u','t','poly']
    if (!obj.shape.kind || !kinds.includes(obj.shape.kind)) return false
    if (!obj.shape.data || typeof obj.shape.data !== 'object') return false
    if (obj.shape.kind === 'poly') {
      const verts = obj.shape.data.vertices
      if (!Array.isArray(verts) || !verts.every(isVec2)) return false
    }
  }
  if (obj.roofUnits) {
    if (!Array.isArray(obj.roofUnits)) return false
    for (const ru of obj.roofUnits) {
      if (!ru || typeof ru.id !== 'string' || !['flat','gable','hip','mono'].includes(ru.type)) return false
      if (!ru.footprint || (ru.footprint.kind !== 'outer' && ru.footprint.kind !== 'polygon')) return false
      if (ru.footprint.kind === 'polygon') {
        if (!Array.isArray((ru.footprint as any).polygon) || !(ru.footprint as any).polygon.every(isVec2)) return false
      }
    }
  }
  return true
}

export function makeSaveData(floors: FloorState[], activeFloorId?: string): SaveFile {
  const payload: SaveFile = {
    app: 'scaff',
    version: 1,
    floors: floors.map(floorToPersist),
    activeFloorId,
  }
  return payload
}

export function serializeSaveData(floors: FloorState[], activeFloorId?: string): string {
  // 日本語コメント: 整形JSONで保存
  return JSON.stringify(makeSaveData(floors, activeFloorId), null, 2)
}

export function parseSaveData(text: string): SaveFile {
  const data = JSON.parse(text)
  if (!data || data.app !== 'scaff' || data.version !== 1) throw new Error('サポート外のファイル形式です')
  if (!Array.isArray(data.floors)) throw new Error('floors が不正です')
  const floors: PersistFloor[] = []
  for (const f of data.floors) {
    if (!validatePersistFloor(f)) throw new Error('floor データが不正です')
    floors.push(f)
  }
  return { app: 'scaff', version: 1, floors, activeFloorId: isStr(data.activeFloorId) ? data.activeFloorId : undefined }
}

// 日本語コメント: ブラウザ向けI/Oユーティリティ
export function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 0)
}

const LS_KEY = 'scaff:project:v1'
export function saveToLocalStorage(floors: FloorState[], activeFloorId?: string) {
  try {
    const text = serializeSaveData(floors, activeFloorId)
    localStorage.setItem(LS_KEY, text)
  } catch {}
}
export function loadFromLocalStorage(): SaveFile | null {
  try {
    const text = localStorage.getItem(LS_KEY)
    if (!text) return null
    return parseSaveData(text)
  } catch {
    return null
  }
}

// 日本語コメント: ローカル保存の消去（初期化用）
export function clearLocalStorage() {
  try { localStorage.removeItem(LS_KEY) } catch {}
}
