---
id: data.resume_tree.content
type: data
status: verified
source_commit: 8f7d475
source_symbols:
  - rs_portrait.html::SKILL_DATA
  - rs_portrait.html::PROJECTS
  - rs_portrait.html::CAT
used_by: [feature.resume_tree.renderer, feature.resume_tree.editing]
related: [invariant.resume_tree.preservation]
tokens_hint: 170
---

# data.resume_tree.content

## Summary

Embedded resume taxonomy and project evidence. The current taxonomy has six roots: Embedded Firmware; Control & Power Conversion; Hardware & Test Systems; Modelling & Digital Twin; AI Engineering; Engineering Process & Standards.

## Constraints

- All 95 baseline skill IDs remain unique and resolvable.
- All project `activeSkills` references resolve to the current skill tree.
- Project `name`, `year`, `desc`, and `result` fields remain byte-equivalent to baseline.
- Category color keys cover every root.

## Sources

- `rs_portrait.html::SKILL_DATA`
- `rs_portrait.html::PROJECTS`
- `rs_portrait.html::CAT`
