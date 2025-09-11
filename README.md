# Scaff

A docs-first repository for a drawing editor MVP. Core specifications live under `docs/` (Japanese). See contributor rules in `AGENTS.md`.

## Overview
- Goal: 2D floor plan editor leading to elevation/3D features.
- Users: construction professionals needing millimeter precision.
- Source of truth: update specs in `docs/` before code.

## Repository Layout (planned)
- `docs/` specs and roadmap
- `src/` application code (to be added)
- `tests/` test code (to be added)
- `assets/` static assets (to be added)

## Development
- Node/Next.js based. First-time setup:
  - `npm install`
  - Dev: `npm run dev` → http://localhost:3000
  - Build: `npm run build` / Start: `npm start`
  - Currently includes minimal UI: top bar, left sidebar, center Canvas placeholder.

## Contributing
- Read `AGENTS.md` for style, tests, and PR rules.
- Keep docs bilingual (EN/JA). Japanese is default for user-facing outputs.
- Summarize actions in `activity.log` (Japanese only).

## Links
- Japanese README: `README.ja.md`
- Specs: `docs/`
- Development Flow: `docs/Development-Flow.md`
