# Repository Guidelines

## Project Structure & Module Organization
- Root contains documentation only for now: `docs/`
  - `docs/作図エディタ要件定義書.md` (Editor requirements)
  - `docs/２D平面作図MVP 要件定義書.md` (MVP spec)
  - `docs/開発ロードマップ.md` (Roadmap)
- When code is added, place application code in `src/` and tests in `tests/`. Keep assets in `assets/`.
  - Example layout: `src/core/`, `src/ui/`, `src/io/`.

## Build, Test, and Development Commands
- This repository has no build toolchain yet. Use your editor’s Markdown preview for `docs/`.
- When code is introduced, add project-specific commands to `README.md`. Suggested defaults:
  - Node: `npm run dev` (start), `npm test` (unit tests), `npm run build` (production build).
  - Python: `uv run pytest -q` (tests), `uv run app.py` (start), `uvx ruff format` (format).

## Coding Style & Naming Conventions
- Indentation: 2 spaces for JS/TS, 4 spaces for Python.
- Filenames: kebab-case for web assets (`drawing-editor.ts`), snake_case for Python (`drawing_engine.py`).
- Keep modules small and cohesive; one responsibility per file.
- Formatting/linting (enable once toolchain is added): Prettier (JS/TS), Ruff/Black (Python).

## Testing Guidelines
- Place tests under `tests/` mirroring `src/` structure.
- Naming: JS/TS `*.spec.ts` or `*.test.ts`; Python `test_*.py`.
- Aim for ≥70% coverage initially; target ≥85% by MVP freeze.
- Fast unit tests preferred; add integration tests for editor interactions and geometry operations.

## Commit & Pull Request Guidelines
- Use Conventional Commits:
  - `feat: add rectangle tool`
  - `fix: correct hit-testing precision`
  - `docs: update 開発ロードマップ`
- PRs must include: clear description, linked issue (if any), screenshots/GIFs for UI changes, and test updates.
- Keep PRs under ~300 lines of diff when possible; split large changes.

## Architecture & Docs First
- Treat `docs/` as the source of truth. Update specs before or with code changes.
- See `docs/作図エディタ要件定義書.md` (architecture/requirements), `docs/２D平面作図MVP 要件定義書.md` (scope), and `docs/開発ロードマップ.md` (milestones).

## Security & Configuration
- Do not commit secrets. Use `.env.local` and provide `.env.example`.
- Add `.gitignore` entries for local artifacts (e.g., caches, env files, build outputs).
