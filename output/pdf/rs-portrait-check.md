# rs_portrait browser check

Mode: final
Source: C:\Data\Code\HTML_Resume\rs_portrait.html

## Measurements
- Taxonomy: 95 nodes including category roots; browser outline rows: 95.
- Projects: 10 live options; static records: 10.
- SVG/project geometry: 97 SVG texts (97 measurable); overlaps: 0; clipped text: 0; foreignObjects: 10; clipped cards: 0; project text overflows: 0.
- Temporary view before print: flex: 0 0 auto; zoom: 0.811429; transform: translate(60px, 30px) scale(1.3225); transform-origin: center center; transition: transform 0.08s;.
- Print view: flex: 0 0 auto; zoom: 1; transform: translate(0px, 0px) scale(1); transform-origin: center center; transition: transform 0.08s;; controls hidden: true; backgrounds: rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255).
- PDF: 1 page(s); 594.96 x 841.92 pts (A4); extracted markdown: 3444 characters.

## Check results
- PASS taxonomy IDs preserved: 95 IDs; count matches
- PASS project data has 10 entries: 10 project records in the bundled data
- PASS file:// stays offline: no external requests
- PASS bundler errors absent: none
- PASS generated DOM replaced loader: loading UI and live thumbnail are gone after hydration
- PASS live taxonomy is present: 95 outline rows; SKILL TREE 95 nodes
- PASS live UI exposes 10 projects: 10 project options
- PASS project editing persists to localStorage: edited project found in resumeTreeProjectsV1
- PASS skill dropdown adds and excludes duplicates: selected skill added; picker resets and excludes linked skills
- PASS dropdown skill persists: saved to project storage
- PASS JSON export smoke check: version 2; 10 projects; blob=true size=15372 clicked=true; page errors=none
- PASS export contains clean, complete skill data: all skill IDs, without rendering metadata
- PASS category drag carries descendants: category and child moved 38.1, 19.1 SVG units
- PASS drag persists after reload: saved offsets restored
- PASS reset restores category layout: default positions restored
- PASS skill keyboard action opens branch menu: Enter opens the existing branch-style editor
- PASS keyboard focus enters branch menu: native option button focused
- PASS branch-style edit persists: selected link style saved
- PASS root branch style changes geometry: root style changes its path
- PASS selection smoke check: clicking a generated SVG label exposes Clear selection
- PASS SVG text and project geometry: 97 SVG texts (97 measurable); 0 overlaps; 0 clipped; 10 foreignObjects; 0 card bounds clipped; 0 project text overflows
- PASS all skill labels are visible: 95 labels
- PASS all category roots start at the center: six roots originate at the center of the ground line
- PASS staggered projects have independent rising traces: 10 separate vertical/diagonal routes into top corners; no downward hooks, pins, or traces through blocks
- PASS light résumé uses one root accent: white paper with one muted green accent for every skill category
- PASS roots occupy 25–30% of the résumé: 29.56% of content height; complete roots below ground and project chips above it
- PASS project text stays inside chip packages: all text corners inside their chip packages
- PASS temporary zoom/pan/selection applied: flex: 0 0 auto; zoom: 0.811429; transform: translate(60px, 30px) scale(1.3225); transform-origin: center center; transition: transform 0.08s;
- PASS screen depth can be collapsed: L2 hides deeper nodes on screen
- PASS print resets temporary zoom/pan: flex: 0 0 auto; zoom: 1; transform: translate(0px, 0px) scale(1); transform-origin: center center; transition: transform 0.08s;
- PASS print hides editing controls: toolbar and panels hidden in print media
- PASS print background is white: rgb(255, 255, 255) / rgb(255, 255, 255) / rgb(255, 255, 255)
- PASS skill text prints at least 9pt: 9.17 pt
- PASS print restores full taxonomy at collapsed depth: all 95 nodes printed
- PASS printed roots occupy 25–30% of A4: 28.12% of A4 height; 29.72% of printable content; no root or canopy overflow
- PASS all interactions remain error-free: no runtime errors
- PASS PDF is exactly one A4 page: 1 page(s); 594.96 x 841.92 pts (A4)
- PASS PDF contains selectable text: 3444 extracted markdown characters
- PASS PDF rendering completed: rendered

## Remaining issues
- None measured.

Final mode treats the checks above as release gates.
