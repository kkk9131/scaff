import React, { createContext, useContext } from 'react'
import type { FloorState } from '@/core/floors'
import type { TemplateKind } from '@/core/model'
import type { RoofUnit } from '@/core/roofing'

export type ViewMode = 'plan' | 'elev' | '3d'

export type DimensionOptions = {
  show: boolean
  outsideMode: 'auto' | 'left' | 'right'
  offset: number
  offsetUnit: 'px' | 'mm'
  decimals: number
  avoidCollision: boolean
}

export type SnapState = {
  enableGrid: boolean
  gridMm: number
  enableOrtho: boolean
  orthoToleranceDeg: number
}

export type EditorActions = {
  addFloorAboveActive: () => void
  duplicateActiveFloor: () => void
  removeActiveFloor: () => void
  patchFloor: (id: string, patch: Partial<FloorState>) => void
  renameFloor: (id: string) => void
  updateEaves: (id: string, patch: Partial<{ enabled: boolean; amountMm: number; perEdge: Record<number, number> }>) => void
  updateRoof: (patch: Partial<{ enabled: boolean; type: RoofUnit['type']; parapetHeightMm: number; pitchSun: number; ridgeAxis: RoofUnit['ridgeAxis']; monoDownhill: RoofUnit['monoDownhill']; apexHeightMm: number; excludeUpperShadows: boolean }>) => void
  applyTemplateToActive: (template: TemplateKind) => void
}

export type EditorStateValue = {
  floors: FloorState[]
  setFloors: React.Dispatch<React.SetStateAction<FloorState[]>>
  activeFloorId: string
  setActiveFloorId: React.Dispatch<React.SetStateAction<string>>
  view: ViewMode
  setView: React.Dispatch<React.SetStateAction<ViewMode>>
  template: TemplateKind
  setTemplate: React.Dispatch<React.SetStateAction<TemplateKind>>
  dimensions: DimensionOptions
  setDimensions: React.Dispatch<React.SetStateAction<DimensionOptions>>
  snap: SnapState
  setSnap: React.Dispatch<React.SetStateAction<SnapState>>
  actions: EditorActions
}

const EditorStateContext = createContext<EditorStateValue | null>(null)

export const EditorStateProvider: React.FC<{ value: EditorStateValue; children: React.ReactNode }> = ({ value, children }) => {
  return (
    <EditorStateContext.Provider value={value}>{children}</EditorStateContext.Provider>
  )
}

export const useEditorState = (): EditorStateValue => {
  const ctx = useContext(EditorStateContext)
  if (!ctx) {
    throw new Error('useEditorState must be used within EditorStateProvider')
  }
  return ctx
}
