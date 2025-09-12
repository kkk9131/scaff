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

## Language & Documentation Policy
- Output language: Japanese by default for user-facing messages (出力は日本語で).
- Code comments: write clear Japanese comments to explain intent and tricky logic.
  - Example (TS): `// 日本語で目的や前提を簡潔に説明する`
  - Example (Py): `# 日本語コメントで処理の意図を残す`
- Checklists: when work is verified, tick relevant checkboxes in Issues/PRs.
  - Use GitHub markdown: `- [ ] 未対応` → `- [x] 完了`
- Documentation: maintain bilingual docs (EN/JA) and keep them in sync.
  - Example: `README.md` + `README.ja.md`, `AGENTS.md` + `AGENTS.ja.md`.

## Action Logging
- Maintain a repository-level action log in `activity.log` (Japanese only).
- Summarize performed actions per session or PR with date/time and short bullets.
  - Example: `2025-09-11: 初期コミット、AGENTS追加、リモート設定`.

### activity.log format rules (unified)
- Append-only: never delete, rewrite, or reorder existing lines.
- Language: Japanese only; keep entries concise (1–5 bullets).
- Date header: start each session with `YYYY-MM-DD` or `YYYY-MM-DD HH:MM` (JST).
- Bullets: use `- ` for sub-items under the date line.
- Scope: log meaningful repository-level actions (spec/docs/code/tests/config/CI). Avoid trivial edits.
- References: optionally include PR numbers `(#123)` or short commit hashes.
- Conflicts: when merging branches, combine logs preserving chronological order; do not drop lines.
- Secrets: never include secrets, tokens, or personally identifiable information.

Example
```
2025-09-13 10:05: フェーズ2「寸法線の常時表示」UIデモを追加
- SVGレンダラを追加（src/ui/svg/dimension-renderer.js）
- デモページを追加（assets/demo-dimensions/index-ui.html）
- READMEに使用方法を追記
```

## Development Flow Compliance
- Follow the development process defined in `docs/Development-Flow.md`.
- Issues/PRs must satisfy Ready/Done definitions and use the checklist.
