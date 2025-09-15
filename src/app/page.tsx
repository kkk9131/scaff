"use client";
import React, { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import Sidebar, { ViewMode } from '@/components/Sidebar'
import CanvasArea from '@/components/CanvasArea'
import { createFloor, duplicateFloor, FloorState, randomId, nextFloorName } from '@/core/floors'
import { pickFloorColors } from '@/ui/palette'
import type { TemplateKind } from '@/core/model'
import ThreePlaceholder from '@/components/ThreePlaceholder'
import { SNAP_DEFAULTS } from '@/core/snap'

export default function Page() {
  // 日本語コメント: フェーズ1のUI骨格（上部バー＋左サイドバー＋中央キャンバス）
  const [expanded, setExpanded] = useState(true)
  const [view, setView] = useState<ViewMode>('plan')
  const [template, setTemplate] = useState<TemplateKind>('rect')
  // 日本語コメント: 階層管理（将来3D化に備える）。初期は1Fのみ。
  const [floors, setFloors] = useState<FloorState[]>([(() => {
    const f = createFloor({ index: 1 })
    f.color = pickFloorColors(0)
    return f
  })()])
  const [activeFloorId, setActiveFloorId] = useState<string>(floors[0].id)
  const [dimensions, setDimensions] = useState({
    show: true as boolean,
    outsideMode: 'auto' as 'auto' | 'left' | 'right',
    offset: 16 as number,
    offsetUnit: 'px' as 'px' | 'mm',
    decimals: 0 as number,
    avoidCollision: true as boolean,
  })
  const [eaves, setEaves] = useState({ enabled: false as boolean, amountMm: 600 as number, perEdge: {} as Record<number, number> })
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
      } else if (e.key === 'PageUp') {
        // 前の階へ
        setFloors(prev => { const i = prev.findIndex(f => f.id === activeFloorId); if (i > 0) setActiveFloorId(prev[i-1].id); return prev })
      } else if (e.key === 'PageDown') {
        // 次の階へ
        setFloors(prev => { const i = prev.findIndex(f => f.id === activeFloorId); if (i >= 0 && i < prev.length - 1) setActiveFloorId(prev[i+1].id); return prev })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeFloorId, floors])

  // 日本語コメント: フロア操作（追加/削除/複製/リネーム/高さ編集/表示/ロック）
  const addFloorAboveActive = () => {
    setFloors(prev => {
      const idx = prev.findIndex(f => f.id === activeFloorId)
      const below = prev[idx] ?? null
      // 形状は必ずディープコピーして独立編集できるようにする
      const shapeCopy = below?.shape ? JSON.parse(JSON.stringify(below.shape)) : undefined
      const next = createFloor({ index: prev.length + 1, below, shape: shapeCopy as any })
      next.color = pickFloorColors(prev.length)
      const arr = [...prev]
      arr.splice(idx + 1, 0, next)
      // 追加直後にアクティブ化
      setActiveFloorId(next.id)
      return arr
    })
  }
  const duplicateActiveFloor = () => {
    setFloors(prev => {
      const i = prev.findIndex(f => f.id === activeFloorId)
      if (i < 0) return prev
      const below = prev[i]
      const name = nextFloorName(below.name)
      const dup = duplicateFloor(prev[i], { name, below, elevationMm: below.elevationMm + below.heightMm })
      dup.id = randomId()
      dup.color = pickFloorColors(prev.length)
      const arr = [...prev]
      arr.splice(i + 1, 0, dup)
      // 新規階をアクティブに
      setActiveFloorId(dup.id)
      return arr
    })
  }
  const removeActiveFloor = () => {
    setFloors(prev => {
      if (prev.length <= 1) return prev
      const i = prev.findIndex(f => f.id === activeFloorId)
      if (i < 0) return prev
      const arr = prev.filter((_, idx) => idx !== i)
      setActiveFloorId(arr[Math.max(0, i - 1)].id)
      return arr
    })
  }
  const patchFloor = (id: string, patch: Partial<FloorState>) => {
    setFloors(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))
  }
  const renameFloor = (id: string) => {
    const target = floors.find(f => f.id === id)
    const cur = prompt('フロア名', target?.name ?? '')
    if (cur != null) patchFloor(id, { name: cur || target?.name || '' })
  }

  // 日本語コメント: アクティブ階変更時にテンプレート種別を同期
  useEffect(() => {
    const f = floors.find(x => x.id === activeFloorId)
    if (f) setTemplate(f.shape.kind)
  }, [activeFloorId])

  return (
    <div className="h-dvh flex flex-col">
      <TopBar onSave={onSave} onLoad={onLoad} />
      <div className="flex flex-1 overflow-hidden">
          <Sidebar
            expanded={expanded}
            current={view}
            onSelectView={setView}
            onToggle={() => setExpanded(v => !v)}
            onSelectTemplate={(k) => {
              setTemplate(k)
              // アクティブ階の形状種別を切り替え（既定パラメータに初期化）
              setFloors(prev => prev.map(f => f.id === activeFloorId ? {
                ...f,
                shape: k==='rect' ? { kind:'rect', data: { widthMm: 8000, heightMm: 6000 } } as any
                  : k==='l' ? { kind:'l', data: { widthMm: 8000, heightMm: 6000, cutWidthMm: 3000, cutHeightMm: 3000 } } as any
                  : k==='u' ? { kind:'u', data: { widthMm: 9000, heightMm: 6000, innerWidthMm: 4000, depthMm: 3000 } } as any
                  : { kind:'t', data: { barWidthMm: 9000, barThickMm: 2000, stemWidthMm: 2000, stemHeightMm: 6000 } } as any
              } : f))
            }}
            currentTemplate={template}
            floors={floors}
            activeFloorId={activeFloorId}
            onSelectFloor={setActiveFloorId}
            onAddFloor={addFloorAboveActive}
            onDuplicateFloor={duplicateActiveFloor}
            onRemoveFloor={removeActiveFloor}
            onPatchFloor={patchFloor}
            onRenameFloor={renameFloor}
            snap={snap}
          onUpdateSnap={(patch) => setSnap(s => ({ ...s, ...patch }))}
            dimensions={dimensions}
            onUpdateDimensions={(patch) => setDimensions(d => ({ ...d, ...patch }))}
            // 日本語コメント: 軒の出はフロアごと。サイドバー操作はアクティブ階に反映
            eaves={floors.find(f => f.id === activeFloorId)?.eaves}
            onUpdateEaves={(patch) => setFloors(prev => prev.map(f => f.id === activeFloorId ? { ...f, eaves: { ...(f.eaves ?? { enabled:false, amountMm:600, perEdge:{} }), ...patch } } : f))}
          />
        <main className="flex-1">
          {view === '3d' ? <ThreePlaceholder /> : (
            <CanvasArea
              template={template}
              floors={floors}
              activeFloorId={activeFloorId}
              activeShape={floors.find(f => f.id === activeFloorId)?.shape as any}
              onUpdateActiveFloorShape={(id, shape) => setFloors(prev => prev.map(f => f.id === id ? { ...f, shape: shape as any } : f))}
              snapOptions={{ ...snap, anchor: { x: 0, y: 0 } }}
              dimensionOptions={dimensions}
              eavesOptions={floors.find(f => f.id === activeFloorId)?.eaves}
              onUpdateEaves={(patch) => setFloors(prev => prev.map(f => f.id === activeFloorId ? { ...f, eaves: { ...(f.eaves ?? { enabled:false, amountMm:600, perEdge:{} }), ...patch } } : f))}
            />
          )}
        </main>
      </div>
    </div>
  )
}
