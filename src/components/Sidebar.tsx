import React from 'react'

export const Sidebar: React.FC<{ expanded: boolean; onToggle: () => void }> = ({ expanded, onToggle }) => {
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
        <button className="w-full px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-left">平面</button>
        <button className="w-full px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-left">立面</button>
        <button className="w-full px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-left">3D</button>
      </div>
    </aside>
  )
}

export default Sidebar
