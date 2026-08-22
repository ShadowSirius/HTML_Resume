---
id: invariant.resume_tree.preservation
type: invariant
status: verified
source_commit: 8f7d475
source_symbols:
  - tests/resume-tree-check.mjs::content assertions
  - rs_portrait.html::Component.constructor
depends_on: [data.resume_tree.content]
used_by: [feature.resume_tree.renderer, feature.resume_tree.editing, test.resume_tree.regression]
tokens_hint: 160
---

# invariant.resume_tree.preservation

## Summary

Layout and editor changes must preserve the verified resume content and user-edit migration path.

## Invariants

- Baseline skill ID set remains exactly 95 unique IDs.
- Project evidence fields remain unchanged and project skill mappings resolve.
- Legacy `resumeTreeOutlineV1` is copied to a backup key; V2 is the active outline storage.
- Exported state contains both content and editable layout state.

## Validated by

- [[test.resume_tree.regression]]
