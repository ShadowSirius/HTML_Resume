# Task Plan

## Goal

Optimize the existing `rs_portrait.html` layout and resume content while preserving its generated runtime, nested skill tree, editors, interactions, and A4 portrait print mode.

## Constraints

- Treat the current modified `rs_portrait.html` and `baseline/` as the entry baseline.
- Preserve all existing project evidence and skill nodes; reorganize and normalize rather than delete.
- Keep the EXPERIENCE / SKILL ROOTS split, drag, zoom/pan, selection, outline/manual editors, localStorage, and print behavior.
- No framework rewrite, external dependency, or invented metric.
- Use the supplied six-domain taxonomy as the content target.
- Entry baseline: `rs_portrait.html` is pre-modified (`git status: M`), SHA-256 `34217E85D83AD9DF88CD8BA6396853A5B385312ECBEA170D0499B45AA151F8C6`; `baseline/` and `plan.md` are untracked. Preserve all of it.

## Module Design

### M: Embedded Resume Tree

interface: `SKILL_DATA`, `PROJECTS`, `CAT`, and `buildViz()` within the existing generated application.
seam: rendered root categories, project cards, project-to-skill highlighting, and A4 view.
hides: nested taxonomy, category colouring, branch geometry, label placement, and card sizing.
dependencies: generated runtime (in-process); localStorage (local-substitutable).
test_strategy: direct structural assertions on embedded source plus a documented browser visual check.

## Cost Ledger

| Scope | Actor / tier | Time budget (min) | Token budget | Actual time (min) | Actual tokens | Basis | Rounds / retries |
|---|---|---:|---:|---:|---:|---|---|
| Context + Think + Plan | orchestrator / high | 20-30 | 8k-15k | pending | unknown | estimated: one packed HTML module | 1 / 0 |
| Gate A | reviewer / high | 10-20 | 5k-10k | pending | unknown | estimated | 1 / 0 |
| T014 | executor / low | 25-40 | 10k-18k | unknown | unknown | passed; telemetry unavailable | 1 / 0 |
| T015 | executor / low | 40-65 | 18k-34k | unknown | unknown | passed; telemetry unavailable | 1 / 0 |
| T016 | executor / low | 10-20 | 4k-8k | unknown | unknown | blocked by local-file browser policy | 1 / 0 |
| Gate B + Capture | reviewer / high | 15-25 | 6k-12k | unknown | unknown | passed for T014/T015 | 1 / 0 |
| Total | mixed / M | 120-200 | 51k-97k | pending | unknown | estimated | 6 / 0 |

## Current Execution Scope

Select T014-T016 after Gate A. T014 lands first; T015 depends on its validated layout seam; T016 is visual verification only.

## Task Overview

| ID | Phase | Task | Status | Depends On | Parallel Group | Selected |
|---|---|---|---|---|---|---|
| T014 | P1 | Balance branches and card space by content density | completed | - | - | yes |
| T015 | P2 | Reorganize content into six stable domains | completed | T014 | - | yes |
| T016 | P3 | Verify interactive and A4 visual layout | blocked | T015 | - | yes |
| T017 | P3 | Add manual project editor | completed | T015 | - | yes |
| T018 | P3 | Export edited resume state to JSON | completed | T017 | - | yes |
| T019 | P3 | Separate right-button canvas pan from left-button node drag | completed | T018 | - | yes |
| T020 | P3 | Make root labels directly draggable | completed | T019 | - | yes |
| T021 | P3 | Make skill-root spread predominantly straight-line | completed | T020 | - | yes |
| T022 | P3 | Make trunk-to-project branches straight-line | superseded | T021 | - | yes |
| T023 | P3 | Shape the full tree like an organic branching silhouette | completed | T022 | - | yes |
| T024 | P3 | Spread project boughs outward from the trunk | completed | T023 | - | yes |

## Dependency Map

`T014 -> T015 -> {T016, T017 -> T018 -> T019 -> T020 -> T021 -> T022 -> T023 -> T024}`

## Task Details

### T014 Balance branches and card space by content density

status: completed
phase: P1
priority: high
depends_on: -
parallel_group: -
selected: yes

#### Goal

Give dense branches central depth and sparse branches outward spread without clipping project cards.

#### Scope

- Adjust only branch/card geometry and related comments in `buildViz()`.
- Expand the root-fan geometry from four fixed angles to six non-overlapping root sectors.
- Add `tests/resume-tree-check.mjs` for source/data geometry assertions.
- Do not change resume data or interactions.

#### Acceptance Criteria

- At seam `M: Embedded Resume Tree`, project distance is a deterministic function of linked-skill count, dense branches remain closer to the trunk, and every card stays inside the A4 canvas.
- Card width and height preserve full name, description, and result text without changing project data.
- Six root categories receive distinct fan angles with no fallback to angle zero.

#### Validation

