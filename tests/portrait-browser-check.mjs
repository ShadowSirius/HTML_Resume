import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const qaDir = resolve(root, "tmp/portrait-tree-qa");
const pdfPath = resolve(root, "output/pdf/rs-portrait.pdf");
const reportPath = resolve(root, "output/pdf/rs-portrait-check.md");
const htmlPath = resolve(root, "rs_portrait.html");
const browserPath = "C:/Users/HML/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe";
const playwrightBase = "C:/Users/HML/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json";
const pdfPlugin = resolve(homedir(), '.codex/plugins/cache/openai-primary-runtime/pdf');
const markerPath = readdirSync(pdfPlugin).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))
  .map(version=>resolve(pdfPlugin,version,'skills/pdf/container_tools/mark_artifact_operation_started.mjs')).find(existsSync);
if (!markerPath) throw new Error('PDF operation marker is missing from the installed PDF plugin');
const markitdownPath = "C:/Py_venv/.venv/Scripts/markitdown.exe";
const finalMode = process.argv.includes("--final");
const checks = [];

mkdirSync(qaDir, { recursive: true });
mkdirSync(dirname(pdfPath), { recursive: true });

const requireFromRuntime = createRequire(playwrightBase);
const { chromium } = requireFromRuntime("playwright");

function check(name, pass, detail) {
  checks.push({ name, pass: !!pass, detail });
  return !!pass;
}

function unpack(file) {
  const source = readFileSync(file, "utf8");
  const match = source.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
  return match ? JSON.parse(match[1]) : source;
}

function readObject(page, name, next) {
  const start = page.indexOf(`const ${name} =`) + `const ${name} =`.length;
  const end = page.indexOf(`const ${next} =`);
  if (start < `const ${name} =`.length || end < 0) throw new Error(`missing ${name}`);
  return runInNewContext(`(${page.slice(start, end).trim().replace(/;$/, "")})`);
}

function ids(tree) {
  const out = [];
  (function walk(node) {
    if (node.id) out.push(node.id);
    (node.children || []).forEach(walk);
  })(tree);
  return out;
}

function command(name, args) {
  const result = spawnSync(name, args, { encoding: "utf8", windowsHide: true });
  return { ...result, stdout: result.stdout || "", stderr: result.stderr || "" };
}

const currentTemplate = unpack(htmlPath);
const baselinePath = resolve(root, "baseline/rs_portrait.html");
const baselineTemplate = unpack(baselinePath);
const currentSkills = readObject(currentTemplate, "SKILL_DATA", "PROJECTS");
const baselineSkills = readObject(baselineTemplate, "SKILL_DATA", "PROJECTS");
const currentTaxonomyIds = ids(currentSkills);
const baselineTaxonomyIds = ids(baselineSkills);
const currentProjects = readObject(currentTemplate, "PROJECTS", "PROJECT_DEFAULTS");
const taxonomySame = currentTaxonomyIds.length === baselineTaxonomyIds.length &&
  [...currentTaxonomyIds].sort().join("\n") === [...baselineTaxonomyIds].sort().join("\n");

check("taxonomy IDs preserved", taxonomySame, `${currentTaxonomyIds.length} IDs; ${currentTaxonomyIds.length === baselineTaxonomyIds.length ? "count matches" : `baseline has ${baselineTaxonomyIds.length}`}`);
check("project data has 10 entries", Object.keys(currentProjects).length === 10, `${Object.keys(currentProjects).length} project records in the bundled data`);

const browser = await chromium.launch({ headless: true, executablePath: browserPath });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const externalRequests = [];
const consoleErrors = [];
const pageErrors = [];

await page.route("**/*", async route => {
  const url = route.request().url();
  if (/^(file:|data:|blob:|about:|chrome:|devtools:)/i.test(url)) return route.continue();
  externalRequests.push(url);
  return route.abort();
});
page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", error => pageErrors.push(String(error)));

await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !document.querySelector("#__bundler_loading") && !!document.querySelector("#a4c svg"), null, { timeout: 15000 });
await page.waitForTimeout(150);

