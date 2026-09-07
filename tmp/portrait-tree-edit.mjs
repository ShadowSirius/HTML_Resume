import { readFileSync, writeFileSync } from "node:fs";

const file = "rs_portrait.html";
const raw = readFileSync(file, "utf8");
const marker = /(<script type="__bundler\/template">)([\s\S]*)(<\/script>)/;
const match = raw.match(marker);
if (!match) throw new Error("bundler template not found");

let page = JSON.parse(match[2]);
const start = page.indexOf("  buildViz() {");
const end = page.indexOf("\n  allSkillIds()", start);
if (start < 0 || end < 0) throw new Error("buildViz bounds not found");

const buildViz = String.raw`  buildViz() {
    const h = React.createElement;
    const W = 900, H = 1330, cx = 450;
    const groundY = 620, trunkTop = 54;
    const printing = !!this.state.printing, sel = this.state.selected;
    const leaves = n => (!n.children || !n.children.length) ? 1 : n.children.reduce((s, c) => s + leaves(c), 0);
    const wrap = (value, max) => {
      const words = String(value).split(/\s+/), lines = [];
      let line = "";
      words.forEach(word => {
        const next = line ? line + " " + word : word;
        if (line && next.length > max) { lines.push(line); line = word; } else line = next;
      });
      if (line) lines.push(line);
      return lines.length ? lines : [""];
    };
    const TREE = this.visibleTree();
    const cats = TREE.children || [];
    const catAng = [1.28, 0.82, 0.34, -0.34, -0.82, -1.28];
    const colX = [32, 320, 608], colW = 248;
    const orderedCats = cats.slice().sort((a, b) => leaves(b) - leaves(a));
    const topCats = orderedCats.slice(0, 3), bottomCats = orderedCats.slice(3);
    const heightOf = n => {
      const kids = n.children || [];
      if (!kids.length) return 1;
      let total = 0, run = [];
      const flush = () => {
        if (!run.length) return;
        const per = Math.min(3, run.length), slot = (colW - 76) / per;
        for (let i = 0; i < run.length; i += per) {
          const row = run.slice(i, i + per);
          const lines = Math.max(...row.map(c => wrap(c.name, Math.max(7, Math.floor(slot / 7.2))).length));
          total += Math.max(24, lines * 15.5 + 4) + 3;
        }
        run = [];
      };
      kids.forEach(child => {
        if (child.children && child.children.length) { flush(); total += Math.max(22, wrap(child.name, 21).length * 15.5 + 4) + 4 + heightOf(child); }
        else run.push(child);
      });
      flush();
      return total;
    };
    const panelHeights = orderedCats.map(heightOf);
    const topY = 666, bottomY = topY + Math.max(...panelHeights.slice(0, 3), 250) + 28;
    const bNodes = [], bLinks = [], spines = [];
    const addNode = (node, x, y, gen, cat, parent, ax, ay, kind, maxChars) => {
      node.px = x; node.py = y; node.gen = gen; node.cat = cat; node.parent = parent;
      node.ax = ax; node.ay = ay; node.kind = kind; node._lines = wrap(node.name, maxChars || (kind === "terminal" ? 8 : 21));
      node.wgt = leaves(node); node.isLeaf = !(node.children && node.children.length);
      bNodes.push(node); bLinks.push({ node, src: { px: ax, py: ay }, kind });
      return node;
    };
    const placeChildren = (parent, left, cursor, depth, catName) => {
      const kids = parent.children || [], run = [];
      const flush = () => {
        if (!run.length) return;
        const per = Math.min(3, run.length), slot = (colW - 76) / per, x0 = left + 62;
        for (let i = 0; i < run.length; i += per) {
          const row = run.slice(i, i + per);
          const lineSets = row.map(c => wrap(c.name, Math.max(7, Math.floor(slot / 7.2))));
          const rowH = Math.max(24, Math.max(...lineSets.map(a => a.length)) * 15.5 + 4);
          const y = cursor + rowH / 2;
          row.forEach((child, j) => {
            const n = addNode(child, x0 + (j + 0.5) * slot, y, depth + 2, catName, parent, parent.px, parent.py, "terminal", Math.max(7, Math.floor(slot / 7.2)));
            n._lines = lineSets[j];
          });
          cursor += rowH + 3;
        }
        run.length = 0;
      };
      kids.forEach(child => {
        if (!(child.children && child.children.length)) { run.push(child); return; }
        flush();
        const lines = wrap(child.name, 21), rowH = Math.max(22, lines.length * 15.5 + 4);
        const gx = left + 48 + Math.min(depth, 2) * 14, gy = cursor + rowH / 2;
        const group = addNode(child, gx, gy, depth + 1, catName, parent, parent.px, parent.py, "group", 21);
        group._lines = lines;
        cursor += rowH + 4;
        cursor = placeChildren(group, left, cursor, depth + 1, catName);
      });
      flush();
      return cursor;
    };
    const categoryLayouts = [];
    orderedCats.forEach((cat, i) => {
      const col = i % 3, row = i < 3 ? 0 : 1, left = colX[col], top = row ? bottomY : topY;
      const colCenter = left + colW / 2, rootX = left + 18, rootY = top + 14;
      const originX = colCenter, originY = row ? bottomY - 18 : groundY;
      const root = addNode(cat, rootX, rootY, 1, cat.name, null, originX, originY, "root", 20);
      const cursor = placeChildren(root, left, top + 38, 0, cat.name);
      spines.push({ x: left + 36, y1: top + 25, y2: cursor - 3 });
      categoryLayouts.push({ colCenter, rootX, rootY, originX, originY, top, bottom: cursor });
    });

    const order = Object.keys(PROJECTS).sort((a, b) => parseInt(PROJECTS[a].year) - parseInt(PROJECTS[b].year));
    const cardW = 360, cardH = 92, projectDistance = imp => 350 - Math.min(90, Math.max(0, imp - 3) * 18);
    const briefs = order.map((id, k) => {
      const left = k % 2 === 0, row = Math.floor(k / 2), x = left ? 28 : 512, y = 64 + row * 104;
      const tipX = left ? x + cardW + 50 : x - 50, tipY = y + cardH / 2;
      const dc = (this.state.drag || {})["c:" + id] || { dx: 0, dy: 0 };
      return { id, left, row, cardX: x + dc.dx, cardY: y + dc.dy, tipX: tipX + dc.dx, tipY: tipY + dc.dy, baseY: groundY - 18 - row * 12, imp: (PROJECTS[id].activeSkills || []).length };
    });

    const els = [];
    const screen = { trunk: "#94a3b8", branch: "#64748b", text: "#e2e8f0", muted: "#cbd5e1", dark: "#1e293b" };
    const ink = printing ? { trunk: "#334155", branch: "#475569", text: "#111827", muted: "#334155", dark: "#111827" } : screen;
    els.push(h("defs", {},
      h("filter", { id: "nodeGlow", x: "-80%", y: "-80%", width: "260%", height: "260%" }, h("feGaussianBlur", { stdDeviation: 3, result: "blur" }), h("feMerge", {}, h("feMergeNode", { in: "blur" }), h("feMergeNode", { in: "SourceGraphic" })))
    ));
    els.push(h("line", { key: "g", x1: 28, y1: groundY, x2: W - 28, y2: groundY, stroke: printing ? "#cbd5e1" : "#334155", strokeWidth: 1.3, strokeDasharray: "2 7" }));
    els.push(h("text", { key: "gl1", x: 30, y: groundY - 8, fontFamily: "system-ui,-apple-system,sans-serif", fontSize: 11, fontWeight: 700, fill: ink.muted }, "EXPERIENCE"));
    els.push(h("text", { key: "gl2", x: W - 30, y: H - 22, textAnchor: "end", fontFamily: "system-ui,-apple-system,sans-serif", fontSize: 11, fontWeight: 700, fill: ink.muted }, "SKILL ROOTS"));
    els.push(h("path", { key: "trunk", d: "M" + cx + "," + trunkTop + " C" + (cx - 6) + ",220 " + (cx + 6) + ",430 " + cx + "," + groundY, stroke: ink.trunk, strokeWidth: printing ? 10 : 12, fill: "none", strokeLinecap: "round" }));
    els.push(h("path", { key: "trunkHi", d: "M" + cx + "," + (trunkTop + 3) + " C" + (cx - 3) + ",220 " + (cx + 3) + ",430 " + cx + "," + groundY, stroke: printing ? "#64748b" : "#cbd5e1", strokeWidth: printing ? 3 : 4, strokeOpacity: 0.9, fill: "none", strokeLinecap: "round" }));
    categoryLayouts.forEach((g, i) => {
      const d = "M" + g.originX + "," + g.originY + " L" + g.rootX + "," + g.rootY;
      els.push(h("path", { key: "main" + i, d, stroke: ink.trunk, strokeWidth: printing ? 6 : 8, strokeOpacity: 0.95, fill: "none", strokeLinecap: "round" }));
    });
    spines.forEach((s, i) => els.push(h("path", { key: "sp" + i, d: "M" + s.x + "," + s.y1 + " L" + s.x + "," + s.y2, stroke: ink.branch, strokeWidth: printing ? 2.4 : 3.4, strokeOpacity: 0.8, fill: "none", strokeLinecap: "round" })));

    const gStyle = this.props.rootStyle || "curved";
    const lStyle = this.state.linkStyle || {};
    const rootD = (s, t, style) => {
      const sx = s.px, sy = s.py, tx = t.px, ty = t.py;
      if (style === "straight") return "M" + sx + "," + sy + "L" + tx + "," + ty;
      if (style === "stepped") { const my = sy + (ty - sy) * 0.5; return "M" + sx + "," + sy + "L" + sx + "," + my + "L" + tx + "," + ty; }
      const mx = sx + (tx - sx) * 0.42;
      return "M" + sx + "," + sy + " Q" + mx + "," + sy + " " + tx + "," + ty;
    };
    const actSet = sel ? new Set(PROJECTS[sel].activeSkills || []) : null;
    const hiSet = new Set(), ancSet = new Set();
    if (actSet) bNodes.forEach(n => { if (n.id && actSet.has(n.id)) { hiSet.add(n); let p = n.parent; while (p && p.px != null) { ancSet.add(p); p = p.parent; } } });
    const dimB = n => actSet && !hiSet.has(n) && !ancSet.has(n);
    bLinks.forEach((link, i) => {
      const n = link.node, s = link.src, t = { px: n.px, py: n.py }, style = lStyle[n.id] || gStyle;
      const d = rootD(s, t, style), active = hiSet.has(n) || ancSet.has(n), color = CAT[n.cat] || ink.branch;
      els.push(h("path", { key: "rl" + i, d, stroke: active && !printing ? color : ink.branch, strokeOpacity: dimB(n) ? 0.14 : (active ? 0.92 : 0.68), strokeWidth: n.kind === "root" ? 4.4 : (n.kind === "group" ? 2.5 : 1.5), fill: "none", strokeLinecap: "round" }));
      els.push(h("path", { key: "rh" + i, d, stroke: "transparent", strokeWidth: 12, fill: "none", style: { cursor: "pointer" }, onClick: e => { e.stopPropagation(); this.setState({ menu: { id: n.id, x: (s.px + n.px) / 2, y: (s.py + n.py) / 2 } }); } }));
    });

    briefs.forEach((b, i) => {
      const pj = PROJECTS[b.id], color = printing ? "#334155" : ERA[this.eraOf(b.id)], dir = b.left ? -1 : 1;
      const bx = cx + dir * (10 + b.row * 12), c1x = bx + dir * 50, c1y = b.baseY - 25 - b.row * 4, c2x = b.tipX - dir * 80, c2y = b.tipY;
      const branch = "M" + bx + "," + b.baseY + " C" + c1x + "," + c1y + " " + c2x + "," + c2y + " " + b.tipX + "," + b.tipY;
      els.push(h("path", { key: "br0" + i, d: branch, stroke: ink.trunk, strokeWidth: 5 + b.imp * 0.12, strokeOpacity: 0.7, fill: "none", strokeLinecap: "round" }));
      els.push(h("path", { key: "br1" + i, d: branch, stroke: color, strokeWidth: 2.2 + b.imp * 0.08, strokeOpacity: 0.95, fill: "none", strokeLinecap: "round" }));
      const x = b.cardX, y = b.cardY, w = cardW, hh = cardH, mid = y + hh / 2, tip = b.tipX;
      const d = b.left
        ? "M" + (x + 18) + "," + y + " Q" + x + "," + y + " " + x + "," + (y + 18) + " L" + x + "," + (y + hh - 18) + " Q" + x + "," + (y + hh) + " " + (x + 18) + "," + (y + hh) + " L" + tip + "," + mid + " Z"
        : "M" + (x + w - 18) + "," + y + " Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + 18) + " L" + (x + w) + "," + (y + hh - 18) + " Q" + (x + w) + "," + (y + hh) + " " + (x + w - 18) + "," + (y + hh) + " L" + tip + "," + mid + " Z";
      const vein = "M" + (b.left ? x + 24 : x + w - 24) + "," + mid + " Q" + (b.left ? x + 150 : x + w - 150) + "," + mid + " " + tip + "," + mid;
      els.push(h("path", { key: "leaf" + i, d, fill: printing ? "#fff" : "#142238", stroke: color, strokeWidth: printing ? 1.5 : 2.2, strokeOpacity: 1 }));
      els.push(h("path", { key: "vein" + i, d: vein, fill: "none", stroke: color, strokeWidth: printing ? 1 : 1.4, strokeOpacity: 0.55 }));
      const toggle = e => { e.stopPropagation(); if (this._didDrag) { this._didDrag = false; return; } this.setState(s => ({ selected: s.selected === b.id ? null : b.id })); };
      const keyToggle = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(e); } };
      const card = h("div", { tabIndex: 0, role: "button", "aria-label": pj.name + ", " + pj.result, onPointerDown: e => this.dragStart(e, "c:" + b.id), onClick: toggle, onKeyDown: keyToggle,
        style: { boxSizing: "border-box", width: (cardW - 46) + "px", minHeight: (cardH - 12) + "px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2px", overflow: "visible", outline: "none", fontFamily: "system-ui,-apple-system,sans-serif", color: printing ? "#111827" : "#e2e8f0", cursor: "grab", touchAction: "none" } },
        h("div", { style: { display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" } }, h("span", { style: { font: "700 15.5px/1.12 system-ui", color: printing ? "#111827" : "#f8fafc" } }, pj.name), h("span", { style: { font: "700 13px/1.1 ui-monospace,Menlo,monospace", color: color } }, pj.year)),
        h("div", { style: { font: "400 14.5px/1.14 system-ui", color: printing ? "#1f2937" : "#cbd5e1" } }, pj.desc),
        h("div", { style: { font: "600 14.5px/1.14 system-ui", color: printing ? "#14532d" : "#a7f3d0" } }, "\u2713 " + pj.result)
      );
      els.push(h("foreignObject", { key: "fo" + i, x: x + 20, y: y + 6, width: cardW - 46, height: cardH - 12, style: { overflow: "visible" } }, card));
    });

    bNodes.forEach((n, i) => {
      const active = hiSet.has(n), opacity = dimB(n) ? 0.2 : 1, r = n.kind === "root" ? 6.8 : (n.kind === "group" ? 5.3 : 4.2), fill = printing ? (n.kind === "terminal" ? "#334155" : "#111827") : (CAT[n.cat] || "#7dd3fc");
      const activate = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.setState(s => ({ selected: s.selected === n.id ? null : n.id })); } };
      els.push(h("circle", { key: "bn" + i, cx: n.px, cy: n.py, r, fill, stroke: active ? (printing ? "#111827" : "#fff") : "none", strokeWidth: active ? 1.5 : 0, opacity, filter: printing ? "none" : "url(#nodeGlow)", tabIndex: 0, role: "button", "aria-label": n.name, onKeyDown: activate, onPointerDown: e => this.dragStart(e, "n:" + n.id), style: { cursor: "grab" } }));
      const lines = n._lines || [n.name], tx = n.px + 8, ty = n.py - (lines.length - 1) * 7.4;
      const fillText = printing ? ink.text : (n.kind === "root" || n.kind === "group" ? (CAT[n.cat] || ink.text) : ink.text);
      els.push(h("text", { key: "bt" + i, x: tx, y: ty, fontFamily: "system-ui,-apple-system,sans-serif", fontSize: n.kind === "terminal" ? 15.5 : 15.5, fontWeight: n.kind === "terminal" ? 500 : 700, fill: fillText, opacity, paintOrder: "stroke", stroke: printing ? "#fff" : "#0f172a", strokeLinejoin: "round", strokeWidth: printing ? 2.5 : 3.2, tabIndex: 0, role: "button", "aria-label": n.name, onKeyDown: activate, onPointerDown: e => this.dragStart(e, "n:" + n.id), style: { cursor: "grab" } }, lines.map((line, j) => h("tspan", { key: j, x: tx, dy: j ? 15.5 : 0 }, line))));
    });

    const cnodes = (this.state.custom.nodes || []).map(n => { const d = (this.state.drag || {})["u:" + n.id] || { dx: 0, dy: 0 }; return { ...n, px: n.x + d.dx, py: n.y + d.dy }; });
    this._pos = {};
    bNodes.forEach(n => { this._pos["n:" + n.id] = { x: n.px, y: n.py, label: n.name }; });
    briefs.forEach(b => { this._pos["c:" + b.id] = { x: b.tipX, y: b.tipY, label: PROJECTS[b.id].name }; });
    cnodes.forEach(n => { this._pos["u:" + n.id] = { x: n.px, y: n.py, label: n.name }; });
    (this.state.custom.links || []).forEach((l, i) => { const a = this._pos[l.a], b = this._pos[l.b]; if (!a || !b) return; const mx = (a.x + b.x) / 2, d = "M" + a.x + "," + a.y + " C" + mx + "," + a.y + " " + mx + "," + b.y + " " + b.x + "," + b.y; els.push(h("path", { key: "cl" + i, d, stroke: printing ? "#64748b" : "#f0abfc", strokeWidth: 1.6, strokeOpacity: 0.85, fill: "none", strokeDasharray: "5 4" })); });
    cnodes.forEach((n, i) => { const activate = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.setState({ selected: "u:" + n.id }); } }; els.push(h("circle", { key: "cn" + i, cx: n.px, cy: n.py, r: 6, fill: CAT[n.cat] || "#f0abfc", tabIndex: 0, role: "button", "aria-label": n.name, onKeyDown: activate, onPointerDown: e => this.dragStart(e, "u:" + n.id) })); });

    return h("svg", { id: "treeSvg", viewBox: "0 0 " + W + " " + H, width: "100%", height: "100%", preserveAspectRatio: "xMidYMid meet", onClick: e => this.canvasClick(e), onPointerMove: e => this.dragMove(e), onPointerUp: () => this.dragEnd(), onPointerLeave: () => this.dragEnd(), style: { display: "block", touchAction: "none" } }, ...els);
  }`;

