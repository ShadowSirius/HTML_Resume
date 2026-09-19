import fs from 'node:fs';
const raw = fs.readFileSync('rs_portrait.html','utf8');
let page = fs.readFileSync('tmp/old-tree-source.html','utf8');
let viz = fs.readFileSync('tmp/build-viz.txt','utf8');
let editor = page.slice(page.indexOf('    // ---------- manual editor: position registry'), page.indexOf('    return h("svg"',page.indexOf('    // ---------- manual editor: position registry')));
editor = editor.replace('this.props.rootStyle || "curved"', 'this.props.rootStyle || "straight"');
editor = editor.replace('fill: "#f5d0fe"', 'fill: "#34463d"');
editor = editor.replace('h("div", { onClick: e => e.stopPropagation(),', 'h("div", { className: "branch-menu", onClick: e => e.stopPropagation(),');
editor = editor.replace('h("div", { key: v, onClick:', 'h("button", { type: "button", key: v, onClick:');
editor = editor.replace('style: { display: "flex", alignItems: "center", gap: "6px", cursor: "pointer",', 'style: { display: "flex", width: "100%", border: 0, alignItems: "center", gap: "6px", cursor: "pointer",');
viz = viz.replace('    // ORIGINAL_EDITOR', editor.replace('    if (menu) {','    if (menu && !printing) {'));
page = page.slice(0,page.indexOf('  buildViz() {')) + viz + page.slice(page.indexOf('\n  allSkillIds()'));
page = page.replace('const md = this.state.maxDepth, src = this.tree();','const md = this.state.printing ? 99 : this.state.maxDepth, src = this.tree();');
page = page.replace('&quot;default&quot;:&quot;curved','&quot;default&quot;:&quot;straight');
page = page.replace('    <textarea value="{{ projectSkillsText }}"', `    <label for="project-skill-add">Add related skill</label>
    <sc-raw-select id="project-skill-add" value="" sc-camel-on-change="{{ addProjectSkill }}" style="width:100%;padding:7px;border:1px solid #d4ddd7;border-radius:6px">
      <option value="">Choose a skill to add…</option>
      <sc-for list="{{ availableProjectSkills }}" as="skill"><option value="{{ skill.id }}">{{ skill.label }}</option></sc-for>
    </sc-raw-select>
    <textarea value="{{ projectSkillsText }}"`);