check("file:// stays offline", externalRequests.length === 0, externalRequests.length ? externalRequests.join(", ") : "no external requests");
check("bundler errors absent", consoleErrors.length === 0 && pageErrors.length === 0, [...consoleErrors, ...pageErrors].slice(0, 3).join(" | ") || "none");
const loaderState = await page.evaluate(() => ({
  loading: !!document.querySelector("#__bundler_loading"),
  liveThumbnail: [...document.querySelectorAll("#__bundler_thumbnail")].some(node => node.tagName !== "TEMPLATE")
}));
check("generated DOM replaced loader", !loaderState.loading && !loaderState.liveThumbnail, "loading UI and live thumbnail are gone after hydration");

const uiTaxonomy = await (async () => {
  const button = page.locator("button").filter({ hasText: "技能樹編輯" }).first();
  await button.click();
  await page.waitForSelector("#outlinepanel");
  const result = await page.evaluate(() => ({
    inputs: document.querySelectorAll("#outlinepanel input").length,
    header: document.querySelector("#outlinepanel")?.innerText.split("\n").slice(0, 2).join(" ") || ""
  }));
  await button.click();
  return result;
})();
check("live taxonomy is present", uiTaxonomy.inputs === currentTaxonomyIds.length, `${uiTaxonomy.inputs} outline rows; ${uiTaxonomy.header}`);

const projectEditor = page.locator("button").filter({ hasText: "PROJECT EDITOR" }).first();
await projectEditor.click();
await page.waitForSelector("#projectpanel");
const projectOptions = await page.locator("#projectpanel select").first().locator('option').evaluateAll(options => options.map(option => option.value));
check("live UI exposes 10 projects", projectOptions.length === 10, `${projectOptions.length} project options`);

const originalName = await page.locator("#projectpanel input").first().inputValue();
const editedName = `${originalName} QA`;
await page.locator("#projectpanel input").first().fill(editedName);
await page.waitForTimeout(80);
let editStorage = null;
try { editStorage = await page.evaluate(() => localStorage.getItem("resumeTreeProjectsV1")); } catch {}
let editSaved = false;
try {
  const saved = JSON.parse(editStorage || "{}");
  editSaved = Object.values(saved).some(project => project.name === editedName);
} catch {}
check("project editing persists to localStorage", editSaved, editStorage ? "edited project found in resumeTreeProjectsV1" : "localStorage value missing");
const skillPicker = page.locator('#project-skill-add');
const skillToAdd = await skillPicker.locator('option').nth(1).getAttribute('value');
await skillPicker.selectOption(skillToAdd);
check('skill dropdown adds and excludes duplicates',
  (await page.getByPlaceholder('Skill IDs, comma separated').inputValue()).split(', ').includes(skillToAdd) &&
  await skillPicker.locator(`option[value="${skillToAdd}"]`).count() === 0 &&
  await skillPicker.inputValue() === '', 'selected skill added; picker resets and excludes linked skills');
check('dropdown skill persists', await page.evaluate(id => Object.values(JSON.parse(localStorage.getItem('resumeTreeProjectsV1') || '{}')).some(p => p.activeSkills.includes(id)), skillToAdd), 'saved to project storage');
await page.locator("#projectpanel button").filter({ hasText: "Reset selected project" }).click();
await page.waitForTimeout(80);

