import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext, Script } from "node:vm";

const mode = process.argv[2];
assert.ok(["--layout", "--content", "--editor", "--pan", "--root-drag", "--straight", "--organic-tree", "--branch-spread"].includes(mode), "usage: node tests/resume-tree-check.mjs --layout|--content|--editor|--pan|--root-drag|--straight|--organic-tree|--branch-spread");

const source = readFileSync(new URL("../rs_portrait.html", import.meta.url), "utf8");
const unpack = url => JSON.parse(readFileSync(url, "utf8").match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/)[1]);
const page = unpack(new URL("../rs_portrait.html", import.meta.url));
const readObject = (text, name, next) => {
  const block = text.slice(text.indexOf(`const ${name} =`) + `const ${name} =`.length, text.indexOf(`const ${next} =`)).trim().replace(/;$/, "");
  return runInNewContext(`(${block})`);
};

if (mode === "--editor") {
  const dcScript = page.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(dcScript, "embedded app script not found");
  new Script(dcScript);
  for (const seam of [
    "PROJECT EDITOR", "toggleProjectPanel", "projectOptions", "onProjectName",
    "onProjectYear", "onProjectDesc", "onProjectResult", "onProjectSkills",
    "resumeTreeProjectsV1", "PROJECT_DEFAULTS", "persistProjects()", "resetProject(id)",
    "SAVE JSON", "exportResume()", "URL.createObjectURL", "resume-tree-"
  ]) assert.ok(page.includes(seam), `missing project editor seam: ${seam}`);
  assert.match(page, /field === "activeSkills"/);
  assert.match(page, /filter\(x => known\.has\(x\)\)/);
  assert.match(page, /#toolbar,#editpanel,#outlinepanel,#projectpanel/);
  assert.equal((page.match(/id="projectpanel"/g) || []).length, 1);
  for (const exported of ["skills: this.tree()", "projects: PROJECTS", "outline: this.state.outline", "drag: this.state.drag", "linkStyle: this.state.linkStyle", "custom: this.state.custom"])
    assert.ok(page.includes(exported), `missing exported data: ${exported}`);
  console.log("resume tree project editor checks passed");
  process.exit(0);
}

if (mode === "--pan") {
  assert.match(page, /onPanStart\(e\) \{ if \(e\.button !== 2\) return; e\.preventDefault\(\);/);
  assert.match(page, /onContextMenu\(e\) \{ e\.preventDefault\(\); \}/);
  assert.match(page, /dragStart\(e, key\) \{ if \(e\.button !== 0\) return; e\.stopPropagation\(\);/);
  assert.match(page, /sc-camel-on-context-menu="\{\{ onContextMenu \}\}"/);
  console.log("resume tree mouse interaction checks passed");
  process.exit(0);
}

if (mode === "--root-drag") {
  assert.ok(page.includes('key: "bt" + o.i, x: tx, y: ty, dy: "0.32em", onPointerDown: e => this.dragStart(e, \'n:\' + o.n.id),'), "root labels must start left-button drag");
  assert.ok(page.includes('key: "bn" + i, onPointerDown: e => this.dragStart(e, "n:" + n.id)'), "root circles must remain draggable");
  console.log("resume tree root drag checks passed");
  process.exit(0);
}

if (mode === "--straight") {
  assert.ok(page.includes('if (style === "straight") return `M${sx},${sy}L${tx},${ty}`;'), "explicit straight link style must remain available");
  console.log("resume tree link-style checks passed");
  process.exit(0);
}

if (mode === "--organic-tree") {
  assert.ok(page.includes('const bd = `M${bx},${baseY} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}`;'), "project branches must sweep organically");
  assert.ok(page.includes('strokeWidth: s === 2 || s === 3 ? 6.5 : 4.2,'), "trunk must have visual weight");
  assert.ok(page.includes('const gStyle = this.props.rootStyle || "curved";'), "curved root style must be the fallback");
  assert.ok(page.includes('&quot;rootStyle&quot;:{&quot;editor&quot;:&quot;enum&quot;,&quot;options&quot;:[&quot;straight&quot;,&quot;curved&quot;,&quot;stepped&quot;],&quot;default&quot;:&quot;curved'), "curved root style must be the default");
  console.log("resume tree organic-shape checks passed");
  process.exit(0);
}

if (mode === "--branch-spread") {
  assert.ok(page.includes('row: r, rt }'), "project layout metadata must carry branch row values");
  assert.ok(page.includes('12 + b.row * 16'), "branch spread must use stored project row");
  assert.ok(page.includes('42 - b.rt * 18'), "branch rise must use stored project ratio");
  assert.ok(page.includes('bx = cx + dir * (12 + b.row * 16)'), "project boughs must leave the trunk at spread positions");
  assert.ok(page.includes('Math.max(34, Math.abs(ex - bx) * 0.22)'), "first branch control point must spread outward");
  assert.ok(page.includes('Math.abs(ex - cx) * 0.68'), "second branch control point must carry the outward sweep");
  console.log("resume tree branch-spread checks passed");
  process.exit(0);
}

if (mode === "--content") {
  const baseline = unpack(new URL("../baseline/rs_portrait.html", import.meta.url));
  const skills = readObject(page, "SKILL_DATA", "PROJECTS");
  const baselineSkills = readObject(baseline, "SKILL_DATA", "PROJECTS");
  const projects = readObject(page, "PROJECTS", "PROJECT_DEFAULTS");
  const baselineProjects = readObject(baseline, "PROJECTS", "TIMELINE");
  assert.equal(
    page.slice(page.indexOf("const PROJECTS ="), page.indexOf("const PROJECT_DEFAULTS =")),
    baseline.slice(baseline.indexOf("const PROJECTS ="), baseline.indexOf("const TIMELINE =")),
    "project records changed"
  );
  const cats = readObject(page, "CAT", "ERA");
  const roots = [
    "Embedded Firmware", "Control & Power Conversion", "Hardware & Test Systems",
    "Modelling & Digital Twin", "AI Engineering", "Engineering Process & Standards"
  ];
  assert.deepEqual(Array.from(skills.children, n => n.name), roots);
  assert.deepEqual(Object.keys(cats), roots);

  const ids = tree => { const out = []; (function walk(n) { if (n.id) out.push(n.id); (n.children || []).forEach(walk); })(tree); return out; };
  const currentIds = ids(skills), baselineIds = ids(baselineSkills);
  assert.equal(currentIds.length, 95);
  assert.equal(new Set(currentIds).size, 95);
  assert.deepEqual([...currentIds].sort(), [...baselineIds].sort());
  const known = new Set(currentIds);
  for (const [id, project] of Object.entries(projects)) {
    assert.ok(project.activeSkills.every(skill => known.has(skill)), `${id} has an unresolved skill`);
    for (const field of ["name", "year", "desc", "result"])
      assert.equal(project[field], baselineProjects[id][field], `${id}.${field} changed`);
  }

  assert.match(page, /newCat: "Embedded Firmware"/);
  assert.match(page, /const legacy = localStorage\.getItem\("resumeTreeOutlineV1"\)/);
  assert.match(page, /localStorage\.setItem\("resumeTreeOutlineV1Backup", legacy\)/);
  assert.match(page, /outline = localStorage\.getItem\("resumeTreeOutlineV2"\)/);
  assert.match(page, /localStorage\.setItem\("resumeTreeOutlineV2", t\)/);
  assert.match(page, /localStorage\.removeItem\("resumeTreeOutlineV2"\)/);
  assert.doesNotMatch(page, /localStorage\.removeItem\("resumeTreeOutlineV1"\)/);
  console.log("resume tree content checks passed");
  process.exit(0);
}

const angles = source.match(/const catAng = \[([^\]]+)\]/)?.[1].split(",").map(Number);
assert.deepEqual(angles, [1.28, 0.82, 0.34, -0.34, -0.82, -1.28]);
assert.equal(new Set(angles).size, 6, "root fan angles must be distinct");
assert.match(source, /catAng\[i\]/);
assert.doesNotMatch(source, /catAng\[i\] != null \? catAng\[i\] : 0/);

assert.match(source, /const projectDistance = imp => 350 - Math\.min\(90, Math\.max\(0, imp - 3\) \* 18\)/);
assert.match(source, /const cardW = 166, cardH = 118, erx = 98, ery = 72/);
assert.match(source, /width: cardW \+ \\"px\\", height: cardH \+ \\"px\\"/);
assert.match(source, /x: b\.tipX - cardW \/ 2, y: b\.tipY - cardH \/ 2, width: cardW, height: cardH/);
const counts = [...source.matchAll(/activeSkills: \[([^\]]*)\]/g)].map(m => [...m[1].matchAll(/"s_[^"]+"/g)].length);
assert.ok(counts.length >= 10, "project skill mappings not found");
const distance = imp => 350 - Math.min(90, Math.max(0, imp - 3) * 18);
const ranked = [...new Set(counts)].sort((a, b) => a - b).map(distance);
assert.ok(ranked.every((d, i) => i === 0 || d <= ranked[i - 1]), "denser projects must stay closer to the trunk");

const W = 900, H = 1330, groundY = 690, trunkTop = 58;
const cardHalfW = 166 / 2, cardHalfH = 118 / 2, margin = 10;
const projectCount = counts.length, rowsPerSide = Math.ceil(projectCount / 2);
for (const [k, imp] of counts.entries()) {
  const dist = distance(imp);
  for (const x of [W / 2 - dist, W / 2 + dist]) {
    const tipX = Math.max(cardHalfW + margin, Math.min(W - cardHalfW - margin, x));
    assert.ok(tipX - cardHalfW >= 0 && tipX + cardHalfW <= W, "card must stay inside canvas");
  }
  const row = Math.floor(k / 2), ratio = rowsPerSide > 1 ? row / (rowsPerSide - 1) : 0;
  const baseY = groundY - 16 - ratio * (groundY - trunkTop - 124);
  const tipY = Math.max(72 + 12, baseY - (66 + ratio * 18));
  assert.ok(tipY - cardHalfH >= 0 && tipY + cardHalfH <= H, "card must stay inside canvas");
}

for (const interaction of ["dragStart(", "onWheel(", "toggleOutline", "togglePanel", "selected:"])
  assert.ok(source.includes(interaction), `missing interaction seam: ${interaction}`);

console.log("resume tree layout checks passed");
