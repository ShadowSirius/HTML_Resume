# A4 Portrait Resume — Prototype Plan

Status: complete. Implemented and reviewed by three GPT-5.6 Luna agents at High reasoning, coordinated by the orchestrator.

## Objective

Create a readable one-page portrait resume showing selected technical achievements and an independent inventory of skills. Preserve the idea of accomplishments above a skill foundation, without revealing which skills belong to which project.

This is a new prototype direction. The existing `plan.md` describes the earlier interactive tree implementation and remains its historical record.

## Page layout

- A4 portrait: 210 × 297 mm.
- Margins: 12 mm; usable area: 186 × 273 mm.
- Reading order: identity → technical achievements → skills → background.
- The dimensions below are initial space budgets; adjust after fitting real content.

| Section | Height | Content |
|---|---:|---|
| Identity | 38 mm | Name, target role, short professional summary, contact links |
| Gap | 6 mm | Whitespace |
| Technical achievements | 110 mm | Section heading and three vertically stacked achievement summaries |
| Gap | 6 mm | Whitespace |
| Skills | 82 mm | Section heading and six categories in two columns × three rows |
| Gap | 6 mm | Whitespace |
| Background | 25 mm | Compact experience and education; dates retained where appropriate |

Total: 273 mm. Section heights include their internal spacing.

## Content

### Technical achievements

Use three selected accomplishments. Give each a short technical headline followed by two concise statements:

1. **Contribution:** the engineering problem addressed and your personal contribution.
2. **Result:** an outcome you can disclose, using a verified metric only when available and appropriate.

Aim for 35–50 English words per achievement, including the headline. Use neutral placeholders in the first prototype; carry across existing factual content only after reviewing it for this presentation. Do not invent achievements or measurements.

Order by relevance to the target role. Omit project identifiers and technology-stack lists from these blocks. Keep each accomplishment understandable on its own.

### Skills

Use the six domains recorded in the existing project plan:

- Embedded Firmware
- Control & Power Conversion
- Hardware & Test Systems
- Modelling & Digital Twin
- AI Engineering
- Engineering Process & Standards

Start with three to four relevant skill names per category, expressed as short inline lists. Preserve the full existing taxonomy in the source material; the one-page view is a curated selection. Group and order skills by domain, independently of achievement order.

### Identity and background

Use a specific professional role and one sentence describing the engineering value offered. Keep contact information selectable and clickable. Reserve the footer for a compact professional and educational background; do not introduce project-specific chronology there.

## Visual treatment

- White paper, dark text, and one restrained forest-green accent for section headings.
- Name: 22–24 pt; section headings: 12–13 pt; body: 10.5–11 pt with approximately 1.3 line spacing.
- Achievements use clear headlines, whitespace, and light horizontal separators.
- Skills use six text groups with a clear category/detail hierarchy.
- No matching colors, codes, branches, aligned project/skill lanes, or skill proficiency bars.
- Start with typography and spacing. An optional faint tree silhouette may be considered after content fits, provided it does not connect items or interfere with text.

## Prototype implementation

1. Create a standalone `prototype-portrait.html` using semantic HTML and native CSS, without adding dependencies or changing the existing tree application.
2. Populate three achievement placeholders and the six skill categories. Keep achievement and skill content independent.
3. Fit the selected factual content within the page budget. Shorten wording and reduce the displayed skill selection before reducing font size.
4. Add A4 print CSS and verify the browser's PDF output. Keep any screen-only controls outside the printed page.

The shareable HTML must omit project-to-skill mapping fields and linked IDs entirely, including scripts, DOM attributes, and exports. Removing visible connectors alone is insufficient for the intended separation. Do not add cross-highlighting interactions.

## Acceptance checks

- PDF output contains exactly one A4 portrait page at 100% scale, with browser headers and footers disabled.
- All content stays within the 12 mm margins; no clipped text, overlaps, or extra blank page.
- Body text remains at least 10.5 pt, selectable, and readable in grayscale.
- Three achievements and all six skill categories are identifiable at a glance.
- No visual, interactive, or embedded data mapping connects skills to achievements.
- Content remains meaningful when printed without background graphics.
- Existing resume files and their full skill taxonomy remain intact.

## Deliverables for the implementation stage

- One standalone portrait HTML prototype.
- One verified A4 PDF proof.

Landscape layout and interactive editing are outside this portrait prototype.

## Execution record

- Layout agent: standalone HTML and print styles.
- Content review agent: verified skill selection and independent content/privacy review.
- Print validation agent: browser PDF generation, visual inspection, and repeatable checks.
- Orchestrator: coordinates fixes, verifies delivered scope, and records completion.

Identity, background, and achievement content remain explicit placeholders in this first prototype. Skill labels may be curated from the existing taxonomy without importing project associations.

Visual review increased the identity budget from 30 to 38 mm and reduced the skills budget from 90 to 82 mm, retaining the same 273 mm content height while allowing the summary to wrap without crowding the next section.

### Completed deliverables and verification

- HTML: `prototype-portrait.html`.
- PDF proof: `output/pdf/prototype-portrait.pdf`.
- Measured QA report: `output/pdf/prototype-portrait-check.md`.
- Repeatable browser/PDF check: `tmp/portrait-prototype/check.mjs`.
- Verified one A4 portrait page, 12 mm CSS print margins (0.5 pt allowance for PDF/font rounding), minimum 10.5 pt visible text, selectable text, and no horizontal overflow at 360 px screen width.
- Verified that the contact block fits its section and the following heading retains the 6 mm section gap. Final PDF visually inspected after the spacing correction; background-off and grayscale output checked.
- Reviewed content for absence of skill/project mappings. Verified skill names are included; identity, achievements, and background remain placeholders.
- Original tracked resume files, baseline, and historical plan are unchanged.

Final HTML SHA256: `AEC96B2D02E71A40436363071DC4F879A048231B89D142ED3EBF7E371016DA69`.