await page.evaluate(() => {
  window.__portraitExportBlob = null;
  window.__portraitExportClicked = false;
  const originalCreateObjectURL = URL.createObjectURL.bind(URL);
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: blob => {
    window.__portraitExportBlob = blob;
    return originalCreateObjectURL(blob);
  }});
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) window.__portraitExportClicked = true;
    return originalAnchorClick.call(this);
  };
});
await page.locator("button").filter({ hasText: "SAVE JSON" }).click({ force: true });
await page.waitForTimeout(80);
const exportMeta = await page.evaluate(() => ({
  blob: !!window.__portraitExportBlob,
  size: window.__portraitExportBlob?.size || 0,
  clicked: window.__portraitExportClicked
}));
const exportText = await page.evaluate(async () => window.__portraitExportBlob ? window.__portraitExportBlob.text() : "");
let exported = {};
try { exported = JSON.parse(exportText); } catch {}
check("JSON export smoke check", exported.version === 2 && Object.keys(exported.projects || {}).length === 10 && exported.skills && exported.editor, `version ${exported.version}; ${Object.keys(exported.projects || {}).length} projects; blob=${exportMeta.blob} size=${exportMeta.size} clicked=${exportMeta.clicked}; page errors=${pageErrors.slice(-1)[0] || "none"}`);
check("export contains clean, complete skill data", exported.skills && ids(exported.skills).sort().join() === currentTaxonomyIds.slice().sort().join() && !/"parent"|"_cum"|"px"/.test(JSON.stringify(exported.skills)), "all skill IDs, without rendering metadata");

const clearSelection = async () => {
  if (await page.locator("button").filter({ hasText: "Clear selection" }).count())
    await page.locator("button").filter({ hasText: "Clear selection" }).first().click();
};
await clearSelection();
if (await page.locator("#projectpanel").count()) await projectEditor.click();

// Dragging a category must move its children, survive reload, and remain resettable.
const coordinates = () => page.locator('.skill-dot').evaluateAll(nodes => nodes.slice(0, 2).map(n => [Number(n.getAttribute('cx')), Number(n.getAttribute('cy'))]));
const beforeDrag = await coordinates();
const rootLabel = page.locator('.skill-label').first();
const labelBox = await rootLabel.boundingBox();
await page.mouse.move(labelBox.x + 25, labelBox.y + 7);
await page.mouse.down();
await page.mouse.move(labelBox.x + 49, labelBox.y + 19, { steps: 6 });
await page.mouse.up();
const afterDrag = await coordinates();
const dx = afterDrag[0][0] - beforeDrag[0][0], dy = afterDrag[0][1] - beforeDrag[0][1];
check("category drag carries descendants", Math.abs(dx) > 2 && Math.abs(afterDrag[1][0] - beforeDrag[1][0] - dx) < 0.1 && Math.abs(afterDrag[1][1] - beforeDrag[1][1] - dy) < 0.1, `category and child moved ${dx.toFixed(1)}, ${dy.toFixed(1)} SVG units`);
await page.reload();
await page.waitForSelector('.skill-label');
check("drag persists after reload", JSON.stringify(await coordinates()) === JSON.stringify(afterDrag), "saved offsets restored");
await page.getByRole('button', {name: '↺ Reset positions', exact: true}).click();
check("reset restores category layout", JSON.stringify(await coordinates()) === JSON.stringify(beforeDrag), "default positions restored");
await page.locator('.skill-label').first().press('Enter');
check("skill keyboard action opens branch menu", await page.getByText('LINE STYLE', {exact:true}).count() === 1, "Enter opens the existing branch-style editor");
await page.waitForFunction(() => document.activeElement?.closest('.branch-menu'));
check("keyboard focus enters branch menu", await page.evaluate(() => document.activeElement?.tagName === 'BUTTON'), 'native option button focused');
const rootPathBefore = await page.locator('.root-link').first().getAttribute('d');
await page.getByRole('button', {name: '階梯 Stepped', exact:false}).press('Enter');
check("branch-style edit persists", await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('resumeTreeLinkStyleV1') || '{}')).includes('stepped')), "selected link style saved");
check("root branch style changes geometry", await page.locator('.root-link').first().getAttribute('d') !== rootPathBefore, 'root style changes its path');
await page.locator('.skill-label').first().press('Enter');
await page.getByRole('button', {name: '直線 Straight', exact:false}).click();

let selectedBefore = false;
try {
  await page.locator("#a4c svg .project-card").first().click({ force: true });
  await page.waitForTimeout(80);
  selectedBefore = await page.locator("button").filter({ hasText: "Clear selection" }).count() > 0;
} catch {}
check("selection smoke check", selectedBefore, "clicking a project card exposes Clear selection");

