# Layer Management Design (Phase 2)

This document specifies requirements, UX, and internal design for layer management.

## Scope
- Minimum layers: `grid`, `guides`, `walls`, `eaves`, `dims`
- Features: visibility (eye), lock, draw order (fixed for now)
- Persistence: Phase 5

## Requirements (UX/Behavior)
- Sidebar section "Layers" with toggles (eye/lock)
- Locked layer: excluded from hit-tests (no editing)
- Invisible layer: not rendered (dims/eaves hidden as well)
- Draw order (bottom→top): `grid` → `guides` → `walls` → `eaves` → `dims`

## Internal Design
- State
  - `layers: { [id in 'grid'|'guides'|'walls'|'eaves'|'dims']: { visible: boolean, locked: boolean } }`
  - Defaults: all visible, all unlocked
- Canvas integration
  - Guard each draw block with `if (!layers.X.visible) return`
  - Before hit-tests, skip locked layers
  - Respect the fixed drawing order

## API/Events (proposal)
- `onToggleLayer(id, patch)` partial updates for visible/locked
- Future: add/remove layers, reorder (drag & drop)

## Acceptance Criteria
- Visibility and lock reflect immediately in rendering and interactions
- Stable draw order

## Minimum Plan
1. Add `layers` state to Page and UI controls in Sidebar (eye/lock)
2. Pass `layers` to CanvasArea and branch draw/hit-test logic
3. Persist `layers` in Phase 5 JSON (out of scope now)

