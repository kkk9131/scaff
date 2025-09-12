import React, { useState } from 'react'
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
}> = ({ expanded, onToggle, onSelectView, current = 'plan', onSelectTemplate, currentTemplate = 'rect', snap, onUpdateSnap }) => {
  // 日本語コメント: 左サイドバー。セクションごとに開閉トグルを持つ（デフォルト閉）
  const [openView, setOpenView] = useState(false)
  const [openTemplate, setOpenTemplate] = useState(false)
  const [openSnap, setOpenSnap] = useState(false)
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
          <span>{openView ? '🔽' : '▶'}</span>
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
          <span>{openTemplate ? '🔽' : '▶'}</span>
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
          <span>{openSnap ? '🔽' : '▶'}</span>
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
      </div>
    </aside>
  )
}

export default Sidebar
