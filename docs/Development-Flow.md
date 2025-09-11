# Development Flow (Branch-based)

## Overview
- Docs-first workflow: update specs in `docs/` → create Issues → implement.
- Default language for user outputs is Japanese. Add Japanese comments in code for intent and caveats.
- After work, summarize actions in `activity.log` (Japanese only).

## Steps
1. Sync requirements: review `docs/` and apply diffs (keep EN/JA in sync).
2. Create Issues: break down by MVP/roadmap; define acceptance criteria (if skipping Issues, include them in the PR).
3. Plan: set 1–2 week sprints; keep WIP small.
4. Branching (required): update `main` → create a branch → develop via PRs.
5. Implement: ship small PRs (~≤300 LOC) frequently.
6. Test: add unit → integration; prioritize critical logic.
7. Review/Merge: follow PR template → CI green → prefer Squash Merge.
8. Log/Docs: update `activity.log` and keep EN/JA docs in sync.

## 2D MVP Order (Suggested)
- 1) Templates + internal model (mm units, coordinate system)
- 2) Editing (dimension input, vertex drag, orthogonal/grid snap)
- 3) Dimensions (outer persistent display, rounding/unit rules)
- 4) Save/Load (initial JSON schema + I/O)
- 5) Left sidebar (view/dimension/layers/save)
- 6) Rendering perf (Canvas/SVG early tuning)

## Ready / Done
- Ready: purpose, spec delta, acceptance, test notes, impact, rollback.
- Done: PR approved, CI green, checklists done, EN/JA docs updated, `activity.log` updated.

## Conventions
- Commits: Conventional Commits (e.g., `feat: add rectangle tool`).
- Branch types: `feature/*`, `fix/*`, `docs/*`, `chore/*`.
- Branch naming: kebab-case. Example: `feature/canvas-skeleton-#2` (Issue number optional).
- Merging: prefer Squash Merge; use Rebase/Merge only when necessary.
- Comments: Japanese comments describing intent, pitfalls, trade-offs.

## Branch Workflow (Details)
- Before work: `git switch main && git pull` to update.
- Create: `git switch -c feature/<short-desc>`.
- Push: `git push -u origin feature/<short-desc>`.
- PR: include purpose, acceptance criteria, impact, tests, screenshots.
- Review: CODEOWNERS auto-assigns reviewers. Address feedback with follow-up commits.
- After merge: delete branch, append to `activity.log`, tag if needed.

## Checklist (Copy/Paste)
- [ ] Update `docs/` (EN/JA)
- [ ] Issue has acceptance/tests/impact
- [ ] Add Japanese intent comments in code
- [ ] Add/Update unit/integration tests
- [ ] Fulfill PR template items
- [ ] Append summary to `activity.log`

## References
- Requirements: `docs/作図エディタ要件定義書.md`, `docs/２D平面作図MVP 要件定義書.md`
- Ops: `AGENTS.md` / `AGENTS.ja.md`
