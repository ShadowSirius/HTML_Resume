---
id: feature.resume_tree.renderer
type: feature
status: verified
source_commit: 8f7d475
source_symbols:
  - rs_portrait.html::Component.buildViz
  - rs_portrait.html::Component.visibleTree
  - rs_portrait.html::Component.dragStart
depends_on: [data.resume_tree.content, invariant.resume_tree.preservation]
used_by: [test.resume_tree.regression]
related: [risk.resume_tree.visual_qa]
tokens_hint: 220
---

# feature.resume_tree.renderer

## Summary

Renders the portrait resume as an embedded SVG/foreignObject tree. The upper experience side uses weighted trunk stems and outward cubic project boughs; the lower skill side uses categorized root geometry. Root labels, root nodes, and project cards share the drag registry.

## Constraints

- Preserve the generated packed wrapper and embedded `text/x-dc` runtime.
- Project card boxes remain clamped to the 900×1330 internal canvas.
- Root style supports curved default plus explicit straight/stepped overrides.
- Blank-area right-button drag pans; node/card left-button drag moves a node.

## Modification impact

Changes affect visual hierarchy, card readability, drag coordinates, selection highlighting, and A4 print output. Run [[test.resume_tree.regression]] and perform the manual visual check in [[risk.resume_tree.visual_qa]].

## Sources

- `rs_portrait.html::Component.buildViz`
- `rs_portrait.html::Component.dragStart`
