import React from 'react'

export const TopBar: React.FC<{ onSave: () => void; onLoad: () => void }> = ({ onSave, onLoad }) => {
  // 日本語コメント: 上部バー。保存/読み込みボタンを配置（MVP初期はダミー実装）
  return (
    <div className="w-full h-12 bg-[var(--panel)] flex items-center justify-between px-3 border-b border-neutral-800">
      <div className="font-medium">Scaff</div>
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" onClick={onSave}>保存</button>
        <button className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" onClick={onLoad}>読み込み</button>
      </div>
    </div>
  )
}

export default TopBar
