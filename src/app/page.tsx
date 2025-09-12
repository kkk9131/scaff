"use client";
import React, { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import Sidebar, { ViewMode } from '@/components/Sidebar'
import CanvasArea from '@/components/CanvasArea'
import type { TemplateKind } from '@/core/model'
import ThreePlaceholder from '@/components/ThreePlaceholder'
import { SNAP_DEFAULTS } from '@/core/snap'

export default function Page() {
  // 日本語コメント: フェーズ1のUI骨格（上部バー＋左サイドバー＋中央キャンバス）
  const [expanded, setExpanded] = useState(true)
  const [view, setView] = useState<ViewMode>('plan')
  const [template, setTemplate] = useState<TemplateKind>('rect')
  const [dimensions, setDimensions] = useState({
    show: true as boolean,
    outsideMode: 'auto' as 'auto' | 'left' | 'right',
    offset: 16 as number,
    decimals: 0 as number,
  })
  const [snap, setSnap] = useState({
    enableGrid: SNAP_DEFAULTS.enableGrid,
    gridMm: SNAP_DEFAULTS.gridMm,
    enableOrtho: SNAP_DEFAULTS.enableOrtho,
    orthoToleranceDeg: SNAP_DEFAULTS.orthoToleranceDeg,
  })
  const onSave = () => {
    // 日本語コメント: 保存（ダミー）
    alert('保存（ダミー）')
  }
  const onLoad = () => {
    // 日本語コメント: 読み込み（ダミー）
    alert('読み込み（ダミー）')
  }
  // 日本語コメント: ショートカット登録（g: グリッド切替, o: 直角切替）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        setSnap(s => ({ ...s, enableGrid: !s.enableGrid }))
      } else if (e.key === 'o' || e.key === 'O') {
        setSnap(s => ({ ...s, enableOrtho: !s.enableOrtho }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="h-dvh flex flex-col">
      <TopBar onSave={onSave} onLoad={onLoad} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          expanded={expanded}
          current={view}
          onSelectView={setView}
          onToggle={() => setExpanded(v => !v)}
          onSelectTemplate={setTemplate}
          currentTemplate={template}
          snap={snap}
          onUpdateSnap={(patch) => setSnap(s => ({ ...s, ...patch }))}
          dimensions={dimensions}
          onUpdateDimensions={(patch) => setDimensions(d => ({ ...d, ...patch }))}
        />
        <main className="flex-1">
          {view === '3d' ? <ThreePlaceholder /> : (
            <CanvasArea
              template={template}
              snapOptions={{ ...snap, anchor: { x: 0, y: 0 } }}
              dimensionOptions={dimensions}
            />
          )}
        </main>
      </div>
    </div>
  )
}
