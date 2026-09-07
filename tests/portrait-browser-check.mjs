import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
const markerPath = "C:/Users/HML/.codex/plugins/cache/openai-primary-runtime/pdf/26.904.11930/skills/pdf/container_tools/mark_artifact_operation_started.mjs";
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
  if (!match) throw new Error(`bundler template missing in ${file}`);
  return JSON.parse(match[1]);
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
const projectOptions = await page.locator("#projectpanel option").evaluateAll(options => options.map(option => option.value));
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
  await page.locator("#a4c svg foreignObject").first().locator("div").first().click({ force: true });
  await page.waitForTimeout(80);
  selectedBefore = await page.locator("button").filter({ hasText: "Clear selection" }).count() > 0;
} catch {}
check("selection smoke check", selectedBefore, "clicking a generated SVG label exposes Clear selection");

await clearSelection();
await page.waitForTimeout(100);

const geometry = await page.evaluate(() => {
  const svg = [...document.querySelectorAll("#a4c svg")].sort((a, b) => b.querySelectorAll("text").length - a.querySelectorAll("text").length)[0];
  if (!svg) return { textCount: 0, rawTextCount: 0, overlaps: [], clipped: [], foreignObjectCount: 0, foreignObjectClippedCount: 0, projectTextOverflowCount: 0 };
  const viewBox = (svg.getAttribute("viewBox") || "0 0 0 0").split(/\s+/).map(Number);
  const [vx, vy, vw, vh] = viewBox;
  const boxes = [...svg.querySelectorAll("text")].map((node, i) => {
    const box = node.getBBox();
    return { i, text: (node.textContent || "").trim(), x: box.x, y: box.y, w: box.width, h: box.height };
  }).filter(box => box.w > 0 && box.h > 0);
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlap(boxes[i], boxes[j])) overlaps.push(`${boxes[i].text} / ${boxes[j].text}`);
  const clipped = boxes.filter(box => box.x < vx || box.y < vy || box.x + box.w > vx + vw || box.y + box.h > vy + vh).map(box => box.text);
  const foreignObjects = [...svg.querySelectorAll("foreignObject")].map(node => ({
    x: Number(node.getAttribute("x")), y: Number(node.getAttribute("y")),
    w: Number(node.getAttribute("width")), h: Number(node.getAttribute("height")),
    card: node.firstElementChild
  }));
  const foreignObjectClipped = foreignObjects.filter(box => box.x < vx || box.y < vy || box.x + box.w > vx + vw || box.y + box.h > vy + vh);
  const projectTextOverflow = foreignObjects.filter(box => box.card && (box.card.scrollWidth > box.card.clientWidth + 1 || box.card.scrollHeight > box.card.clientHeight + 1));
  return {
    textCount: boxes.length, rawTextCount: svg.querySelectorAll("text").length,
    overlaps: overlaps.slice(0, 12), overlapCount: overlaps.length,
    clipped: clipped.slice(0, 12), clippedCount: clipped.length,
    foreignObjectCount: foreignObjects.length,
    foreignObjectClippedCount: foreignObjectClipped.length,
    projectTextOverflowCount: projectTextOverflow.length
  };
});
check("SVG text and project geometry", geometry.overlapCount === 0 && geometry.clippedCount === 0 && geometry.foreignObjectClippedCount === 0 && geometry.projectTextOverflowCount === 0, `${geometry.rawTextCount} SVG texts (${geometry.textCount} measurable); ${geometry.overlapCount} overlaps; ${geometry.clippedCount} clipped; ${geometry.foreignObjectCount} foreignObjects; ${geometry.foreignObjectClippedCount} card bounds clipped; ${geometry.projectTextOverflowCount} project text overflows`);
check("all skill labels are visible", await page.locator('.skill-label').count() === currentTaxonomyIds.length, `${currentTaxonomyIds.length} labels`);
const outsideLeaf = await page.evaluate(() => {
  const svg = document.querySelector('#treeSvg'), leaves = [...svg.querySelectorAll('.project-leaf')], bad = [];
  [...svg.querySelectorAll('.project-card')].forEach((card, i) => {
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(walker.currentNode);
      for (const r of range.getClientRects()) for (const [x, y] of [[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]]) {
        if (!leaves[i].isPointInFill(new DOMPoint(x,y).matrixTransform(svg.getScreenCTM().inverse()))) bad.push(walker.currentNode.textContent);
      }
    }
  });
  return bad;
});
check("project text stays inside leaf silhouettes", outsideLeaf.length === 0, outsideLeaf.join('; ') || "all text corners inside their leaves");