await clearSelection();
await page.waitForTimeout(100);

const geometry = await page.evaluate(() => {
  const svg = document.querySelector("#treeSvg");
  if (!svg) return { textCount: 0, rawTextCount: 0, overlaps: [], clipped: [], overlapCount: 0, clippedCount: 0, foreignObjectCount: 0, projectTextOutsideCount: 0 };
  const svgRect = svg.getBoundingClientRect();
  const boxes = [...svg.querySelectorAll("text")].map((node, i) => {
    const r = node.getBoundingClientRect();
    return { i, text: (node.textContent || "").trim(), x: r.left, y: r.top, w: r.width, h: r.height };
  }).filter(box => box.w > 0 && box.h > 0);
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlap(boxes[i], boxes[j])) overlaps.push(`${boxes[i].text} / ${boxes[j].text}`);
  const clipped = boxes.filter(box => box.x < svgRect.left - 1 || box.y < svgRect.top - 1 || box.x + box.w > svgRect.right + 1 || box.y + box.h > svgRect.bottom + 1).map(box => box.text);
  const chips = [...svg.querySelectorAll(".project-chip")];
  const projectTextOutside = [];
  [...svg.querySelectorAll(".project-card")].forEach(card => {
    const chip = chips.find(node => node.dataset.projectId === card.dataset.projectId);
    if (!chip) { projectTextOutside.push(card.dataset.projectId || "missing-chip"); return; }
    const cr = chip.getBoundingClientRect();
    [...card.querySelectorAll("text")].forEach(node => {
      const r = node.getBoundingClientRect();
      if (r.left < cr.left - 1 || r.top < cr.top - 1 || r.right > cr.right + 1 || r.bottom > cr.bottom + 1) projectTextOutside.push(node.textContent || card.dataset.projectId);
    });
  });
  return {
    textCount: boxes.length, rawTextCount: svg.querySelectorAll("text").length,
    overlaps: overlaps.slice(0, 12), overlapCount: overlaps.length,
    clipped: clipped.slice(0, 12), clippedCount: clipped.length,
    foreignObjectCount: svg.querySelectorAll("foreignObject").length,
    projectTextOutsideCount: projectTextOutside.length
  };
});
check("SVG text and project geometry", geometry.overlapCount === 0 && geometry.clippedCount === 0 && geometry.foreignObjectCount === 0 && geometry.projectTextOutsideCount === 0, `${geometry.rawTextCount} SVG texts (${geometry.textCount} measurable); ${geometry.overlapCount} overlaps; ${geometry.clippedCount} clipped; ${geometry.foreignObjectCount} foreignObjects; ${geometry.projectTextOutsideCount} project texts outside chips`);
check("all skill labels are visible", await page.locator('.skill-label').count() === currentTaxonomyIds.length, `${currentTaxonomyIds.length} labels`);
const layoutSignature = async () => page.evaluate(() => {
  const round = n => Math.round(n * 1000) / 1000;
  const a4 = document.querySelector("#a4c"), paper = document.querySelector("#a4page"), header = a4?.querySelector("header"), svg = document.querySelector("#treeSvg");
  const style = a4 ? getComputedStyle(a4) : null, paperStyle = paper ? getComputedStyle(paper) : null, headerStyle = header ? getComputedStyle(header) : null;
  const sig = selector => [...document.querySelectorAll(selector)].slice(0, 32).map(node => {
    const b = node.getBBox();
    return [(node.textContent || "").trim(), round(b.x), round(b.y), round(b.width), round(b.height)];
  });
  return {
    fullPageW: paperStyle ? round(parseFloat(paperStyle.width)) : 0,
    fullPageH: paperStyle ? round(parseFloat(paperStyle.height)) : 0,
    pageW: style ? round(parseFloat(style.width)) : 0,
    pageH: style ? round(parseFloat(style.height)) : 0,
    headerH: headerStyle ? round(parseFloat(headerStyle.height)) : 0,
    viewBox: svg?.getAttribute("viewBox") || "",
    skills: sig(".skill-label"),
    projects: sig(".project-card text")
  };
});
const desktopLayout = await layoutSignature();
const viewportChecks = [];
for (const size of [{ width: 820, height: 1180, name: "iPad portrait" }, { width: 1180, height: 820, name: "iPad landscape" }]) {
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.waitForTimeout(120);
  const signature = await layoutSignature();
  const bounds = await page.evaluate(() => {
    const vp = document.querySelector("#vp")?.getBoundingClientRect(), fit = document.querySelector("#a4fit")?.getBoundingClientRect();
    return vp && fit ? { inside: fit.width <= vp.width + 1 && fit.height <= vp.height + 1, vw: vp.width, vh: vp.height, fw: fit.width, fh: fit.height } : { inside: false };
  });
  viewportChecks.push({ name: size.name, invariant: JSON.stringify(signature) === JSON.stringify(desktopLayout), bounds });
}
check("A4 geometry is viewport-invariant", viewportChecks.every(v => v.invariant), viewportChecks.map(v => `${v.name}: ${v.invariant ? "stable" : "changed"}`).join(" / "));
check("A4 fit stays inside iPad viewport", viewportChecks.every(v => v.bounds.inside), viewportChecks.map(v => `${v.name}: ${Math.round(v.bounds.fw || 0)}x${Math.round(v.bounds.fh || 0)} in ${Math.round(v.bounds.vw || 0)}x${Math.round(v.bounds.vh || 0)}`).join(" / "));
await page.setViewportSize({ width: 1440, height: 1000 });
await page.waitForTimeout(120);

