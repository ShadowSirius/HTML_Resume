---
id: feature.resume_tree.editing
type: feature
status: verified
source_commit: 8f7d475
source_symbols:
  - rs_portrait.html::Component.updateProject
  - rs_portrait.html::Component.setOutline
  - rs_portrait.html::Component.exportResume
depends_on: [data.resume_tree.content, invariant.resume_tree.preservation]
used_by: [test.resume_tree.regression]
tokens_hint: 190
---

# feature.resume_tree.editing

## Summary

Provides manual project editing, outline editing, custom node/link controls, position persistence, reset actions, and a combined JSON download for content plus layout state.

## Constraints

- Project `activeSkills` is filtered against known skill IDs.
- Project editor writes `resumeTreeProjectsV1`; outline migration uses V1 backup and V2 storage.
- Export includes skills, projects, outline, drag offsets, link styles, and custom nodes/links.
- Print mode hides editing panels.

## Modification impact

Changes to state keys, export fields, or migration logic can lose user edits. Validate with [[test.resume_tree.regression]] before commit.

## Sources

- `rs_portrait.html::Component.updateProject`
- `rs_portrait.html::Component.setOutline`
- `rs_portrait.html::Component.exportResume`
