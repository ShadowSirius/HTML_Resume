---
id: risk.resume_tree.visual_qa
type: risk
status: manual
source_commit: 8f7d475
source_symbols:
  - plan.md::T016
related: [feature.resume_tree.renderer, test.resume_tree.regression]
tokens_hint: 120
---

# risk.resume_tree.visual_qa

## Summary

Automated checks cannot fully prove `file://` browser rendering, text overflow, pointer feel, or A4 print clipping.

## Mitigation

Open `rs_portrait.html` locally and verify: project-card text is not clipped, curved branches remain readable, root sectors do not overlap critically, left node drag/right blank-area pan work, and A4 print preview fits the portrait canvas.
