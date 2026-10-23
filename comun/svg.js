/* Desen SVG realist: gradienți metalici, filtre, șuruburi, ID-uri unice pe desen */
"use strict";

const SVGNS = "http://www.w3.org/2000/svg";
function mk(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function hexRgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function shade(h, f) { return "#" + hexRgb(h).map(v => clamp(Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f), 0, 255).toString(16).padStart(2, "0")).join(""); }

/* ID-uri unice pe fiecare desen (două SVG-uri în aceeași pagină) */
function prefixeazaId(svg, pre) {
  const ids = [...svg.querySelectorAll("[id]")].map(e => e.id);
  svg.querySelectorAll("[id]").forEach(e => { e.id = pre + e.id; });
  const atr = ["fill", "stroke", "filter", "marker-end", "clip-path"];
  svg.querySelectorAll("*").forEach(e => atr.forEach(a => {
    const v = e.getAttribute(a); if (v && v.startsWith("url(#")) { const id = v.slice(5, -1); if (ids.includes(id)) e.setAttribute(a, `url(#${pre}${id})`); }
  }));
}
function urlP(pre, id) { return `url(#${pre}${id})`; }
/* gradienți comuni */
const STOP = {
  otel: [[0, "#4f565e"], [0.1, "#8e969f"], [0.26, "#dfe3e7"], [0.38, "#ffffff"], [0.5, "#c4cad1"], [0.72, "#848d97"], [0.9, "#5b626b"], [1, "#3c4248"]],
  crom: [[0, "#3b4148"], [0.18, "#c9cfd5"], [0.32, "#ffffff"], [0.46, "#8c949d"], [0.62, "#d6dbe0"], [0.82, "#6f7780"], [1, "#30353b"]],
  interior: [[0, "#24282d"], [0.22, "#5d656e"], [0.5, "#9aa3ac"], [0.78, "#5d656e"], [1, "#24282d"]],
  albastru: [[0, "#6d93d1"], [0.18, "#4a71b3"], [0.55, "#284a85"], [1, "#132848"]],
  alama: [[0, "#fff0c0"], [0.25, "#e2b553"], [0.6, "#a87b22"], [1, "#5f430f"]],
  cauciuc: [[0, "#5a5d62"], [0.35, "#2a2c30"], [1, "#0d0e10"]],
  rosu: [[0, "#ff8a80"], [0.3, "#d32f2f"], [1, "#7f1010"]]
};
function grad(defs, id, stops, o = {}) {
  const g = mk(o.radial ? "radialGradient" : "linearGradient", Object.assign({ id }, o.radial ? { cx: o.cx ?? 0.5, cy: o.cy ?? 0.5, r: o.r ?? 0.5, fx: o.fx ?? o.cx ?? 0.5, fy: o.fy ?? o.cy ?? 0.5 } : { x1: o.x1 ?? 0, y1: o.y1 ?? 0, x2: o.x2 ?? 0, y2: o.y2 ?? 1 }), defs);
  stops.forEach(s => mk("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] ?? 1 }, g));
  return g;
}
function filtre(defs) {
  const f1 = mk("filter", { id: "fUmbra", x: "-10%", y: "-10%", width: "125%", height: "140%" }, defs);
  mk("feDropShadow", { dx: 0, dy: 6, stdDeviation: 5, "flood-color": "#000", "flood-opacity": 0.28 }, f1);
  const f2 = mk("filter", { id: "fBlur6" }, defs); mk("feGaussianBlur", { stdDeviation: 6 }, f2);
  const f3 = mk("filter", { id: "fBlur1" }, defs); mk("feGaussianBlur", { stdDeviation: 1.2 }, f3);
  const f4 = mk("filter", { id: "fBlur2", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs); mk("feGaussianBlur", { stdDeviation: 2 }, f4);
  // textură periată pentru fețele secționate
  const p = mk("pattern", { id: "pPeriat", width: 90, height: 5, patternUnits: "userSpaceOnUse" }, defs);
  mk("rect", { width: 90, height: 5, fill: "#c5cbd1" }, p);
  mk("line", { x1: 0, y1: 1, x2: 90, y2: 1.2, stroke: "#dde1e5", "stroke-width": 0.8 }, p);
  mk("line", { x1: 0, y1: 3.4, x2: 90, y2: 3.2, stroke: "#aeb5bd", "stroke-width": 0.6 }, p);
  // hașură pentru secțiune (ușoară)
  const h = mk("pattern", { id: "pHasura", width: 8, height: 8, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  mk("line", { x1: 0, y1: 0, x2: 0, y2: 8, stroke: "#8f979f", "stroke-width": 0.7, opacity: 0.45 }, h);
}
function surub(parent, x, y, r = 5.5) { // cap hexagonal văzut din față
  const pts = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; pts.push(`${x + r * Math.cos(a)},${y + r * Math.sin(a)}`); }
  mk("polygon", { points: pts.join(" "), fill: "url(#gOtelR)", stroke: "#4b5259", "stroke-width": 0.6 }, parent);
  mk("circle", { cx: x, cy: y, r: r * 0.45, fill: "none", stroke: "#6b737c", "stroke-width": 0.6 }, parent);
}


/** gradienții de bază folosiți de toate standurile (se apelează o dată pe desen, apoi prefixeazaId) */
function defsComune(defs) {
  grad(defs, "gOtel", STOP.otel);
  grad(defs, "gOtelR", STOP.otel, { x1: 0, y1: 0, x2: 1, y2: 1 });
  grad(defs, "gOtelO", STOP.otel, { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gCrom", STOP.crom);
  grad(defs, "gCromO", STOP.crom, { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gAlbastru", STOP.albastru);
  grad(defs, "gAlbastruO", STOP.albastru, { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gAlama", STOP.alama);
  grad(defs, "gAlamaO", STOP.alama, { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gCauciuc", STOP.cauciuc);
  grad(defs, "gRosu", STOP.rosu, { radial: true, cx: 0.4, cy: 0.35, r: 0.7 });
  grad(defs, "gNegru", [[0, "#5b5f66"], [0.4, "#2a2d31"], [1, "#0f1012"]]);
  grad(defs, "gAlu", [[0, "#6f767e"], [0.18, "#c9ced3"], [0.35, "#f1f3f5"], [0.6, "#aab1b8"], [1, "#59606a"]]);
  grad(defs, "gRama", [[0, "#ffffff"], [0.3, "#c8ced5"], [0.55, "#6f7882"], [0.8, "#d9dee3"], [1, "#59616a"]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  grad(defs, "gCadran", [[0, "#ffffff"], [0.75, "#f7f7f4"], [1, "#dfe2e5"]], { radial: true, cx: 0.45, cy: 0.4, r: 0.65 });
  grad(defs, "gSticla", [[0, "#ffffff", 0.75], [0.45, "#ffffff", 0.12], [1, "#ffffff", 0]], { x1: 0, y1: 0, x2: 0.7, y2: 1 });
  grad(defs, "gTub", [[0, "#cfe3f2", 0.55], [0.2, "#ffffff", 0.25], [0.5, "#eef6fc", 0.08], [0.8, "#ffffff", 0.3], [1, "#a9c3d8", 0.6]]);
  grad(defs, "gTubO", [[0, "#cfe3f2", 0.55], [0.2, "#ffffff", 0.25], [0.5, "#eef6fc", 0.08], [0.8, "#ffffff", 0.3], [1, "#a9c3d8", 0.6]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gApa", [[0, "#a9d4f5", 0.75], [0.5, "#5aa6e0", 0.7], [1, "#2f78b8", 0.8]]);
  grad(defs, "gApaO", [[0, "#a9d4f5", 0.75], [0.5, "#5aa6e0", 0.7], [1, "#2f78b8", 0.8]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(defs, "gLuciu", [[0, "#fff", 0.55], [1, "#fff", 0]]);
  grad(defs, "gBula", [[0, "#ffffff", 1], [0.28, "#ffffff", 0.65], [0.72, "#e8f0f7", 0.25], [0.92, "#9fb0c2", 0.55], [1, "#5d6b7a", 0.9]], { radial: true, cx: 0.5, cy: 0.5, r: 0.5, fx: 0.36, fy: 0.3 });
  filtre(defs);
}

/** manometru analogic realist; întoarce funcția de setare a acului (valoare în unitățile scalei) */
function manometru(parent, cx, cy, R, o = {}) {
  const max = o.max ?? 160, unit = o.unit ?? "bar", pasMaj = o.pasMaj ?? max / 8, pasMin = o.pasMin ?? pasMaj / 4, zonaRosie = o.rosu;
  const g = mk("g", { filter: "url(#fUmbra)" }, parent);
  mk("circle", { cx, cy, r: R + 7, fill: "url(#gRama)" }, g);
  mk("circle", { cx, cy, r: R + 2.5, fill: "#8d959e" }, g);
  mk("circle", { cx, cy, r: R, fill: "url(#gCadran)" }, g);
  const ang = v => (-135 + 270 * v / max) * Math.PI / 180;
  const P = (r, v) => [cx + r * Math.sin(ang(v)), cy - r * Math.cos(ang(v))];
  if (zonaRosie != null) { const [x1, y1] = P(R - 7, zonaRosie), [x2, y2] = P(R - 7, max); mk("path", { d: `M${x1} ${y1} A ${R - 7} ${R - 7} 0 ${270 * (max - zonaRosie) / max > 180 ? 1 : 0} 1 ${x2} ${y2}`, fill: "none", stroke: "#d32f2f", "stroke-width": Math.max(2.5, R * 0.09) }, g); }
  for (let v = 0; v <= max + 1e-9; v += pasMin) {
    const maj = Math.abs(v / pasMaj - Math.round(v / pasMaj)) < 1e-6;
    const [x1, y1] = P(R - 3, v), [x2, y2] = P(R - 3 - (maj ? R * 0.18 : R * 0.08), v);
    mk("line", { x1, y1, x2, y2, stroke: "#1b1b1b", "stroke-width": maj ? 1.3 : 0.6 }, g);
    if (maj) { const [xt, yt] = P(R * 0.62, v); const t = mk("text", { x: xt, y: yt + R * 0.065, "font-size": Math.max(6, R * 0.17), "text-anchor": "middle", fill: "#1b1b1b", "font-weight": 600 }, g); t.textContent = o.eticheta ? o.eticheta(v) : String(+v.toFixed(2)).replace(".", ","); }
  }
  const t1 = mk("text", { x: cx, y: cy + R * 0.42, "font-size": Math.max(6, R * 0.17), "text-anchor": "middle", fill: "#333", "font-weight": 700 }, g); t1.textContent = unit;
  if (o.subtitlu) { const t2 = mk("text", { x: cx, y: cy + R * 0.62, "font-size": Math.max(5, R * 0.12), "text-anchor": "middle", fill: "#666" }, g); t2.textContent = o.subtitlu; }
  const um = mk("g", { opacity: 0.28, filter: "url(#fBlur1)" }, g), ac = mk("g", {}, g);
  [um, ac].forEach((grp, i) => mk("polygon", { points: `0,${-(R - 8)} ${-R * 0.05},${R * 0.08} ${-R * 0.03},${R * 0.22} ${R * 0.03},${R * 0.22} ${R * 0.05},${R * 0.08}`, fill: i ? (o.culoareAc || "#c62828") : "#000" }, grp));
  mk("circle", { cx, cy, r: Math.max(2.5, R * 0.1), fill: "url(#gOtelR)", stroke: "#444", "stroke-width": 0.6 }, g);
  mk("path", { d: `M${cx - R + 4} ${cy - 6} A ${R - 4} ${R - 4} 0 0 1 ${cx + R * 0.36} ${cy - R + 6} Q ${cx - R * 0.16} ${cy - R * 0.52} ${cx - R + 4} ${cy - 6} Z`, fill: "url(#gSticla)" }, g);
  return v => {
    const a = -135 + 270 * clamp(v, -max * 0.02, max * 1.03) / max;
    ac.setAttribute("transform", `translate(${cx},${cy}) rotate(${a})`);
    um.setAttribute("transform", `translate(${cx + 1.6},${cy + 2.4}) rotate(${a})`);
  };
}

/** afișaj digital (LCD) – întoarce funcția de setare a textului */
function afisajLCD(parent, x, y, w, h, o = {}) {
  mk("rect", { x: x - 3, y: y - 3, width: w + 6, height: h + 6, rx: 4, fill: "url(#gNegru)" }, parent);
  mk("rect", { x, y, width: w, height: h, rx: 2, fill: o.fundal || "#c7d6a8" }, parent);
  const t = mk("text", { x: x + w - 5, y: y + h * 0.74, "font-size": h * 0.62, "text-anchor": "end", fill: "#1f2a12", "font-family": "'Courier New', monospace", "font-weight": 700 }, parent);
  if (o.unit) { const u = mk("text", { x: x + 4, y: y + h * 0.42, "font-size": h * 0.28, fill: "#2c3a1a" }, parent); u.textContent = o.unit; }
  return s => { t.textContent = s; };
}

/** pentru tragerea cu mouse-ul a unui element: întoarce unghiul / poziția în coordonatele SVG */
function punctSVG(svg, ev) { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
