// Interfața aplicației „Calculul sistemelor de propulsie electrice”.
(function () {
  "use strict";
  const E = window.EV, VK = window.WLTC3B, V0 = VK.map(x => x / 3.6);
  const $ = s => document.querySelector(s);
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function fmt(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return "–";
    let s = Number(x).toFixed(d === undefined ? 2 : d);
    const neg = s[0] === "-"; if (neg) s = s.slice(1);
    let [a, b] = s.split(".");
    if (a.length > 4) a = a.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const r = a + (b ? "," + b : "");
    return (neg && Number(s) !== 0 ? "−" : "") + r;
  }
  const parseNum = s => parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
  const getP = (o, p) => p.split(".").reduce((a, k) => (a === undefined || a === null ? undefined : a[k]), o);
  function setP(o, p, v) { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; }
  function decimals(x) { for (let d = 0; d <= 4; d++) if (Math.abs(x * Math.pow(10, d) - Math.round(x * Math.pow(10, d))) < 1e-6) return d; return 4; }

  const NUME = { SPRING: "Autoturism mic (după Dacia Spring)", SCENIC: "SUV (după Renault Scenic E-Tech)",
    SCENIC_2T: "SUV – reductor cu 2 trepte", SCENIC_AWD: "SUV – două motoare" };

  // ---------------------------------------------------------------- câmpuri: [cale, etichetă, simbol, unitate, scală, doarDacă]
  const EMF = (p, t) => ({ leg: t, f: [[p + ".em.P", "Puterea de vârf", "P<sub>max</sub>", "kW"], [p + ".em.P_cont", "Puterea continuă", "P<sub>c</sub>", "kW"],
    [p + ".em.T_max", "Cuplul maxim", "M<sub>max</sub>", "N·m"], [p + ".em.n_max", "Turația maximă", "n<sub>max</sub>", "rot/min"],
    [p + ".em.eta_max", "Randamentul maxim (cu invertor)", "η<sub>max</sub>", "–"], [p + ".i", "Rapoartele reductorului (separate cu ;)", "i", "–", "lista"],
    [p + ".eta", "Randamentul reductorului", "η<sub>red</sub>", "–"]] });
  const GRUPE = [
    { leg: "Vehiculul", f: [["veh.m", "Masa în simulare", "m", "kg"], ["veh.CdA", "Aria aerodinamică C<sub>x</sub>·A", "C<sub>x</sub>A", "m²"],
      ["veh.f", "Coeficientul de rezistență la rulare", "f", "–"], ["veh.rw", "Raza dinamică a roții", "r<sub>r</sub>", "m"],
      ["veh.delta", "Coeficientul maselor în rotație", "δ", "–"], ["veh.P_aux", "Consumatori (fără climatizare)", "P<sub>aux</sub>", "W"],
      ["veh.phi_front", "Fracțiunea frânării pe puntea față", "φ<sub>f</sub>", "–"], ["veh.phi_static", "Fracțiunea greutății pe puntea față", "–", "–"],
      ["veh.mu", "Coeficientul de aderență", "μ", "–"], ["veh.v_lim", "Viteza maximă limitată electronic", "v<sub>lim</sub>", "km/h"]] },
    EMF("drives.0", "Motorul 1 (punte față / principal)"), EMF("drives.1", "Motorul 2 (punte spate)"),
    { leg: "Bateria", f: [["bat.chem", "Chimia celulelor (NMC sau LFP)", "–", "–", "text"], ["bat.ns", "Celule în serie", "n<sub>s</sub>", "–"],
      ["bat.np", "Celule în paralel", "n<sub>p</sub>", "–"], ["bat.Q_Ah", "Capacitatea celulei", "Q", "Ah"], ["bat.R25", "Rezistența celulei la 25 °C", "R<sub>25</sub>", "mΩ"],
      ["bat.soc_min", "SOC minim", "SOC<sub>min</sub>", "%", 0.01], ["bat.soc_max", "SOC maxim", "SOC<sub>max</sub>", "%", 0.01],
      ["bat.P_dis", "Puterea maximă de descărcare", "P<sub>d</sub>", "kW"], ["bat.P_chg", "Puterea maximă la recuperare", "P<sub>rec</sub>", "kW"],
      ["bat.e_pack", "Energia specifică a pachetului", "e<sub>b</sub>", "Wh/kg"], ["bat.UA_bat", "Schimbul de căldură cu mediul", "(UA)<sub>b</sub>", "W/K"],
      ["bat.P_cool", "Puterea de răcire (0 = pasiv)", "Q<sub>răc</sub>", "W"], ["bat.T_cool_on", "Temperatura de pornire a răcirii", "T<sub>răc</sub>", "°C"],
      ["bat.crate", "Curentul de încărcare admis (C) la SOC-urile de mai jos", "C<sub>adm</sub>", "C", "lista"],
      ["bat.crate_soc", "… SOC-urile corespunzătoare (0 … 1)", "SOC", "–", "lista"]] },
    { leg: "Climatizarea", f: [["veh.hvac.T_cab", "Temperatura în habitaclu", "T<sub>hab</sub>", "°C"], ["veh.hvac.UA", "Coeficientul de pierderi al habitaclului", "(UA)<sub>h</sub>", "W/K"],
      ["veh.hvac.COP_heat", "COP la încălzire (1 = PTC)", "COP<sub>î</sub>", "–"], ["veh.hvac.COP_cool", "COP la răcire", "COP<sub>r</sub>", "–"],
      ["veh.hvac.Q_solar", "Aport solar vara", "Q<sub>sol</sub>", "W"]] },
    { leg: "Încărcarea", f: [["P_ac", "Încărcătorul de la bord (AC)", "P<sub>AC</sub>", "kW"], ["P_dc", "Puterea stației DC", "P<sub>DC</sub>", "kW"],
      ["eta_ac", "Randamentul încărcării AC", "η<sub>AC</sub>", "–"], ["eta_dc", "Randamentul încărcării DC", "η<sub>DC</sub>", "–"]] },
    { leg: "Cerințele temei", f: [["$req.vmax", "Viteza maximă", "v<sub>max</sub>", "km/h"], ["$req.tacc", "Timpul 0–100 km/h", "t<sub>0–100</sub>", "s"],
      ["$req.panta", "Panta la pornire", "p<sub>0</sub>", "%"], ["$req.d", "Autonomia WLTP", "d<sub>WLTP</sub>", "km"],
      ["$req.tdc", "Timpul de încărcare DC (de la SOC-ul de mai jos la 80 %)", "t<sub>DC</sub>", "min"], ["$req.socA", "… SOC de pornire", "SOC<sub>1</sub>", "%", 0.01]] },
    { leg: "Vehiculul de referință (validare)", f: [["$ref.range_wltp", "Autonomia WLTP omologată", "d<sub>ref</sub>", "km"]] },
    { leg: "Analiza de cost și CO₂", f: [["$tco.ev.pret", "Prețul vehiculului electric", "P<sub>VE</sub>", "EUR"], ["$tco.ev.rezidual", "Valoarea reziduală relativă (VE)", "r<sub>VE</sub>", "–"],
      ["$tco.ev.mentenanta", "Mentenanța (VE)", "C<sub>m</sub>", "EUR/an"], ["$tco.ev.taxe", "Taxele anuale (VE)", "C<sub>t</sub>", "EUR/an"],
      ["$tco.ice.L100", "Consumul vehiculului convențional", "C", "L/100 km"], ["$tco.ice.pret", "Prețul vehiculului convențional", "P<sub>c</sub>", "EUR"],
      ["$tco.ice.rezidual", "Valoarea reziduală relativă (convențional)", "r<sub>c</sub>", "–"], ["$tco.ice.mentenanta", "Mentenanța (convențional)", "C<sub>m</sub>", "EUR/an"],
      ["$tco.ice.taxe", "Taxele anuale (convențional)", "C<sub>t</sub>", "EUR/an"], ["$tco.ice.m", "Masa vehiculului convențional", "m<sub>c</sub>", "kg"],
      ["$econ.km_an", "Kilometraj anual", "D", "km/an"], ["$econ.ani", "Orizontul analizei", "N", "ani"], ["$econ.p_home", "Prețul energiei acasă", "p<sub>acasă</sub>", "EUR/kWh"],
      ["$econ.p_dc", "Prețul energiei la stații DC", "p<sub>DC</sub>", "EUR/kWh"], ["$econ.share_home", "Fracțiunea încărcată acasă", "s<sub>acasă</sub>", "–"],
      ["$econ.p_fuel", "Prețul benzinei", "p<sub>c</sub>", "EUR/L"], ["$econ.g_grid", "Intensitatea CO₂ a rețelei", "g<sub>rețea</sub>", "g/kWh"],
      ["$econ.kg_L", "CO₂ benzină, de la extracție la roată", "k<sub>c</sub>", "kg/L"], ["$econ.k_bat", "CO₂ la producția bateriei", "k<sub>bat</sub>", "kg/kWh"],
      ["$econ.k_glider", "CO₂ la producția restului vehiculului", "k<sub>veh</sub>", "kg/kg"]] }
  ];

  let S = null;
  function initState(key) {
    S = { key: key, hib: clone(PRESETS[key]), req: clone(REQ[key.startsWith("SCENIC") ? "SCENIC" : "SPRING"]),
      ref: clone(REF[key.startsWith("SCENIC") ? "scenic" : "spring"]), tco: clone(TCO_IN[key.startsWith("SCENIC") ? "SCENIC" : "SPRING"]),
      econ: clone(ECON), tab: S ? S.tab : "cerinte", custom: { T: 0, v: 100, hvac: true }, variante: null };
  }
  function objFor(path) {
    if (path[0] === "$") { const ks = path.slice(1).split("."); return [S[ks[0]], ks.slice(1).join(".")]; }
    return [S.hib, path];
  }
  function renderForm() {
    let h = `<fieldset><legend>Configurația</legend><div class="camp"><label for="sel-preset">Exemplul de pornire</label><span class="simbol"></span>
      <select id="sel-preset">${Object.keys(NUME).map(k => `<option value="${k}"${k === S.key ? " selected" : ""}>${NUME[k]}</option>`).join("")}</select><span class="um"></span></div>
      <p class="nota">La schimbare se încarcă datele exemplului din îndrumar. Pentru două motoare, porniți de la „SUV – două motoare”.</p></fieldset>`;
    for (const g of GRUPE) {
      let rows = "";
      for (const fd of g.f) {
        const [path, et, sim, um, sc] = fd;
        const [o, p] = objFor(path); const val = getP(o, p);
        if (val === undefined) continue;
        const scale = typeof sc === "number" ? sc : 1;
        const disp = sc === "lista" ? val.map(x => fmt(x, decimals(x))).join("; ") : sc === "text" ? val : fmt(val / scale, decimals(val / scale));
        rows += `<div class="camp"><label for="f-${path}">${et}</label><span class="simbol">${sim}</span>
          <input id="f-${path}" data-path="${path}" data-scale="${sc === undefined ? 1 : sc}" value="${esc(disp)}"${sc === "lista" ? ' class="lista"' : ""}${sc === "text" ? "" : ' inputmode="decimal"'}><span class="um">${um}</span></div>`;
      }
      if (rows) h += `<fieldset><legend>${g.leg}</legend>${rows}</fieldset>`;
    }
    $("#formular").innerHTML = h;
    $("#sel-preset").addEventListener("change", e => { initState(e.target.value); renderForm(); schedule(); });
  }
  $("#formular").addEventListener("input", e => {
    const inp = e.target; if (!inp.dataset || !inp.dataset.path) return;
    const [o, p] = objFor(inp.dataset.path), sc = inp.dataset.scale;
    if (sc === "lista") { const a = inp.value.split(/[;\s]+/).map(parseNum).filter(x => isFinite(x)); if (!a.length) return; setP(o, p, a); }
    else if (sc === "text") { const t = inp.value.trim().toUpperCase(); if (t !== "NMC" && t !== "LFP") return; setP(o, p, t); }
    else { const x = parseNum(inp.value); if (!isFinite(x)) return; setP(o, p, x * parseFloat(sc)); }
    schedule();
  });
  document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => { initState(b.dataset.preset); renderForm(); schedule(); }));

  // ---------------------------------------------------------------- calcul
  let R = null, timer = null;
  function schedule() { clearTimeout(timer); $("#sumar").classList.add("lucru"); timer = setTimeout(compute, 300); }
  function cycleFor(c) { const vm = E.vMax(c); return vm < 131.3 ? E.capCycle(V0, vm) : V0; }
  function compute() {
    try {
      const c = E.build(S.hib), r = { c };
      r.vmax = E.vMax(c); r.vphys = E.vPhys(c); r.v = cycleFor(c); r.capped = r.vmax < 131.3;
      r.D = E.wheelDemand(c.veh, r.v);
      r.r1 = E.simulate(c, r.v, { soc0: 0.9, record: true });
      r.rw = E.rangeCycle(c, r.v);
      r.rc = E.rangeCycle(c, r.v, -7, true);
      r.rhot = E.rangeCycle(c, r.v, 35, true);
      r.vh = r.vmax >= 130 ? 130 : 110;
      r.rh = E.rangeConst(c, r.vh);
      r.acc = E.accel(c); r.a80 = E.accel(c, 120, 80); r.gs = E.gradeStart(c); r.gc = E.gradeCont(c, 30); r.vcont = E.vMax(c, true);
      r.ch = E.chargeCurve(c, 0.10, 0.80); r.chq = E.chargeCurve(c, S.req.socA, 0.80);
      r.ch35 = E.chargeCurve(c, 0.10, 0.80, { T0: 35 }); r.ch0 = E.chargeCurve(c, 0.10, 0.80, { T0: 0 });
      r.ac = E.chargeCurve(c, 0.10, 1.00, { ac: true });
      const raw2 = clone(S.hib); raw2.veh.m += 100; r.r2 = E.simulate(E.build(raw2), r.v, { soc0: 0.9 });
      r.cost = costs(r);
      R = r; S.variante = null;
      $("#sumar").classList.remove("lucru"); render();
    } catch (err) {
      $("#sumar").classList.remove("lucru");
      $("#sumar").innerHTML = `<div class="alerta">Calculul nu s-a putut face cu datele introduse: ${esc(err.message)}</div>`;
      console.error(err);
    }
  }
  function costs(r) {
    const k = S.econ, t = S.tco, base = { km_an: k.km_an, ani: k.ani, p_home: k.p_home, p_dc: k.p_dc, share_home: k.share_home, p_fuel: k.p_fuel };
    const te = E.tco(Object.assign({}, base, { kWh100: r.rw.e_grid }, t.ev)), tc = E.tco(Object.assign({}, base, { L100: t.ice.L100, pret: t.ice.pret, rezidual: t.ice.rezidual, mentenanta: t.ice.mentenanta, taxe: t.ice.taxe }));
    const pmix = k.share_home * k.p_home + (1 - k.share_home) * k.p_dc;
    const sav = (t.ice.L100 / 100 * k.p_fuel - r.rw.e_grid / 100 * pmix) * k.km_an + (t.ice.mentenanta - t.ev.mentenanta) + (t.ice.taxe - t.ev.taxe);
    const dP = t.ev.pret - t.ice.pret;
    const c = r.c, mg = c.veh.m - 75 - c.bat.m_pack;
    const ce = E.co2({ m_glider: mg, k_glider: k.k_glider, E_bat: c.bat.E_nom, k_bat: k.k_bat, kWh100: r.rw.e_grid, g_grid: k.g_grid });
    const ci = E.co2({ m_glider: t.ice.m, k_glider: k.k_glider, L100: t.ice.L100, kg_L: k.kg_L });
    return { te, tc, pmix, sav, dP, be: sav > 0 ? dP / sav : Infinity, ce, ci, beco2: (ce.prod - ci.prod) / (ci.use_km - ce.use_km) };
  }

  // ---------------------------------------------------------------- verificări
  function checks(r) {
    const c = r.c, b = c.bat, q = S.req, ok = x => x ? "ok" : "atentie", out = [];
    out.push(["Autonomia WLTC", `${fmt(r.rw.range_km, 0)} km ≥ ${fmt(q.d, 0)} km`, ok(r.rw.range_km >= q.d)]);
    out.push(["Viteza maximă", `${fmt(r.vmax, 0)} km/h ≥ ${fmt(q.vmax, 0)} km/h`, ok(r.vmax >= q.vmax)]);
    out.push(["Accelerarea 0–100 km/h", `${fmt(r.acc, 1)} s ≤ ${fmt(q.tacc, 1)} s`, ok(r.acc <= q.tacc + 1e-9)]);
    out.push(["Panta la pornire", `${fmt(r.gs, 0)} % ≥ ${fmt(q.panta, 0)} %`, ok(r.gs >= q.panta)]);
    out.push(["Încărcarea DC " + fmt(q.socA * 100, 0) + "–80 %", `${fmt(r.chq.t_min, 0)} min ≤ ${fmt(q.tdc, 0)} min`, ok(r.chq.t_min <= q.tdc)]);
    const err = (r.rw.range_km / S.ref.range_wltp - 1) * 100;
    out.push(["Validarea pe vehiculul de referință", `autonomie ${fmt(r.rw.range_km, 0)} față de ${fmt(S.ref.range_wltp, 0)} km: ${err >= 0 ? "+" : ""}${fmt(err, 1)} %`, ok(Math.abs(err) <= 5)]);
    out.push(["Motorul pe ciclu și turația la v<sub>max</sub>", `cuplu ${fmt(r.r1.lim.T * 100, 0)} %, turație ${fmt(r.r1.lim.w * 100, 0)} %; viteza maximă fizică ${fmt(r.vphys, 1)} km/h`, ok(r.r1.lim.T <= 1 + 1e-6 && r.r1.lim.w <= 1 + 1e-6 && r.vphys >= r.vmax)]);
    const Umin = b.ns * E.ocvCell(b.chem, b.soc_min), Crate = b.P_dis * 1e3 / Umin / (b.Q_Ah * b.np);
    out.push(["Bateria: puterea pe ciclu și curentul relativ maxim", `${fmt(r.r1.lim.P * 100, 0)} % din P<sub>d</sub>; ${fmt(Crate, 1)}C la P<sub>d</sub>`, ok(r.r1.lim.P <= 1 && Crate <= (b.chem === "LFP" ? 5 : 4))]);
    out.push(["Ciclul urmat" + (r.capped ? " (cu viteză limitată)" : ""), `${r.r1.nofollow} s cu cerere neacoperită`, ok(r.r1.nofollow === 0)]);
    const d0 = c.drives[0], F0 = E.maxWheelForce(c, 0.1), Fm = d0.em.T_max * d0.i[0] * d0.eta / c.veh.rw;
    out.push(["Forța la pornire și aderența", `forța din cuplul motorului ${fmt(Fm, 0)} N; limita de aderență ${fmt(F0, 0)} N` + (Fm > F0 * 1.001 ? " – controlul tracțiunii limitează cuplul (se justifică în memoriu)" : ""), "ok"]);
    out.push(["Temperatura bateriei la DC 10–80 % (pornire de la 35 °C)", `${fmt(r.ch35.T_max, 1)} °C ≤ 45 °C`, ok(r.ch35.T_max <= 45)]);
    out.push(["Bilanțul energetic", `abatere ${fmt(r.r1.energy.closure * 100, 2)} %`, ok(Math.abs(r.r1.energy.closure) <= 0.005)]);
    return out;
  }

  // ---------------------------------------------------------------- grafice
  function grafic({ titlu, xEt, yEt, serii, xMin, xMax, yMin, yMax, puncte, W, Hh, bare }) {
    W = W || 640; Hh = Hh || 250;
    const m = { l: 56, r: 14, t: 10, b: 40 }, w = W - m.l - m.r, h = Hh - m.t - m.b;
    const ys = [], xs = [];
    serii.forEach(s => { s.y.forEach(v => isFinite(v) && ys.push(v)); (s.x || []).forEach(v => xs.push(v)); });
    (puncte || []).forEach(p => { ys.push(p[1]); xs.push(p[0]); });
    const x0 = xMin !== undefined ? xMin : Math.min(...xs, 0), x1 = xMax !== undefined ? xMax : Math.max(...xs);
    let y0 = yMin !== undefined ? yMin : Math.min(...ys), y1 = yMax !== undefined ? yMax : Math.max(...ys);
    if (y1 === y0) { y1 += 1; y0 -= 1; }
    const tick = (a, b, n) => { const raw = (b - a) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(k => k * p).find(k => raw <= k); const r = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) r.push(+v.toFixed(10)); return r; };
    const X = v => m.l + (v - x0) / (x1 - x0) * w, Y = v => m.t + h - (v - y0) / (y1 - y0) * h;
    let g = "";
    tick(y0, y1, 5).forEach(v => g += `<line class="grila" x1="${m.l}" x2="${m.l + w}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0)}</text>`);
    tick(x0, x1, 6).forEach(v => g += `<text class="ax" x="${X(v)}" y="${m.t + h + 16}" text-anchor="middle">${fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0)}</text>`);
    g += `<line class="axa" x1="${m.l}" x2="${m.l + w}" y1="${m.t + h}" y2="${m.t + h}"/><line class="axa" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${m.t + h}"/>`;
    g += `<text class="ax-titlu" x="${m.l + w / 2}" y="${Hh - 4}" text-anchor="middle">${xEt}</text><text class="ax-titlu" transform="translate(13 ${m.t + h / 2}) rotate(-90)" text-anchor="middle">${yEt}</text>`;
    if (puncte) g += puncte.map(p => `<circle class="punct" cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="1.6"/>`).join("");
    serii.forEach((s, i) => {
      const pts = s.y.map((v, k) => [X(s.x ? s.x[k] : k), Y(Math.min(Math.max(v, y0), y1))]);
      g += `<polyline class="serie serie-${s.cls !== undefined ? s.cls : i}${s.sub ? " subtire" : ""}" points="${pts.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ")}"/>`;
    });
    const leg = serii.filter(s => s.nume).map((s, i) => `<span><i class="serie-${s.cls !== undefined ? s.cls : i}"></i>${s.nume}</span>`).join("") + (puncte && puncte.nume ? `<span><i class="punct-leg"></i>${puncte.nume}</span>` : "");
    return `<figure class="grafic"><figcaption>${titlu}</figcaption><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(titlu.replace(/<[^>]+>/g, ""))}">${g}</svg>${leg ? `<div class="legenda">${leg}</div>` : ""}</figure>`;
  }
  function bare(titlu, et, vals, um) {
    const mx = Math.max(...vals);
    return `<figure class="grafic"><figcaption>${titlu}</figcaption><div class="bare">${vals.map((v, i) => `<div class="bara"><span class="bara-et">${et[i]}</span><span class="bara-f"><i style="width:${(v / mx * 100).toFixed(1)}%" class="b${i}"></i></span><span class="bara-v">${fmt(v, 0)} ${um}</span></div>`).join("")}</div></figure>`;
  }
  const tabel = (cap, rows, cls) => `<div class="tabel-container"><table class="tabel${cls ? " " + cls : ""}"><thead><tr>${cap.map((c, i) => `<th${i ? ' class="num"' : ""}>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r => r.sectiune ? `<tr class="sectiune"><td colspan="${cap.length}">${r.sectiune}</td></tr>` : `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const ins = s => `<span class="insigna ${s}">${s === "ok" ? "îndeplinită" : "neîndeplinită"}</span>`;
  const col = (h, k) => h.map(r => r[k]);

  // ---------------------------------------------------------------- taburi
  const TAB = [["cerinte", "2. Cerințe de putere și energie"], ["dim", "3. Arhitectura și dimensionarea"], ["sim", "5. Simularea pe ciclul WLTC"], ["aut", "5.4 Autonomia în condiții reale"],
    ["inc", "6–7. Încărcarea și managementul termic"], ["var", "8. Variante de arhitectură"], ["tco", "9. Analiza tehnico-economică și CO₂"], ["ver", "10. Verificări"]];
  function render() {
    if (window.PCMAI_SHELL) PCMAI_SHELL.rezultat(S, R);
    renderSumar();
    $("#taburi").innerHTML = TAB.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === S.tab}">${t}</button>`).join("");
    $("#taburi").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { S.tab = b.dataset.tab; render(); }));
    const F = { cerinte: tCer, dim: tDim, sim: tSim, aut: tAut, inc: tInc, var: tVar, tco: tTco, ver: tVer };
    $("#continut").innerHTML = F[S.tab]();
    if (S.tab === "aut") bindAut(); if (S.tab === "var") bindVar();
    $("#continut").insertAdjacentHTML("beforeend", `<div class="doar-tipar">${TAB.filter(t => t[0] !== S.tab && t[0] !== "var").map(([k, t]) => `<section class="foaie-tipar"><h2>${t}</h2>${F[k]()}</section>`).join("")}</div>`);
  }
  function renderSumar() {
    const r = R, ch = checks(r), n = ch.filter(c => c[2] === "ok").length;
    const k = [["Autonomie WLTC", fmt(r.rw.range_km, 0), "km"], ["Consum de la rețea", fmt(r.rw.e_grid, 1), "kWh/100 km"],
      ["Autonomie la −7 °C", fmt(r.rc.range_km, 0), "km"], ["0–100 km/h", fmt(r.acc, 1), "s"],
      ["Încărcare DC 10–80 %", fmt(r.ch.t_min, 0), "min"], ["TCO pe " + S.econ.ani + " ani", fmt(r.cost.te.TCO, 0), "EUR"]];
    $("#sumar").innerHTML = `<div class="kpiuri">${k.map(x => `<div class="kpi"><span class="kpi-et">${x[0]}</span><span class="kpi-v">${x[1]}</span><span class="kpi-um">${x[2]}</span></div>`).join("")}</div>
      <div class="stare ${n === ch.length ? "stare-ok" : "stare-atentie"}">${NUME[S.key]}: ${n} din ${ch.length} verificări îndeplinite${n === ch.length ? "." : " – vezi fila Verificări."}</div>`;
  }

  function tCer() {
    const r = R, D = r.D, veh = r.c.veh, n = D.vm.length, eta = r.c.drives[0].eta, q = S.req;
    let Ep = 0, En = 0, Pmx = 0, Pmn = 0, dist = 0;
    for (let i = 0; i < n; i++) { const P = D.P[i]; if (P > 0) Ep += P; else En -= P; Pmx = Math.max(Pmx, P); Pmn = Math.min(Pmn, P); dist += D.vm[i]; }
    Ep /= 3.6e6; En /= 3.6e6; dist /= 1000;
    const vs = [50, 90, 120, 130, 150];
    const al = Math.atan(q.panta / 100), Fp = veh.m * E.G * (Math.sin(al) + veh.f * Math.cos(al));
    const Pacc = veh.delta * veh.m * Math.pow(100 / 3.6, 2) / (2 * q.tacc) / 1e3;
    let h = `<div class="grafice">${grafic({ titlu: "Ciclul WLTC clasa 3b" + (r.capped ? ` cu viteza limitată la ${fmt(r.vmax, 0)} km/h` : ""), xEt: "timpul [s]", yEt: "v [km/h]", serii: [{ y: r.v.map(x => x * 3.6) }], xMin: 0, xMax: 1800, yMin: 0 })}
      ${grafic({ titlu: "Puterea la roată", xEt: "timpul [s]", yEt: "P [kW]", serii: [{ y: Array.from(D.P).map(x => x / 1e3), sub: true }], xMin: 0, xMax: 1800 })}</div>`;
    h += tabel(["Ciclul și energia la roată (§2.2)", "Valoare"], [["Distanța / viteza medie", `${fmt(dist, 2)} km / ${fmt(dist / n * 3600, 1)} km/h`],
      ["Energia de tracțiune E<sub>r</sub><sup>+</sup>", `${fmt(Ep * 1000 / dist, 0)} Wh/km`], ["Energia disponibilă la frânare E<sub>r</sub><sup>−</sup>", `${fmt(En * 1000 / dist, 0)} Wh/km (${fmt(En / Ep * 100, 0)} %)`],
      ["Puterea maximă la roată: tracțiune / frânare", `${fmt(Pmx / 1e3, 1)} / ${fmt(Pmn / 1e3, 1)} kW`]]);
    h += "<br>" + tabel(["Viteza [km/h]", ...vs.map(String)], [["Puterea necesară, η<sub>red</sub> = " + fmt(eta, 2) + " [kW]", ...vs.map(v => fmt(E.pRoad(veh, v) / eta / 1e3, 1))]], "compact");
    h += "<br>" + tabel(["Puterile cerute de performanțe (§2.3)", "Valoare"], [
      [`Viteza maximă ${fmt(q.vmax, 0)} km/h → (2.2)`, `${fmt(E.pRoad(veh, q.vmax) / eta / 1e3, 1)} kW`],
      [`Accelerare 0–100 km/h în ${fmt(q.tacc, 1)} s: medie / cu rezistențe (2.3)`, `${fmt(Pacc, 1)} / ${fmt(Pacc / eta + E.pRoad(veh, 100) / 2e3, 1)} kW`],
      [`Panta la pornire ${fmt(q.panta, 0)} %: forța la roată (2.4)`, `${fmt(Fp, 0)} N`]]);
    return h;
  }

  function tDim() {
    const r = R, c = r.c, veh = c.veh, b = c.bat, q = S.req, d0 = c.drives[0], em = d0.em;
    const al = Math.atan(q.panta / 100), Fp = veh.m * E.G * (Math.sin(al) + veh.f * Math.cos(al));
    const Umin = b.ns * E.ocvCell(b.chem, b.soc_min), Umax = b.ns * E.ocvCell(b.chem, b.soc_max);
    const imax = em.n_max * E.PI30 * veh.rw / (q.vmax / 3.6), Ereq = q.d * r.r1.e_bat / 100;
    const P0 = E.pRoad(veh, q.vmax) / d0.eta / 1e3, Crate = b.P_dis * 1e3 / Umin / (b.Q_Ah * b.np);
    const F0 = E.maxWheelForce(c, 0.1), Fm = em.T_max * d0.i[0] * d0.eta / veh.rw;
    const rows = [{ sectiune: "Motorul și reductorul (§3.2)" },
      ["Puterea continuă ≥ P la v<sub>max</sub> cerută (2.2)", `${fmt(em.P_cont, 0)} ≥ ${fmt(P0, 1)} kW`, ins(em.P_cont >= P0 ? "ok" : "atentie")],
      ["Raportul maxim admis i<sub>max</sub> (3.2); raportul ales", `${fmt(imax, 2)}; ${d0.i.map(x => fmt(x, 2)).join(" / ")}`, ins(d0.i[d0.i.length - 1] <= imax + 1e-9 ? "ok" : "atentie")],
      ["Viteza maximă fizică / limitată", `${fmt(r.vphys, 1)} / ${fmt(r.vmax, 0)} km/h`, ""],
      ["Cuplul necesar pentru panta la pornire (3.1)", `${fmt(Fp * veh.rw / (d0.i[0] * d0.eta), 0)} ≤ ${fmt(em.T_max, 0)} N·m`, ins(Fp * veh.rw / (d0.i[0] * d0.eta) <= em.T_max * (c.drives.length) ? "ok" : "atentie")],
      ["Viteza de bază a motorului", `${fmt(em.P * 1e3 / em.T_max / E.PI30, 0)} rot/min`, ""],
      ["Forța maximă la pornire / limita de aderență", `${fmt(Fm, 0)} / ${fmt(F0, 0)} N`, Fm > F0 * 1.001 ? '<span class="insigna atentie">control tracțiune</span>' : ins("ok")],
      { sectiune: "Invertorul (§3.3)" },
      ["Curentul maxim la U<sub>min</sub> (3.3)", `${fmt(em.P * 1e3 / em.eta_max / Umin, 0)} A la ${fmt(Umin, 0)} V`, ""],
      { sectiune: "Bateria (§3.4)" },
      ["Consumul la baterie din prima simulare (SOC 90 %)", `${fmt(r.r1.e_bat, 2)} kWh/100 km`, ""],
      [`Energia utilă necesară pentru ${fmt(q.d, 0)} km / nominală (3.4)`, `${fmt(Ereq, 1)} / ${fmt(Ereq / (b.soc_max - b.soc_min), 1)} kWh`, ""],
      ["Configurația; tensiunea medie a celulei (3.5)", `${b.ns}s${b.np}p, ${b.chem} ${fmt(b.Q_Ah, 0)} Ah; ${fmt(b.U_nom_cell, 3)} V`, ""],
      ["Energia nominală / utilă", `${fmt(b.E_nom, 1)} / ${fmt(b.E_use, 1)} kWh`, ins(b.E_use >= Ereq * 0.99 ? "ok" : "atentie")],
      ["Tensiunea nominală (min – max)", `${fmt(b.U_nom, 0)} (${fmt(Umin, 0)} – ${fmt(Umax, 0)}) V`, ""],
      ["Curentul relativ la P<sub>d</sub> (3.7)", `${fmt(Crate, 1)}C (${fmt(b.P_dis * 1e3 / Umin, 0)} A)`, ins(Crate <= (b.chem === "LFP" ? 5 : 4) ? "ok" : "atentie")],
      ["Rezistența pachetului la 25 °C", `${fmt(E.rPack(b, 25) * 1e3, 0)} mΩ`, ""],
      ["Masa pachetului", `${fmt(b.m_pack, 0)} kg`, ""],
      ["Efectul a +100 kg asupra consumului", `+${fmt((r.r2.e_bat / r.r1.e_bat - 1) * 100, 1)} %`, ""],
      { sectiune: "Performanțele (§3.5)" },
      ["Viteza maximă", `${fmt(r.vmax, 0)} km/h (cerut ≥ ${fmt(q.vmax, 0)})`, ins(r.vmax >= q.vmax ? "ok" : "atentie")],
      ["0–100 km/h", `${fmt(r.acc, 1)} s (cerut ≤ ${fmt(q.tacc, 1)})`, ins(r.acc <= q.tacc + 1e-9 ? "ok" : "atentie")],
      ["80–120 km/h", `${fmt(r.a80, 1)} s`, ""],
      ["Panta la pornire / la 30 km/h cu puterea continuă", `${fmt(r.gs, 0)} % / ${fmt(r.gc, 0)} %`, ins(r.gs >= q.panta ? "ok" : "atentie")],
      ["Viteza maximă cu puterea continuă", `${fmt(r.vcont, 0)} km/h`, ""]];
    let h = tabel(["Mărime", "Valoare", "Verificare"], rows);
    const vk = [], Fmax = [], Fr0 = [], Fr20 = [];
    for (let v = 1; v <= Math.max(r.vphys + 10, 140); v += 2) {
      vk.push(v); Fmax.push(E.maxWheelForce(c, v / 3.6) / 1e3);
      Fr0.push((veh.m * E.G * veh.f + 0.5 * E.RHO_AIR * veh.CdA * Math.pow(v / 3.6, 2)) / 1e3);
      Fr20.push((veh.m * E.G * (veh.f * Math.cos(Math.atan(0.2)) + Math.sin(Math.atan(0.2))) + 0.5 * E.RHO_AIR * veh.CdA * Math.pow(v / 3.6, 2)) / 1e3);
    }
    h += `<div class="grafice">${grafic({ titlu: "Forța maximă la roată (cu aderența) și rezistențele", xEt: "viteza [km/h]", yEt: "F [kN]", serii: [{ x: vk, y: Fmax, nume: "forța maximă" }, { x: vk, y: Fr0, nume: "rezistențe, 0 %" }, { x: vk, y: Fr20, nume: "rezistențe, 20 %", cls: 2 }], xMin: 0, yMin: 0 })}
      ${grafic({ titlu: "Tensiunea în gol a celulei", xEt: "SOC [%]", yEt: "U<sub>0</sub> [V]".replace(/<[^>]+>/g, ""), serii: [{ x: E.OCV[b.chem][0].map(x => x * 100), y: E.OCV[b.chem][1], nume: b.chem }], xMin: 0, xMax: 100 })}</div>`;
    return h;
  }

  function tSim() {
    const r = R, h = r.r1.hist, e = r.r1.energy, d = r.r1.dist_km, PH = [[0, 589, "Low"], [589, 1022, "Medium"], [1022, 1477, "High"], [1477, 1800, "Extra High"]];
    const ph = (a, b) => { let E_ = 0, s = 0; for (let i = a; i < b; i++) { E_ += h[i][4]; s += h[i][1] / 3.6; } return E_ / 3600 / (s / 1000) * 100; };
    const wh = x => fmt(x / d * 1000, 1);
    let t = tabel(["Bilanțul energetic pe un ciclu (§5.3)", "Wh/km"], [["Energia chimică extrasă din baterie", wh(e.E_chem)], { sectiune: "Consumatori și pierderi" },
      ["Tracțiune la roată E<sub>r</sub><sup>+</sup>", wh(e.wheel_pos)], ["Frânare la roată E<sub>r</sub><sup>−</sup> (se scade)", "−" + wh(e.wheel_neg)], ["Frâne cu fricțiune", wh(e.fric)],
      ["Pierderi în motor și invertor", wh(e.em_loss)], ["Pierderi în reductor", wh(e.tr_loss)], ["Pierderi în baterie", wh(e.bat_loss)], ["Consumatori", wh(e.aux)],
      { sectiune: "Indicatori" }, ["Energia recuperată (din energia de frânare)", `${wh(e.regen)} (${fmt(e.regen / e.wheel_neg * 100, 0)} %)`],
      ["Consumul la baterie pe un ciclu", `${fmt(r.r1.e_bat, 2)} kWh/100 km`], ["Abaterea bilanțului", fmt(e.closure * 100, 2) + " %"]]);
    t += "<br>" + tabel(["Consumul pe faze la baterie [kWh/100 km]", ...PH.map(p => p[2])], [["", ...PH.map(p => fmt(ph(p[0], p[1]), 1))]], "compact");
    const pts = h.filter(x => Math.abs(x[10]) > 0.5).map(x => [x[11] / E.PI30, x[10]]); pts.nume = "puncte pe WLTC";
    const em = r.c.drives[0].em, ws = E.linspace(10, em.w_max, 120);
    t += `<div class="grafice">${grafic({ titlu: "Puterea motorului (electrică) și a bateriei", xEt: "timpul [s]", yEt: "P [kW]", serii: [{ y: col(h, 3), nume: "motor", sub: true }, { y: col(h, 4), nume: "baterie", sub: true, cls: 1 }], xMin: 0, xMax: 1800 })}
      ${grafic({ titlu: "Punctele de funcționare ale motorului 1", xEt: "turația [rot/min]", yEt: "cuplul [N·m]", serii: [{ x: ws.map(w => w / E.PI30), y: ws.map(w => E.emTmax(em, w)), nume: "cuplul maxim" }, { x: ws.map(w => w / E.PI30), y: ws.map(w => -E.emTmax(em, w)), cls: 0 }], puncte: pts, xMin: 0, xMax: em.n_max })}</div>`;
    return t;
  }

  function tAut() {
    const r = R, u = S.custom;
    const rows = [["WLTC, 23 °C (omologare)", r.rw], ["WLTC, 35 °C, climatizare", r.rhot], ["WLTC, −7 °C, încălzire, baterie rece", r.rc], [`${r.vh} km/h constant, 23 °C`, r.rh]];
    if (u.res) rows.push([`${u.v > 0 ? fmt(u.v, 0) + " km/h constant" : "WLTC"}, ${fmt(u.T, 0)} °C${u.hvac ? ", climatizare" : ""}`, u.res]);
    let h = tabel(["Scenariu (§5.4)", "Autonomie [km]", "Consum la baterie [kWh/100 km]", "Față de WLTC"], rows.map(x => [x[0], fmt(x[1].range_km, 0), fmt(x[1].e_bat, 1), fmt((x[1].range_km / r.rw.range_km - 1) * 100, 0) + " %"]));
    h += `<p class="nota">Puterea de climatizare în regim staționar: ${fmt(E.hvacPower(r.c.veh, -7) / 1e3, 2)} kW la −7 °C, ${fmt(E.hvacPower(r.c.veh, 35) / 1e3, 2)} kW la 35 °C. Consumul de la rețea pe WLTC: ${fmt(r.rw.e_grid, 1)} kWh/100 km.</p>
      <div class="rand-optim"><label>Temperatura <input id="cu-T" value="${fmt(u.T, 0)}"> °C</label><label>Viteza constantă <input id="cu-v" value="${fmt(u.v, 0)}"> km/h (0 = WLTC)</label>
      <label><input type="checkbox" id="cu-h"${u.hvac ? " checked" : ""}> climatizare</label><button type="button" id="cu-run">Calculează scenariul</button></div>`;
    h += `<div class="grafice">${bare("Autonomia în condiții de omologare și reale", rows.map(x => x[0]), rows.map(x => x[1].range_km), "km")}</div>`;
    return h;
  }
  function bindAut() {
    $("#cu-run").addEventListener("click", () => {
      const u = S.custom; u.T = parseNum($("#cu-T").value); u.v = parseNum($("#cu-v").value); u.hvac = $("#cu-h").checked;
      const c = R.c; u.res = u.v > 0 ? E.rangeConst(c, u.v, u.T, u.hvac) : E.rangeCycle(c, R.v, u.T, u.hvac); render();
    });
  }

  function tInc() {
    const r = R, q = S.req, c = r.c;
    let h = tabel(["Încărcarea (cap. 6) și temperatura bateriei (cap. 7)", "Valoare"], [
      ["DC 10–80 % la " + fmt(c.P_dc, 0) + " kW, baterie la 25 °C", `${fmt(r.ch.t_min, 0)} min; ${fmt(r.ch.E_kWh, 1)} kWh de la stație`],
      [`DC ${fmt(q.socA * 100, 0)}–80 % (cerința temei: ≤ ${fmt(q.tdc, 0)} min)`, `${fmt(r.chq.t_min, 0)} min`],
      ["Puterea maximă la bornele bateriei", `${fmt(Math.max(...r.ch.curve.map(x => x[2])), 0)} kW`],
      ["Temperatura maximă a bateriei: pornire de la 25 °C / 35 °C", `${fmt(r.ch.T_max, 1)} / ${fmt(r.ch35.T_max, 1)} °C`],
      ["DC 10–80 % cu bateria la 0 °C, fără precondiționare", `${fmt(r.ch0.t_min, 0)} min`],
      [`AC ${fmt(c.P_ac, 1)} kW, 10–100 %`, `${fmt(r.ac.t_min / 60, 1)} h; ${fmt(r.ac.E_kWh, 1)} kWh de la rețea`],
      ["Răcirea bateriei", c.bat.P_cool > 0 ? `${fmt(c.bat.P_cool / 1e3, 1)} kW peste ${fmt(c.bat.T_cool_on, 0)} °C` : "pasivă (fără răcire activă)"]]);
    h += `<div class="grafice">${grafic({ titlu: "Puterea DC în funcție de SOC", xEt: "SOC [%]", yEt: "P [kW]", serii: [{ x: r.ch.curve.map(x => x[1] * 100), y: r.ch.curve.map(x => x[2]), nume: "25 °C" }, { x: r.ch0.curve.map(x => x[1] * 100), y: r.ch0.curve.map(x => x[2]), nume: "0 °C", cls: 1 }], xMin: 10, xMax: 80, yMin: 0 })}
      ${grafic({ titlu: "Temperatura bateriei la încărcarea DC", xEt: "timpul [min]", yEt: "T [°C]", serii: [{ x: r.ch.curve.map(x => x[0] / 60), y: r.ch.curve.map(x => x[3]), nume: "pornire 25 °C" }, { x: r.ch35.curve.map(x => x[0] / 60), y: r.ch35.curve.map(x => x[3]), nume: "pornire 35 °C", cls: 1 }], xMin: 0 })}</div>`;
    return h;
  }

  function variants() {
    const base = clone(S.hib), d0 = base.drives[0], i0 = d0.i[0];
    const t2 = clone(base); t2.drives = [Object.assign(clone(d0), { i: [+(14.5 / 11.5 * i0).toFixed(2), +(8 / 11.5 * i0).toFixed(2)], eta: d0.eta - 0.005 })];
    const awd = clone(base); awd.veh.m += 80;
    awd.drives = [Object.assign(clone(d0), { i: [i0] }), { axle: "spate", i: [+(10 / 11.5 * i0).toFixed(2)], eta: d0.eta, decouple: true,
      em: { P: Math.round(0.625 * d0.em.P), P_cont: Math.round(0.625 * d0.em.P_cont), T_max: Math.round(200 / 300 * d0.em.T_max), n_max: d0.em.n_max, eta_max: Math.min(0.96, d0.em.eta_max + 0.01) } }];
    if (base.drives.length > 1) return null;
    return [["reductor cu o treaptă", base], ["reductor cu 2 trepte", t2], ["două motoare, față + spate", awd]];
  }
  function tVar() {
    if (S.hib.drives.length > 1) return `<p class="nota">Configurația curentă are deja două motoare; comparația pornește de la o configurație cu un singur motor.</p>`;
    let h = `<p class="nota">Variantele se obțin din configurația curentă: 2 trepte cu rapoartele 1,26·i și 0,70·i; al doilea motor pe puntea spate, decuplabil, cu 62,5 % din putere, 67 % din cuplu și raportul 0,87·i, cu 80 kg în plus. Pentru exemplul 2 se obțin exact variantele din Tabelul 11.2. Calculul durează câteva secunde.</p><div class="rand-optim"><button type="button" id="var-run">Calculează variantele</button></div>`;
    if (S.variante) h += tabel(["Varianta", "m [kg]", "e<sub>b</sub> WLTC [kWh/100 km]", "Autonomie [km]", "La 130 km/h [km]", "0–100 [s]", "80–120 [s]"],
      S.variante.map(x => [x[0], fmt(x[1], 0), fmt(x[2], 2), fmt(x[3], 0), fmt(x[4], 0), fmt(x[5], 1), fmt(x[6], 1)]));
    return h;
  }
  function bindVar() {
    const b = $("#var-run"); if (!b) return;
    b.addEventListener("click", () => {
      b.disabled = true; b.textContent = "Se calculează…";
      setTimeout(() => {
        S.variante = variants().map(([nm, raw]) => { const c = E.build(raw), v = cycleFor(c), r = E.rangeCycle(c, v), rh = E.rangeConst(c, E.vMax(c) >= 130 ? 130 : 110); return [nm, c.veh.m, r.e_bat, r.range_km, rh.range_km, E.accel(c), E.accel(c, 120, 80)]; });
        render();
      }, 30);
    });
  }

  function tTco() {
    const r = R, k = r.cost, n = S.tco.ice.nume || "convențional";
    let h = tabel([`Costul total de proprietate pe ${S.econ.ani} ani [EUR] (§9.1)`, "Electric", esc(n)], [
      ["Achiziție − valoare reziduală", fmt(k.te.P_net, 0), fmt(k.tc.P_net, 0)], ["Energie", fmt(k.te.C_en, 0), fmt(k.tc.C_en, 0)],
      ["Mentenanță", fmt(k.te.C_m, 0), fmt(k.tc.C_m, 0)], ["Taxe", fmt(k.te.C_t, 0), fmt(k.tc.C_t, 0)],
      ["<b>TCO</b>", "<b>" + fmt(k.te.TCO, 0) + "</b>", "<b>" + fmt(k.tc.TCO, 0) + "</b>"],
      ["Costul energiei [EUR/100 km]", fmt(r.rw.e_grid * k.pmix, 2), fmt(S.tco.ice.L100 * S.econ.p_fuel, 2)],
      ["Economia anuală / pragul de rentabilitate", fmt(k.sav, 0) + " EUR/an", isFinite(k.be) && k.be > 0 ? fmt(k.be, 1) + " ani" : "–"]]);
    h += "<br>" + tabel(["CO₂e pe ciclul de viață (§9.2)", "Electric", esc(n)], [
      ["Producția [t]", `${fmt(k.ce.prod, 1)} (bateria ${fmt(r.c.bat.E_nom * S.econ.k_bat / 1000, 1)})`, fmt(k.ci.prod, 1)],
      ["Utilizarea [g/km]", fmt(k.ce.use_km * 1e6, 0), fmt(k.ci.use_km * 1e6, 0)],
      [`Total după ${fmt(S.econ.km_an * S.econ.ani, 0)} km [t]`, fmt(k.ce.prod + k.ce.use_km * S.econ.km_an * S.econ.ani, 1), fmt(k.ci.prod + k.ci.use_km * S.econ.km_an * S.econ.ani, 1)],
      ["Distanța de compensare a CO₂ de la producție", k.beco2 > 0 ? fmt(k.beco2, 0) + " km" : "imediat", ""]]);
    const km = E.linspace(0, 250000, 60);
    h += `<div class="grafice">${grafic({ titlu: "CO₂e cumulat", xEt: "distanța [mii km]", yEt: "CO₂e [t]", serii: [{ x: km.map(x => x / 1000), y: km.map(x => k.ce.prod + k.ce.use_km * x), nume: "electric" }, { x: km.map(x => x / 1000), y: km.map(x => k.ci.prod + k.ci.use_km * x), nume: esc(n), cls: 1 }], xMin: 0, xMax: 250, yMin: 0 })}</div>`;
    return h;
  }
  function tVer() { return tabel(["Verificare", "Valoare", "Stare"], checks(R).map(c => [c[0], c[1], ins(c[2])])); }

  // ---------------------------------------------------------------- export
  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $("#btn-csv").addEventListener("click", () => {
    if (!R) return;
    const hdr = "t [s];v [km/h];P_roata [kW];P_motor el. [kW];P_baterie [kW];SOC [%];T_baterie [°C];I [A];treapta;M_motor1 [N·m];n_motor1 [rot/min];M_motor2 [N·m]";
    const rows = R.r1.hist.map(x => [x[0], x[1], x[2], x[3], x[4], x[5] * 100, x[6], x[7], x[8] + 1, x[10], x[11] / E.PI30, x[12]].map(v => String(+Number(v).toFixed(4)).replace(".", ",")).join(";"));
    download("simulare_" + S.key + ".csv", hdr + "\n" + rows.join("\n"));
  });
  $("#btn-ciclu").addEventListener("click", () => download("wltc_clasa3b.csv", "t [s];v [km/h]\n" + VK.map((v, i) => i + ";" + String(v).replace(".", ",")).join("\n")));
  $("#btn-print").addEventListener("click", () => window.print());

  initState(window.PCMAI_SHELL ? PCMAI_SHELL.exemplu("SPRING") : "SPRING"); if (window.PCMAI_SHELL) PCMAI_SHELL.restaureaza(S); renderForm(); compute();
})();
