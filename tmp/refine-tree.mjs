import fs from 'node:fs';
const raw = fs.readFileSync('rs_portrait.html','utf8');
let page = fs.readFileSync('tmp/old-tree-source.html','utf8');
let viz = fs.readFileSync('tmp/build-viz.txt','utf8');
let editor = page.slice(page.indexOf('    // ---------- manual editor: position registry'), page.indexOf('    return h("svg"',page.indexOf('    // ---------- manual editor: position registry')));
editor = editor.replace('this.props.rootStyle || "curved"', 'this.props.rootStyle || "straight"');
editor = editor.replace('h("div", { onClick: e => e.stopPropagation(),', 'h("div", { className: "branch-menu", onClick: e => e.stopPropagation(),');
editor = editor.replace('h("div", { key: v, onClick:', 'h("button", { type: "button", key: v, onClick:');
editor = editor.replace('style: { display: "flex", alignItems: "center", gap: "6px", cursor: "pointer",', 'style: { display: "flex", width: "100%", border: 0, alignItems: "center", gap: "6px", cursor: "pointer",');
viz = viz.replace('    // ORIGINAL_EDITOR', editor.replace('    if (menu) {','    if (menu && !printing) {'));
page = page.slice(0,page.indexOf('  buildViz() {')) + viz + page.slice(page.indexOf('\n  allSkillIds()'));
page = page.replace('const md = this.state.maxDepth, src = this.tree();','const md = this.state.printing ? 99 : this.state.maxDepth, src = this.tree();');
page = page.replace('&quot;default&quot;:&quot;curved','&quot;default&quot;:&quot;straight');
page = page.replace('</head>', `<style id="portrait-layout">
  #toolbar{flex-wrap:wrap;width:min(1100px,100%)}
  #toolbar button{white-space:nowrap;font:600 12px Arial,sans-serif !important;min-height:32px}
  #toolbar>span{flex:1;min-width:180px;font:12px/1.3 Arial,sans-serif !important;color:#9badba !important}
  #a4c header{font-family:Arial,sans-serif !important}
  #a4c header>div:first-child>div:last-child{font:12px/1.4 Arial,sans-serif !important}
  .project-card:focus-visible,.skill-label:focus-visible{outline:2px solid #fbbf24;outline-offset:3px}
  @media print{
    html,body,#scr{background:white !important;color:#172d27 !important}
    #vp{padding:0 !important;width:194mm !important;height:281mm !important}
    #a4fit{zoom:1 !important;transform:none !important;width:194mm !important;height:281mm !important}
    #a4c{width:194mm !important;height:281mm !important;background:white !important}
    #a4c header{background:white !important;border-color:#879b90 !important;padding:10px 16px !important}
    #a4c header *{color:#233e34 !important}
    #treeSvg{background:white !important}
    #treeSvg text,#treeSvg circle,#treeSvg path,#treeSvg foreignObject,.project-card{opacity:1 !important;filter:none !important}
    .root-hit{display:none !important}
    #treeSvg text{fill:#24392f !important}
    #treeSvg .skill-label{stroke:white !important}
  }
</style><title>Jay Huang | Engineering Skill Tree</title></head>`);
page = page.replace('drag nodes/cards to move · scroll to zoom, drag empty area to pan · click a root line to change its style','Select a project to trace its skills · drag to arrange · right-drag to pan');
const match = raw.match(/(<script type="__bundler\/template">)([\s\S]*?)(<\/script>)/);
const encoded = JSON.stringify(page).replaceAll('<','\\u003C').replaceAll('>','\\u003E').replaceAll('&','\\u0026');
fs.writeFileSync('rs_portrait.html',raw.slice(0,match.index)+match[1]+encoded+match[3]+raw.slice(match.index+match[0].length));
