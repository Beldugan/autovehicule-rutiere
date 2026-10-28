// Interfața aplicației „Calculul autoutilitarelor electrice”.
(function () {
  "use strict";
  const L = window.LCV, VK = window.WLTC3B, V0 = VK.map(x => x / 3.6);
  const $ = s => document.querySelector(s);
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function fmt(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return "–";
    let s = Number(x).toFixed(d === undefined ? 2 : d); const neg = s[0] === "-"; if (neg) s = s.slice(1);
    let [a, b] = s.split("."); if (a.length > 4) a = a.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (neg && Number(s) !== 0 ? "−" : "") + a + (b ? "," + b : "");
  }
  const parseNum = s => parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
  const getP = (o, p) => p.split(".").reduce((a, k) => (a === undefined || a === null ? undefined : a[k]), o);
  function setP(o, p, v) { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; }
  function decimals(x) { for (let d = 0; d <= 4; d++) if (Math.abs(x * Math.pow(10, d) - Math.round(x * Math.pow(10, d))) < 1e-6) return d; return 4; }
  const NUME = { EJ49: "eJolly furgon 49 kWh", EJ75: "eJolly furgon 75 kWh", EJ75F: "eJolly 75 kWh frigorific" };

  const GRUPE = [
    { leg: "Masele", f: [["$v.m_curb", "Masa proprie (în ordine de mers)", "m<sub>0</sub>", "kg"], ["$v.gvw", "Masa totală maximă autorizată", "m<sub>tot</sub>", "kg"],
      ["$v.payload", "Sarcina utilă în simulare", "m<sub>u</sub>", "kg"], ["$v.phi0", "Fracțiunea greutății pe puntea față (gol)", "–", "–"]] },
    { leg: "Vehiculul", f: [["$v.veh.CdA", "Aria aerodinamică C<sub>x</sub>·A", "C<sub>x</sub>A", "m²"], ["$v.veh.f", "Coeficientul de rezistență la rulare", "f", "–"],
      ["$v.veh.rw", "Raza dinamică a roții", "r<sub>r</sub>", "m"], ["$v.veh.delta", "Coeficientul maselor în rotație", "δ", "–"],
      ["$v.veh.P_aux", "Consumatori (fără climatizare)", "P<sub>aux</sub>", "W"], ["$v.veh.phi_front", "Fracțiunea frânării pe puntea față", "φ<sub>f</sub>", "–"],
      ["$v.veh.mu", "Coeficientul de aderență", "μ", "–"], ["$v.veh.v_lim", "Viteza maximă limitată electronic", "v<sub>lim</sub>", "km/h"]] },
    { leg: "Motorul și reductorul", f: [["$v.drives.0.em.P", "Puterea de vârf", "P<sub>max</sub>", "kW"], ["$v.drives.0.em.P_cont", "Puterea continuă", "P<sub>c</sub>", "kW"],
      ["$v.drives.0.em.T_max", "Cuplul maxim", "M<sub>max</sub>", "N·m"], ["$v.drives.0.em.n_max", "Turația maximă", "n<sub>max</sub>", "rot/min"],
      ["$v.drives.0.em.eta_max", "Randamentul maxim (cu invertor)", "η<sub>max</sub>", "–"], ["$v.drives.0.i.0", "Raportul reductorului", "i", "–"], ["$v.drives.0.eta", "Randamentul reductorului", "η<sub>red</sub>", "–"]] },
    { leg: "Bateria", f: [["$v.bat.ns", "Celule în serie", "n<sub>s</sub>", "–"], ["$v.bat.np", "Ramuri în paralel", "n<sub>p</sub>", "–"], ["$v.bat.Q_Ah", "Capacitatea celulei", "Q", "Ah"],
      ["$v.bat.R25", "Rezistența celulei la 25 °C", "R<sub>25</sub>", "mΩ"], ["$v.bat.soc_min", "SOC minim", "SOC<sub>min</sub>", "%", 0.01], ["$v.bat.soc_max", "SOC maxim", "SOC<sub>max</sub>", "%", 0.01],
      ["$v.bat.P_dis", "Puterea maximă de descărcare", "P<sub>d</sub>", "kW"], ["$v.bat.P_chg", "Puterea maximă la recuperare", "P<sub>rec</sub>", "kW"], ["$v.bat.e_pack", "Energia specifică a pachetului", "e<sub>b</sub>", "Wh/kg"]] },
    { leg: "Climatizarea cabinei", f: [["$v.veh.hvac.UA", "Coeficientul de pierderi al cabinei", "(UA)<sub>h</sub>", "W/K"], ["$v.veh.hvac.COP_heat", "COP la încălzire (1 = PTC)", "COP<sub>î</sub>", "–"],
      ["$v.veh.hvac.COP_cool", "COP la răcire", "COP<sub>r</sub>", "–"]] },
    { leg: "Încărcarea", f: [["$v.P_ac", "Încărcătorul de la bord (depou)", "P<sub>AC</sub>", "kW"], ["$v.P_dc", "Puterea stației DC", "P<sub>DC</sub>", "kW"], ["$v.eta_ac", "Randamentul încărcării AC", "η<sub>AC</sub>", "–"]] },
    { leg: "Traseul zilnic de livrări", f: [["$r.d_app", "Distanța depou – zonă (dus)", "d<sub>a</sub>", "km"], ["$r.v_app", "Viteza pe drumul de apropiere", "v<sub>a</sub>", "km/h"],
      ["$r.n_stops", "Numărul de opriri", "n", "–"], ["$r.L_s", "Distanța între opriri", "L<sub>s</sub>", "km"], ["$r.v_c", "Viteza între opriri", "v<sub>c</sub>", "km/h"],
      ["$r.t_s", "Durata unei opriri", "t<sub>s</sub>", "s"], ["$r.a_acc", "Accelerația", "a<sub>+</sub>", "m/s²"], ["$r.a_dec", "Decelerația", "a<sub>−</sub>", "m/s²"]] },
    { leg: "Agregatul frigorific (ePTO)", f: [["$p.on", "Agregat frigorific (1 = da, 0 = nu)", "–", "–"], ["$p.UA_box", "Coeficientul de pierderi al caroseriei", "(UA)<sub>box</sub>", "W/K"],
      ["$p.T_box", "Temperatura mărfii", "T<sub>box</sub>", "°C"], ["$p.Q_door", "Căldura pătrunsă la o deschidere", "Q<sub>ușă</sub>", "kJ"], ["$p.COP", "COP-ul agregatului", "COP", "–"], ["$p.P_fan", "Ventilatoare", "P<sub>vent</sub>", "W"]] },
    { leg: "Cerințele temei", f: [["$q.vmax", "Viteza maximă", "v<sub>max</sub>", "km/h"], ["$q.tacc", "0–100 km/h la masa de încercare", "t", "s"], ["$q.panta", "Panta la pornire, masa maximă", "p<sub>0</sub>", "%"],
      ["$q.d_day", "Tura zilnică", "d<sub>zi</sub>", "km"], ["$q.reserve", "Rezerva la întoarcere", "r", "%", 0.01], ["$q.soh", "SOH la sfârșitul utilizării", "SOH", "%", 0.01],
      ["$q.ref_range", "Autonomia WLTP publicată (validare)", "d<sub>ref</sub>", "km"]] },
    { leg: "Costul pe kilometru", f: [["$t.ev.pret", "Prețul vehiculului electric", "P<sub>VE</sub>", "EUR"], ["$t.ev.rezidual", "Valoarea reziduală (VE)", "r", "–"], ["$t.ev.mentenanta", "Mentenanța (VE)", "C<sub>m</sub>", "EUR/an"],
      ["$t.ev.fix_an", "Asigurare și taxe (VE)", "C<sub>fix</sub>", "EUR/an"], ["$t.d.pret", "Prețul variantei diesel", "P<sub>D</sub>", "EUR"], ["$t.d.L100_route", "Consumul diesel pe traseu", "C", "L/100 km"],
      ["$t.d.rezidual", "Valoarea reziduală (diesel)", "r", "–"], ["$t.d.mentenanta", "Mentenanța (diesel)", "C<sub>m</sub>", "EUR/an"], ["$t.d.fix_an", "Asigurare și taxe (diesel)", "C<sub>fix</sub>", "EUR/an"],
      ["$e.km_an", "Kilometraj anual", "D", "km/an"], ["$e.ani", "Durata de utilizare", "N", "ani"], ["$e.p_depot", "Prețul energiei la depou", "p<sub>d</sub>", "EUR/kWh"],
      ["$e.p_dc", "Prețul energiei la stații DC", "p<sub>DC</sub>", "EUR/kWh"], ["$e.share_depot", "Fracțiunea încărcată la depou", "s<sub>d</sub>", "–"], ["$e.p_fuel", "Prețul motorinei", "p<sub>c</sub>", "EUR/L"],
      ["$e.adblue", "AdBlue", "–", "EUR/km"], ["$e.g_grid", "Intensitatea CO₂ a rețelei", "g", "g/kWh"], ["$e.kg_L_diesel", "CO₂ motorină, extracție – roată", "k", "kg/L"]] }
  ];

  let S = null;
  function initState(key) {
    const raw = clone(PRESETS[key]), fr = key === "EJ75F";
    raw.phi0 = 0.58;
    S = { key, v: raw, r: clone(fr ? ROUTE_FRIGO : ROUTE), p: Object.assign(clone(PTO), { on: fr ? 1 : 0 }),
      q: Object.assign(clone(REQ), { soh: SOH_EOL, ref_range: key === "EJ49" ? REF.ejolly.range49 : REF.ejolly.range75 }),
      t: { ev: clone(TCO_IN[key === "EJ49" ? "ev49" : fr ? "evfr" : "ev75"]), d: clone(TCO_IN[fr ? "dieselfr" : "diesel"]) },
      e: clone(ECON), tab: S ? S.tab : "dim" };
  }
  function objFor(path) { const ks = path.slice(1).split("."); return [S[ks[0]], ks.slice(1).join(".")]; }
  function renderForm() {
    let h = `<fieldset><legend>Configurația</legend><div class="camp"><label for="sel-preset">Exemplul de pornire</label><span class="simbol"></span>
      <select id="sel-preset">${Object.keys(NUME).map(k => `<option value="${k}"${k === S.key ? " selected" : ""}>${NUME[k]}</option>`).join("")}</select><span class="um"></span></div></fieldset>`;
    for (const g of GRUPE) {
      let rows = "";
      for (const [path, et, sim, um, sc] of g.f) {
        const [o, p] = objFor(path); const val = getP(o, p); if (val === undefined) continue;
        const scale = typeof sc === "number" ? sc : 1, x = typeof val === "boolean" ? (val ? 1 : 0) : val / scale;
        rows += `<div class="camp"><label for="f-${path}">${et}</label><span class="simbol">${sim}</span><input id="f-${path}" data-path="${path}" data-scale="${scale}" value="${esc(fmt(x, decimals(x)))}" inputmode="decimal"><span class="um">${um}</span></div>`;
      }
      if (rows) h += `<fieldset><legend>${g.leg}</legend>${rows}</fieldset>`;
    }
    $("#formular").innerHTML = h;
    $("#sel-preset").addEventListener("change", e => { initState(e.target.value); renderForm(); schedule(); });
  }
  $("#formular").addEventListener("input", e => {
    const inp = e.target; if (!inp.dataset || !inp.dataset.path) return;
    const [o, p] = objFor(inp.dataset.path), x = parseNum(inp.value); if (!isFinite(x)) return;
    setP(o, p, x * parseFloat(inp.dataset.scale)); schedule();
  });
  document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => { initState(b.dataset.preset); renderForm(); schedule(); }));

  // ---------------------------------------------------------------- calcul
  function cfgFor(payload, mass) {
    const raw = clone(S.v), plMax = raw.gvw - raw.m_curb - 75;
    raw.payload_max = plMax;
    const pl = payload === undefined ? raw.payload : payload;
    raw.veh.m = mass !== undefined ? mass : raw.m_curb + 75 + pl;
    raw.veh.phi_static = raw.phi0 - 0.10 * pl / Math.max(plMax, 1);
    return L.build(raw);
  }
  let R = null, timer = null;
  function schedule() { clearTimeout(timer); $("#sumar").classList.add("lucru"); timer = setTimeout(compute, 300); }
  function compute() {
    try {
      const r = {}, v = S.v, plMax = v.gvw - v.m_curb - 75, pto = S.p.on ? Object.assign({}, S.p, { on: true }) : null;
      r.plMax = plMax; r.tm = L.wltpTestMass(v.m_curb, plMax);
      r.c = cfgFor(); r.cFull = cfgFor(plMax); r.cTM = cfgFor(0.28 * plMax, r.tm);
      r.rw = L.rangeCycle(r.cTM, V0);
      r.acc = L.accel(r.cTM); r.accFull = L.accel(r.cFull); r.vmax = L.vMax(r.cFull); r.vphys = L.vPhys(r.cFull);
      r.gs = L.gradeStart(r.cFull); r.gc = L.gradeCont(r.cFull, 30);
      r.route = L.routeSim(r.c, S.r, pto, 23, !!pto, r.c.bat.soc_max, true);
      r.pl = []; for (let k = 0; k <= 5; k++) { const pl = plMax * k / 5, cc = cfgFor(pl); r.pl.push([pl, L.routeSim(cc, S.r, pto, 23, false, 0.9).e_bat, L.simulate(cc, V0, { soc0: 0.9 }).e_bat]); }
      const b = r.c.bat, Enew = b.E_use - S.q.reserve * b.E_nom, Eeol = b.E_use * S.q.soh - S.q.reserve * b.E_nom;
      r.Enew = Enew; r.Eeol = Eeol;
      r.days = [["vară, 23 °C, gol", 23, false, 0], ["vară, 23 °C, încărcat", 23, !!pto, plMax], ["caniculă, 35 °C, încărcat", 35, true, plMax], ["iarnă, −7 °C, încărcat", -7, true, plMax]].map(([nm, Ta, h, pl]) => {
        const x = L.routeSim(cfgFor(pl), S.r, Ta < 0 ? null : pto, Ta, h, 0.9); return { nm, e: x.e_bat, E: x.E_bat_kWh, pto: x.E_pto, dn: Enew / x.e_bat * 100, de: Eeol / x.e_bat * 100 };
      });
      r.ch = L.chargeCurve(r.c, 0.10, 0.80);
      const wint = L.routeSim(cfgFor(plMax), S.r, null, -7, true, b.soc_max);
      r.winSoc = wint.soc_end; r.tacw = L.chargeCurve(r.c, Math.min(wint.soc_end, b.soc_max - 0.001), b.soc_max, { ac: true }).t_min / 60;
      r.ac = L.chargeCurve(r.c, 0.10, 1.0, { ac: true });
      const egr = (r.days[1].e * 0.5 + r.days[3].e * 0.25 + r.days[2].e * 0.25) / v.eta_ac; r.eYear = egr;
      const E = S.e, T = S.t;
      const evk = km => L.tcoKm({ km_an: km, ani: E.ani, kWh100: egr, share_depot: E.share_depot, p_depot: E.p_depot, p_dc: E.p_dc, pret: T.ev.pret, rezidual: T.ev.rezidual, mentenanta: T.ev.mentenanta, fix_an: T.ev.fix_an });
      const dk = km => L.tcoKm({ km_an: km, ani: E.ani, L100: T.d.L100_route, p_fuel: E.p_fuel, adblue: E.adblue, pret: T.d.pret, rezidual: T.d.rezidual, mentenanta: T.d.mentenanta, fix_an: T.d.fix_an });
      r.tev = evk(E.km_an); r.td = dk(E.km_an); r.evk = evk; r.dk = dk;
      let lo = 2000, hi = 200000; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (evk(m).total > dk(m).total) lo = m; else hi = m; } r.eq = (lo + hi) / 2;
      r.co2ev = egr / 100 * E.g_grid; r.co2d = T.d.L100_route / 100 * E.kg_L_diesel * 1000;
      R = r; $("#sumar").classList.remove("lucru"); render();
    } catch (err) { $("#sumar").classList.remove("lucru"); $("#sumar").innerHTML = `<div class="alerta">Calculul nu s-a putut face: ${esc(err.message)}</div>`; console.error(err); }
  }

  function checks(r) {
    const q = S.q, ok = x => x ? "ok" : "atentie", o = [], v = S.v, b = r.c.bat;
    o.push(["Masele: sarcina utilă în limita maximă", `${fmt(v.payload, 0)} ≤ ${fmt(r.plMax, 0)} kg; masa totală ${fmt(v.gvw, 0)} kg (${v.gvw <= 3500 ? "≤ 3,5 t" : v.gvw <= 4250 ? "≤ 4,25 t, permis B cu condiții" : "> 4,25 t"})`, ok(v.payload <= r.plMax + 1e-6 && v.gvw <= 4250)]);
    const err = (r.rw.range_km / q.ref_range - 1) * 100;
    o.push(["Validarea pe WLTC (masa de încercare)", `${fmt(r.rw.range_km, 0)} față de ${fmt(q.ref_range, 0)} km: ${err >= 0 ? "+" : ""}${fmt(err, 1)} %`, ok(Math.abs(err) <= 5)]);
    o.push(["Viteza maximă", `${fmt(r.vmax, 0)} km/h ≥ ${fmt(q.vmax, 0)} km/h`, ok(r.vmax >= q.vmax)]);
    o.push(["0–100 km/h la masa de încercare", `${fmt(r.acc, 1)} s ≤ ${fmt(q.tacc, 1)} s (la masa maximă: ${fmt(r.accFull, 1)} s)`, ok(r.acc <= q.tacc)]);
    o.push(["Panta la pornire, masa maximă", `${fmt(r.gs, 0)} % ≥ ${fmt(q.panta, 0)} %`, ok(r.gs >= q.panta)]);
    const w = r.days[3];
    o.push(["Tura zilnică: iarnă, încărcat, SOH, rezervă", `${fmt(w.de, 0)} km ≥ ${fmt(q.d_day, 0)} km`, ok(w.de >= q.d_day)]);
    o.push(["Motorul și bateria pe traseu", `cuplu ${fmt(r.route.lim.T * 100, 0)} %, turație ${fmt(r.route.lim.w * 100, 0)} %, putere baterie ${fmt(r.route.lim.P * 100, 0)} %`, ok(r.route.lim.T <= 1 && r.route.lim.w <= 1 && r.route.lim.P <= 1)]);
    o.push(["Refacerea la depou după tura de iarnă", `${fmt(r.tacw, 1)} h ≤ 10 h`, ok(r.tacw <= 10)]);
    o.push(["Costul pe km față de diesel", `${fmt(r.tev.total * 100, 1)} față de ${fmt(r.td.total * 100, 1)} eurocenți/km; echilibru la ${fmt(r.eq, 0)} km/an`, "ok"]);
    o.push(["Bilanțul energetic pe traseu", `abatere ${fmt(r.route.energy.closure * 100, 2)} %`, ok(Math.abs(r.route.energy.closure) <= 0.005)]);
    return o;
  }

  // ---------------------------------------------------------------- grafice și tabele (ca în aplicațiile îndrumarelor)
  function grafic({ titlu, xEt, yEt, serii, xMin, xMax, yMin, yMax, W, Hh }) {
    W = W || 640; Hh = Hh || 250;
    const m = { l: 56, r: 14, t: 10, b: 40 }, w = W - m.l - m.r, h = Hh - m.t - m.b, ys = [], xs = [];
    serii.forEach(s => { s.y.forEach(v => isFinite(v) && ys.push(v)); (s.x || []).forEach(v => xs.push(v)); });
    const x0 = xMin !== undefined ? xMin : Math.min(...xs, 0), x1 = xMax !== undefined ? xMax : Math.max(...xs);
    let y0 = yMin !== undefined ? yMin : Math.min(...ys), y1 = yMax !== undefined ? yMax : Math.max(...ys); if (y1 === y0) { y1 += 1; y0 -= 1; }
    const tick = (a, b, n) => { const raw = (b - a) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(k => k * p).find(k => raw <= k); const r = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) r.push(+v.toFixed(10)); return r; };
    const X = v => m.l + (v - x0) / (x1 - x0) * w, Y = v => m.t + h - (v - y0) / (y1 - y0) * h;
    let g = "";
    tick(y0, y1, 5).forEach(v => g += `<line class="grila" x1="${m.l}" x2="${m.l + w}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0)}</text>`);
    tick(x0, x1, 6).forEach(v => g += `<text class="ax" x="${X(v)}" y="${m.t + h + 16}" text-anchor="middle">${fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0)}</text>`);
    g += `<line class="axa" x1="${m.l}" x2="${m.l + w}" y1="${m.t + h}" y2="${m.t + h}"/><line class="axa" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${m.t + h}"/>`;
    g += `<text class="ax-titlu" x="${m.l + w / 2}" y="${Hh - 4}" text-anchor="middle">${xEt}</text><text class="ax-titlu" transform="translate(13 ${m.t + h / 2}) rotate(-90)" text-anchor="middle">${yEt}</text>`;
    serii.forEach((s, i) => { g += `<polyline class="serie serie-${s.cls !== undefined ? s.cls : i}${s.sub ? " subtire" : ""}" points="${s.y.map((v, k) => X(s.x ? s.x[k] : k).toFixed(1) + "," + Y(Math.min(Math.max(v, y0), y1)).toFixed(1)).join(" ")}"/>`; });
    const leg = serii.filter(s => s.nume).map((s, i) => `<span><i class="serie-${s.cls !== undefined ? s.cls : i}"></i>${s.nume}</span>`).join("");
    return `<figure class="grafic"><figcaption>${titlu}</figcaption><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(titlu)}">${g}</svg>${leg ? `<div class="legenda">${leg}</div>` : ""}</figure>`;
  }
  function bare(titlu, et, vals, um, ref) {
    const mx = Math.max(...vals, ref || 0);
    return `<figure class="grafic"><figcaption>${titlu}</figcaption><div class="bare">${vals.map((v, i) => `<div class="bara"><span class="bara-et">${et[i]}</span><span class="bara-f"><i style="width:${(v / mx * 100).toFixed(1)}%" class="b${i % 5}"></i></span><span class="bara-v">${fmt(v, 0)} ${um}</span></div>`).join("")}</div>${ref ? `<p class="nota">Cerința: ${fmt(ref, 0)} ${um}.</p>` : ""}</figure>`;
  }
  const tabel = (cap, rows) => `<div class="tabel-container"><table class="tabel"><thead><tr>${cap.map((c, i) => `<th${i ? ' class="num"' : ""}>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r => r.sectiune ? `<tr class="sectiune"><td colspan="${cap.length}">${r.sectiune}</td></tr>` : `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const ins = s => `<span class="insigna ${s}">${s === "ok" ? "îndeplinită" : "neîndeplinită"}</span>`;

  const TAB = [["dim", "1–3. Mase și dimensionare"], ["wltc", "3.5 Validarea pe ciclul WLTC"], ["sarc", "2. Traseul de livrări și sarcina utilă"], ["zi", "5. Tura zilnică"],
    ["pto", "4. Agregatul frigorific (ePTO)"], ["cic", "5.3 Cicluri de conducere"], ["inc", "6. Încărcarea la depou"], ["cost", "7. Costul pe kilometru"], ["ver", "8. Verificări"]];
  function render() {
    if (window.PCMAI_SHELL) PCMAI_SHELL.rezultat(S, R);
    const ch = checks(R), n = ch.filter(c => c[2] === "ok").length;
    const k = [["Tura zilnică iarna, SOH " + fmt(S.q.soh * 100, 0) + " %", fmt(R.days[3].de, 0), "km"], ["Consum pe traseu, încărcat", fmt(R.days[1].e, 1), "kWh/100 km"],
      ["Autonomie WLTC", fmt(R.rw.range_km, 0), "km"], ["Sarcina utilă maximă", fmt(R.plMax, 0), "kg"], ["Cost VE", fmt(R.tev.total * 100, 1), "eurocenți/km"], ["Cost diesel", fmt(R.td.total * 100, 1), "eurocenți/km"]];
    $("#sumar").innerHTML = `<div class="kpiuri">${k.map(x => `<div class="kpi"><span class="kpi-et">${x[0]}</span><span class="kpi-v">${x[1]}</span><span class="kpi-um">${x[2]}</span></div>`).join("")}</div>
      <div class="stare ${n === ch.length ? "stare-ok" : "stare-atentie"}">${NUME[S.key]}: ${n} din ${ch.length} verificări îndeplinite${n === ch.length ? "." : " – vezi fila Verificări."}</div>`;
    $("#taburi").innerHTML = TAB.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === S.tab}">${t}</button>`).join("");
    $("#taburi").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { S.tab = b.dataset.tab; render(); }));
    const F = { dim: tDim, wltc: tW, sarc: tS, zi: tZ, pto: tP, cic: tCic, inc: tI, cost: tC, ver: () => tabel(["Verificare", "Valoare", "Stare"], checks(R).map(c => [c[0], c[1], ins(c[2])])) };
    $("#continut").innerHTML = F[S.tab]();
    hookCic();
    $("#continut").insertAdjacentHTML("beforeend", `<div class="doar-tipar">${TAB.filter(t => t[0] !== S.tab).map(([k, t]) => `<section class="foaie-tipar"><h2>${t}</h2>${F[k]()}</section>`).join("")}</div>`);
  }
  function tDim() {
    const r = R, c = r.cFull, v = S.v, d0 = c.drives[0], em = d0.em, b = c.bat, q = S.q, veh = c.veh;
    const al = Math.atan(q.panta / 100), Fp = v.gvw * L.G * (Math.sin(al) + veh.f * Math.cos(al));
    const Umin = b.ns * L.ocvCell(b.chem, b.soc_min), P0 = L.pRoad(veh, q.vmax) / d0.eta / 1e3;
    return tabel(["Mărime", "Valoare", "Verificare"], [{ sectiune: "Masele (cap. 1)" },
      ["Masa proprie / totală maximă", `${fmt(v.m_curb, 0)} / ${fmt(v.gvw, 0)} kg`, ""], ["Sarcina utilă maximă", `${fmt(r.plMax, 0)} kg`, ""],
      ["Masa de încercare WLTP (N1): m<sub>0</sub> + 25 + 0,28·m<sub>u,max</sub>", `${fmt(r.tm, 0)} kg`, ""],
      { sectiune: "Motorul și reductorul (§3.1), la masa maximă" },
      [`Puterea continuă ≥ P la ${fmt(q.vmax, 0)} km/h`, `${fmt(em.P_cont, 0)} ≥ ${fmt(P0, 1)} kW`, ins(em.P_cont >= P0 ? "ok" : "atentie")],
      ["Raportul maxim admis / ales", `${fmt(em.n_max * L.PI30 * veh.rw / (q.vmax / 3.6), 2)} / ${fmt(d0.i[0], 2)}`, ""],
      [`Cuplul pentru panta de ${fmt(q.panta, 0)} % la masa maximă (3.1)`, `${fmt(Fp * veh.rw / (d0.i[0] * d0.eta), 0)} ≤ ${fmt(em.T_max, 0)} N·m`, ins(Fp * veh.rw / (d0.i[0] * d0.eta) <= em.T_max ? "ok" : "atentie")],
      ["Curentul invertorului la U<sub>min</sub>", `${fmt(em.P * 1e3 / em.eta_max / Umin, 0)} A la ${fmt(Umin, 0)} V`, ""],
      { sectiune: "Bateria (§3.2)" },
      ["Configurația / energia nominală / utilă", `${b.ns}s${b.np}p, ${fmt(b.Q_Ah, 0)} Ah; ${fmt(b.E_nom, 1)} / ${fmt(b.E_use, 1)} kWh`, ""],
      ["Masa pachetului", `${fmt(b.m_pack, 0)} kg`, ""], ["Curentul relativ la P<sub>d</sub>", `${fmt(b.P_dis * 1e3 / Umin / (b.Q_Ah * b.np), 1)}C`, ""],
      [`Energia disponibilă cu rezervă: nouă / SOH ${fmt(q.soh * 100, 0)} %`, `${fmt(r.Enew, 1)} / ${fmt(r.Eeol, 1)} kWh`, ""],
      { sectiune: "Performanțele" },
      ["Viteza maximă (fizică)", `${fmt(r.vmax, 0)} km/h (${fmt(r.vphys, 1)})`, ins(r.vmax >= q.vmax ? "ok" : "atentie")],
      ["0–100 km/h: masa de încercare / masa maximă", `${fmt(r.acc, 1)} / ${fmt(r.accFull, 1)} s`, ins(r.acc <= q.tacc ? "ok" : "atentie")],
      ["Panta la pornire / la 30 km/h continuu, masa maximă", `${fmt(r.gs, 0)} / ${fmt(r.gc, 0)} %`, ins(r.gs >= q.panta ? "ok" : "atentie")]]);
  }
  function tW() {
    const r = R, err = (r.rw.range_km / S.q.ref_range - 1) * 100;
    return tabel(["Validarea pe WLTC la masa de încercare", "Valoare"], [["Masa de încercare", fmt(r.tm, 0) + " kg"], ["Consum la baterie / de la rețea", `${fmt(r.rw.e_bat, 1)} / ${fmt(r.rw.e_grid, 1)} kWh/100 km`],
      ["Autonomia calculată / publicată", `${fmt(r.rw.range_km, 0)} / ${fmt(S.q.ref_range, 0)} km`], ["Abaterea", `${err >= 0 ? "+" : ""}${fmt(err, 1)} % ${ins(Math.abs(err) <= 5 ? "ok" : "atentie")}`]]);
  }
  function tS() {
    const r = R, h = r.route.hist, d = r.route.dist_km;
    let x = tabel(["Traseul de livrări (§2.3)", "Valoare"], [["Distanța / durata", `${fmt(d, 1)} km / ${fmt(r.route.dur_h, 1)} h`], ["Viteza medie", `${fmt(d / r.route.dur_h, 1)} km/h`],
      ["Consum la baterie, sarcina din formular", `${fmt(r.route.e_bat, 1)} kWh/100 km`],
      ["Consum gol → încărcat (traseu)", `${fmt(r.pl[0][1], 1)} → ${fmt(r.pl[5][1], 1)} kWh/100 km (+${fmt((r.pl[5][1] / r.pl[0][1] - 1) * 100, 0)} %)`],
      ["Consum gol → încărcat (WLTC)", `${fmt(r.pl[0][2], 1)} → ${fmt(r.pl[5][2], 1)} kWh/100 km (+${fmt((r.pl[5][2] / r.pl[0][2] - 1) * 100, 0)} %)`],
      ["Creșterea la 100 kg (traseu)", `${fmt((r.pl[5][1] - r.pl[0][1]) / (r.plMax / 100), 2)} kWh/100 km`]]);
    x += `<div class="grafice">${grafic({ titlu: "Consumul în funcție de sarcina utilă", xEt: "sarcina utilă [kg]", yEt: "kWh/100 km", serii: [{ x: r.pl.map(p => p[0]), y: r.pl.map(p => p[1]), nume: "traseu de livrări" }, { x: r.pl.map(p => p[0]), y: r.pl.map(p => p[2]), nume: "WLTC", cls: 1 }], xMin: 0 })}
      ${grafic({ titlu: "Viteza pe traseu (prima oră)", xEt: "timpul [min]", yEt: "v [km/h]", serii: [{ x: h.slice(0, 3600).map(q => q[0] / 60), y: h.slice(0, 3600).map(q => q[1]), sub: true }], xMin: 0, xMax: 60, yMin: 0 })}</div>`;
    return x;
  }
  function tZ() {
    const r = R, q = S.q;
    let x = tabel(["Scenariu (§5)", "Consum [kWh/100 km]", "d nouă [km]", `d SOH ${fmt(q.soh * 100, 0)} % [km]`], r.days.map(d => [d.nm, fmt(d.e, 1), fmt(d.dn, 0), fmt(d.de, 0)]));
    x += `<div class="grafice">${bare(`Distanța zilnică posibilă, baterie la SOH ${fmt(q.soh * 100, 0)} %`, r.days.map(d => d.nm), r.days.map(d => d.de), "km", q.d_day)}</div>`;
    return x;
  }
  function tP() {
    const r = R;
    if (!S.p.on) return `<p class="nota">Agregatul frigorific este oprit. Setați „Agregat frigorific” = 1 în formular sau alegeți exemplul „eJolly 75 kWh frigorific”.</p>`;
    const pp = r.route.pto, pts = pp.map((p, k) => [k / 3600, p / 1e3]).filter((_, k) => k % 10 === 0);
    let x = tabel(["Agregatul frigorific pe tura de 23 °C (cap. 4)", "Valoare"], [["Energia ePTO pe tură", `${fmt(r.route.E_pto, 1)} kWh (${fmt(r.route.E_pto / r.route.E_bat_kWh * 100, 0)} % din energia turei)`],
      ["Puterea medie ePTO", `${fmt(r.route.E_pto / r.route.dur_h, 2)} kW`], ["Conducția la 30 °C, termic", `${fmt(S.p.UA_box * (30 - S.p.T_box), 0)} W`]]);
    x += "<br>" + tabel(["Scenariu", "Energia pe tură [kWh]", "din care ePTO [kWh]"], r.days.map(d => [d.nm, fmt(d.E, 1), fmt(d.pto, 1)]));
    x += `<div class="grafice">${grafic({ titlu: "Puterea ePTO pe tură (23 °C)", xEt: "timpul [h]", yEt: "P [kW]", serii: [{ x: pts.map(p => p[0]), y: pts.map(p => p[1]), sub: true }], xMin: 0 })}
      ${grafic({ titlu: "SOC pe tură", xEt: "timpul [h]", yEt: "SOC [%]", serii: [{ x: r.route.hist.map(q => q[0] / 3600), y: r.route.hist.map(q => q[5] * 100) }], xMin: 0 })}</div>`;
    return x;
  }
  function tI() {
    const r = R, c = r.c;
    return tabel(["Încărcarea (cap. 6)", "Valoare"], [["DC 10–80 % la " + fmt(c.P_dc, 0) + " kW", `${fmt(r.ch.t_min, 0)} min; vârf ${fmt(Math.max(...r.ch.curve.map(q => q[2])), 0)} kW la borne`],
      ["SOC după tura de iarnă, încărcat (pornire 95 %)", `${fmt(r.winSoc * 100, 0)} %`], [`Refacerea la depou, AC ${fmt(c.P_ac, 1)} kW`, `${fmt(r.tacw, 1)} h`],
      [`AC ${fmt(c.P_ac, 1)} kW, 10–100 %`, `${fmt(r.ac.t_min / 60, 1)} h`], ["Puterea depoului pentru 10 vehicule, fără eșalonare", `${fmt(10 * c.P_ac, 0)} kW`]]) +
      `<div class="grafice">${grafic({ titlu: "Puterea DC în funcție de SOC", xEt: "SOC [%]", yEt: "P [kW]", serii: [{ x: r.ch.curve.map(q => q[1] * 100), y: r.ch.curve.map(q => q[2]) }], xMin: 10, xMax: 80, yMin: 0 })}</div>`;
  }
  function tC() {
    const r = R, a = r.tev, d = r.td, c = x => fmt(x * 100, 1);
    const kms = []; for (let k = 10000; k <= 60000; k += 2000) kms.push(k);
    return tabel([`Costul pe kilometru (cap. 7), ${fmt(S.e.km_an, 0)} km/an, ${S.e.ani} ani [eurocenți/km]`, "Electric", "Diesel"], [["Amortizare", c(a.dep), c(d.dep)], ["Energie", c(a.en), c(d.en)],
      ["Mentenanță", c(a.m), c(d.m)], ["Asigurare și taxe", c(a.o), c(d.o)], ["<b>Total</b>", "<b>" + c(a.total) + "</b>", "<b>" + c(d.total) + "</b>"],
      ["Consumul folosit", fmt(r.eYear, 1) + " kWh/100 km de la rețea (medie anuală)", fmt(S.t.d.L100_route, 1) + " L/100 km"],
      ["Kilometrajul anual de echilibru", fmt(r.eq, 0) + " km/an", ""], ["CO₂e în utilizare", fmt(r.co2ev, 0) + " g/km", fmt(r.co2d, 0) + " g/km"]]) +
      `<div class="grafice">${grafic({ titlu: "Costul pe kilometru în funcție de kilometrajul anual", xEt: "kilometraj anual [mii km]", yEt: "eurocenți/km", serii: [{ x: kms.map(k => k / 1000), y: kms.map(k => r.evk(k).total * 100), nume: "electric" }, { x: kms.map(k => k / 1000), y: kms.map(k => r.dk(k).total * 100), nume: "diesel", cls: 1 }], xMin: 10, xMax: 60 })}</div>`;
  }


  // ---------------------------------------------------------------- ciclurile de conducere (calcul la cerere, durează 1–3 s)
  let CYC = null, cycKey = "";
  function cycList() {
    const L0 = CICLURI.lista.map(m => ({ k: m.k, nm: m.nm, o: m.o, t: m.t, v: m.k === "wltc3b" ? V0 : CICLURI.date[m.k].map(x => x / 3.6) }));
    CICLURI.faze.forEach(p => L0.push({ k: "wltc_" + p.nm, nm: "WLTC – faza " + p.nm, o: "UE", t: "fază", v: V0.slice(p.a, p.b + 1) }));
    L0.push({ k: "traseu", nm: "Traseul de livrări (§2.3)", o: "parametric", t: "livrări", v: L.deliveryRoute(S.r).v });
    return L0;
  }
  function cycCompute() {
    const key = JSON.stringify([S.v, S.r]);
    if (CYC && cycKey === key) return CYC;
    const plMax = S.v.gvw - S.v.m_curb - 75, c0 = cfgFor(0), c1 = cfgFor(plMax);
    CYC = cycList().map(cy => {
      const st = L.cycleStats(cy.v), s0 = L.simulate(c0, cy.v, { soc0: 0.9 }), s1 = L.simulate(c1, cy.v, { soc0: 0.9 }), rr = L.rangeCycle(c1, cy.v);
      return { k: cy.k, nm: cy.nm, o: cy.o, t: cy.t, st, e0: s0.e_bat, e1: s1.e_bat, rng: rr.range_km, rec: s1.energy.regen / Math.max(s1.energy.wheel_pos, 1e-9), nf: s1.nofollow / Math.max(s1.steps, 1) };
    });
    cycKey = key; return CYC;
  }
  function tCic() {
    const key = JSON.stringify([S.v, S.r]);
    if (!(CYC && cycKey === key)) return `<div class="cic-asteapta" data-cic="1"><p class="nota">Se calculează consumul pe ${CICLURI.lista.length + CICLURI.faze.length + 1} cicluri…</p></div>`;
    const plMax = S.v.gvw - S.v.m_curb - 75, E = fmt(cfgFor(0).bat.E_nom, 1);
    const rows = []; let sec = "";
    CYC.forEach(c => {
      const s2 = c.t === "fază" ? "Fazele ciclului WLTC" : c.k === "traseu" ? "Traseul temei" : "Cicluri complete";
      if (s2 !== sec) { rows.push({ sectiune: s2 }); sec = s2; }
      rows.push([`<span style="white-space:nowrap">${c.nm}</span>`, fmt(c.st.v_med, 1), fmt(c.st.stops_km, 1), fmt(c.e0, 1), fmt(c.e1, 1), "+" + fmt((c.e1 / c.e0 - 1) * 100, 0) + " %", fmt(c.rec * 100, 0) + " %", fmt(c.rng, 0)]);
    });
    const main = CYC.filter(c => c.t !== "fază");
    let x = `<p class="nota">Vehiculul din formular, gol și încărcat (${fmt(plMax, 0)} kg), la 23 °C, fără climatizare. Autonomia: ciclul repetat de la SOC maxim la SOC minim, încărcat, bateria nouă (${E} kWh nominal).</p>`;
    x += tabel(["Ciclul", "v<sub>med</sub>", "Opriri/km", "e gol", "e încărcat", "Creștere", "Recuperat", "Autonomie"], rows);
    x += `<p class="nota">v<sub>med</sub> în km/h; e în kWh/100 km, la baterie; „Recuperat” = energia recuperată la frânare, raportată la energia la roată; autonomia în km, încărcat.</p>`;
    x += `<div class="grafice">${bare("Consumul încărcat pe cicluri [kWh/100 km]", main.map(c => c.nm), main.map(c => c.e1), "")}
      ${bare("Autonomia încărcat pe cicluri", main.map(c => c.nm), main.map(c => c.rng), "km")}</div>`;
    const us = CYC.find(c => c.k === "us06");
    if (us && us.nf > 0.001) x += `<p class="nota">US06, încărcat: vehiculul nu urmărește accelerațiile ciclului în ${fmt(us.nf * 100, 1)} % din timp (limita de putere sau de cuplu).</p>`;
    x += `<p class="nota">Descărcați un ciclu: <select id="sel-cic">${cycList().map(c => `<option value="${c.k}">${c.nm}</option>`).join("")}</select> <button type="button" id="btn-cic">Descarcă (CSV)</button></p>`;
    return x;
  }
  function hookCic() {
    const w = document.querySelector("#continut > [data-cic]");
    if (w) setTimeout(() => { try { cycCompute(); render(); } catch (e) { w.innerHTML = `<div class="alerta">${esc(e.message)}</div>`; } }, 30);
    const b = document.getElementById("btn-cic");
    if (b) b.addEventListener("click", () => { const k = $("#sel-cic").value, c = cycList().find(q => q.k === k); download("ciclu_" + k + ".csv", "t [s];v [km/h]\n" + c.v.map((x, i) => i + ";" + String(+(x * 3.6).toFixed(3)).replace(".", ",")).join("\n")); });
  }

  function download(name, text) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  $("#btn-csv").addEventListener("click", () => { if (!R) return; const pp = R.route.pto; download("tura_" + S.key + ".csv", "t [s];v [km/h];P_roata [kW];P_motor [kW];P_baterie [kW];SOC [%];T_baterie [°C];P_ePTO [kW]\n" + R.route.hist.map((x, k) => [x[0], x[1], x[2], x[3], x[4], x[5] * 100, x[6], pp ? pp[k] / 1e3 : 0].map(v => String(+Number(v).toFixed(4)).replace(".", ",")).join(";")).join("\n")); });
  $("#btn-ciclu").addEventListener("click", () => download("wltc_clasa3b.csv", "t [s];v [km/h]\n" + VK.map((v, i) => i + ";" + String(v).replace(".", ",")).join("\n")));
  $("#btn-print").addEventListener("click", () => { try { if (R) { cycCompute(); render(); } } catch (e) { console.error(e); } window.print(); });
  initState(window.PCMAI_SHELL ? PCMAI_SHELL.exemplu("EJ75") : "EJ75"); if (window.PCMAI_SHELL) PCMAI_SHELL.restaureaza(S); renderForm(); compute();
})();
