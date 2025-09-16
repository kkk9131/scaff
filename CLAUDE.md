# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scaff is a 2D floor plan drawing editor MVP built with Next.js, TypeScript, and Canvas/SVG. It's a docs-first repository focused on construction professional needs with millimeter precision. The project follows a bilingual documentation approach (Japanese primary, English secondary) and maintains a strict docs-before-code development flow.

## Development Commands

- **Development**: `npm run dev` - Start Next.js development server at http://localhost:3000
- **Build**: `npm run build` - Create production build
- **Start**: `npm start` - Start production server
- **Lint**: `npm run lint` - Run ESLint checks
- **Test**: `npm test` - Currently placeholder (no test framework configured)

## Architecture Overview

### Core System Architecture

The project follows a model-view separation with millimeter-based internal coordinates:

**Core Modules** (`src/core/`):
- `model.ts` - Internal data model with template shapes (rect, L, U, T, poly)
- `floors.ts` - Multi-floor management with elevation and shape data
- `units.ts` - Coordinate system utilities (mm internal, px screen)
- `transform.ts` - Model-to-screen coordinate transformations
- `snap.ts` - Orthogonal and grid snapping system

**Rendering System**:
- `CanvasArea.tsx` - Main drawing canvas with multi-floor rendering
- `src/core/dimensions/` - Dimension line engine for external measurements
- `src/core/eaves/` - Eaves (overhang) offset calculations and rendering

**UI Components**:
- Uses Radix UI components with custom Tailwind styling
- `Sidebar.tsx` - Floor management and shape controls
- `TopBar.tsx` - Main navigation and tool controls
- `PreviewOverlay.tsx` - Full-screen preview with zoom controls

### Coordinate System

- **Internal Model**: Millimeters (mm) with origin at center
- **Screen Display**: Pixels (px) with auto-fit scaling
- **Transformations**: Bidirectional model↔screen via `transform.ts`
- **Grid Snapping**: 50mm default grid with orthogonal snapping at ±7.5°

### Shape System

**Template Types**: `rect` (rectangle), `l` (L-shape), `u` (U-shape), `t` (T-shape), `poly` (custom polygon)
- Each template has parametric controls (width, height, cuts, etc.)
- Interactive editing via edge clicking for dimension input
- Vertex dragging converts templates to polygons
- Eaves system adds outer offset with per-edge customization

### Multi-Floor Management

- Floor stack with elevation (Z) and height properties
- Shape inheritance and independent editing
- Color-coded floor visualization with transparency for inactive floors
- Locked floor protection against accidental edits

## Key Technologies

- **Framework**: Next.js 14.2.5 with TypeScript
- **Styling**: Tailwind CSS with custom color palette (neonBlue, wallBlue, etc.)
- **UI Components**: Radix UI for dialogs, dropdowns, tooltips
- **Rendering**: HTML5 Canvas for main graphics + SVG overlay for dimensions
- **Icons**: Lucide React icon library
- **3D Future**: Three.js imported (placeholder for 3D elevation features)

## Development Guidelines

### Code Style
- **Language**: Japanese comments for intent and logic explanation
- **Naming**: kebab-case for files, camelCase for variables/functions
- **Indentation**: 2 spaces for JS/TS
- **Output Language**: Japanese by default for user-facing messages

### Documentation Requirements
- **Docs-First**: Update specifications in `docs/` before code changes
- **Bilingual**: Maintain both Japanese and English documentation
- **Activity Log**: Record all repository changes in `activity.log` (Japanese only)

### File Organization
- `src/core/` - Core business logic and data models
- `src/components/` - React UI components
- `src/ui/` - Utility components and styling helpers
- `src/io/` - Data persistence utilities
- `tests/` - Test files (minimal stubs currently)
- `docs/` - Comprehensive specifications and design documents

## Snap System Implementation

Located in `src/core/snap.ts`:
- **Orthogonal Snap**: Snaps to 0°, 90°, 180°, 270° within tolerance
- **Grid Snap**: Rounds to configurable mm grid (default 50mm)
- **Combined**: Applies orthogonal first, then grid snapping
- **Integration**: Used in `CanvasArea` during vertex dragging

## Testing Strategy

- Target ≥70% coverage initially, ≥85% by MVP freeze
- Fast unit tests preferred with integration tests for editor interactions
- Test file naming: `*.spec.ts` or `*.test.ts`
- No test framework currently configured - needs setup

## Build Configuration

- **Next.js**: Standard configuration with React strict mode
- **TypeScript**: Strict type checking enabled
- **Tailwind**: Custom color palette, animation support
- **ESLint**: Next.js recommended configuration

## Important Notes

- **Millimeter Precision**: All internal calculations use mm units for construction accuracy
- **Canvas Performance**: Uses device pixel ratio scaling for crisp rendering
- **Multi-Floor Support**: Designed for future 3D elevation features
- **Japanese-First**: Code comments and user messages default to Japanese
- **Docs Authority**: Specifications in `docs/` are the source of truth