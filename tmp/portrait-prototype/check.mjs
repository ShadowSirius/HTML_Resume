import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '../..');
const NODE_MODULES = 'C:/Users/HML/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const require = createRequire(pathToFileURL(path.join(NODE_MODULES, 'playwright', 'package.json')));
const { chromium } = require('playwright');
const POPPLER = 'C:/Users/HML/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin';
const PYTHON = 'C:/Py_venv/.venv/Scripts/python.exe';
const MM_TO_PT = 72 / 25.4;
const MARGIN = 12 * MM_TO_PT;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const html = path.resolve(ROOT, arg('--html', 'prototype-portrait.html'));
const pdf = path.resolve(ROOT, arg('--pdf', 'output/pdf/prototype-portrait.pdf'));
const report = path.resolve(ROOT, arg('--report', 'output/pdf/prototype-portrait-check.md'));
const grayPreview = path.resolve(ROOT, 'tmp/portrait-prototype/prototype-portrait-gray.png');
const render = process.argv.includes('--render');

if (!fs.existsSync(html)) throw new Error(`HTML not found: ${html}`);
fs.mkdirSync(path.dirname(pdf), { recursive: true });

const run = (bin, args) => execFileSync(path.join(POPPLER, bin), args, { encoding: 'utf8' });
const runPython = (args) => execFileSync(PYTHON, args, { encoding: 'utf8' });
const fail = (checks, message) => checks.push({ ok: false, message });
const pass = (checks, message) => checks.push({ ok: true, message });

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/HML/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe' });
const page = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' });
const screen = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
await page.emulateMedia({ media: 'print' });
const printMetrics = await page.evaluate(() => {
  const visibleText = [...document.querySelectorAll('body *')].filter((el) => {
    const s = getComputedStyle(el);
    return el.textContent.trim() && s.display !== 'none' && s.visibility !== 'hidden';
  });
  const sizes = visibleText.map((el) => parseFloat(getComputedStyle(el).fontSize));
  return {
    minFontPx: Math.min(...sizes),
    scrollHeight: document.documentElement.scrollHeight,
    cssPage: [...document.styleSheets].flatMap((sheet) => {
      try { return [...sheet.cssRules]; } catch { return []; }
    }).filter((r) => r.type === CSSRule.PAGE_RULE).map((r) => r.cssText),
    identity: (() => {
      const identity = document.querySelector('.identity')?.getBoundingClientRect();
      const contact = document.querySelector('.contact')?.getBoundingClientRect();
      const heading = document.querySelector('.achievements h2')?.getBoundingClientRect();
      return identity && contact && heading ? {
        identityBottom: identity.bottom,
        contactBottom: contact.bottom,
        headingTop: heading.top,
      } : null;
    })(),
    sectionBoxes: ['identity', 'achievements', 'skills', 'background'].map((name) => {
      const box = document.querySelector(`.${name}`)?.getBoundingClientRect();
      return box ? { name, heightPx: box.height } : null;
    }).filter(Boolean),
  };
});
if (render) await page.pdf({ path: pdf, format: 'A4', printBackground: false, displayHeaderFooter: false, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
await browser.close();
if (!fs.existsSync(pdf)) throw new Error(`PDF not found: ${pdf}; rerun with --render`);

const info = run('pdfinfo.exe', [pdf]);
const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
const size = info.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m);
if (!size) throw new Error('pdfinfo did not report page size');
const width = Number(size[1]);
const height = Number(size[2]);
const pdfData = JSON.parse(runPython(['-c', [
  'import json,sys,pdfplumber',
  'with pdfplumber.open(sys.argv[1]) as p:',
  ' page=p.pages[0]',
  ' print(json.dumps({"text":page.extract_text() or "","words":page.extract_words()}))',
].join('\n'), pdf]).trim());
const text = pdfData.text;
const words = pdfData.words;
const checks = [];
const htmlHash = crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex').toUpperCase();
pages === 1 ? pass(checks, 'exactly 1 page') : fail(checks, `page count ${pages}`);
Math.abs(width - 595.276) < 1 && Math.abs(height - 841.89) < 1 ? pass(checks, `A4 portrait ${width.toFixed(3)} x ${height.toFixed(3)} pt`) : fail(checks, `page size ${width} x ${height} pt`);
screen.scrollWidth <= screen.clientWidth + 1 ? pass(checks, `360px screen has no horizontal overflow (${screen.scrollWidth}/${screen.clientWidth}px)`) : fail(checks, `360px horizontal overflow (${screen.scrollWidth}/${screen.clientWidth}px)`);
printMetrics.minFontPx >= 14 ? pass(checks, `minimum visible print font ${printMetrics.minFontPx.toFixed(2)}px (>=10.5pt)`) : fail(checks, `minimum visible print font ${printMetrics.minFontPx.toFixed(2)}px`);
text.trim() ? pass(checks, `selectable text extracted (${text.trim().length} chars)`) : fail(checks, 'no selectable text extracted');
if (words.length) {
  const bounds = words.reduce((a, w) => ({ xMin: Math.min(a.xMin, w.x0), yMin: Math.min(a.yMin, w.top), xMax: Math.max(a.xMax, w.x1), yMax: Math.max(a.yMax, w.bottom) }), { xMin: Infinity, yMin: Infinity, xMax: -Infinity, yMax: -Infinity });
  const inside = bounds.xMin >= MARGIN - 0.5 && bounds.yMin >= MARGIN - 0.5 && bounds.xMax <= width - MARGIN + 0.5 && bounds.yMax <= height - MARGIN + 0.5;
  const edgeDelta = Math.min(bounds.xMin - MARGIN, bounds.yMin - MARGIN, width - MARGIN - bounds.xMax, height - MARGIN - bounds.yMax);
  inside ? pass(checks, `text bounds ${Object.values(bounds).map((v) => v.toFixed(1)).join(', ')}pt; minimum edge delta ${edgeDelta.toFixed(1)}pt vs 12mm CSS margin (<=0.5pt font rounding allowed)`) : fail(checks, `text bounds ${JSON.stringify(bounds)}pt exceed 12mm margin tolerance`);
} else fail(checks, 'no text bounding boxes extracted');
for (const label of ['Technical achievements', 'Skills', 'Embedded Firmware', 'AI Engineering']) text.toLowerCase().includes(label.toLowerCase()) ? pass(checks, `content label present: ${label}`) : fail(checks, `missing content label: ${label}`);
printMetrics.scrollHeight <= 1123 ? pass(checks, `print DOM height ${printMetrics.scrollHeight}px fits A4 CSS height`) : fail(checks, `print DOM height ${printMetrics.scrollHeight}px exceeds A4 CSS height`);
if (printMetrics.sectionBoxes.length === 4) {
  const sectionTotalMm = printMetrics.sectionBoxes.reduce((sum, s) => sum + s.heightPx, 0) * 25.4 / 96;
  Math.abs(sectionTotalMm - 273) < 0.5 ? pass(checks, `section boxes total ${sectionTotalMm.toFixed(1)}mm (identity ${ (printMetrics.sectionBoxes[0].heightPx * 25.4 / 96).toFixed(1)}, achievements ${(printMetrics.sectionBoxes[1].heightPx * 25.4 / 96).toFixed(1)}, skills ${(printMetrics.sectionBoxes[2].heightPx * 25.4 / 96).toFixed(1)}, background ${(printMetrics.sectionBoxes[3].heightPx * 25.4 / 96).toFixed(1)}mm)`) : fail(checks, `section boxes total ${sectionTotalMm.toFixed(1)}mm`);
} else fail(checks, 'section box geometry unavailable');
if (printMetrics.identity) {
  const { identityBottom, contactBottom, headingTop } = printMetrics.identity;
  contactBottom <= identityBottom + 0.5 ? pass(checks, `contact block ends ${identityBottom - contactBottom >= 0 ? (identityBottom - contactBottom).toFixed(1) : '-' + (contactBottom - identityBottom).toFixed(1)}px before identity boundary`) : fail(checks, `contact block crosses identity boundary by ${(contactBottom - identityBottom).toFixed(1)}px`);
  headingTop - identityBottom >= 22.2 ? pass(checks, `achievement heading gap ${(headingTop - identityBottom).toFixed(1)}px (>=6mm minus rounding)`) : fail(checks, `achievement heading gap ${(headingTop - identityBottom).toFixed(1)}px`);
} else fail(checks, 'identity/contact/achievement geometry unavailable');
run('pdftoppm.exe', ['-gray', '-png', '-r', '72', '-singlefile', pdf, grayPreview.slice(0, -4)]);
const grayPixels = JSON.parse(runPython(['-c', 'from PIL import Image; import json,sys; im=Image.open(sys.argv[1]).convert("L"); p=list(im.getdata()); print(json.dumps({"pixels":len(p),"nonwhite":sum(x<250 for x in p),"min":min(p)}))', grayPreview]).trim());
grayPixels.nonwhite > 0 ? pass(checks, `grayscale/background-off render readable (${grayPixels.nonwhite} non-white pixels; white background retained)`) : fail(checks, 'grayscale/background-off render is blank');

const status = checks.every((c) => c.ok) ? 'PASS' : 'FAIL';
const lines = [
  '# Portrait prototype PDF QA', '',
  `- Result: **${status}**`,
  `- PDF: \`${path.relative(ROOT, pdf).replaceAll('\\', '/') }\``,
  `- Browser: Playwright Chromium, headless; A4 CSS page size; 100%; headers/footers disabled; print backgrounds disabled.`,
  `- HTML SHA256: \`${htmlHash}\``,
  `- Section boxes include planned internal gaps: identity 38 mm + achievements 116 mm + skills 88 mm + background 31 mm = 273 mm.`,
  '',
  ...checks.map((c) => `- ${c.ok ? 'PASS' : 'FAIL'}: ${c.message}`),
  '',
  `- Source: \`${path.relative(ROOT, html).replaceAll('\\', '/') }\``,
];
fs.writeFileSync(report, lines.join('\n') + '\n', 'utf8');
console.log(lines.join('\n'));
if (status !== 'PASS') process.exitCode = 1;