commands:
- `node tests/resume-tree-check.mjs --layout`
result: passed

### T015 Reorganize content into six stable domains

status: completed
phase: P2
priority: high
depends_on: T014
parallel_group: -
selected: yes

#### Goal

Normalize the existing skill content under the supplied six-domain resume narrative.

#### Scope

- Update `SKILL_DATA`, `CAT`, default editor category, terminology, and project references only where IDs require reconciliation.
- Preserve existing verified project descriptions/results and all reusable skill nodes.
- Back up legacy `resumeTreeOutlineV1`, then use a versioned `resumeTreeOutlineV2` default so four-root stored outlines cannot override six-root data.

#### Acceptance Criteria

- At seam `M: Embedded Resume Tree`, the six roots are Embedded Firmware; Control & Power Conversion; Hardware & Test Systems; Modelling & Digital Twin; AI Engineering; Engineering Process & Standards.
- Every `PROJECTS.activeSkills` ID resolves to a skill node, and category colours exist for all six roots.
- Equipment brands are not top-level knowledge roots; verified metrics remain project evidence.
- All 95 baseline skill IDs remain unless an explicit remap is listed; project `name`, `year`, `desc`, and `result` fields remain byte-equivalent.
- Fresh storage loads six roots; legacy outline storage is preserved under a backup key and does not override the new taxonomy.

#### Validation

commands:
- `node tests/resume-tree-check.mjs --content`
result: passed

### T016 Verify interactive and A4 visual layout

status: blocked
phase: P3
priority: high
depends_on: T015
parallel_group: -
selected: yes

#### Goal

Verify the integrated original-framework result visually without further feature work.

#### Acceptance Criteria

- At seam `M: Embedded Resume Tree`, all project cards remain within the canvas and each card satisfies `scrollHeight <= clientHeight` for its text container.
- Six root sectors are visually distinct, dense branches read as deeper/central, labels have no critical overlap, and A4 print preview has no clipping.
- Existing selection, drag, zoom/pan, outline/manual editors, and project-to-skill highlighting still operate.

#### Validation

commands:
- Documented browser check: interactive 760x1050 canvas plus A4 portrait print preview; evaluate card overflow and canvas bounds in page context.
result: pending

### T017 Add manual project editor

status: completed
phase: P3
priority: high
depends_on: T015
parallel_group: -
selected: yes

#### Goal

Allow manual editing of every above-ground project without changing the original renderer.

#### Acceptance Criteria

- The toolbar opens a project panel for selecting and editing name, year, description, result, and linked skill IDs.
- Changes persist in `resumeTreeProjectsV1`, invalid skill IDs are ignored, selected projects can be reset, and the panel is hidden in print mode.

#### Validation

commands:
- `node tests/resume-tree-check.mjs --editor`
result: passed

### T018 Export edited resume state to JSON

status: completed
phase: P3
priority: high
depends_on: T017
parallel_group: -
selected: yes

#### Goal

Download all edited resume data and layout state as one JSON file.

#### Acceptance Criteria

- SAVE JSON exports the resolved skill tree, projects, outline, drag positions, link styles, and custom nodes/links.

#### Validation

commands:
- `node tests/resume-tree-check.mjs --editor`
result: passed

### T019 Separate right-button canvas pan from left-button node drag

status: completed
phase: P3
priority: high
depends_on: T018
parallel_group: -
selected: yes

#### Goal

Make blank-area right-drag pan the canvas while node dragging remains left-button only.

#### Acceptance Criteria

- Right-button pointer-down starts pan and suppresses the browser context menu.
- Left-button pointer-down remains the only node/card drag path.

#### Validation

commands:
- `node tests/resume-tree-check.mjs --pan`
result: passed

### T020 Make root labels directly draggable

status: completed
phase: P3
priority: high
depends_on: T019
parallel_group: -
selected: yes

#### Goal

Allow both root circles and their visible labels to move through the existing left-button drag path.

#### Acceptance Criteria

- Root labels call `dragStart` with the matching `n:<root-id>` key on left-button pointer-down.
- Existing right-button blank-area pan and root-circle dragging remain unchanged.

#### Validation

commands:
- `node tests/resume-tree-check.mjs --root-drag`
result: passed

### T021 Make skill-root spread predominantly straight-line

status: completed
phase: P3
priority: high
depends_on: T020
parallel_group: -
selected: yes

#### Goal

Use straight segments for the skill-root trunk stems and label leaders so the lower tree reads as a radiating linear spread.

#### Acceptance Criteria

- Trunk stems and root label leader paths use line commands.
- Existing straight/curved/stepped link style selection remains available for explicit link overrides.

#### Validation

commands:
- `node tests/resume-tree-check.mjs --straight`
result: passed

### T022 Make trunk-to-project branches straight-line

status: superseded
phase: P3
priority: high
depends_on: T021
parallel_group: -
selected: yes

#### Goal

