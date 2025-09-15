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
  // 階層管理UI
  floors?: Array<{ id: string; name: string; elevationMm: number; heightMm: number; visible: boolean; locked: boolean; color?: { walls?: string; eaves?: string } }>
  activeFloorId?: string
  onSelectFloor?: (id: string) => void
  onAddFloor?: () => void
  onDuplicateFloor?: () => void
  onRemoveFloor?: () => void
  onPatchFloor?: (id: string, patch: Partial<{ name: string; elevationMm: number; heightMm: number; visible: boolean; locked: boolean }>) => void
  onRenameFloor?: (id: string) => void
  snap?: Pick<SnapOptions, 'enableGrid' | 'gridMm' | 'enableOrtho' | 'orthoToleranceDeg'>
  onUpdateSnap?: (patch: Partial<Pick<SnapOptions, 'enableGrid' | 'gridMm' | 'enableOrtho' | 'orthoToleranceDeg'>>) => void
  dimensions?: { show: boolean; outsideMode: 'auto'|'left'|'right'; offset: number; offsetUnit: 'px'|'mm'; decimals: number; avoidCollision: boolean }
  onUpdateDimensions?: (patch: Partial<{ show: boolean; outsideMode: 'auto'|'left'|'right'; offset: number; offsetUnit: 'px'|'mm'; decimals: number; avoidCollision: boolean }>) => void
  eaves?: { enabled: boolean; amountMm: number; perEdge?: Record<number, number> }
  onUpdateEaves?: (patch: Partial<{ enabled: boolean; amountMm: number; perEdge: Record<number, number> }>) => void
}> = ({ expanded, onToggle, onSelectView, current = 'plan', onSelectTemplate, currentTemplate = 'rect',
  floors = [], activeFloorId, onSelectFloor, onAddFloor, onDuplicateFloor, onRemoveFloor, onPatchFloor, onRenameFloor,
  snap, onUpdateSnap, dimensions, onUpdateDimensions, eaves, onUpdateEaves }) => {
  // 日本語コメント: 左サイドバー。セクションごとに開閉トグルを持つ（デフォルト閉）
  const [openView, setOpenView] = useState(false)
  const [openTemplate, setOpenTemplate] = useState(false)
  const [openFloors, setOpenFloors] = useState(true)
  const [openSnap, setOpenSnap] = useState(false)
  const [openDims, setOpenDims] = useState(false)
  const [openEaves, setOpenEaves] = useState(false)
  return (
    <aside className={`h-full bg-[var(--panel)] border-r border-neutral-800 transition-all duration-200 ${expanded ? 'w-56' : 'w-14'}`}>
      <div className="h-12 flex items-center justify-center border-b border-neutral-800">
        <button className="px-2 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 rounded" onClick={onToggle}>
          {expanded ? '閉じる' : '展開'}
        </button>
      </div>
      <div className="p-3 space-y-3">
        {/* 階層 */}
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
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600" onClick={onAddFloor}>追加</button>
              <button className="px-2 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600" onClick={onDuplicateFloor}>複製</button>
              <button className="px-2 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600" onClick={onRemoveFloor}>削除</button>
              <div className="ml-auto flex items-center gap-1">
                <button
                  className="px-2 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600"
                  title="前の階へ"
                  onClick={() => {
                    const i = floors.findIndex(f => f.id === activeFloorId)
                    if (i > 0) onSelectFloor?.(floors[i-1].id)
                  }}
                >▲</button>
                <button
                  className="px-2 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600"
                  title="次の階へ"
                  onClick={() => {
                    const i = floors.findIndex(f => f.id === activeFloorId)
                    if (i >= 0 && i < floors.length - 1) onSelectFloor?.(floors[i+1].id)
                  }}
                >▼</button>
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-auto pr-1">
              {floors.map(f => (
                <div key={f.id} className={`p-2 rounded border ${activeFloorId===f.id?'border-blue-500 bg-neutral-700/40':'border-neutral-700 bg-neutral-800/40'}`}>
                  <div className="flex items-center gap-1 text-sm">
                    <button className={`px-1 rounded ${f.visible?'bg-green-700':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onPatchFloor?.(f.id, { visible: !f.visible })} title="表示切替">{f.visible ? '👁' : '🚫'}</button>
                    <button className={`px-1 rounded ${f.locked?'bg-red-700':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onPatchFloor?.(f.id, { locked: !f.locked })} title={f.locked?'ロック解除':'ロック'}>{f.locked ? '🔒' : '🔓'}</button>
                    <button className={`flex-1 text-left px-2 py-0.5 rounded ${activeFloorId===f.id?'bg-neutral-600':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onSelectFloor?.(f.id)} title="アクティブにする">{activeFloorId===f.id?'●':'○'} {f.name}</button>
                    <button className="px-1 rounded bg-neutral-700 hover:bg-neutral-600" onClick={() => onRenameFloor?.(f.id)}>改名</button>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-neutral-300">
                    <div className="flex items-center gap-1" title="床レベルZ（1Fは0mm想定）">
                      <span>床Z</span>
                      <div className="ml-auto flex items-center gap-1">
                        <input className="w-24 px-1 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-right" type="number" step={50} value={f.elevationMm}
                          onChange={(e)=> onPatchFloor?.(f.id, { elevationMm: Number(e.target.value) || 0 })} />
                        <span>mm</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" title="階高（床Zから天井まで）">
                      <span>階高</span>
                      <div className="ml-auto flex items-center gap-1">
                        <input className="w-24 px-1 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-right" type="number" min={1} step={50} value={f.heightMm}
                          onChange={(e)=> onPatchFloor?.(f.id, { heightMm: Math.max(1, Number(e.target.value)||0) })} />
                        <span>mm</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1">PgUp/PgDnで階切替、非アクティブ階は半透明表示</div>
                  {/* 軒の出の編集はアクティブ階のみ（キャンバス上の辺クリック）に限定 */}
                </div>
              ))}
            </div>
          </div>
        )}
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

        {/* データセクションはMVPでは上部バーに集約 */}
      </div>
    </aside>
  )
}

export default Sidebar