try {
  await page.locator("#a4c svg foreignObject").first().locator("div").first().click({ force: true });
  await page.waitForTimeout(80);
} catch {}

await page.locator("button").filter({ hasText: /^\+$/ }).click();
await page.locator("button").filter({ hasText: /^\+$/ }).click();
await page.waitForTimeout(150);
const vpBox = await page.locator("#vp").boundingBox();
if (vpBox) {
  await page.mouse.move(vpBox.x + 10, vpBox.y + vpBox.height / 2);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(vpBox.x + 70, vpBox.y + vpBox.height / 2 + 30, { steps: 6 });
  await page.mouse.up({ button: "right" });
}
const temporaryView = await page.evaluate(() => ({
  fitStyle: document.querySelector("#a4fit")?.getAttribute("style") || "",
  selected: !!document.querySelector("button") && [...document.querySelectorAll("button")].some(button => button.textContent.includes("Clear selection"))
}));
check("temporary zoom/pan/selection applied", /scale\(1\.3/.test(temporaryView.fitStyle) && !/translate\(0px,\s*0px\)/.test(temporaryView.fitStyle) && temporaryView.selected, temporaryView.fitStyle);

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
  const fit = document.querySelector("#a4fit");
  const style = getComputedStyle(a4);
  return {
    fitStyle: fit?.getAttribute("style") || "",
    a4Background: style.backgroundColor,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    scrBackground: getComputedStyle(document.querySelector("#scr")).backgroundColor,
    controlsHidden: ["#toolbar", "#editpanel", "#outlinepanel", "#projectpanel"].every(selector => {
      const node = document.querySelector(selector);
      return !node || getComputedStyle(node).display === "none";
    })
  };
});
const printIdentity = /translate\(0px,\s*0px\)\s*scale\(1\)/.test(printState.fitStyle);
check("print resets temporary zoom/pan", printIdentity, printState.fitStyle);
check("print hides editing controls", printState.controlsHidden, "toolbar and panels hidden in print media");
check("print background is white", [printState.a4Background, printState.bodyBackground, printState.scrBackground].every(value => value === "rgb(255, 255, 255)"), `${printState.a4Background} / ${printState.bodyBackground} / ${printState.scrBackground}`);
const printTextPt = await page.locator('.skill-label').first().evaluate(n => parseFloat(getComputedStyle(n).fontSize) * n.ownerSVGElement.getScreenCTM().a * 0.75);
check("skill text prints at least 9pt", printTextPt >= 9, `${printTextPt.toFixed(2)} pt`);
check('print restores full taxonomy at collapsed depth', await page.locator('.skill-label').count() === 95, 'all 95 nodes printed');
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
if (geometry.overlapCount || geometry.clippedCount || geometry.foreignObjectClippedCount || geometry.projectTextOverflowCount) deferred.push(`- SVG/project geometry remains a baseline blocker: ${geometry.overlapCount} text overlaps, ${geometry.clippedCount} clipped text boxes, ${geometry.foreignObjectClippedCount} clipped card bounds, ${geometry.projectTextOverflowCount} project text overflows.`);
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
  `- SVG/project geometry: ${geometry.rawTextCount} SVG texts (${geometry.textCount} measurable); overlaps: ${geometry.overlapCount}; clipped text: ${geometry.clippedCount}; foreignObjects: ${geometry.foreignObjectCount}; clipped cards: ${geometry.foreignObjectClippedCount}; project text overflows: ${geometry.projectTextOverflowCount}.`,
  `- Temporary view before print: ${temporaryView.fitStyle || "unknown"}.`,
  `- Print view: ${printState.fitStyle || "unknown"}; controls hidden: ${printState.controlsHidden}; backgrounds: ${printState.a4Background} / ${printState.bodyBackground} / ${printState.scrBackground}.`,
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