Change the above-ground branches from the central trunk to project cards into direct spreading segments.

#### Acceptance Criteria

- Each trunk-to-project path uses a straight SVG line segment to the card ellipse.
- Project card position, selection, editing, and dragging remain unchanged.

#### Validation

commands:
- `node tests/resume-tree-check.mjs --project-straight`
result: passed

### T023 Shape the full tree like an organic branching silhouette

status: completed
phase: P3
priority: high
depends_on: T022
parallel_group: -
selected: yes

#### Goal

Match the supplied tree reference with a visually weighted trunk and curved branches that sweep toward project cards.

#### Acceptance Criteria

- The central trunk has visibly heavier stems and project branches use smooth cubic curves.
- Curved root style is the default while explicit straight and stepped styles remain available.
- Project card position, selection, editing, and dragging remain unchanged.

#### Validation

commands:
- `node tests/resume-tree-check.mjs --organic-tree`
result: passed

### T024 Spread project boughs outward from the trunk

status: completed
phase: P3
priority: high
depends_on: T023
parallel_group: -
selected: yes

#### Goal

Make each project branch leave the trunk at a distinct offset and carry a stronger outward sweep, matching the reference tree silhouette.

#### Acceptance Criteria

- Branch start positions vary by row and side instead of converging at the trunk center.
- Cubic control points push each branch outward before it reaches the project card.
- Project card position, selection, editing, and dragging remain unchanged.

#### Validation

commands:
- `node tests/resume-tree-check.mjs --branch-spread`
result: passed

## Execution Log

| Date | Task | Action | Result | Ledger row |
|---|---|---|---|---|
| 2026-08-22 | T020 | Root category labels now start the existing left-button node drag path; regression assertion passes. | completed | T020 |
| 2026-08-22 | T021 | Skill-root trunk stems and label leaders changed to straight segments; regression assertions pass. | completed | T021 |
| 2026-08-22 | T022 | Above-ground trunk-to-project branches changed from curves to direct line segments; regression assertions pass. | completed | T022 |
| 2026-08-22 | T023 | Applied organic tree silhouette: weighted trunk, curved project branches, and curved default root style; regression assertions pass. | completed | T023 |
| 2026-08-22 | T024 | Spread project branch origins and control points outward from the trunk; regression assertions pass. | completed | T024 |
| 2026-08-22 | T019 | Right-button canvas pan and left-button node drag separation added; interaction assertions pass. | completed | T019 |
| 2026-08-02 | T018 | Added native combined JSON download for edited content and layout. | completed | T018 |
| 2026-08-02 | T017 | Added persisted manual project editor with validated skill mappings and reset support. | completed | T017 |
| 2026-08-02 | T016 | Automated local-file browser inspection was rejected by browser security policy; user visual verification required. | blocked | T016 |
| 2026-08-02 | T015 | Six-domain taxonomy, 95-ID preservation, unchanged project evidence, valid mappings, and V1 backup/V2 migration passed. | completed | T015 |
| 2026-08-02 | T015 | T014 validated; T015 started. | in_progress | T015 |
| 2026-08-02 | T014 | Added six-sector root fan, density-only branch distance, shared card bounds, and passing layout assertions. | completed | T014 |
| 2026-08-02 | T014 | Gate A approved T014-T016; T014 started. | in_progress | T014 |
| 2026-08-02 | planning | Re-scoped prior broad plan to original-framework layout and content optimization. | passed | Context + Think + Plan |

## Deferred Items

- Search, comparison mode, new PDFs, ATS output, and unverified metrics are outside this optimization.

## Handoff Summary

current_goal: Optimize original-framework layout and content.
selected_tasks: T014,T015,T016,T017,T018,T019,T020,T021,T022,T023,T024
completed_tasks: T014,T015,T017,T018,T019,T020,T021,T023,T024
in_progress_task: none
blocked_tasks: T016 waiting for local-file visual verification
last_validated_checkpoint: T024, branch-spread/organic-tree/link-style/root-drag/pan/editor/layout/content assertions passed
files_changed: plan.md, rs_portrait.html, tests/resume-tree-check.mjs, agy_result.md
commands_run: source inspection; workflow reference reads; node tests/resume-tree-check.mjs --layout; node tests/resume-tree-check.mjs --content; node tests/resume-tree-check.mjs --editor; node tests/resume-tree-check.mjs --pan; node tests/resume-tree-check.mjs --root-drag; node tests/resume-tree-check.mjs --straight; node tests/resume-tree-check.mjs --organic-tree; node tests/resume-tree-check.mjs --branch-spread; git diff --check
next_action: User reloads local page, tests project editing, and checks T016 visual criteria.
do_not_repeat: Do not replace the generated framework or remove nested skill data.
deferred_items: search, compare, additional output formats, unverified metrics
open_risks: actual card text overflow and A4 clipping remain visually unverified because automated file URL access is blocked.
