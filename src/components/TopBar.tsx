import React from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'

export const TopBar: React.FC<{ onSave: () => void; onLoad: () => void; onReset?: () => void }> = ({ onSave, onLoad, onReset }) => {
  // 日本語コメント: 上部バー。保存/読み込み＋メニュー（初期化）
  return (
    <div className="w-full h-12 bg-[var(--panel)] flex items-center justify-between px-3 border-b border-neutral-800">
      <div className="font-medium">Scaff</div>
      <div className="flex gap-2">
        {/* 日本語コメント: 保存=JSONダウンロード、読み込み=ファイル選択 */}
        <Button onClick={onSave}>保存</Button>
        <Button variant="outline" onClick={onLoad}>読み込み</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">…</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>データ</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500 focus:text-red-500"
              onClick={() => onReset?.()}
            >エディタを初期化</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default TopBar