page = page.slice(0, start) + buildViz + page.slice(end);
page = page.replace(
  '  allSkillIds() {',
  '  plainTree(n) { const out = { name: n.name }; if (n.id) out.id = n.id; if (n.children && n.children.length) out.children = n.children.map(c => this.plainTree(c)); return out; }\n  allSkillIds() {'
);
page = page.replace('skills: this.tree()', 'skills: this.plainTree(this.tree())');
page = page.replace(/  @media print\{[\s\S]*?\n  \}<\/style>/, `  @media print{
    html,body{background:#fff !important;color:#111827 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    #scr{padding:0 !important;background:#fff !important;display:block !important;overflow:visible !important;height:auto !important}
    #vp{overflow:visible !important;display:block !important;width:194mm !important;height:281mm !important}
    #toolbar,#editpanel,#outlinepanel,#projectpanel{display:none !important}
    #a4fit{width:194mm !important;height:281mm !important;zoom:1 !important;transform:none !important}
    #a4c{width:194mm !important;height:281mm !important;background:#fff !important;color:#111827 !important;box-shadow:none;border-radius:0}
    #treeSvg{background:#fff !important}
    #treeSvg path,#treeSvg circle,#treeSvg text,#treeSvg foreignObject{opacity:1 !important;filter:none !important}
    #a4c [style*="color:#fff"],#a4c [style*="color:#f1f5f9"],#a4c [style*="color:#e2e8f0"]{color:#111827 !important}
  }</style>`);
const encoded = JSON.stringify(page).replace(/</g, "\\u003C").replace(/>/g, "\\u003E").replace(/&/g, "\\u0026");
const output = raw.slice(0, match.index) + match[1] + encoded + match[3] + raw.slice(match.index + match[0].length);
writeFileSync(file, output, "utf8");
