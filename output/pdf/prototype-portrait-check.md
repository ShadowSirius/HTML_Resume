# Portrait prototype PDF QA

- Result: **PASS**
- PDF: `output/pdf/prototype-portrait.pdf`
- Browser: Playwright Chromium, headless; A4 CSS page size; 100%; headers/footers disabled; print backgrounds disabled.
- HTML SHA256: `AEC96B2D02E71A40436363071DC4F879A048231B89D142ED3EBF7E371016DA69`
- Section boxes include planned internal gaps: identity 38 mm + achievements 116 mm + skills 88 mm + background 31 mm = 273 mm.

- PASS: exactly 1 page
- PASS: A4 portrait 594.960 x 841.920 pt
- PASS: 360px screen has no horizontal overflow (360/360px)
- PASS: minimum visible print font 14.00px (>=10.5pt)
- PASS: selectable text extracted (1406 chars)
- PASS: text bounds 33.7, 41.3, 553.7, 769.1pt; minimum edge delta -0.3pt vs 12mm CSS margin (<=0.5pt font rounding allowed)
- PASS: content label present: Technical achievements
- PASS: content label present: Skills
- PASS: content label present: Embedded Firmware
- PASS: content label present: AI Engineering
- PASS: print DOM height 1032px fits A4 CSS height
- PASS: section boxes total 273.0mm (identity 38.0, achievements 116.0, skills 88.0, background 31.0mm)
- PASS: contact block ends 10.1px before identity boundary
- PASS: achievement heading gap 22.7px (>=6mm minus rounding)
- PASS: grayscale/background-off render readable (34777 non-white pixels; white background retained)

- Source: `prototype-portrait.html`
