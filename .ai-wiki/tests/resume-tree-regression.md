---
id: test.resume_tree.regression
type: test
status: verified
source_commit: 6b8c054
source_symbols:
  - tests/resume-tree-check.mjs::mode dispatch
validates: [feature.resume_tree.renderer, feature.resume_tree.editing, invariant.resume_tree.preservation]
tokens_hint: 150
---

# test.resume_tree.regression

## Summary

Dependency-free Node assertions validate packed-template integrity, layout geometry, six-root content, editor/export seams, pointer-button behavior, root dragging, organic tree shape, and outward project branch spread.

## Validation commands

- `node tests/resume-tree-check.mjs --layout`
- `node tests/resume-tree-check.mjs --content`
- `node tests/resume-tree-check.mjs --editor`
- `node tests/resume-tree-check.mjs --pan`
- `node tests/resume-tree-check.mjs --root-drag`
- `node tests/resume-tree-check.mjs --straight`
- `node tests/resume-tree-check.mjs --organic-tree`
- `node tests/resume-tree-check.mjs --branch-spread`

## Modification impact

Run the full command set after changing embedded renderer strings; the outer wrapper is JSON-packed and can fail before the app loads if escaping is damaged.