page = page.replace(/  renderVals\(\) \{\r?\n    return \{/, `  renderVals() {
    const projectId = PROJECTS[this.state.selected] ? this.state.selected : Object.keys(PROJECTS)[0];
    const availableProjectSkills = [], active = PROJECTS[projectId].activeSkills || [], known = this.allSkillIds();
    (function walk(node, path) {
      const label = path ? path + " / " + node.name : node.name;
      if (node.id && known.has(node.id) && !active.includes(node.id)) availableProjectSkills.push({ id: node.id, label });
      (node.children || []).forEach(child => walk(child, label));
    })(this.tree(), "");
    return {
      availableProjectSkills,
      addProjectSkill: e => { const id = e.target.value; if (id) this.updateProject(projectId, "activeSkills", [...active, id].join(",")); e.target.value = ""; },`);
page = page.replace('    <input value="{{ projectEdit.name }}"', `    <button sc-camel-on-click="{{ addProject }}">Add project</button>
    <button sc-camel-on-click="{{ deleteProject }}">Delete selected project</button>
    <button sc-camel-on-click="{{ undoDeleteProject }}">Undo last deletion</button>
    <button sc-camel-on-click="{{ toggleRouteEdit }}">{{ routeEditLabel }}</button>
    <small>Line handles snap to a centered 10-unit grid. Project lanes share equal spacing (8–14 units). Drag a junction directly; attachments stay connected.</small>
    <input value="{{ projectEdit.name }}"`);
page = page.replace('    <button sc-camel-on-click="{{ toggleProjectPanel }}"', '    <button sc-camel-on-click="{{ toggleRouteEdit }}">{{ routeEditLabel }}</button>\n    <button sc-camel-on-click="{{ toggleProjectPanel }}"');
page = page.replace('if (PROJECTS[id]) Object.assign(PROJECTS[id], pe[id]);', 'if (pe[id] === null) delete PROJECTS[id]; else if (pe[id] && typeof pe[id].name === "string") PROJECTS[id] = { ...(PROJECTS[id] || {}), ...pe[id] };');
page = page.replace('const p = PROJECTS[id], d = PROJECT_DEFAULTS[id]; if (', 'const p = PROJECTS[id], d = PROJECT_DEFAULTS[id] || {}; if (');
page = page.replace('try { localStorage.setItem("resumeTreeProjectsV1", JSON.stringify(out));', 'Object.keys(PROJECT_DEFAULTS).forEach(id => { if (!PROJECTS[id]) out[id] = null; }); try { localStorage.setItem("resumeTreeProjectsV1", JSON.stringify(out));');
page = page.replace('active = PROJECTS[projectId].activeSkills || []', 'active = PROJECTS[projectId]?.activeSkills || []');
page = page.replace('      availableProjectSkills,', `      availableProjectSkills,
      routeEditLabel: this.state.routeEdit ? "Finish editing lines" : "Edit line junctions",
      toggleRouteEdit: () => this.setState(s => ({ routeEdit: !s.routeEdit, projectPanelOpen: false })),
      addProject: () => { const id = "p_" + crypto.randomUUID(); PROJECTS[id] = { name: "New project", year: String(new Date().getFullYear()), desc: "", result: "", activeSkills: [] }; this.persistProjects(); this.setState(s => ({ selected: id, projectTick: s.projectTick + 1 })); },
      deleteProject: () => { if (!PROJECTS[projectId]) return; this._deletedProject = { id: projectId, data: PROJECTS[projectId] }; delete PROJECTS[projectId]; this.persistProjects(); this.setState(s => ({ selected: Object.keys(PROJECTS)[0] || null, projectTick: s.projectTick + 1 })); },
      undoDeleteProject: () => { const p = this._deletedProject; if (!p) return; PROJECTS[p.id] = p.data; this._deletedProject = null; this.persistProjects(); this.setState(s => ({ selected: p.id, projectTick: s.projectTick + 1 })); },`);
page = page.replace('projectEdit: PROJECTS[PROJECTS[this.state.selected] ? this.state.selected : Object.keys(PROJECTS)[0]],', 'projectEdit: PROJECTS[projectId] || { name: "", year: "", desc: "", result: "" },');
page = page.replace('Object.keys(PROJECTS)[0]].activeSkills || []', 'Object.keys(PROJECTS)[0]]?.activeSkills || []');
page = page.replace(/  svgPt\(svg, e\) \{[^\n]+/, `  svgPt(svg, e) { const r = svg.getBoundingClientRect(), v = svg.viewBox.baseVal, scale = Math.min(r.width/v.width,r.height/v.height); return { x:v.x+(e.clientX-r.left-(r.width-v.width*scale)/2)/scale, y:v.y+(e.clientY-r.top-(r.height-v.height*scale)/2)/scale }; }`);
page = page.replace('  dragMove(e) {', `  routeStart(e, key, move) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const svg = e.currentTarget.ownerSVGElement;
    svg.setPointerCapture(e.pointerId);
    this._routeDrag = { key, move, svg };
    this.routeMove(e);
  }
  routeMove(e) {
    const r = this._routeDrag; if (!r) return;
    const p = this.svgPt(r.svg, e), value = r.move(p);
    this._didDrag = true;
    this.setState(s => ({ drag: { ...s.drag, [r.key]: value } }));
  }
  dragMove(e) { if (this._routeDrag) { this.routeMove(e); return; }`);
page = page.replace('  dragEnd() {', `  dragEnd() { if (this._routeDrag) { this._routeDrag = null; try { localStorage.setItem("resumeTreeDragV1", JSON.stringify(this.state.drag || {})); } catch(e) {} }`);
page = page.replace('  allSkillIds() {', fs.readFileSync('tmp/resume-storage.txt','utf8')+'\n  allSkillIds() {');
page = page.replace(/const payload = \{ version: 2, exportedAt:[^\n]+? \}; const blob/, 'const payload = this.resumeSnapshot(); const blob');
page = page.replace('      exportResume: () => this.exportResume(),', `      exportResume: () => this.exportResume(),
      loadResume: () => this.loadResume(), saveResumeDefault: () => this.saveResumeDefault(), restoreResumeDefault: () => this.restoreResumeDefault(), storageMessage: this.state.storageMessage || "Defaults are saved in this browser; HTML is unchanged.",`);
page = page.replace('    <button sc-camel-on-click="{{ exportResume }}"', `    <button sc-camel-on-click="{{ loadResume }}">LOAD JSON</button>
    <button sc-camel-on-click="{{ saveResumeDefault }}">SAVE AS DEFAULT</button>
    <button sc-camel-on-click="{{ restoreResumeDefault }}">RESTORE DEFAULT</button>
    <button sc-camel-on-click="{{ exportResume }}"`);
page = page.replace('    <small>Line handles', '    <small role="status">{{ storageMessage }}</small>\n    <small>Line handles');
page = page.replace('    let d = {}, ls = {};', `    let loaded = null;
    try { const raw = localStorage.getItem("resumeTreeLoadedV1"); if(raw) loaded = this.validateResume(JSON.parse(raw)); } catch(e) { console.warn("Saved résumé could not be loaded",e); }
    if (loaded) { Object.keys(PROJECTS).forEach(k=>delete PROJECTS[k]); Object.assign(PROJECTS,loaded.projects); Object.keys(PROJECT_DEFAULTS).forEach(k=>delete PROJECT_DEFAULTS[k]); Object.assign(PROJECT_DEFAULTS,JSON.parse(JSON.stringify(loaded.projects))); Object.keys(SKILL_DATA).forEach(k=>delete SKILL_DATA[k]); Object.assign(SKILL_DATA,loaded.skills); }
    let d = loaded?.editor.drag || {}, ls = loaded?.editor.linkStyle || {};`);
page = page.replace('JSON.parse(localStorage.getItem("resumeTreeDragV1") || "{}")', 'JSON.parse(localStorage.getItem("resumeTreeDragV1") || JSON.stringify(d))');
page = page.replace('JSON.parse(localStorage.getItem("resumeTreeLinkStyleV1") || "{}")', 'JSON.parse(localStorage.getItem("resumeTreeLinkStyleV1") || JSON.stringify(ls))');
page = page.replace('let cu = { nodes: [], links: [] };', 'let cu = loaded?.editor.custom || { nodes: [], links: [] };');
page = page.replace('outline = localStorage.getItem("resumeTreeOutlineV2");','outline = localStorage.getItem("resumeTreeOutlineV2") ?? loaded?.editor.outline ?? null;');
page = page.replace('localStorage.removeItem("resumeTreeDragV1"); localStorage.removeItem("resumeTreeLinkStyleV1");','localStorage.setItem("resumeTreeDragV1","{}"); localStorage.setItem("resumeTreeLinkStyleV1","{}");');
page = page.replace('</head>', `<style id="portrait-layout">
  html,body,#scr{background:#eef1ee !important;color:#34463d}
  #a4c,#a4c>div,#treeSvg{background:white !important}
  #a4c{box-shadow:0 8px 28px #263d3512 !important}
  #a4c header{background:white !important;border-color:#d4ddd7 !important}
  #a4c header *{color:#34463d !important;border-color:#d4ddd7 !important}
  #toolbar button,#editpanel,#outlinepanel,#projectpanel,.branch-menu{background:#fff !important;color:#34463d !important;border-color:#c5d0c9 !important;box-shadow:none !important}
  #editpanel *,#outlinepanel *,#projectpanel *,.branch-menu *{color:#34463d !important;border-color:#d4ddd7 !important}
  #editpanel input,#editpanel select,#editpanel button,#outlinepanel input,#outlinepanel textarea,#outlinepanel button,#projectpanel input,#projectpanel textarea,#projectpanel select,#projectpanel button,.branch-menu button{background:#f5f7f4 !important}
  #toolbar{flex-wrap:wrap;width:min(1100px,100%)}
  #toolbar button{white-space:nowrap;font:600 12px Arial,sans-serif !important;min-height:32px}
  #projectpanel>button{padding:7px;border:1px solid #d4ddd7;border-radius:6px;cursor:pointer}
  #toolbar>span{flex:1;min-width:180px;font:12px/1.3 Arial,sans-serif !important;color:#617169 !important}
  #a4c header{font-family:Arial,sans-serif !important}
  #a4c header>div:first-child>div:last-child{font:12px/1.4 Arial,sans-serif !important}
  .project-card:focus-visible,.skill-label:focus-visible{outline:2px solid #426a61;outline-offset:3px}
  @media print{
    html,body,#scr{background:white !important;color:#172d27 !important}
    #vp{padding:0 !important;width:194mm !important;height:281mm !important}
    #a4fit{zoom:1 !important;transform:none !important;width:194mm !important;height:281mm !important}
    #a4c{width:194mm !important;height:281mm !important;background:white !important}
    #a4c header{background:white !important;border-color:#879b90 !important;padding:10px 16px !important}
    #a4c header *{color:#233e34 !important}
    #treeSvg{background:white !important}
    #treeSvg text,#treeSvg circle,#treeSvg path,#treeSvg foreignObject,.project-card{opacity:1 !important;filter:none !important}
    .root-hit,.route-handle{display:none !important}
    #treeSvg text{fill:#24392f !important}
    #treeSvg .skill-label{stroke:white !important}
  }
</style><title>Jay Huang | Engineering Skill Tree</title></head>`);
page = page.replace('drag nodes/cards to move · scroll to zoom, drag empty area to pan · click a root line to change its style','Select a project to trace its skills · drag to arrange · right-drag to pan');
page = page.replace(/[📧📱📍🔗]/gu, '');
const match = raw.match(/(<script type="__bundler\/template">)([\s\S]*?)(<\/script>)/);
const encoded = JSON.stringify(page).replaceAll('<','\\u003C').replaceAll('>','\\u003E').replaceAll('&','\\u0026');
fs.writeFileSync('rs_portrait.html',raw.slice(0,match.index)+match[1]+encoded+match[3]+raw.slice(match.index+match[0].length));
