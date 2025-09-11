import React from 'react'
import { Button } from '@/components/ui/button'

export const TopBar: React.FC<{ onSave: () => void; onLoad: () => void }> = ({ onSave, onLoad }) => {
  // 日本語コメント: 上部バー。保存/読み込みボタンを配置（MVP初期はダミー実装）
  return (
    <div className="w-full h-12 bg-[var(--panel)] flex items-center justify-between px-3 border-b border-neutral-800">
      <div className="font-medium">Scaff</div>
      <div className="flex gap-2">
        <Button onClick={onSave}>保存</Button>
        <Button variant="outline" onClick={onLoad}>読み込み</Button>
      </div>
    </div>
  )
}

export default TopBar