const centeredRoots = await page.evaluate(() => {
  const svg = document.querySelector('#treeSvg'), ground = svg.querySelector('.ground-line');
  const center = (Number(ground.getAttribute('x1'))+Number(ground.getAttribute('x2')))/2;
  const paths = [...svg.querySelectorAll('.category-root-link')];
  return paths.length===6 && paths.every(path => {
    const start=path.getPointAtLength(0);
    return Math.abs(start.x-center)<.1 && Math.abs(start.y-Number(ground.getAttribute('y1')))<.1;
  });
});
check('all category roots start at the center', centeredRoots, 'six roots originate at the center of the ground line');
const circuit = await page.evaluate(() => {
  const routes = [...document.querySelectorAll('.project-branch')], chips = [...document.querySelectorAll('.project-chip')];
  const endpoints = routes.every(route => {
    const chip = chips.find(n=>n.dataset.projectId === route.dataset.projectId), box = chip.getBBox();
    const end = route.getPointAtLength(route.getTotalLength());
    return Math.abs(end.y-box.y)<.1 && end.x>=box.x-.1 && end.x<=box.x+box.width+.1;
  });
  const clear = routes.every(route => {
    for (let d=0;d<route.getTotalLength()-1;d+=2) {
      if(chips.some(chip=>chip.isPointInFill(route.getPointAtLength(d)))) return false;
    }
    return true;
  });
  const rising = routes.every(route => {
    let previous = route.getPointAtLength(0).y;
    for(let d=2;d<=route.getTotalLength();d+=2) {
      const y=route.getPointAtLength(d).y;
      if(y>previous+.01) return false;
      previous=y;
    }
    return /^M[\d.,-]+V[\d.-]+L[\d.,-]+$/.test(route.getAttribute('d'));
  });
  return {
    count:routes.length, endpoints, clear, rising,
    lanes:new Set(routes.map(n=>n.getPointAtLength(0).x)).size,
    levels:new Set(chips.map(n=>n.getBBox().y)).size,
    pins:document.querySelectorAll('.chip-pins').length,
    background:getComputedStyle(document.querySelector('#a4c')).backgroundColor,
    rootColors:new Set([...document.querySelectorAll('.skill-dot')].map(n=>n.getAttribute('fill'))).size
  };
});
check('staggered projects have independent rising traces', circuit.count===10 && circuit.lanes===10 && circuit.levels===10 && circuit.endpoints && circuit.clear && circuit.rising && !circuit.pins,
  '10 separate vertical/diagonal routes into top corners; no downward hooks, pins, or traces through blocks');
