# Snap Feature Spec (Phase 2)

Defines snapping behavior during drag editing in the 2D plan editor. Initial scope includes Orthogonal and Grid snapping.

## Goals
- Improve stability and repeatability when editing with millimeter precision.
- Constrain to horizontal/vertical and regular intervals to avoid tiny drifts.

## Snaps
- Orthogonal (Ortho)
  - If the angle from the anchor is within 0/90/180/270° ± tolerance, snap to the respective axis.
  - Default tolerance: ±7.5°.
- Grid
  - Round coordinates to a given grid interval (mm).
  - Default grid: 50mm.

## Implementation (MVP)
- Pure functions in `src/core/snap.ts` with no side effects.
- Apply in order: Ortho → Grid.
- Anchor is origin (0,0) for MVP. Future: drag start, nearest vertex, or constraint line.
- UI toggles are future work. MVP keeps defaults always on.

## API
- `snapToGrid(p, gridMm)`
- `snapToOrtho(p, anchor, toleranceDeg)`
- `applySnaps(p, options)`

```
// SNAP_DEFAULTS
{
  enableOrtho: true,
  orthoToleranceDeg: 7.5,
  enableGrid: true,
  gridMm: 50,
  anchor: { x: 0, y: 0 }
}
```

## Canvas Integration
- In `CanvasArea`, apply `applySnaps` after `screenToModel` during drag.
- Render a faint grid for visual feedback when spacing is visible.

## Future Work
- Anchor selection (drag start, nearest vertex, constraint lines)
- Visual guides for snap candidates (lines/markers)
- Sidebar/shortcuts to toggle and edit settings
- Angle series (e.g., 45°), object snaps (end/mid/intersection)
