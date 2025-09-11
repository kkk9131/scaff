"use client";
import React, { useState } from 'react'
import TopBar from '@/components/TopBar'
import Sidebar, { ViewMode } from '@/components/Sidebar'
import CanvasArea from '@/components/CanvasArea'
import ThreePlaceholder from '@/components/ThreePlaceholder'

export default function Page() {
  // 日本語コメント: フェーズ1のUI骨格（上部バー＋左サイドバー＋中央キャンバス）
  const [expanded, setExpanded] = useState(true)
  const [view, setView] = useState<ViewMode>('plan')
  const onSave = () => {
    // 日本語コメント: 保存（ダミー）
    alert('保存（ダミー）')
  }
  const onLoad = () => {
    // 日本語コメント: 読み込み（ダミー）
    alert('読み込み（ダミー）')
  }
  return (
    <div className="h-dvh flex flex-col">
      <TopBar onSave={onSave} onLoad={onLoad} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar expanded={expanded} current={view} onSelectView={setView} onToggle={() => setExpanded(v => !v)} />
        <main className="flex-1">
          {view === '3d' ? <ThreePlaceholder /> : <CanvasArea />}
        </main>
      </div>
    </div>
  )
}