check('light résumé uses one root accent', circuit.background==='rgb(255, 255, 255)' && circuit.rootColors===1,
  'white paper with one muted green accent for every skill category');
const rootFootprint = () => page.evaluate(() => {
  const svg = document.querySelector('#treeSvg'), paper = document.querySelector('#a4c').getBoundingClientRect();
  const ground = Number(svg.querySelector('.ground-line').getAttribute('y1'));
  const screenGround = new DOMPoint(0,ground).matrixTransform(svg.getScreenCTM()).y;
  const rootsBelowGround = [...svg.querySelectorAll('.root-link,.skill-label,.skill-dot')].every(n => {
    const box = n.getBBox();
    return box.y >= ground - .1 && box.y + box.height <= svg.viewBox.baseVal.height;
  });
  const canopyAboveGround = [...svg.querySelectorAll('.project-chip')].every(n => n.getBBox().y+n.getBBox().height < ground-12);
  return {percent:100*(paper.bottom-screenGround)/paper.height,rootsBelowGround,canopyAboveGround};
});
const screenRoots = await rootFootprint();
check('roots occupy 25–30% of the résumé', screenRoots.percent >= 25 && screenRoots.percent <= 30 && screenRoots.rootsBelowGround && screenRoots.canopyAboveGround,
  `${screenRoots.percent.toFixed(2)}% of content height; complete roots below ground and project chips above it`);
const outsideChip = await page.evaluate(() => {
  const svg = document.querySelector("#treeSvg"), bad = [];
  const chips = [...svg.querySelectorAll(".project-chip")];
  [...svg.querySelectorAll(".project-card")].forEach(card => {
    const chip = chips.find(node => node.dataset.projectId === card.dataset.projectId);
    if (!chip) { bad.push(card.dataset.projectId || "missing-chip"); return; }
    const cr = chip.getBoundingClientRect();
    [...card.querySelectorAll("text")].forEach(node => {
      const r = node.getBoundingClientRect();
      if (r.left < cr.left - 1 || r.top < cr.top - 1 || r.right > cr.right + 1 || r.bottom > cr.bottom + 1) bad.push(node.textContent || card.dataset.projectId);
    });
  });
  return bad;
});
check("project text stays inside chip packages", outsideChip.length === 0, outsideChip.join('; ') || "all text corners inside their chip packages");

try {
  await page.locator("#a4c svg .project-card").first().click({ force: true });
  await page.waitForTimeout(80);
} catch {}

