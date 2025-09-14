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
      walls: { /* planar geometry (Polygon etc.) */ },
      eaves?: { enabled: boolean, amountMm: number, perEdge?: { [edgeIndex: number]: number } },
    }
  ]
}
```
- Layer visibility/lock is not persisted (session/UI state). Promote to persistence later if needed.

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

