# Roadmap (EN)

This mirrors `docs/開発ロードマップ.md` and is kept in sync. Japanese is the source of truth.

## MVP (2D Plan Only)

### Phase 1: Foundation
- Next.js + TS, Tailwind, basic UI (top bar, sidebar, canvas)

### Phase 2: 2D Editor
- Templates: Rect / L / U / T + convert to free-form polygon for arbitrary vertex edits
- Dimensioning: click edges to enter mm; always-visible dimensions (outside), collision avoidance
- Vertex drag with snap (orthogonal, grid)
- Styles: walls neon-blue, helpers gray
- Eaves Overhang (outer offset only), dashed, per-edge edit via click
- Zoom & pan: wheel/keys/UI, cursor-centered zoom, click+scroll/trackpad pan
- Floors (multi-floor management)
  - List: add/delete/duplicate/rename; active switching (row/▲▼/PgUp/PgDn)
  - Heights: `elevationMm` (floor Z), `heightMm` (story)
  - Editing: active-only; others locked and rendered lighter; multiple floors overlaid (lower→higher)
  - Colors: auto palette per floor name/level (consistent across views); shapes deep-copied for independence
  - Eaves: stored per floor; editing on the active floor only; non-active dashed display
  - 3D prep: extrude semantics zBottom=`elevationMm`, zTop=`elevationMm+heightMm`

### Phase 5: Data
- Save/load JSON (done)
  - Include eaves (`enabled/amountMm/perEdge`) (done)
  - Include floors array: `id/name/elevationMm/heightMm/color/walls/eaves` (done)
  - Auto save/restore via localStorage (done)
  - Reset editor to defaults via top-bar menu (done)

## Full Version (Elevation + 3D)

### Phase 3: Elevation Automation
- [x] Generate four elevations from plan + heights (N/E/S/W)
- [ ] Dimension annotations (wall height / roof apex)
- [ ] Toggle for dimension overlays via sidebar
- [ ] Roof generation (flat / gable / hip with slope inputs)

### Phase 4: 3D Wireframe
- Extrude outer walls
- Generate roof wireframe (gable / hip / flat)
- Render via Three.js `LineSegments`
- Mouse controls (orbit / zoom / pan)
- Coloring with glow (walls=blue, roof=orange, helpers=gray)

### Phase 6: UI Polish
- Sidebar expand/collapse animation (Framer Motion)
- View transitions (plan ⇄ elevation ⇄ 3D)
- Dimension fade-in/out motion
- Sidebar icon neo-green glow when active

## Priorities
- MVP: Phases 1 + 2 + 5
- Future: Phases 3 + 4
- Visual polish: Phase 6