await page.locator("button").filter({ hasText: /^\+$/ }).click();
await page.locator("button").filter({ hasText: /^\+$/ }).click();
await page.waitForTimeout(150);
const panCursor = await page.locator("#vp").evaluate(node => getComputedStyle(node).cursor);
check("high-contrast page cursor is installed", /url\(/.test(panCursor) && /grab/.test(panCursor), panCursor);

const pageBox = await page.locator("#a4page").boundingBox();
if (pageBox) {
  // Start in the white A4 margin so the gesture pans the whole page, not an editable node.
  await page.mouse.move(pageBox.x + 8, pageBox.y + pageBox.height / 2);
  await page.mouse.down({ button: "left" });
  await page.waitForTimeout(40);
  await page.mouse.move(pageBox.x + 68, pageBox.y + pageBox.height / 2 + 30, { steps: 6 });
  await page.mouse.up({ button: "left" });
}
const temporaryView = await page.evaluate(() => ({
  fitStyle: document.querySelector("#a4fit")?.getAttribute("style") || "",
  pageStyle: document.querySelector("#a4page")?.getAttribute("style") || "",
  selected: !!document.querySelector("button") && [...document.querySelectorAll("button")].some(button => button.textContent.includes("Clear selection"))
}));
check("temporary zoom/pan/selection applied", /scale\(1\.3/.test(temporaryView.pageStyle) && !/translate\(0px,\s*0px\)/.test(temporaryView.fitStyle) && temporaryView.selected, temporaryView.fitStyle + " / " + temporaryView.pageStyle);

const outlineToggle = page.locator('button').filter({hasText:'技能樹編輯'}).first();
await outlineToggle.click();
await page.getByText('L2', {exact:true}).click();
await outlineToggle.click();
check('screen depth can be collapsed', await page.locator('.skill-label').count() < 95, 'L2 hides deeper nodes on screen');

await page.emulateMedia({ media: "print" });
await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
await page.waitForTimeout(100);
const printState = await page.evaluate(() => {
  const a4 = document.querySelector("#a4c");
  const pagePaper = document.querySelector("#a4page");
  const fit = document.querySelector("#a4fit");
  const style = getComputedStyle(a4);
  return {
    fitStyle: fit?.getAttribute("style") || "",
    pageStyle: pagePaper?.getAttribute("style") || "",
    a4Background: style.backgroundColor,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    scrBackground: getComputedStyle(document.querySelector("#scr")).backgroundColor,
    controlsHidden: ["#toolbar", "#editpanel", "#outlinepanel", "#projectpanel"].every(selector => {
      const node = document.querySelector(selector);
      return !node || getComputedStyle(node).display === "none";
    })
  };
});
const printIdentity = /translate\(0px,\s*0px\)/.test(printState.fitStyle) && /scale\(1\)/.test(printState.pageStyle);
check("print resets temporary zoom/pan", printIdentity, printState.fitStyle + " / " + printState.pageStyle);
check("print hides editing controls", printState.controlsHidden, "toolbar and panels hidden in print media");
check("print background is white", [printState.a4Background, printState.bodyBackground, printState.scrBackground].every(value => value === "rgb(255, 255, 255)"), `${printState.a4Background} / ${printState.bodyBackground} / ${printState.scrBackground}`);
const printTextPt = await page.locator('.skill-label').first().evaluate(n => parseFloat(getComputedStyle(n).fontSize) * n.ownerSVGElement.getScreenCTM().a * 0.75);
check("skill text prints at least 9pt", printTextPt >= 9, `${printTextPt.toFixed(2)} pt`);
check('print restores full taxonomy at collapsed depth', await page.locator('.skill-label').count() === 95, 'all 95 nodes printed');
const printRoots = await rootFootprint();
const rootA4Percent = printRoots.percent * 281 / 297; // 8 mm page margins above and below the 281 mm content area.
check('printed roots occupy 25–30% of A4', rootA4Percent >= 25 && rootA4Percent <= 30 && printRoots.rootsBelowGround && printRoots.canopyAboveGround,
  `${rootA4Percent.toFixed(2)}% of A4 height; ${printRoots.percent.toFixed(2)}% of printable content; no root or canopy overflow`);
check("all interactions remain error-free", !pageErrors.length && !consoleErrors.length, [...pageErrors,...consoleErrors].join('; ') || 'no runtime errors');

execFileSync(process.execPath, [markerPath, "--operation-kind", "create", "--expected-output-count", "1", "--output-format", "pdf"], { cwd: dirname(markerPath), stdio: "inherit", windowsHide: true });
await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
await context.close();
await browser.close();

execFileSync(markitdownPath, [pdfPath, "-o", resolve(qaDir, "rs-portrait.pdf.md")], { stdio: "inherit", windowsHide: true });
const pdfInfo = command("pdfinfo", [pdfPath]);
const pdfText = readFileSync(resolve(qaDir, "rs-portrait.pdf.md"), "utf8");
const pageCount = Number(pdfInfo.stdout.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
const pageSize = pdfInfo.stdout.match(/^Page size:\s+(.+)/m)?.[1]?.trim() || "unknown";
const pageSizeNumbers = pageSize.match(/([\d.]+)\s*x\s*([\d.]+)/i)?.slice(1).map(Number) || [];
const isA4Portrait = pageSizeNumbers.length === 2 && Math.abs(pageSizeNumbers[0] - 595) < 2 && Math.abs(pageSizeNumbers[1] - 842) < 2;
const renderedPrefix = resolve(qaDir, "rs-portrait-page");
const render = command("pdftoppm", ["-png", "-r", "144", pdfPath, renderedPrefix]);
check("PDF is exactly one A4 page", pageCount === 1 && isA4Portrait, `${pageCount} page(s); ${pageSize}`);
check("PDF contains selectable text", pdfText.trim().length > 40 && /Jay Huang|PROJECT|Skills/i.test(pdfText), `${pdfText.trim().length} extracted markdown characters`);
check("PDF rendering completed", render.status === 0, render.stderr.trim() || "rendered");

const deferred = [];
for (const item of checks.filter(item => !item.pass && !["SVG text and project geometry", "print background is white"].includes(item.name))) deferred.push(`- ${item.name}: ${item.detail}`);
if (geometry.overlapCount || geometry.clippedCount || geometry.foreignObjectCount || geometry.projectTextOutsideCount) deferred.push(`- SVG/project geometry remains a baseline blocker: ${geometry.overlapCount} text overlaps, ${geometry.clippedCount} clipped text boxes, ${geometry.foreignObjectCount} foreignObjects, ${geometry.projectTextOutsideCount} project texts outside chips.`);
if (!printIdentity) deferred.push("- Print still carries the temporary zoom/pan transform.");
if (![printState.a4Background, printState.bodyBackground, printState.scrBackground].every(value => value === "rgb(255, 255, 255)")) deferred.push(`- Print background is not fully white: ${printState.a4Background} / ${printState.bodyBackground} / ${printState.scrBackground}.`);
if (pageCount !== 1) deferred.push(`- PDF page count is ${pageCount}; expected exactly one A4 portrait page.`);
if (!pdfText.trim()) deferred.push("- PDF text extraction is empty; selectable text is not proven.");
if (pageErrors.length) deferred.push(`- The generated PDF contains the app's runtime error banner from the export smoke path: ${pageErrors[pageErrors.length - 1].split("\n")[0]}.`);

const report = [
  "# rs_portrait browser check",
  "",
  `Mode: ${finalMode ? "final" : "baseline"}`,
  `Source: ${htmlPath}`,
  "",
  "## Measurements",
  `- Taxonomy: ${currentTaxonomyIds.length} nodes including category roots; browser outline rows: ${uiTaxonomy.inputs}.`,
  `- Projects: ${projectOptions.length} live options; static records: ${Object.keys(currentProjects).length}.`,
  `- SVG/project geometry: ${geometry.rawTextCount} SVG texts (${geometry.textCount} measurable); overlaps: ${geometry.overlapCount}; clipped text: ${geometry.clippedCount}; foreignObjects: ${geometry.foreignObjectCount}; project texts outside chips: ${geometry.projectTextOutsideCount}.`,
  `- Temporary view before print: ${temporaryView.fitStyle || "unknown"} / ${temporaryView.pageStyle || "unknown"}.`,
  `- Print view: ${printState.fitStyle || "unknown"} / ${printState.pageStyle || "unknown"}; controls hidden: ${printState.controlsHidden}; backgrounds: ${printState.a4Background} / ${printState.bodyBackground} / ${printState.scrBackground}.`,
  `- PDF: ${pageCount} page(s); ${pageSize}; extracted markdown: ${pdfText.trim().length} characters.`,
  "",
  "## Check results",
  ...checks.map(item => `- ${item.pass ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`),
  "",
  finalMode ? "## Remaining issues" : "## Baseline blockers",
  ...(deferred.length ? deferred : ["- None measured."]),
  "",
  finalMode ? "Final mode treats the checks above as release gates." : "Baseline mode records known visual and print defects without asserting them as implementation failures."
].join("\n");
writeFileSync(reportPath, report + "\n");

if (finalMode && checks.some(item => !item.pass)) {
  console.error(report);
  process.exitCode = 1;
} else {
  console.log(report);
}
