# Phase 1 PoC Task Plan

## Purpose
- Translate the Phase 1 requirements (`docs/作図エディタ要件定義書.md`) into actionable implementation tasks with clear priorities and dependencies.
- Provide Issue-ready items with explicit acceptance criteria using checklists for each deliverable.

## Task List

### 0. Foundation Setup
- [ ] Initialize the canonical source tree (`src/core`, `src/ui`, `src/io`) and configure TypeScript path aliases.
- [ ] Create the base Next.js layout (SideBar + Canvas + Inspector) that hosts the editor surface.
- [ ] Configure Tailwind CSS theme and responsive breakpoints, and prepare Storybook or a lightweight component playground.
- [ ] Establish a React Context skeleton covering project/floor/roof state slices.

### 1. Floor Plan Editor (Konva.js)
- [ ] Implement template generators (rectangle / L / T / U) and the picker UI.
- [ ] Support vertex drag/add/remove with snapping and an undo/redo scaffold.
- [ ] Build a side-panel form to edit edge length, setback, and eaves offset with bidirectional binding.
- [ ] Add SVG export so the current floor plan can be downloaded by the user.

### 2. Elevation Generation
- [ ] Finalize the `core/elevation` module to derive north/south/east/west elevations from plan and floor data.
- [ ] Render roof styles (flat / mono / gable / hip) with the `|──6000──|` dimension format.
- [ ] Compute slope labels in `10/〇` (0.5-sun increments) and place them along the roof edges.
- [ ] Provide UI toggles and persisted settings for dimension visibility.

### 3. 3D View (Three.js)
- [ ] Extrude the footprint polygon into exterior walls with proper floor heights.
- [ ] Generate roof meshes for all four roof types.
- [ ] Keep the 3D scene in sync with 2D edits and optimize render updates.
- [ ] Integrate orbit-style controls for rotation, zoom, and pan via mouse/touch.

### 4. Export (SVG / JPEG / PDF)
- [ ] Harden SVG export from the Konva stage and the download workflow.
- [ ] Implement JPEG capture using html-to-image / dom-to-image and verify cross-browser compatibility.
- [ ] Prototype PDF generation with pdf-lib or jsPDF.
- [ ] Provide an export dialog covering format selection, filenames, and user guidance.

### 5. Data Model & Openings
- [ ] Define schema for windows/bays/doors (dimensions, placement, orientation) and persist them in JSON saves.
- [ ] Prepare mock input UI or fixtures for openings to validate elevation/3D hooks.

### 6. Testing & Quality
- [ ] Add geometry-focused unit tests under `tests/core/` for plan→elevation/3D conversions.
- [ ] Create Playwright (or alternative E2E) smoke tests for template selection, vertex editing, and dimension entry.
- [ ] Document snapshot or automation steps for verifying SVG/JPEG/PDF outputs.
- [ ] Add CI (GitHub Actions or equivalent) running lint and test suites.

### 7. Documentation
- [ ] Update README.md / README.ja.md with development workflow, libraries, and commands.
- [ ] Cross-check `docs/２D平面作図MVP 要件定義書.md` against this plan and align differences.
- [ ] Log major implementation milestones in `activity.log` per repository policy.

## Dependencies & Priority
1. Complete section 0 (foundation) to unblock feature modules.
2. Floor plan work (section 1) must land before elevation (2) and 3D (3) because they consume the plan data model.
3. Export (4) depends on stable 2D/3D outputs and should follow their completion.
4. Openings (5) can remain data-only but should be wired to saves to enable future UI work.
5. Testing & docs (6, 7) run alongside feature development and culminate in CI coverage.

## Definition of Done
- All checkboxes are complete, satisfying the Phase 1 requirements.
- Features operate on desktop and tablet form factors with no blocking issues on Chromium, Firefox, or Safari.
