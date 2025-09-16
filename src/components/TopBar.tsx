import React from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Save, Upload, Eye, MoreHorizontal } from 'lucide-react'

export const TopBar: React.FC<{ onSave: () => void; onLoad: () => void; onPreview?: () => void; onReset?: () => void }> = ({ onSave, onLoad, onPreview, onReset }) => {
  // 日本語コメント: モダンな上部バー。建築プロ向けの洗練されたデザイン
  return (
    <header className="w-full h-14 bg-surface-panel/95 backdrop-blur-sm border-b border-border-default flex items-center justify-between px-6 shadow-panel">
      {/* ブランドロゴエリア */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center shadow-glow">
            <div className="w-4 h-4 bg-white rounded-sm opacity-90"></div>
          </div>
          <h1 className="text-lg font-semibold text-text-primary tracking-tight">Scaff</h1>
        </div>
        <div className="hidden sm:block w-px h-6 bg-border-default"></div>
        <div className="hidden sm:block text-sm text-text-tertiary">建築平面作図エディタ</div>
      </div>

      {/* アクションボタンエリア */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button 
            onClick={onSave}
            size="sm"
            className="bg-accent-500 hover:bg-accent-600 text-white border-0 shadow-sm transition-all duration-200"
          >
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => onPreview?.()}
            size="sm"
            className="bg-surface-elevated hover:bg-surface-hover text-text-primary border-border-default transition-all duration-200"
          >
            <Eye className="w-4 h-4 mr-2" />
            プレビュー
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onLoad}
            size="sm"
            className="border-border-default hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all duration-200"
          >
            <Upload className="w-4 h-4 mr-2" />
            読み込み
          </Button>
        </div>

        <div className="w-px h-6 bg-border-default"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="w-9 h-9 p-0 hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-all duration-200"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="bg-surface-elevated border-border-default shadow-elevated animate-slide-down"
          >
            <DropdownMenuLabel className="text-text-secondary text-xs font-medium">データ管理</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border-subtle" />
            <DropdownMenuItem
              className="text-error hover:text-error hover:bg-error/10 focus:text-error focus:bg-error/10 transition-colors duration-200"
              onClick={() => onReset?.()}
            >
              エディタを初期化
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default TopBar
