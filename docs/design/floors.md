# Floor Management Requirements (Phase 2)

This document defines floor (1F/2F/...) management. Height (Z) is stored for future elevation/3D.

## Terminology
- Floor level Z: absolute height (mm) of each floor's top-of-slab. Z=0 baseline (default: 1F floor = 0mm). +Z is up.
- Story height: vertical height (mm) from floor level to ceiling/top-of-wall.

## Scope & Goals
- Duplicate plan geometry as-is across floors (1F/2F...) for independent editing.
- Elevation/3D will directly use `floors[].elevationMm` and `floors[].heightMm`.

## Duplication Rules
- Duplicate walls only (exclude dimensions, eaves, guides, etc.).
- Independence: fully copied; no linking between floors.

## Visibility & Editing
- Only the active floor is editable. Other floors are locked (not hit-testable) and rendered semi-transparent.
- Multiple floors can be shown simultaneously. Draw order: lower → higher floors (back → front).
- Per-floor colors for walls/eaves (palette auto-assign + manual override).

## UI (Floors section)
- Floor list (1F/2F...) supports:
  - Add / Delete / Duplicate / Rename
  - Inline editing of elevation Z (mm) and story height (mm)
  - Visibility (eye) and lock (padlock)
- Shortcuts: floor switching (PgUp/PgDn). Fit/zoom applies globally.

## Zoom/Snap Consistency
- `pxPerMm` follows global scale; zoom is shared regardless of floor visibility/editing.
- Snap applies only while editing the active floor.

## Data Model (save schema)
```
{
  floors: [
    {
      id: string,
      name: string,           // e.g., "1F", "2F"
      elevationMm: number,    // floor level Z
      heightMm: number,       // story height
      color?: {
        walls?: string,
        eaves?: string,
      },
      // Planar footprint used for 2D and for 3D extrusion
      walls: {
        outer: { x: number, y: number }[],   // CCW winding (screen coords)
        holes?: { x: number, y: number }[][] // optional holes, CW winding
      },
      // Overhang settings (used in 2D and 3D)
      eaves?: {
        enabled: boolean,
        amountMm: number,
        perEdge?: { [edgeIndex: number]: number }
      },
    }
  ]
}
```
- Layer visibility/lock is not persisted (session/UI state). Promote to persistence later if needed.

## 3D Prep (Extrusion semantics)
- Units/axes: millimeters, +Z is up. Default baseline: 1F floor Z = 0mm.
- Floor volume: extrude the `walls` polygon from `zBottom = elevationMm` to `zTop = elevationMm + heightMm`.
  - Outer ring CCW and holes CW are required for robust meshing.
  - Resulting 3D is a hollow prism (no thickness for walls at this phase).
- Eaves in 3D: if `eaves.enabled`, generate a thin horizontal plate at the top of the floor
  - Plan shape = outward offset of the outer ring using `amountMm`/`perEdge`, with self-intersections resolved by union (same rule as 2D spec).
  - Vertical span: `[zTop - eavesThicknessMm, zTop]`.
  - `eavesThicknessMm` default: 50mm (configurable later). Color uses `color.eaves`.
- Roof shapes (gable/hip, slopes) are out of scope for Phase 2 and will be added later.

## Acceptance Criteria (amended for 3D readiness)
- `walls` stored as outer+holes with defined winding (outer CCW, holes CW).
- `eaves` settings are sufficient to derive a 3D thin plate at the floor top when enabled.

## Defaults & Limits (proposal)
- New floor defaults:
  - name: auto-numbered (nF)
  - elevationMm: previous floor's elevation + height
  - heightMm: same as below (initial 2800mm, for example)
  - color: rotate from palette
- Max floors: no hard limit (operational guideline ~20)

## Acceptance Criteria
- Add/Delete/Duplicate/Rename and height edits reflect immediately.
- Only active floor is editable; others are semi-transparent and not hit-testable.
- Per-floor colors apply and remain legible with multi-floor display.
- Save/load reproduces the `floors` schema (layer visibility/lock is session-only).
