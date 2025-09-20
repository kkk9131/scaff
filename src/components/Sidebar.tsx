import React, { useState } from 'react'
import { 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  Grid, 
  Ruler, 
  Home, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Plus, 
  Copy, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Settings,
  Square,
  Zap,
  Building
} from 'lucide-react'
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
  // 屋根（統合セクション）
  roof?: { enabled: boolean; type: 'flat'|'gable'|'hip'|'mono'; parapetHeightMm?: number; pitchSun?: number; ridgeAxis?: 'NS'|'EW'; monoDownhill?: 'N'|'S'|'E'|'W'; apexHeightMm?: number; excludeUpperShadows?: boolean }
  onUpdateRoof?: (patch: Partial<{ enabled: boolean; type: 'flat'|'gable'|'hip'|'mono'; parapetHeightMm: number; pitchSun: number; ridgeAxis: 'NS'|'EW'; monoDownhill: 'N'|'S'|'E'|'W'; apexHeightMm: number; excludeUpperShadows: boolean }>) => void
}> = ({ expanded, onToggle, onSelectView, current = 'plan', onSelectTemplate, currentTemplate = 'rect',
  floors = [], activeFloorId, onSelectFloor, onAddFloor, onDuplicateFloor, onRemoveFloor, onPatchFloor, onRenameFloor,
  snap, onUpdateSnap, dimensions, onUpdateDimensions, eaves, onUpdateEaves, roof, onUpdateRoof }) => {
  
  // 日本語コメント: モダンな左サイドバー。建築プロ向けのセクション管理
  // ビューは簡易トグル化したため openView は廃止
  const [openTemplate, setOpenTemplate] = useState(false)
  const [openFloors, setOpenFloors] = useState(true)
  const [openSnap, setOpenSnap] = useState(false)
  const [openDims, setOpenDims] = useState(false)
  const [openEaves, setOpenEaves] = useState(false)
  const [openRoof, setOpenRoof] = useState(true)

  return (
    <aside className={`h-full bg-surface-panel/95 backdrop-blur-sm border-r border-border-default transition-all duration-300 ease-out shadow-panel ${expanded ? 'w-72' : 'w-16'}`}>
      {/* ヘッダー */}
      <div className="h-14 flex items-center justify-center border-b border-border-default px-4">
        <button 
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border-default text-text-secondary hover:text-text-primary transition-all duration-200 shadow-sm" 
          onClick={onToggle}
          title={expanded ? 'サイドバーを閉じる' : 'サイドバーを展開'}
        >
          <Settings className="w-4 h-4" />
        </button>
        {expanded && (
          <div className="ml-3 text-sm font-medium text-text-secondary">
            コントロールパネル
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-3.5rem)]">

        {/* ビュー（クリックで順送り） */}
        <div className="space-y-3">
          <button
            className={`w-full text-sm font-medium text-text-primary flex items-center justify-between rounded-lg px-3 py-2.5 border transition-all duration-200 ${expanded ? 'bg-surface-elevated hover:bg-surface-hover border-border-default' : 'bg-surface-elevated border-border-default'}`}
            onClick={() => {
              const next = current === 'plan' ? 'elev' : current === 'elev' ? '3d' : 'plan'
              onSelectView?.(next)
            }}
            title="クリックで 平面→立面→3D→… と切替"
          >
            <div className="flex items-center gap-2">
              {current==='plan'? <Square className="w-4 h-4 text-accent-500" /> : current==='elev'? <Building className="w-4 h-4 text-accent-500" /> : <Home className="w-4 h-4 text-accent-500" />}
              {expanded && <span>ビュー</span>}
            </div>
            {expanded && (
              <span className="text-xs text-text-secondary">
                {current==='plan' ? '平面図' : current==='elev' ? '立面図' : '3Dビュー'}
              </span>
            )}
          </button>
        </div>

        {/* テンプレートセクション（順番：2番目） */}
        <div className="space-y-3">
          <button
            className="w-full text-sm font-medium text-text-primary flex items-center justify-between bg-surface-elevated hover:bg-surface-hover rounded-lg px-3 py-2.5 border border-border-default transition-all duration-200 group"
            onClick={() => setOpenTemplate(v => !v)}
            aria-expanded={openTemplate}
            title="形状テンプレートの開閉"
          >
            <div className="flex items-center gap-2">
              <Square className="w-4 h-4 text-accent-500" />
              {expanded && <span>テンプレート</span>}
            </div>
            {expanded && (openTemplate ? 
              <ChevronDown className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" /> : 
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
            )}
          </button>
          
          {openTemplate && expanded && (
            <div className="grid grid-cols-2 gap-2 pl-2">
              {(['rect','l','u','t'] as TemplateKind[]).map(t => (
                <button 
                  key={t} 
                  className={`px-3 py-2 rounded-lg text-left font-medium transition-all duration-200 ${currentTemplate===t?'bg-accent-500 text-white':'bg-surface-elevated hover:bg-surface-hover text-text-primary border border-border-default'}`} 
                  onClick={() => onSelectTemplate?.(t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
              {currentTemplate === 'poly' && (
                <div className="col-span-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning font-medium">
                  カスタム形状（テンプレート解除）
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 階層セクション */}
        <div className="space-y-3">
          <button
            className="w-full text-sm font-medium text-text-primary flex items-center justify-between bg-surface-elevated hover:bg-surface-hover rounded-lg px-3 py-2.5 border border-border-default transition-all duration-200 group"
            onClick={() => setOpenFloors(v => !v)}
            aria-expanded={openFloors}
            title="階層管理の開閉"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-500" />
              {expanded && <span>階層</span>}
            </div>
            {expanded && (openFloors ? 
              <ChevronDown className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" /> : 
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
            )}
          </button>
          
          {openFloors && expanded && (
            <div className="space-y-3 pl-2">
              {/* 階層コントロール */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button 
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent-500 hover:bg-accent-600 text-white transition-colors duration-200" 
                    onClick={onAddFloor}
                    title="新しい階を追加"
                  >
                    <Plus className="w-3 h-3" />
                    追加
                  </button>
                  <button 
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-surface-elevated hover:bg-surface-hover border border-border-default text-text-secondary transition-colors duration-200" 
                    onClick={onDuplicateFloor}
                    title="現在の階を複製"
                  >
                    <Copy className="w-3 h-3" />
                    複製
                  </button>
                  <button 
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-surface-elevated hover:bg-error/20 border border-border-default text-text-secondary hover:text-error transition-colors duration-200" 
                    onClick={onRemoveFloor}
                    title="現在の階を削除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-surface-elevated hover:bg-surface-hover border border-border-default text-text-tertiary hover:text-text-primary transition-colors duration-200"
                    title="上の階へ"
                    onClick={() => {
                      const i = floors.findIndex(f => f.id === activeFloorId)
                      if (i > 0) onSelectFloor?.(floors[i-1].id)
                    }}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-surface-elevated hover:bg-surface-hover border border-border-default text-text-tertiary hover:text-text-primary transition-colors duration-200"
                    title="下の階へ"
                    onClick={() => {
                      const i = floors.findIndex(f => f.id === activeFloorId)
                      if (i >= 0 && i < floors.length - 1) onSelectFloor?.(floors[i+1].id)
                    }}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              

              

              {/* 階リスト */}
              <div className="space-y-2 max-h-64 overflow-auto scrollbar-thin scrollbar-thumb-border-default scrollbar-track-transparent">
                {floors.map(f => (
                  <div key={f.id} className={`p-3 rounded-lg border transition-all duration-200 ${activeFloorId===f.id?'border-accent-500 bg-accent-500/10 shadow-glow':'border-border-default bg-surface-elevated hover:bg-surface-hover'}`}>
                    <div className="flex items-center gap-2 text-sm">
                      <button 
                        className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors duration-200 ${f.visible?'bg-success text-white':'bg-surface-hover text-text-tertiary hover:bg-success/20 hover:text-success'}`} 
                        onClick={() => onPatchFloor?.(f.id, { visible: !f.visible })} 
                        title="表示/非表示切替"
                      >
                        {f.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button 
                        className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors duration-200 ${f.locked?'bg-error text-white':'bg-surface-hover text-text-tertiary hover:bg-warning/20 hover:text-warning'}`} 
                        onClick={() => onPatchFloor?.(f.id, { locked: !f.locked })} 
                        title={f.locked?'ロック解除':'ロック'}
                      >
                        {f.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button 
                        className={`flex-1 text-left px-3 py-1.5 rounded-md font-medium transition-all duration-200 ${activeFloorId===f.id?'bg-accent-500 text-white':'bg-surface-hover text-text-primary hover:bg-surface-elevated'}`} 
                        onClick={() => onSelectFloor?.(f.id)} 
                        title="この階をアクティブにする"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${activeFloorId===f.id?'bg-white':'bg-accent-500'}`}></div>
                          {f.name}
                        </div>
                      </button>
                      <button 
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-surface-hover hover:bg-surface-elevated text-text-tertiary hover:text-text-primary transition-colors duration-200" 
                        onClick={() => onRenameFloor?.(f.id)}
                        title="階名を変更"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-text-tertiary font-medium" title="床レベルZ（1Fは0mm想定）">床レベル</label>
                        <div className="flex items-center gap-2">
                          <input 
                            className="flex-1 px-2 py-1.5 bg-primary-950 border border-primary-700 rounded-md text-right text-primary-50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-colors duration-200" 
                            type="number" 
                            step={50} 
                            value={f.elevationMm}
                            onChange={(e)=> onPatchFloor?.(f.id, { elevationMm: Number(e.target.value) || 0 })} 
                          />
                          <span className="text-text-muted text-xs">mm</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-text-tertiary font-medium" title="階高（床Zから天井まで）">階高</label>
                        <div className="flex items-center gap-2">
                          <input 
                            className="flex-1 px-2 py-1.5 bg-primary-950 border border-primary-700 rounded-md text-right text-primary-50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-colors duration-200" 
                            type="number" 
                            min={1} 
                            step={50} 
                            value={f.heightMm}
                            onChange={(e)=> onPatchFloor?.(f.id, { heightMm: Math.max(1, Number(e.target.value)||0) })} 
                          />
                          <span className="text-text-muted text-xs">mm</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-2xs text-text-muted mt-2 p-2 bg-surface-canvas rounded border border-border-subtle">
                      💡 PgUp/PgDnで階切替、非アクティブ階は半透明表示
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* 屋根（統合）セクション */}
        <div className="space-y-3">
          <button
            className="w-full text-sm font-medium text-text-primary flex items-center justify-between bg-surface-elevated hover:bg-surface-hover rounded-lg px-3 py-2.5 border border-border-default transition-all duration-200 group"
            onClick={() => setOpenRoof(v => !v)}
            aria-expanded={openRoof}
            title="屋根設定の開閉"
          >
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-accent-500" />
              {expanded && <span>屋根</span>}
            </div>
            {expanded && (openRoof ? 
              <ChevronDown className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" /> : 
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
            )}
          </button>
          {openRoof && expanded && (
            <div className="space-y-3 pl-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">屋根を有効化</label>
                <button
                  className={`w-12 h-7 rounded-full border transition-colors duration-200 flex items-center ${roof?.enabled ? 'bg-accent-500 border-accent-600' : 'bg-surface-hover border-border-default'}`}
                  onClick={() => onUpdateRoof?.({ enabled: !roof?.enabled })}
                  title="屋根の有効/無効"
                >
                  <span className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-200 ${roof?.enabled ? 'translate-x-5' : 'translate-x-1'}`}></span>
                </button>
              </div>
              {/* 形状選択 */}
              <div className="space-y-2">
                <label className="text-xs text-text-tertiary">屋根形状</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['flat','gable','hip','mono'] as const).map(t => (
                    <button
                      key={t}
                      disabled={!roof?.enabled}
                      onClick={() => onUpdateRoof?.({ type: t })}
                      className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${roof?.type===t ? 'bg-accent-500 border-accent-600 text-white' : 'bg-surface-hover border-border-default text-text-primary'} ${!roof?.enabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {t==='flat'?'フラット': t==='gable'?'切妻': t==='hip'?'寄棟':'片流れ'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 軒の出（屋根に統合） */}
              <div className="space-y-2">
                <label className="text-xs text-text-tertiary">軒の出</label>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">有効</span>
                    <button
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${eaves?.enabled ? 'bg-success text-white' : 'bg-surface-elevated hover:bg-surface-hover border border-border-default text-text-secondary'}`}
                      onClick={() => onUpdateEaves?.({ enabled: !eaves?.enabled })}
                      disabled={!roof?.enabled}
                    >
                      {eaves?.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={3000}
                      value={eaves?.amountMm ?? 600}
                      onChange={(e) => {
                        const num = Number(e.target.value)
                        const v = isNaN(num) ? 0 : Math.max(0, Math.min(3000, Math.round(num)))
                        onUpdateEaves?.({ amountMm: v })
                      }}
                      disabled={!roof?.enabled}
                      className={`w-full px-2 py-1.5 bg-primary-950 border rounded-md text-right text-primary-50 ${roof?.enabled ? 'border-primary-700' : 'border-border-default opacity-60 cursor-not-allowed'}`}
                    />
                    <span className="text-text-muted text-xs">mm</span>
                  </div>
                </div>
              </div>

              {/* 形状ごとのパラメータ */}
              {roof?.type === 'flat' && (
                <div className="grid grid-cols-2 gap-2 items-center">
                  <label className="text-xs text-text-tertiary">立上り高さ(mm)</label>
                  <input
                    type="number"
                    step={10}
                    min={0}
                    value={roof?.parapetHeightMm ?? 150}
                    onChange={(e) => onUpdateRoof?.({ parapetHeightMm: Math.max(0, Math.round(Number(e.target.value)||0)) })}
                    disabled={!roof?.enabled}
                    className={`px-2 py-1.5 bg-primary-950 border rounded-md text-right text-primary-50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-colors duration-200 ${roof?.enabled ? 'border-primary-700' : 'border-border-default opacity-60 cursor-not-allowed'}`}
                  />
                </div>
              )}

              {/* 立面の上階の陰を除外（ターゲット階の設定） */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">立面で上階の陰を除外</label>
                <button
                  className={`w-12 h-7 rounded-full border transition-colors duration-200 flex items-center ${roof?.excludeUpperShadows ? 'bg-accent-500 border-accent-600' : 'bg-surface-hover border-border-default'}`}
                  onClick={() => onUpdateRoof?.({ excludeUpperShadows: !roof?.excludeUpperShadows })}
                  title="立面図で上階の屋根が覆う部分を非表示にする"
                  disabled={!roof?.enabled}
                >
                  <span className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform duration-200 ${roof?.excludeUpperShadows ? 'translate-x-5' : 'translate-x-1'}`}></span>
                </button>
              </div>

              {roof?.type === 'gable' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-xs text-text-tertiary">勾配（寸）</label>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      max={15}
                      value={roof?.pitchSun ?? 4}
                      onChange={(e) => onUpdateRoof?.({ pitchSun: Math.max(0, Math.min(15, Number(e.target.value)||0)) })}
                      disabled={!roof?.enabled}
                      className={`px-2 py-1.5 bg-primary-950 border rounded-md text-right text-primary-50 ${roof?.enabled ? 'border-primary-700' : 'border-border-default opacity-60 cursor-not-allowed'}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-xs text-text-tertiary">棟方向</label>
                    <div className="flex items-center gap-2">
                      {(['NS','EW'] as const).map(ax => (
                        <button key={ax} disabled={!roof?.enabled} onClick={() => onUpdateRoof?.({ ridgeAxis: ax })}
                          className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${roof?.ridgeAxis===ax ? 'bg-accent-500 border-accent-600 text-white' : 'bg-surface-hover border-border-default text-text-primary'} ${!roof?.enabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          {ax}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-text-tertiary">妻面の辺指定はキャンバス操作で行う予定です（後続対応）。</p>
                </div>
              )}

              {roof?.type === 'hip' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-xs text-text-tertiary">勾配（寸）</label>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      max={15}
                      value={roof?.pitchSun ?? 4}
                      onChange={(e) => onUpdateRoof?.({ pitchSun: Math.max(0, Math.min(15, Number(e.target.value)||0)) })}
                      disabled={!roof?.enabled}
                      className={`px-2 py-1.5 bg-primary-950 border rounded-md text-right text-primary-50 ${roof?.enabled ? 'border-primary-700' : 'border-border-default opacity-60 cursor-not-allowed'}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-xs text-text-tertiary">最高点(mm)</label>
                    <input
                      type="number"
                      step={10}
                      min={0}
                      value={roof?.apexHeightMm ?? 0}
                      onChange={(e) => onUpdateRoof?.({ apexHeightMm: Math.max(0, Math.round(Number(e.target.value)||0)) })}
                      disabled={!roof?.enabled}
                      className={`px-2 py-1.5 bg-primary-950 border rounded-md text-right text-primary-50 ${roof?.enabled ? 'border-primary-700' : 'border-border-default opacity-60 cursor-not-allowed'}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-xs text-text-tertiary">棟方向</label>
                    <div className="flex items-center gap-2">
                      {(['NS','EW'] as const).map(ax => (
                        <button key={ax} disabled={!roof?.enabled} onClick={() => onUpdateRoof?.({ ridgeAxis: ax })}
                          className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${roof?.ridgeAxis===ax ? 'bg-accent-500 border-accent-600 text-white' : 'bg-surface-hover border-border-default text-text-primary'} ${!roof?.enabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          {ax}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-text-tertiary">未指定時は長辺方向を自動選択します。</p>
                </div>
              )}

              {roof?.type === 'mono' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-xs text-text-tertiary">勾配（寸）</label>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      max={15}
                      value={roof?.pitchSun ?? 3}
                      onChange={(e) => onUpdateRoof?.({ pitchSun: Math.max(0, Math.min(15, Number(e.target.value)||0)) })}
                      disabled={!roof?.enabled}
                      className={`px-2 py-1.5 bg-primary-950 border rounded-md text-right text-primary-50 ${roof?.enabled ? 'border-primary-700' : 'border-border-default opacity-60 cursor-not-allowed'}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-xs text-text-tertiary">流れ方向</label>
                    <div className="flex items-center gap-2">
                      {(['N','S','E','W'] as const).map(dir => (
                        <button key={dir} disabled={!roof?.enabled} onClick={() => onUpdateRoof?.({ monoDownhill: dir })}
                          className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${roof?.monoDownhill===dir ? 'bg-accent-500 border-accent-600 text-white' : 'bg-surface-hover border-border-default text-text-primary'} ${!roof?.enabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          {dir}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 下屋の自動抽出は非採用（将来拡張） */}

              <p className="text-xs text-text-tertiary">平面の屋根外形は軒ラインと同一です（点線）。立面は順次反映します。</p>
            </div>
          )}
        </div>
        </div>

        {/* 以降の旧ビュー/テンプレ/スナップのブロックは再配置のため削除 */}

        

        {/* 寸法セクション */}
        <div className="space-y-3">
          <button
            className="w-full text-sm font-medium text-text-primary flex items-center justify-between bg-surface-elevated hover:bg-surface-hover rounded-lg px-3 py-2.5 border border-border-default transition-all duration-200 group"
            onClick={() => setOpenDims(v => !v)}
            aria-expanded={openDims}
            title="寸法設定の開閉"
          >
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-accent-500" />
              {expanded && <span>寸法線</span>}
            </div>
            {expanded && (openDims ? 
              <ChevronDown className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" /> : 
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
            )}
          </button>
          
          {openDims && expanded && (
            <div className="space-y-3 text-sm pl-2">
              <div className="flex items-center justify-between">
                <label className="text-text-secondary font-medium">表示</label>
                <button
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors duration-200 ${dimensions?.show ? 'bg-success text-white' : 'bg-surface-elevated hover:bg-surface-hover border border-border-default text-text-secondary'}`}
                  onClick={() => onUpdateDimensions?.({ show: !dimensions?.show })}
                >
                  {dimensions?.show ? 'ON' : 'OFF'}
                </button>
              </div>
              
              <div className="space-y-1">
                <label className="text-text-tertiary text-xs font-medium">外側配置</label>
                <select
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-700 rounded-md text-primary-50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-colors duration-200"
                  value={dimensions?.outsideMode ?? 'auto'}
                  onChange={(e) => onUpdateDimensions?.({ outsideMode: (e.target.value as any) })}
                >
                  <option value="auto">自動</option>
                  <option value="left">左法線</option>
                  <option value="right">右法線</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-text-tertiary text-xs font-medium">オフセット</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    className="w-full px-3 py-2 bg-primary-950 border border-primary-700 rounded-md text-right text-primary-50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-colors duration-200"
                    value={dimensions?.offset ?? 16}
                    onChange={(e) => {
                      const num = Number(e.target.value)
                      const v = isNaN(num) ? 0 : Math.max(0, Math.min(200, Math.round(num)))
                      onUpdateDimensions?.({ offset: v })
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-text-tertiary text-xs font-medium">単位</label>
                  <select
                    className="w-full px-3 py-2 bg-primary-950 border border-primary-700 rounded-md text-primary-50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-colors duration-200"
                    value={dimensions?.offsetUnit ?? 'px'}
                    onChange={(e) => onUpdateDimensions?.({ offsetUnit: (e.target.value as any) })}
                  >
                    <option value="px">px</option>
                    <option value="mm">mm</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-text-tertiary text-xs font-medium">小数桁数</label>
                <input
                  type="number"
                  min={0}
                  max={2}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-700 rounded-md text-right text-primary-50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-colors duration-200"
                  value={dimensions?.decimals ?? 0}
                  onChange={(e) => {
                    const num = Number(e.target.value)
                    const v = isNaN(num) ? 0 : Math.max(0, Math.min(2, Math.round(num)))
                    onUpdateDimensions?.({ decimals: v })
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-text-secondary font-medium">ラベル回避</label>
                <button
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors duration-200 ${dimensions?.avoidCollision ? 'bg-success text-white' : 'bg-surface-elevated hover:bg-surface-hover border border-border-default text-text-secondary'}`}
                  onClick={() => onUpdateDimensions?.({ avoidCollision: !dimensions?.avoidCollision })}
                >
                  {dimensions?.avoidCollision ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* スナップセクション（最後） */}
        <div className="space-y-3">
          <button
            className="w-full text-sm font-medium text-text-primary flex items-center justify-between bg-surface-elevated hover:bg-surface-hover rounded-lg px-3 py-2.5 border border-border-default transition-all duration-200 group"
            onClick={() => setOpenSnap(v => !v)}
            aria-expanded={openSnap}
            title="スナップ設定の開閉"
          >
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-accent-500" />
              {expanded && <span>スナップ</span>}
            </div>
            {expanded && (openSnap ? 
              <ChevronDown className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" /> : 
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
            )}
          </button>
          
          {openSnap && expanded && (
            <div className="space-y-3 text-sm pl-2">
              <div className="flex items-center justify-between">
                <label className="text-text-secondary font-medium">グリッド</label>
                <button
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors duration-200 ${snap?.enableGrid ? 'bg-success text-white' : 'bg-surface-elevated hover:bg-surface-hover border border-border-default text-text-secondary'}`}
                  onClick={() => onUpdateSnap?.({ enableGrid: !snap?.enableGrid })}
                >
                  {snap?.enableGrid ? 'ON' : 'OFF'}
                </button>
              </div>
              
              <div className="space-y-1">
                <label className="text-text-tertiary text-xs font-medium">間隔 (mm)</label>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-700 rounded-md text-right text-primary-50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-colors duration-200"
                  value={snap?.gridMm ?? 50}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(2000, Math.round(Number(e.target.value) || 0)))
                    onUpdateSnap?.({ gridMm: v })
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-text-secondary font-medium">直角スナップ</label>
                <button
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors duration-200 ${snap?.enableOrtho ? 'bg-success text-white' : 'bg-surface-elevated hover:bg-surface-hover border border-border-default text-text-secondary'}`}
                  onClick={() => onUpdateSnap?.({ enableOrtho: !snap?.enableOrtho })}
                >
                  {snap?.enableOrtho ? 'ON' : 'OFF'}
                </button>
              </div>
              
              <div className="space-y-1">
                <label className="text-text-tertiary text-xs font-medium">許容角度 (°)</label>
                <input
                  type="number"
                  min={0}
                  max={45}
                  step={0.5}
                  className="w-full px-3 py-2 bg-primary-950 border border-primary-700 rounded-md text-right text-primary-50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 transition-colors duration-200"
                  value={snap?.orthoToleranceDeg ?? 7.5}
                  onChange={(e) => {
                    const num = Number(e.target.value)
                    const v = isNaN(num) ? 0 : Math.max(0, Math.min(45, num))
                    onUpdateSnap?.({ orthoToleranceDeg: v })
                  }}
                />
              </div>
              
              <div className="text-2xs text-text-muted p-2 bg-surface-canvas rounded border border-border-subtle">
                💡 ショートカット: G=グリッド切替, O=直角切替
              </div>
            </div>
          )}
        </div>

        {/* 旧：軒の出セクション（再配置のため削除） */}

      </div>
    </aside>
  )
}

export default Sidebar
