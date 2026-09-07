import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext, Script } from "node:vm";

const mode = process.argv[2];
assert.ok(["--layout", "--content", "--editor", "--pan", "--root-drag", "--straight", "--organic-tree", "--branch-spread"].includes(mode), "usage: node tests/resume-tree-check.mjs --layout|--content|--editor|--pan|--root-drag|--straight|--organic-tree|--branch-spread");

if (["--layout","--root-drag","--straight","--organic-tree","--branch-spread"].includes(mode)) {
  execFileSync(process.execPath, [fileURLToPath(new URL("./portrait-browser-check.mjs", import.meta.url)), "--final"], {stdio: "inherit"});
  process.exit(0);
}

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
