"use client";
import React, { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import Sidebar, { ViewMode } from '@/components/Sidebar'
import CanvasArea from '@/components/CanvasArea'
import type { TemplateKind } from '@/core/model'
import { INITIAL_L, INITIAL_RECT, INITIAL_T, INITIAL_U } from '@/core/model'
import ThreePlaceholder from '@/components/ThreePlaceholder'
import { SNAP_DEFAULTS } from '@/core/snap'

export default function Page() {
  // 日本語コメント: フェーズ1のUI骨格（上部バー＋左サイドバー＋中央キャンバス）
  const [expanded, setExpanded] = useState(true)
  const [view, setView] = useState<ViewMode>('plan')
  const [template, setTemplate] = useState<TemplateKind>('rect')
  const [dimensions, setDimensions] = useState({
    show: true as boolean,
    outsideMode: 'auto' as 'auto' | 'left' | 'right',
    offset: 16 as number,
    offsetUnit: 'px' as 'px' | 'mm',
    decimals: 0 as number,
    avoidCollision: true as boolean,
  })
  const [eaves, setEaves] = useState({ enabled: false as boolean, amountMm: 600 as number, perEdge: {} as Record<number, number> })
  // 日本語コメント: レイヤー状態（表示/ロック）。既定は全て表示・ロックなし。
  const [layers, setLayers] = useState({
    grid:   { visible: true, locked: false },
    guides: { visible: true, locked: false },
    walls:  { visible: true, locked: false },
    eaves:  { visible: true, locked: false },
    dims:   { visible: true, locked: false },
  })
  // 日本語コメント: フロア（階層）管理の最小状態。既定は 1F のみ。
  type FloorData = { id: string; name: string; heightMm: number; template?: TemplateKind; walls?: any; eaves?: { enabled: boolean; amountMm: number; perEdge?: Record<number, number> } }
  const [floors, setFloors] = useState<FloorData[]>([
    { id: 'f1', name: '1F', heightMm: 2800, template: 'rect', walls: INITIAL_RECT, eaves: { enabled: false, amountMm: 600, perEdge: {} } },
    { id: 'roof', name: '屋根', heightMm: 2800, template: 'rect', walls: INITIAL_RECT, eaves: { enabled: false, amountMm: 600, perEdge: {} } }
  ])
  const [activeFloorId, setActiveFloorId] = useState<string>('f1')
  // 日本語コメント: Canvas からの最新スナップショットを保持（複製に使用）
  const [currentSnap, setCurrentSnap] = useState<{ template: TemplateKind; rect?: typeof INITIAL_RECT; l?: typeof INITIAL_L; u?: typeof INITIAL_U; t?: typeof INITIAL_T; eaves?: { enabled: boolean; amountMm: number; perEdge?: Record<number, number> } } | null>(null)
  const addFloor = () => {
    const nextIdx = floors.length + 1
    const id = `f${nextIdx}`
    const name = `${nextIdx}F`
    const base = floors.find(f => f.id === activeFloorId) ?? floors[floors.length - 1]
    const heightMm = base?.heightMm ?? 2800
    setFloors(fs => [...fs, { id, name, heightMm }])
    setActiveFloorId(id)
  }
  const deleteFloor = (id: string) => {
    if (floors.length <= 1) return alert('少なくとも1つの階層が必要です')
    setFloors(fs => fs.filter(f => f.id !== id))
    if (activeFloorId === id) {
      const remain = floors.filter(f => f.id !== id)
      setActiveFloorId(remain[0]?.id ?? 'f1')
    }
  }
  const duplicateFloor = (id: string) => {
    const idx = floors.findIndex(f => f.id === id)
    if (idx < 0) return
    const src = floors[idx]
    // 現在の編集内容をアクティブ階に反映
    const snap = currentSnap
    let updated: FloorData = src
    if (snap) {
      updated = { ...src, template: snap.template, walls: snap.rect ?? snap.l ?? snap.u ?? snap.t ?? src.walls, eaves: snap.eaves ?? src.eaves }
    }
    // 次の階番号を決定（名称末尾の数字+1を優先）
    const m = /^([0-9]+)F$/.exec(src.name)
    const nextNum = m ? (parseInt(m[1], 10) + 1) : (floors.filter(f => /F$/.test(f.name)).length + 1)
    const newId = `f${nextNum}`
    const name = `${nextNum}F`
    const newFloor: FloorData = {
      id: newId,
      name,
      heightMm: src.heightMm,
      template: updated.template ?? 'rect',
      walls: updated.walls ?? INITIAL_RECT,
      eaves: updated.eaves ?? { enabled: false, amountMm: 600, perEdge: {} },
    }
    setFloors(fs => fs.map((f, i) => (i === idx ? updated : f)).concat(newFloor))
    setActiveFloorId(newId)
  }
  const updateFloor = (id: string, patch: Partial<{ name: string; heightMm: number }>) => {
    setFloors(fs => fs.map(f => f.id === id ? { ...f, ...patch } : f))
  }
  const [snap, setSnap] = useState({
    enableGrid: SNAP_DEFAULTS.enableGrid,
    gridMm: SNAP_DEFAULTS.gridMm,
    enableOrtho: SNAP_DEFAULTS.enableOrtho,
    orthoToleranceDeg: SNAP_DEFAULTS.orthoToleranceDeg,
  })
  const onSave = () => {
    // 日本語コメント: 保存（ダミー）
    alert('保存（ダミー）')
  }
  const onLoad = () => {
    // 日本語コメント: 読み込み（ダミー）
    alert('読み込み（ダミー）')
  }
  // 日本語コメント: ショートカット登録（g: グリッド切替, o: 直角切替）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        setSnap(s => ({ ...s, enableGrid: !s.enableGrid }))
      } else if (e.key === 'o' || e.key === 'O') {
        setSnap(s => ({ ...s, enableOrtho: !s.enableOrtho }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="h-dvh flex flex-col">
      <TopBar onSave={onSave} onLoad={onLoad} />
      <div className="flex flex-1 overflow-hidden">
          <Sidebar
            expanded={expanded}
            current={view}
            onSelectView={setView}
            onToggle={() => setExpanded(v => !v)}
            onSelectTemplate={setTemplate}
            currentTemplate={template}
            snap={snap}
          onUpdateSnap={(patch) => setSnap(s => ({ ...s, ...patch }))}
          dimensions={dimensions}
          onUpdateDimensions={(patch) => setDimensions(d => ({ ...d, ...patch }))}
          eaves={eaves}
          onUpdateEaves={(patch) => setEaves(s => ({ ...s, ...patch }))}
          layers={layers}
          onUpdateLayers={(id, patch) => setLayers(ls => ({ ...ls, [id]: { ...ls[id as keyof typeof ls], ...patch } }))}
          floors={floors}
          activeFloorId={activeFloorId}
          onSelectFloor={setActiveFloorId}
          onAddFloor={addFloor}
          onDeleteFloor={deleteFloor}
          onDuplicateFloor={duplicateFloor}
          onUpdateFloor={updateFloor}
        />
        <main className="flex-1">
          {view === '3d' ? <ThreePlaceholder /> : (
            <CanvasArea
              template={template}
              snapOptions={{ ...snap, anchor: { x: 0, y: 0 } }}
              dimensionOptions={dimensions}
              eavesOptions={eaves}
              layers={layers}
              onSnapshot={(snap) => setCurrentSnap(snap)}
              // 未来対応: floors/activeFloorId を渡してアクティブ階のみ編集、他階は半透明表示にする
            onUpdateEaves={(patch) => setEaves(s => ({ ...s, ...patch }))}
          />
          )}
        </main>
      </div>
    </div>
  )
}
