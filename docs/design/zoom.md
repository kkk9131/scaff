# Zoom Feature Design (Phase 2)

This document specifies requirements, UX, and internal design for canvas zoom.

## Scope
- View: plan (2D)
- Inputs: mouse wheel/trackpad, pinch (OS-scroll), keyboard (+/-), UI buttons (±/100%)
- Range: 0.1x–10x (tunable)

## Requirements (UX/Behavior)
- Cursor-centered zoom: the model position under the cursor remains visually fixed when zooming
- Smooth zoom: exponential scaling per delta (e.g., 1.05^delta)
- Snap consistency: dimension offsets (px/mm) and grid rendering track `pxPerMm`
- UI: Top bar shows +, -, 100%, Fit buttons
- Persistence: out of scope for Phase 2 (consider in Phase 5)

## Internal Design
- State
  - `scale` (number, default 1.0, clamp [0.1, 10])
  - `pan` (Vec2, CSS px, screen offset of canvas center)
- Transform
  - Base `pxPerMmBase` (auto-fit) → `pxPerMm = pxPerMmBase * scale`
  - Cursor anchoring:
    - Before zoom: compute model `m = screenToModel(cursorPx, view, pxPerMm_before)`
    - After zoom: adjust `pan` so `modelToScreen(m, view, pxPerMm_after)` equals the same `cursorPx`
- Wheel input
  - `scaleNext = clamp(scale * pow(1.05, -deltaY))`
  - Stronger factor when Ctrl/Cmd held (pinch gesture)

## API/Events (proposal)
- `onZoom(delta, anchorPx)` change zoom with cursor anchor
- `onZoomReset()` set 100%
- `onZoomFit()` fit shape to ~90% of viewport
- `onPan(dx, dy)` panning (middle-drag/space+drag for future)

## Acceptance Criteria
- Cursor position remains visually fixed during zoom
- Scale clamped to 0.1x–10x
- Dimensions and grid stay consistent with `pxPerMm`
- 100%/Fit/± work and reflect in UI

## Minimum Plan
1. Add `scale` to Page and top bar buttons
2. Pass `scale` into CanvasArea to recompute `pxPerMm`
3. Handle wheel → `onZoom()` with cursor anchor & pan adjust
4. Keep label font size in CSS px (12px) for readability; revisit later if needed

