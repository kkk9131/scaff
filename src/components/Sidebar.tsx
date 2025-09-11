import React from 'react'

export type ViewMode = 'plan' | 'elev' | '3d'
import type { TemplateKind } from '@/core/model'

export const Sidebar: React.FC<{ expanded: boolean; onToggle: () => void; onSelectView?: (v: ViewMode) => void; current?: ViewMode; onSelectTemplate?: (t: TemplateKind) => void; currentTemplate?: TemplateKind }> = ({ expanded, onToggle, onSelectView, current = 'plan', onSelectTemplate, currentTemplate = 'rect' }) => {
  // 日本語コメント: 左サイドバー。アイコンのみ表示→展開可能（簡易版）
  return (
    <aside className={`h-full bg-[var(--panel)] border-r border-neutral-800 transition-all duration-200 ${expanded ? 'w-56' : 'w-14'}`}>
      <div className="h-12 flex items-center justify-center border-b border-neutral-800">
        <button className="px-2 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 rounded" onClick={onToggle}>
          {expanded ? '閉じる' : '展開'}
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div className="text-xs text-neutral-400">ビュー</div>
        <button className={`w-full px-2 py-1 rounded text-left ${current==='plan'?'bg-neutral-600':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onSelectView?.('plan')}>平面</button>
        <button className={`w-full px-2 py-1 rounded text-left ${current==='elev'?'bg-neutral-600':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onSelectView?.('elev')}>立面</button>
        <button className={`w-full px-2 py-1 rounded text-left ${current==='3d'?'bg-neutral-600':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onSelectView?.('3d')}>3D</button>

        <div className="h-px bg-neutral-800 my-3" />
        <div className="text-xs text-neutral-400">テンプレート</div>
        <div className="grid grid-cols-2 gap-2">
          {(['rect','l','u','t'] as TemplateKind[]).map(t => (
            <button key={t} className={`px-2 py-1 rounded text-left ${currentTemplate===t?'bg-neutral-600':'bg-neutral-700 hover:bg-neutral-600'}`} onClick={() => onSelectTemplate?.(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
