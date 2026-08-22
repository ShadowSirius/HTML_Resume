# HTML_Resume

- Entry: `rs_portrait.html` — generated packed page; the application source is embedded in `text/x-dc` and unpacked by the outer runtime.
- Core behavior: `Component.buildViz` renders the portrait resume tree; `SKILL_DATA` and `PROJECTS` provide the taxonomy and project evidence.
- Editing: outline/manual node controls, project editor, localStorage persistence, drag state, link-style state, and combined JSON export.
- Validation: `tests/resume-tree-check.mjs` provides dependency-free structural/content/interaction assertions.
- Runtime constraint: retain the generated wrapper and `file://` compatibility; no framework, server, fetch, or external data dependency is required.
