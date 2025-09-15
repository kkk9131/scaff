import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { SnapOptions } from '@/core/snap'

export type ViewMode = 'plan' | 'elev' | '3d'
import type { TemplateKind } from '@/core/model'

export const Sidebar: React.FC<{
  expanded: boolean
  onToggle: () => void
  onSelectView?: (v: ViewMode) => void
  current?: ViewMode
  onSelectTemplate?: (t: TemplateKind) => void
  currentTemplate?: TemplateKind
  snap?: Pick<SnapOptions, 'enableGrid' | 'gridMm' | 'enableOrtho' | 'orthoToleranceDeg'>
  onUpdateSnap?: (patch: Partial<Pick<SnapOptions, 'enableGrid' | 'gridMm' | 'enableOrtho' | 'orthoToleranceDeg'>>) => void
  dimensions?: { show: boolean; outsideMode: 'auto'|'left'|'right'; offset: number; offsetUnit: 'px'|'mm'; decimals: number; avoidCollision: boolean }
  onUpdateDimensions?: (patch: Partial<{ show: boolean; outsideMode: 'auto'|'left'|'right'; offset: number; offsetUnit: 'px'|'mm'; decimals: number; avoidCollision: boolean }>) => void
  eaves?: { enabled: boolean; amountMm: number; perEdge?: Record<number, number> }
  onUpdateEaves?: (patch: Partial<{ enabled: boolean; amountMm: number; perEdge: Record<number, number> }>) => void
  layers?: { [k in 'grid'|'guides'|'walls'|'eaves'|'dims']: { visible: boolean; locked: boolean } }
  onUpdateLayers?: (id: 'grid'|'guides'|'walls'|'eaves'|'dims', patch: Partial<{ visible: boolean; locked: boolean }>) => void
  // フロア（階層）管理の最小UI
  floors?: { id: string; name: string; heightMm: number }[]
  activeFloorId?: string
  onSelectFloor?: (id: string) => void
  onAddFloor?: () => void
  onDeleteFloor?: (id: string) => void
  onDuplicateFloor?: (id: string) => void
  onUpdateFloor?: (id: string, patch: Partial<{ name: string; heightMm: number }>) => void
}> = ({ expanded, onToggle, onSelectView, current = 'plan', onSelectTemplate, currentTemplate = 'rect', snap, onUpdateSnap, dimensions, onUpdateDimensions, eaves, onUpdateEaves, layers, onUpdateLayers, floors = [{ id: 'f1', name: '1F', heightMm: 2800 }, { id: 'roof', name: '屋根', heightMm: 2800 }], activeFloorId, onSelectFloor, onAddFloor, onDeleteFloor, onDuplicateFloor, onUpdateFloor }) => {
  // 日本語コメント: 左サイドバー。セクションごとに開閉トグルを持つ（デフォルト閉）
  const [openView, setOpenView] = useState(false)
  const [openTemplate, setOpenTemplate] = useState(false)
  const [openSnap, setOpenSnap] = useState(false)
  const [openDims, setOpenDims] = useState(false)
  const [openEaves, setOpenEaves] = useState(false)
  const [openLayers, setOpenLayers] = useState(false)
  const [openFloors, setOpenFloors] = useState(true)
  return (
    <aside className={`h-full bg-[var(--panel)] border-r border-neutral-800 transition-all duration-200 ${expanded ? 'w-56' : 'w-14'}`}>
      <div className="h-12 flex items-center justify-center border-b border-neutral-800">
        <button className="px-2 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 rounded" onClick={onToggle}>
          {expanded ? '閉じる' : '展開'}
        </button>
      </div>
      <div className="p-3 space-y-3">
        {/* ビュー */}
        <button
          className="w-full text-xs text-neutral-300 flex items-center justify-between bg-neutral-800/40 hover:bg-neutral-700/50 rounded px-2 py-1"
          onClick={() => setOpenView(v => !v)}
          aria-expanded={openView}
          title="ビューの開閉"
        >
          <span>ビュー</span>
          {openView ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {openView && (
          <div className="space-y-2">
            <button className={`w-full px-2 py-1 rounded text-left ${current==='plan'?'bg-neutral-600':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onSelectView?.('plan')}>平面</button>
            <button className={`w-full px-2 py-1 rounded text-left ${current==='elev'?'bg-neutral-600':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onSelectView?.('elev')}>立面</button>
            <button className={`w-full px-2 py-1 rounded text-left ${current==='3d'?'bg-neutral-600':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onSelectView?.('3d')}>3D</button>
          </div>
        )}

        {/* テンプレート */}
        <button
          className="w-full text-xs text-neutral-300 flex items-center justify-between bg-neutral-800/40 hover:bg-neutral-700/50 rounded px-2 py-1"
          onClick={() => setOpenTemplate(v => !v)}
          aria-expanded={openTemplate}
          title="テンプレートの開閉"
        >
          <span>テンプレート</span>
          {openTemplate ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {openTemplate && (
          <div className="grid grid-cols-2 gap-2">
            {(['rect','l','u','t'] as TemplateKind[]).map(t => (
              <button key={t} className={`px-2 py-1 rounded text-left ${currentTemplate===t?'bg-neutral-600':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onSelectTemplate?.(t)}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* スナップ */}
        <button
          className="w-full text-xs text-neutral-300 flex items-center justify-between bg-neutral-800/40 hover:bg-neutral-700/50 rounded px-2 py-1"
          onClick={() => setOpenSnap(v => !v)}
          aria-expanded={openSnap}
          title="スナップの開閉"
        >
          <span>スナップ</span>
          {openSnap ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {openSnap && (
          <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <label className="text-neutral-300">グリッド</label>
            <button
              className={`px-2 py-1 rounded ${snap?.enableGrid ? 'bg-green-700' : 'bg-neutral-700 hover:bg-neutral-600'}`}
              onClick={() => onUpdateSnap?.({ enableGrid: !snap?.enableGrid })}
            >{snap?.enableGrid ? 'ON' : 'OFF'}</button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-neutral-300">間隔(mm)</label>
            <input
              type="number"
              min={1}
              max={2000}
              className="w-24 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-right"
              value={snap?.gridMm ?? 50}
              onChange={(e) => {
                const v = Math.max(1, Math.min(2000, Math.round(Number(e.target.value) || 0)))
                onUpdateSnap?.({ gridMm: v })
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300">直角</label>
            <button
              className={`px-2 py-1 rounded ${snap?.enableOrtho ? 'bg-green-700' : 'bg-neutral-700 hover:bg-neutral-600'}`}
              onClick={() => onUpdateSnap?.({ enableOrtho: !snap?.enableOrtho })}
            >{snap?.enableOrtho ? 'ON' : 'OFF'}</button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-neutral-300">許容角(°)</label>
            <input
              type="number"
              min={0}
              max={45}
              step={0.5}
              className="w-24 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-right"
              value={snap?.orthoToleranceDeg ?? 7.5}
              onChange={(e) => {
                const num = Number(e.target.value)
                const v = isNaN(num) ? 0 : Math.max(0, Math.min(45, num))
                onUpdateSnap?.({ orthoToleranceDeg: v })
              }}
            />
          </div>
          <div className="text-[11px] text-neutral-400 pt-1">
            ショートカット: g=グリッド切替, o=直角切替
          </div>
          </div>
        )}

        {/* 寸法 */}
        <button
          className="w-full text-xs text-neutral-300 flex items-center justify-between bg-neutral-800/40 hover:bg-neutral-700/50 rounded px-2 py-1"
          onClick={() => setOpenDims(v => !v)}
          aria-expanded={openDims}
          title="寸法の開閉"
        >
          <span>寸法</span>
          {openDims ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {openDims && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <label className="text-neutral-300">表示</label>
              <button
                className={`px-2 py-1 rounded ${dimensions?.show ? 'bg-green-700' : 'bg-neutral-700 hover:bg-neutral-600'}`}
                onClick={() => onUpdateDimensions?.({ show: !dimensions?.show })}
              >{dimensions?.show ? 'ON' : 'OFF'}</button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-neutral-300">外側</label>
              <select
                className="w-24 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded"
                value={dimensions?.outsideMode ?? 'auto'}
                onChange={(e) => onUpdateDimensions?.({ outsideMode: (e.target.value as any) })}
              >
                <option value="auto">自動</option>
                <option value="left">左法線</option>
                <option value="right">右法線</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-neutral-300">オフセット</label>
              <input
                type="number"
                min={0}
                max={200}
                className="w-24 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-right"
                value={dimensions?.offset ?? 16}
                onChange={(e) => {
                  const num = Number(e.target.value); const v = isNaN(num) ? 0 : Math.max(0, Math.min(200, Math.round(num)))
                  onUpdateDimensions?.({ offset: v })
                }}
              />
              <select
                className="w-20 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded"
                value={dimensions?.offsetUnit ?? 'px'}
                onChange={(e) => onUpdateDimensions?.({ offsetUnit: (e.target.value as any) })}
              >
                <option value="px">px</option>
                <option value="mm">mm</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-neutral-300">小数桁</label>
              <input
                type="number"
                min={0}
                max={2}
                className="w-24 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-right"
                value={dimensions?.decimals ?? 0}
                onChange={(e) => {
                  const num = Number(e.target.value); const v = isNaN(num) ? 0 : Math.max(0, Math.min(2, Math.round(num)))
                  onUpdateDimensions?.({ decimals: v })
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-neutral-300">ラベル回避</label>
              <button
                className={`px-2 py-1 rounded ${dimensions?.avoidCollision ? 'bg-green-700' : 'bg-neutral-700 hover:bg-neutral-600'}`}
                onClick={() => onUpdateDimensions?.({ avoidCollision: !dimensions?.avoidCollision })}
              >{dimensions?.avoidCollision ? 'ON' : 'OFF'}</button>
            </div>
          </div>
        )}

        {/* 軒の出 */}
        <button
          className="w-full text-xs text-neutral-300 flex items-center justify-between bg-neutral-800/40 hover:bg-neutral-700/50 rounded px-2 py-1"
          onClick={() => setOpenEaves(v => !v)}
          aria-expanded={openEaves}
          title="軒の出の開閉"
        >
          <span>軒の出</span>
          {openEaves ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {openEaves && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <label className="text-neutral-300">有効</label>
              <button
                className={`px-2 py-1 rounded ${eaves?.enabled ? 'bg-green-700' : 'bg-neutral-700 hover:bg-neutral-600'}`}
                onClick={() => onUpdateEaves?.({ enabled: !eaves?.enabled })}
              >{eaves?.enabled ? 'ON' : 'OFF'}</button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-neutral-300">出幅(mm)</label>
              <input
                type="number"
                min={0}
                max={3000}
                className="w-28 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-right"
                value={eaves?.amountMm ?? 600}
                onChange={(e) => {
                  const num = Number(e.target.value); const v = isNaN(num) ? 0 : Math.max(0, Math.min(3000, Math.round(num)))
                  onUpdateEaves?.({ amountMm: v })
                }}
              />
            </div>
            <div className="text-[11px] text-neutral-400 pt-1">辺クリックで個別編集（mm）</div>
          </div>
        )}

        {/* レイヤー */}
        <button
          className="w-full text-xs text-neutral-300 flex items-center justify-between bg-neutral-800/40 hover:bg-neutral-700/50 rounded px-2 py-1"
          onClick={() => setOpenLayers(v => !v)}
          aria-expanded={openLayers}
          title="レイヤーの開閉"
        >
          <span>レイヤー</span>
          {openLayers ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {openLayers && (
          <div className="space-y-2 text-sm">
            {([
              { id: 'grid',   label: 'グリッド' },
              { id: 'guides', label: 'ガイド' },
              { id: 'walls',  label: '壁' },
              { id: 'eaves',  label: '軒の出' },
              { id: 'dims',   label: '寸法' },
            ] as { id: 'grid'|'guides'|'walls'|'eaves'|'dims'; label: string }[]).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-2">
                <label className="text-neutral-300">{row.label}</label>
                <div className="flex items-center gap-2">
                  <button
                    className={`px-2 py-1 rounded ${layers?.[row.id].visible ? 'bg-green-700' : 'bg-neutral-700 hover:bg-neutral-600'}`}
                    onClick={() => onUpdateLayers?.(row.id, { visible: !layers?.[row.id].visible })}
                    title="表示ON/OFF"
                  >{layers?.[row.id].visible ? '表示' : '非表示'}</button>
                  <button
                    className={`px-2 py-1 rounded ${layers?.[row.id].locked ? 'bg-red-700' : 'bg-neutral-700 hover:bg-neutral-600'}`}
                    onClick={() => onUpdateLayers?.(row.id, { locked: !layers?.[row.id].locked })}
                    title="ロックON/OFF"
                  >{layers?.[row.id].locked ? 'ロック' : '編集可'}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 階層（フロア） */}
        <button
          className="w-full text-xs text-neutral-300 flex items-center justify-between bg-neutral-800/40 hover:bg-neutral-700/50 rounded px-2 py-1"
          onClick={() => setOpenFloors(v => !v)}
          aria-expanded={openFloors}
          title="階層の開閉"
        >
          <span>階層</span>
          {openFloors ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {openFloors && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <label className="text-neutral-300">選択</label>
              <select
                className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded"
                value={activeFloorId ?? floors[0]?.id}
                onChange={(e) => onSelectFloor?.(e.target.value)}
              >
                {floors.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600" onClick={() => onAddFloor?.()} title="階層を追加">追加</button>
                <button className="px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600" onClick={() => activeFloorId && onDuplicateFloor?.(activeFloorId)} title="選択階層を複製">複製</button>
                <button className="px-2 py-1 rounded bg-red-700 hover:bg-red-600" onClick={() => activeFloorId && onDeleteFloor?.(activeFloorId)} title="選択階層を削除">削除</button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-neutral-300">高さ(mm)</label>
              <input
                type="number"
                min={1}
                max={10000}
                className="w-28 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-right"
                value={(floors.find(f => f.id === (activeFloorId ?? floors[0]?.id))?.heightMm) ?? 2800}
                onChange={(e) => {
                  const num = Number(e.target.value); const v = isNaN(num) ? 0 : Math.max(1, Math.min(10000, Math.round(num)))
                  const id = activeFloorId ?? floors[0]?.id
                  if (id) onUpdateFloor?.(id, { heightMm: v })
                }}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
