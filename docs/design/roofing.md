# Roofing Logic Specification (Phase 3)

This document consolidates requirements for generating roofs across Plan → Elevation → 3D. It assumes per-floor multiple roofs and supports subordinate roofs ("lower roofs"). This is a design memo for specification only; no implementation is included.

## 1. Scope / Assumptions
- Multiple roofs per floor (roofs on different floors can overlap in plan).
- Roof types: flat / gable / hip / mono-pitch.
- Eaves are configured in plan; roof outlines are drawn with eaves applied.
- Pitch input: Japanese sun pitch (X sun), range 0–15, step 0.5.
  - 0 sun allowed only for flat; for other types, warn and suggest flat.
- Rendering uses the existing pipeline (Canvas body + SVG overlay).
- Roof stroke style: floor color + dashed. Ridge/valley/helper lines are also dashed (thinner).
- Z-order: walls < roof lines < dimension lines < labels/handles. Stroke scaling follows existing px/mm.

## 2. Data Model (persistence proposal)
- `floors[i].roofUnits: RoofUnit[]`
- RoofUnit common fields:
  - `id: string`
  - `type: "flat" | "gable" | "hip" | "mono"`
  - `mode?: "byPitch" | "byApex"` (hip defaults to byApex; gable/mono default to byPitch)
  - `pitchSun?: number` (0..15, step 0.5; display as `X sun (θ°)`)
  - `ridgeAxis?: "NS" | "EW"` (for gable/hip)
  - `gableEdges?: number[]` (indices of edges to be gable ends; multiple allowed; all-edges allowed → no ridge)
  - `monoDownhill?: "N" | "S" | "E" | "W"` (mono flow direction = lower side)
  - `apexHeightMm?: number` (for byApex; absolute Z or delta from eaves top – unify at implementation)
  - `footprint: { kind: "outer" | "polygon", polygon?: {x:number,y:number}[] }`
  - `eavesOverride?: { enabled?: boolean, amountMm?: number, perEdge?: { [edgeIndex:number]: number } }`
  - `computed?: { outline: {x:number,y:number}[], ridges: Line[], valleys: Line[] }`

Note: Lower roofs use `footprint.kind = "polygon"`. The initial footprint can be auto-detected (1F exposed area excluding upper floor shadows) and then edited by the user.

## 3. Common Geometry / Rendering
- Outline: offset `footprint` outward by eaves → resolve self-intersections with Union → keep CCW.
- Multi-floor overlap: draw plan in order bottom → top. Only active floor is editable; others are semi-transparent and locked.
- Upper-floor shadow exclusion: default ON. Per-roof toggle allows overlap when OFF.
- Labels: place near plan centroid; draggable; respect existing collision avoidance.

## 4. Type-specific Specs
### 4.1 Flat
- Input: `parapetHeightMm` (default 150mm; step 10mm suggested).
- Plan: eaves-applied outline; no ridges/valleys (`ridges=[], valleys=[]`).
- Elevation: eaves height = `elevationMm + heightMm`; parapet top = `eaves + parapetHeightMm`. Use existing dimension lines.
- Label: `Flat (parapet h=150mm)`.

### 4.2 Gable
- Input: `ridgeAxis` (NS/EW), `pitchSun` (>0), `gableEdges` (multiple allowed, all-edges allowed).
- Plan: eaves-applied outline. Initial ridge = maximal inscribed segment parallel to `ridgeAxis`; draggable.
- Gable ends: edges in `gableEdges` are vertical gable ends; others are eaves sides sloping up to the ridge.
- All-edges-gable: treat as no ridge (isolated apex). Not an error.
- Elevation: eaves = `elevationMm + heightMm`; ridge derived from `pitchSun`. Use existing dimension lines.
- Label: `Gable 4.0 sun (ridge=NS)`.

### 4.3 Hip
- Input: default `mode=byApex`, `apexHeightMm` (>=0). Initial apex = polygon centroid; draggable within polygon.
- Plan: eaves-applied outline. Roof rises radially from all edges toward the apex (edge-wise effective pitch varies by distance).
- Elevation: eaves = `elevationMm + heightMm`; apex = `eaves + apexHeightMm`. Use existing dimension lines.
- Label: `Hip apex=3200mm (ref pitch: 3.5 sun)` (only representative value on label; per-edge details in sidebar).

### 4.4 Mono-pitch
- Input: `pitchSun` (>0), `monoDownhill` (N/S/E/W).
- Plan: eaves-applied outline. Single sloped plane; concave footprints may form internal valleys (draw dashed thin lines).
- Elevation: low-side eaves = `elevationMm + heightMm`; high-side height computed by pitch × projected distance.
- Label: `Mono 3.0 sun (flow:E, max H=3450mm)`.

## 5. Eaves
- Outline is the outward offset of `footprint` by eaves. Concavities are unified via Union.
- Floor-level eaves are the default; per-roof `eavesOverride` can overwrite (on/off/amount/per-edge).
- Elevation dimensions reference eaves-applied outline (eaves edge, not wall centerline).

## 6. Validation / Errors
- `pitchSun = 0` allowed only for flat. For other types, warn and suggest flat.
- Auto lower-roof extraction failures / tiny slivers → warn and suggest manual footprint.
- Remove tiny slivers by area threshold; resolve self-intersections with Union and keep outer ring only.

## 7. Acceptance Criteria
- Plan outline is stable (eaves applied, self-intersections resolved).
- Rendering (color / dashed / scaling / z-order) matches existing plan/elevation.
- Labels/dimensions avoid collisions and remain legible.
- Type-specific behaviors are satisfied (gable all-edges = no ridge, hip byApex, mono valleys shown, etc.).

## 8. Future Work
- Distinct dash patterns for ridge/valley (e.g., outline=dashed, ridge=chain, valley=broken).
- Roof thickness/finish layers; parapet width/openings.
- Degree-based pitch input; bidirectional conversion (X sun ⇄ θ°).

> Note: This memo reflects agreed requirements; implementation is out of scope for this phase.

