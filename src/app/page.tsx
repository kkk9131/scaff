"use client";
import React, { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import PreviewOverlay from '@/components/PreviewOverlay'
import Sidebar, { ViewMode } from '@/components/Sidebar'
import CanvasArea from '@/components/CanvasArea'
import ElevationView from '@/components/ElevationView'
import { createFloor, duplicateFloor, FloorState, randomId, nextFloorName, cloneShape, createDefaultShape } from '@/core/floors'
import { pickFloorColorsByName } from '@/ui/palette'
import type { TemplateKind } from '@/core/model'
import Wireframe3D from '@/components/Wireframe3D'
import { SNAP_DEFAULTS } from '@/core/snap'
import { downloadJson, loadFromLocalStorage, parseSaveData, saveToLocalStorage, serializeSaveData, clearLocalStorage, persistFloorToState } from '@/io/persist'
import type { RoofUnit } from '@/core/roofing'
// 下屋の自動抽出は非採用（将来拡張）

export default function Page() {
  // 日本語コメント: フェーズ1のUI骨格（上部バー＋左サイドバー＋中央キャンバス）
  const [expanded, setExpanded] = useState(true)
  const [view, setView] = useState<ViewMode>('plan')
  const [template, setTemplate] = useState<TemplateKind>('rect')
  // 日本語コメント: 完全初期化時に再マウントを強制するためのキー
  const [resetKey, setResetKey] = useState(0)
  // 日本語コメント: 階層管理（将来3D化に備える）。初期は1Fのみ。
  const [floors, setFloors] = useState<FloorState[]>([(() => {
    const f = createFloor({ index: 1 })
    f.color = pickFloorColorsByName(f.name, 0)
    return f
  })()])
  const [activeFloorId, setActiveFloorId] = useState<string>(floors[0].id)
  const DEFAULT_DIMENSIONS = {
    show: true as boolean,
    outsideMode: 'auto' as 'auto' | 'left' | 'right',
    offset: 16 as number,
    offsetUnit: 'px' as 'px' | 'mm',
    decimals: 0 as number,
    avoidCollision: true as boolean,
  }
  const [dimensions, setDimensions] = useState({ ...DEFAULT_DIMENSIONS })
  // const [eaves, setEaves] = useState({ enabled: false as boolean, amountMm: 600 as number, perEdge: {} as Record<number, number> }) // 階層別管理に移行
  const initialSnap = () => ({
    enableGrid: SNAP_DEFAULTS.enableGrid,
    gridMm: SNAP_DEFAULTS.gridMm,
    enableOrtho: SNAP_DEFAULTS.enableOrtho,
    orthoToleranceDeg: SNAP_DEFAULTS.orthoToleranceDeg,
  })
  const [snap, setSnap] = useState(initialSnap())
  // 日本語コメント: プレビュー表示状態
  const [previewOpen, setPreviewOpen] = useState(false)
  // 日本語コメント: 保存（JSONダウンロード）/ 読み込み（ファイル選択）
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const onSave = () => {
    const text = serializeSaveData(floors, activeFloorId)
    const ts = new Date()
    const pad = (n:number)=> String(n).padStart(2,'0')
    const name = `scaff-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}.json`
    downloadJson(name, text)
  }
  const onLoad = () => {
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    fileInputRef.current.click()
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

  // 日本語コメント: 起動時にローカルストレージから復元
  useEffect(() => {
    const saved = loadFromLocalStorage()
    if (saved && saved.floors?.length) {
      try {
        const restored = saved.floors.map(pf => persistFloorToState(pf))
        setFloors(restored)
        if (saved.activeFloorId && restored.some(f => f.id === saved.activeFloorId)) {
          setActiveFloorId(saved.activeFloorId)
        } else {
          setActiveFloorId(restored[0].id)
        }
      } catch (e) {
        console.warn('ローカル保存の復元に失敗しました', e)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 日本語コメント: 変更をローカルストレージに保存（簡易デバウンス）
  useEffect(() => {
    const h = setTimeout(() => saveToLocalStorage(floors, activeFloorId), 300)
    return () => clearTimeout(h)
  }, [floors, activeFloorId])

  // 日本語コメント: フロア操作（追加/削除/複製/リネーム/高さ編集/表示/ロック）
  const addFloorAboveActive = () => {
    setFloors(prev => {
      const idx = prev.findIndex(f => f.id === activeFloorId)
      const below = prev[idx] ?? null
      // 形状は必ずディープコピーして独立編集できるようにする
      const shapeCopy = below?.shape ? cloneShape(below.shape) : undefined
      const next = createFloor({ index: prev.length + 1, below, shape: shapeCopy as any })
      next.color = pickFloorColorsByName(next.name, prev.length)
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
      dup.color = pickFloorColorsByName(dup.name, prev.length)
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
    if (cur != null) {
      const nextName = cur || target?.name || ''
      const order = floors.findIndex(f => f.id === id)
      const nextColor = pickFloorColorsByName(nextName, order >= 0 ? order : 0)
      patchFloor(id, { name: nextName, color: nextColor })
    }
  }

  // 日本語コメント: エディタ初期化（確認ダイアログ→状態リセット→LS消去）
  const resetEditor = () => {
    if (!confirm('エディタを初期化します。現在の作業内容は失われます。よろしいですか？')) return
    // まずLSを消去し、その後に初期状態を書き戻す
    clearLocalStorage()
    const f = createFloor({ index: 1 })
    f.color = pickFloorColorsByName(f.name, 0)
    setExpanded(true)
    setView('plan')
    setTemplate('rect')
    setDimensions({ ...DEFAULT_DIMENSIONS })
    setSnap(initialSnap())
    setFloors([f])
    setActiveFloorId(f.id)
    setResetKey(k => k + 1) // 子コンポーネントを再マウントして内部状態（ズーム/パン等）も初期化
  }

  // 日本語コメント: アクティブ階変更時にテンプレート種別を同期
  useEffect(() => {
    const f = floors.find(x => x.id === activeFloorId)
    if (f) setTemplate(f.shape.kind)
  }, [activeFloorId, floors])

  return (
    <div className="h-dvh flex flex-col">
      <TopBar onSave={onSave} onLoad={onLoad} onPreview={() => setPreviewOpen(true)} onReset={resetEditor} />
      {/* 日本語コメント: 読み込み用の非表示ファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          try {
            const text = await file.text()
            const data = parseSaveData(text)
            const restored = data.floors.map(pf => persistFloorToState(pf))
            setFloors(restored)
            if (data.activeFloorId && restored.some(f => f.id === data.activeFloorId)) {
              setActiveFloorId(data.activeFloorId)
            } else {
              setActiveFloorId(restored[0].id)
            }
          } catch (err:any) {
            alert(`読み込みに失敗しました: ${err?.message ?? err}`)
          }
        }}
      />
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
                shape: createDefaultShape(k),
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
            // 日本語コメント: 屋根（統合）
            roof={(() => {
              const act = floors.find(f => f.id === activeFloorId)
              const ru = act?.roofUnits?.find(u => u.footprint?.kind === 'outer')
              if (!ru) return { enabled: false, type: 'flat' as const, parapetHeightMm: 150, ridgeAxis: 'NS' as const, monoDownhill: 'E' as const, pitchSun: 3, apexHeightMm: 0 }
              return {
                enabled: true,
                type: ru.type,
                parapetHeightMm: ru.parapetHeightMm,
                pitchSun: ru.pitchSun,
                ridgeAxis: ru.ridgeAxis as any,
                monoDownhill: ru.monoDownhill as any,
                apexHeightMm: ru.apexHeightMm,
                excludeUpperShadows: ru.excludeUpperShadows ?? true,
              }
            })()}
            onUpdateRoof={(patch) => setFloors(prev => prev.map(f => {
              if (f.id !== activeFloorId) return f
              const units = Array.isArray(f.roofUnits) ? [...f.roofUnits] as RoofUnit[] : []
              const idx = units.findIndex(u => u.footprint?.kind === 'outer')
              const cur = idx >= 0 ? units[idx] : null
              const enabled = patch.enabled ?? (cur != null)
              if (!enabled) {
                if (idx >= 0) units.splice(idx, 1)
                return { ...f, roofUnits: units }
              }
              const nextType = (patch.type ?? cur?.type ?? 'flat') as RoofUnit['type']
              const base: RoofUnit = cur ?? {
                id: 'roof_' + Math.random().toString(36).slice(2, 8),
                type: nextType,
                footprint: { kind: 'outer' },
                excludeUpperShadows: cur?.excludeUpperShadows ?? true,
              }
              base.type = nextType
              // 共通/個別プロパティを更新
              if (nextType === 'flat') {
                base.parapetHeightMm = patch.parapetHeightMm ?? base.parapetHeightMm ?? 150
              }
              if (nextType === 'gable') {
                base.pitchSun = patch.pitchSun ?? base.pitchSun ?? 4
                base.ridgeAxis = (patch.ridgeAxis ?? base.ridgeAxis ?? 'NS') as any
              }
              if (nextType === 'hip') {
                base.mode = 'byApex'
                base.apexHeightMm = patch.apexHeightMm ?? base.apexHeightMm ?? 0
                base.pitchSun = patch.pitchSun ?? base.pitchSun ?? 4
                base.ridgeAxis = (patch.ridgeAxis ?? base.ridgeAxis ?? 'NS') as any
              }
              if (nextType === 'mono') {
                base.pitchSun = patch.pitchSun ?? base.pitchSun ?? 3
                base.monoDownhill = (patch.monoDownhill ?? base.monoDownhill ?? 'E') as any
                base.apexHeightMm = patch.apexHeightMm ?? base.apexHeightMm ?? 0
              }
              if (typeof patch.excludeUpperShadows === 'boolean') {
                base.excludeUpperShadows = patch.excludeUpperShadows
              }
              if (idx >= 0) units[idx] = base; else units.push(base)
              return { ...f, roofUnits: units }
            }))}
          />
        <main className="flex-1">
          {view === 'plan' && (
            <CanvasArea
              key={resetKey}
              template={template}
              floors={floors}
              activeFloorId={activeFloorId}
              activeShape={floors.find(f => f.id === activeFloorId)?.shape as any}
              onUpdateActiveFloorShape={(id, shape) => setFloors(prev => prev.map(f => f.id === id ? { ...f, shape: shape as any } : f))}
              snapOptions={{ ...snap, anchor: { x: 0, y: 0 } }}
              dimensionOptions={dimensions}
              eavesOptions={floors.find(f => f.id === activeFloorId)?.eaves}
              onUpdateEaves={(id, patch) => setFloors(prev => prev.map(f => f.id === id ? { ...f, eaves: { ...(f.eaves ?? { enabled:false, amountMm:600, perEdge:{} }), ...patch } } : f))}
            />
          )}
          {view === 'elev' && (
            <ElevationView floors={floors.filter(f => f.visible)} />
          )}
          {view === '3d' && <Wireframe3D floors={floors.filter(f => f.visible)} />}
        </main>
      </div>
      {previewOpen && (
        <PreviewOverlay floors={floors} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  )
}
