# Scaff

A docs-first repository for a drawing editor MVP. Core specifications live under `docs/` (Japanese). See contributor rules in `AGENTS.md`.

## Overview
- Goal: 2D floor plan editor leading to elevation/3D features.
- Users: construction professionals needing millimeter precision.
- Source of truth: update specs in `docs/` before code.

## Repository Layout (updated)
- `docs/` specs and roadmap
- `src/` application code
  - `src/core/dimensions/` dimension model & engine
  - `src/core/eaves/` eaves (outer offset) utility
- `tests/` test code (minimal stubs)
- `assets/` static assets

## Development
- Node/Next.js based. First-time setup:
  - `npm install`
  - Dev: `npm run dev` → http://localhost:3000
  - Build: `npm run build` / Start: `npm start`
  - Includes UI: top bar, left sidebar, center canvas editor.
  - Phase 2 features:
    - Always-visible dimensions (outside each edge)
    - Eaves Overhang (outer offset) with dashed neon-blue outline
      - Concave corners bevelled, convex corners mitered (auto-bevel on extreme angles)
      - Sidebar: ON/OFF and amount (mm); per-edge editing prompt placeholder

## Snap (MVP)
- Orthogonal: snaps to axes when angle from anchor (origin) is within ±7.5° of 0/90/180/270°.
- Grid: rounds to 50mm spacing. A faint grid is rendered on the canvas.
- Implementation: `src/core/snap.ts`. Applied in `CanvasArea` during drag.
- Future: sidebar/shortcuts for toggles and settings, visual guides.

## Contributing
- Read `AGENTS.md` for style, tests, and PR rules.
- Keep docs bilingual (EN/JA). Japanese is default for user-facing outputs.
- Summarize actions in `activity.log` (Japanese only).

## Links
- Japanese README: `README.ja.md`
- Specs: `docs/`
- Development Flow: `docs/Development-Flow.md`
