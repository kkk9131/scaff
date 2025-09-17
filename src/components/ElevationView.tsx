import React, { useMemo } from 'react'
import type { FloorState } from '@/core/floors'
import { computeElevationBounds, computeElevationRects, type ElevationBounds, type ElevationDirection } from '@/core/elevation'
import { COLORS } from '@/ui/colors'

const DIRECTION_LABEL: Record<ElevationDirection, string> = {
  north: '北立面',
  south: '南立面',
  east: '東立面',
  west: '西立面',
}

const ElevationPanel: React.FC<{ direction: ElevationDirection; floors: FloorState[]; actualBounds: ElevationBounds; sharedAxisMin: number; sharedAxisMax: number; sharedBaseMin: number; sharedTopMax: number }> = ({ direction, floors, actualBounds, sharedAxisMin, sharedAxisMax, sharedBaseMin, sharedTopMax }) => {
  // 日本語コメント: 階層状態から指定方向の立面データを算出
  const rects = useMemo(() => computeElevationRects(floors, direction), [floors, direction])

  const axisRange = sharedAxisMax - sharedAxisMin
  const verticalRange = sharedTopMax - sharedBaseMin
  const axisMargin = Math.max(axisRange * 0.1, 500)
  const verticalMargin = Math.max(verticalRange * 0.15, 500)
  const minX = sharedAxisMin - axisMargin
  const maxX = sharedAxisMax + axisMargin
  const minY = -(sharedTopMax + verticalMargin)
  const width = maxX - minX
  const height = verticalRange + verticalMargin * 2
  const viewBox = `${minX} ${minY} ${width} ${height}`
  const groundY = -sharedBaseMin
  const axisOffset = sharedAxisMin - actualBounds.axisMin

  return (
    <div className="flex flex-col rounded-xl border border-border-default bg-surface-elevated/80 backdrop-blur-sm shadow-panel overflow-hidden">
      <div className="px-4 py-2 border-b border-border-default text-sm font-semibold text-text-secondary">
        {DIRECTION_LABEL[direction]}
      </div>
      <div className="flex-1">
        {rects.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-tertiary text-sm">
            立面を生成するフロアがありません
          </div>
        ) : (
          <svg className="w-full h-full" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
            {/* 地面ライン */}
            <line x1={minX} y1={groundY} x2={minX + width} y2={groundY} stroke={COLORS.helper} strokeWidth={2} strokeDasharray="24 12" vectorEffect="non-scaling-stroke" />
            {/* 立面輪郭（塗りなしの線画） */}
            {rects.map((r, idx) => {
              const stroke = r.color ?? COLORS.wall
              const startAligned = r.start + axisOffset
              const endAligned = r.end + axisOffset
              const flip = direction === 'north' || direction === 'west'
              const spanWidth = Math.max(1, endAligned - startAligned)
              const mirroredStart = sharedAxisMin + sharedAxisMax - endAligned
              const x = flip ? mirroredStart : startAligned
              return (
                <rect
                  key={`${r.floorId}-${idx}`}
                  x={x}
                  y={-r.top}
                  width={spanWidth}
                  height={Math.max(1, r.top - r.base)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
            {/* 階高目安ライン */}
            {floors.filter(f => f.visible).map(f => {
              const z = -(f.elevationMm + f.heightMm)
              return (
                <line
                  key={`${f.id}-tick-${direction}`}
                  x1={minX}
                  y1={z}
                  x2={minX + width}
                  y2={z}
                  stroke={COLORS.helper}
                  strokeWidth={1}
                  strokeDasharray="200 200"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.4}
                />
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}

const ElevationView: React.FC<{ floors: FloorState[] }> = ({ floors }) => {
  const bounds = useMemo(() => {
    const north = computeElevationBounds(floors, 'north')
    const south = computeElevationBounds(floors, 'south')
    const east = computeElevationBounds(floors, 'east')
    const west = computeElevationBounds(floors, 'west')
    const sharedBaseMin = Math.min(north.baseMin, south.baseMin, east.baseMin, west.baseMin)
    const sharedTopMax = Math.max(north.topMax, south.topMax, east.topMax, west.topMax)
    const sharedAxisMin = Math.min(north.axisMin, south.axisMin, east.axisMin, west.axisMin)
    const sharedAxisMax = Math.max(north.axisMax, south.axisMax, east.axisMax, west.axisMax)
    return { north, south, east, west, sharedBaseMin, sharedTopMax, sharedAxisMin, sharedAxisMax }
  }, [floors])

  // 日本語コメント: 立面ビュー全体を2x2グリッドで表示
  return (
    <div className="h-full w-full overflow-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-full">
        <ElevationPanel
          direction="north"
          floors={floors}
          actualBounds={bounds.north}
          sharedAxisMin={bounds.sharedAxisMin}
          sharedAxisMax={bounds.sharedAxisMax}
          sharedBaseMin={bounds.sharedBaseMin}
          sharedTopMax={bounds.sharedTopMax}
        />
        <ElevationPanel
          direction="east"
          floors={floors}
          actualBounds={bounds.east}
          sharedAxisMin={bounds.sharedAxisMin}
          sharedAxisMax={bounds.sharedAxisMax}
          sharedBaseMin={bounds.sharedBaseMin}
          sharedTopMax={bounds.sharedTopMax}
        />
        <ElevationPanel
          direction="south"
          floors={floors}
          actualBounds={bounds.south}
          sharedAxisMin={bounds.sharedAxisMin}
          sharedAxisMax={bounds.sharedAxisMax}
          sharedBaseMin={bounds.sharedBaseMin}
          sharedTopMax={bounds.sharedTopMax}
        />
        <ElevationPanel
          direction="west"
          floors={floors}
          actualBounds={bounds.west}
          sharedAxisMin={bounds.sharedAxisMin}
          sharedAxisMax={bounds.sharedAxisMax}
          sharedBaseMin={bounds.sharedBaseMin}
          sharedTopMax={bounds.sharedTopMax}
        />
      </div>
    </div>
  )
}

export default ElevationView
