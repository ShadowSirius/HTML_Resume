# architecture.dependencies

- `feature.resume_tree.renderer` → `data.resume_tree.content`
- `feature.resume_tree.renderer` → `invariant.resume_tree.preservation`
- `feature.resume_tree.editing` → `data.resume_tree.content`
- `feature.resume_tree.renderer` → `test.resume_tree.regression`
- `feature.resume_tree.editing` → `test.resume_tree.regression`
- `test.resume_tree.regression` → `invariant.resume_tree.preservation`
- `feature.resume_tree.renderer` → `risk.resume_tree.visual_qa`
