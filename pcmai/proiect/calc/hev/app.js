// Interfața aplicației „Calculul sistemelor de propulsie hibride”.
(function () {
  "use strict";
  const H = window.HEV, V = window.WLTC3B;
  const $ = s => document.querySelector(s);
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function fmt(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return "–";
    let s = Number(x).toFixed(d === undefined ? 2 : d);
    const neg = s[0] === "-"; if (neg) s = s.slice(1);
    let [a, b] = s.split(".");
    if (a.length > 4) a = a.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (neg ? "−" : "") + a + (b ? "," + b : "");
  }
  const parseNum = s => parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
  const getP = (o, p) => p.split(".").reduce((a, k) => (a === undefined || a === null ? undefined : a[k]), o);
  function setP(o, p, v) { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; }

  const NUME_PRESET = { P2_HEV: "HEV paralel P2", S_HEV: "HEV serie", PS_HEV: "HEV serie-paralel",
    P2_PHEV: "PHEV paralel P2", S_PHEV: "PHEV serie", PS_PHEV: "PHEV serie-paralel" };
  const REQ0 = { vmax: 175, tacc: 9.9, panta: 30, dEV: 50 };

  // ---------------------------------------------------------------- câmpurile formularului
  // [cale, etichetă, simbol, unitate, scală (valoare afișată = valoare internă / scală), zecimale]
  const EM = (b, t) => ({ leg: t, f: [[b + ".P", "Puterea maximă (de vârf)", "P<sub>max</sub>", "kW"], [b + ".P_nom", "Puterea nominală", "P<sub>n</sub>", "kW"],
    [b + ".T_max", "Cuplul maxim", "M<sub>max</sub>", "N·m"], [b + ".n_max", "Turația maximă", "n<sub>max</sub>", "rot/min"],
    [b + ".eta_max", "Randamentul maxim (cu invertor)", "η<sub>max</sub>", "–"]] });
  const GRUPE = [
    { leg: "Vehiculul", f: [["veh.m", "Masa în simulare", "m", "kg"], ["veh.CdA", "Aria aerodinamică C<sub>x</sub>·A", "C<sub>x</sub>A", "m²"],
      ["veh.f", "Coeficientul de rezistență la rulare", "f", "–"], ["veh.rw", "Raza dinamică a roții", "r<sub>r</sub>", "m"],
      ["veh.delta", "Coeficientul maselor în rotație", "δ", "–"], ["veh.P_aux", "Consumatori auxiliari", "P<sub>aux</sub>", "W"],
      ["veh.axle", "Fracțiunea greutății pe puntea motoare", "–", "–"], ["veh.mu", "Coeficientul de aderență", "μ", "–"]] },
    { leg: "Motorul cu ardere internă", f: [["ice.P_max", "Puterea maximă", "P<sub>max</sub>", "kW"], ["ice.n_P", "Turația puterii maxime", "n<sub>P</sub>", "rot/min"],
      ["ice.T_max", "Cuplul maxim", "M<sub>max</sub>", "N·m"], ["ice.n_M1", "Începutul palierului de cuplu maxim", "n<sub>M1</sub>", "rot/min"],
      ["ice.n_M2", "Sfârșitul palierului de cuplu maxim", "n<sub>M2</sub>", "rot/min"], ["ice.n_idle", "Turația minimă", "n<sub>min</sub>", "rot/min"],
      ["ice.n_max", "Turația maximă", "n<sub>max</sub>", "rot/min"], ["ice.Vd", "Cilindreea", "V<sub>s</sub>", "L"],
      ["ice.bsfc_min", "Consumul specific minim", "c<sub>e,min</sub>", "g/kWh"], ["ice.c0", "Frecare: termenul constant", "c<sub>0</sub>", "bar"],
      ["ice.c1", "Frecare: termenul liniar", "c<sub>1</sub>", "bar"], ["ice.c2", "Frecare: termenul pătratic", "c<sub>2</sub>", "bar"],
      ["ice.n_e", "Turația randamentului maxim e(n)", "n<sub>e</sub>", "rot/min"]] },
    { leg: "Cutia de viteze", f: [["gb.ig", "Rapoartele treptelor (separate cu ;)", "i<sub>CV</sub>", "–", "lista"], ["gb.i0", "Raportul transmisiei principale", "i<sub>0</sub>", "–"],
      ["gb.eta", "Randamentul transmisiei", "η<sub>tr</sub>", "–"], ["gb.n_min", "Turația minimă de mers a MAI", "n<sub>min</sub>", "rot/min"],
      ["gb.n_launch", "Turația de lansare (ambreiaj)", "n<sub>l</sub>", "rot/min"], ["t_shift", "Timpul schimbărilor (0–100 km/h)", "t<sub>s</sub>", "s"]] },
    EM("em", "Mașina electrică de tracțiune"), EM("gen", "Generatorul (serie)"), EM("mg1", "MG1 (soare)"), EM("mg2", "MG2 (coroană)"),
    { leg: "Transmisia", f: [["i_em", "Raportul reductorului motorului de tracțiune", "i<sub>ME</sub>", "–"], ["eta_red", "Randamentul reductorului", "η<sub>red</sub>", "–"],
      ["k", "Raportul planetarului Z<sub>c</sub>/Z<sub>s</sub>", "k", "–"], ["i_f", "Raportul reductorului final", "i<sub>f</sub>", "–"],
      ["i_mg2", "Raportul reductorului MG2 – coroană", "i<sub>2</sub>", "–"], ["eta_tr", "Randamentul transmisiei", "η<sub>tr</sub>", "–"]] },
    { leg: "Bateria", f: [["bat.E", "Energia nominală", "E<sub>bat</sub>", "kWh"], ["bat.U_n", "Tensiunea nominală", "U<sub>n</sub>", "V"],
      ["bat.R0", "Rezistența internă", "R<sub>0</sub>", "mΩ", 1e-3], ["bat.P_dis", "Puterea maximă la descărcare", "P<sub>d</sub>", "kW"],
      ["bat.P_chg", "Puterea maximă la încărcare", "P<sub>î</sub>", "kW"], ["bat.eta_c", "Randamentul coulombian", "η<sub>C</sub>", "–"]] },
    { leg: "Strategia de gestionare a energiei", f: [["ems.soc_min", "SOC minim", "SOC<sub>min</sub>", "%", 0.01], ["ems.soc_target", "SOC țintă (CS)", "SOC<sub>ț</sub>", "%", 0.01],
      ["ems.soc_max", "SOC maxim", "SOC<sub>max</sub>", "%", 0.01], ["ems.soc_low", "Termostat: pornire MAI sub", "SOC<sub>jos</sub>", "%", 0.01],
      ["ems.soc_high", "Termostat: oprire MAI peste", "SOC<sub>sus</sub>", "%", 0.01], ["ems.P_opt", "Termostat: puterea MAI", "P<sub>opt</sub>", "kW", 1e3],
      ["ems.v_ice_min", "Viteza sub care se merge electric", "v<sub>MAI,min</sub>", "km/h"], ["ems.P_low", "Puterea sub care se merge electric", "P<sub>jos</sub>", "kW", 1e3],
      ["ems.P_th", "Puterea peste care ME asistă", "P<sub>prag</sub>", "kW", 1e3], ["ems.P_chg", "Puterea maximă de încărcare din MAI", "P<sub>înc</sub>", "kW", 1e3],
      ["ems.lps", "Sarcina relativă a MAI la încărcare", "τ<sub>opt</sub>", "–"], ["ems.v_ev_max", "Viteza maximă în regim electric (CS)", "v<sub>EV</sub>", "km/h"],
      ["ems.P_start", "Puterea de pornire a MAI (CS)", "P<sub>porn</sub>", "kW", 1e3], ["ems.k_soc", "Câștigul corecției SOC", "k<sub>SOC</sub>", "–"],
      ["ems.P_chg_max", "Puterea maximă de încărcare", "P<sub>înc</sub>", "kW", 1e3], ["ems.P_ice_min", "Puterea minimă a MAI pornit", "P<sub>MAI,min</sub>", "kW", 1e3]] },
    { leg: "Regimul PHEV", f: [["ems.soc_full", "SOC după încărcarea de la rețea", "SOC<sub>plin</sub>", "%", 0.01], ["ems.soc_cs", "SOC de trecere în regim CS", "SOC<sub>CS</sub>", "%", 0.01],
      ["ems.v_ev_max_cd", "Viteza maximă în regim electric (CD)", "v<sub>EV,CD</sub>", "km/h"], ["ems.P_ev_max", "Puterea maximă în regim electric (CD)", "P<sub>EV</sub>", "kW", 1e3],
      ["eta_charge", "Randamentul încărcării de la rețea", "η<sub>înc</sub>", "–"], ["$cost.UF", "Factorul de utilizare", "UF", "–"]] },
    { leg: "Sistemul MHEV 48 V", f: [["mhev.P", "Puterea de recuperare", "P", "kW"], ["mhev.eta", "Randamentul recuperării", "η", "–"],
      ["mhev.E", "Energia stocată utilă", "E", "kWh"], ["eta_alt", "Randamentul alternatorului", "η<sub>alt</sub>", "–"]] },
    { leg: "Validare", f: [["L_omol", "Consumul omologat WLTP al referinței", "C<sub>WLTP</sub>", "L/100 km"]] },
    { leg: "Cerințele temei", hib: true, f: [["$req.vmax", "Viteza maximă", "v<sub>max</sub>", "km/h"], ["$req.tacc", "Timpul 0–100 km/h", "t<sub>0–100</sub>", "s"],
      ["$req.panta", "Panta maximă la 30 km/h", "p<sub>max</sub>", "%"], ["$req.dEV", "Autonomia electrică (PHEV)", "d<sub>EV</sub>", "km", 1, 0, "PHEV"]] },
    { leg: "Analiza de cost", hib: true, f: [["$cost.pret_ref", "Prețul variantei de referință", "P<sub>ref</sub>", "EUR"], ["$cost.dP", "Costul suplimentar al hibridizării", "ΔP", "EUR"],
      ["$cost.km_an", "Kilometraj anual", "D", "km/an"], ["$cost.ani", "Orizontul analizei", "N", "ani"], ["$cost.pret_L", "Prețul benzinei", "p<sub>c</sub>", "EUR/L"],
      ["$cost.pret_kWh", "Prețul energiei electrice", "p<sub>e</sub>", "EUR/kWh"], ["$cost.rezidual", "Valoarea reziduală relativă", "r<sub>rez</sub>", "–"],
      ["$cost.mentenanta_ref", "Mentenanța referinței", "C<sub>m</sub>", "EUR/an"], ["$cost.red_m", "Reducerea mentenanței la hibrid", "–", "–"],
      ["$cost.taxe_ref", "Taxele anuale ale referinței", "C<sub>t</sub>", "EUR/an"], ["$cost.red_t", "Reducerea taxelor la hibrid", "–", "–"]] }
  ];

  // ---------------------------------------------------------------- starea
  let S = null;
  function initState(key) {
    const raw = clone(PRESETS[key]);
    const cost = {
      pret_ref: COSTURI.pret_ref, dP: COSTURI.dP[key] || (raw.tip === "PHEV" ? 8322 : 3259), km_an: COSTURI.km_an, ani: COSTURI.ani,
      pret_L: COSTURI.pret_L, pret_kWh: COSTURI.pret_kWh, rezidual: COSTURI.rezidual, mentenanta_ref: COSTURI.mentenanta_ref,
      red_m: COSTURI.red_m[raw.tip], taxe_ref: COSTURI.taxe_ref, red_t: COSTURI.red_t, UF: COSTURI.UF
    };
    S = { key: key, hib: raw, ref: S ? S.ref : clone(PRESETS.CONV), req: S ? S.req : clone(REQ0), cost: cost,
      edit: S ? S.edit : "hib", tab: S ? S.tab : "cerinte", ecms: null };
  }

  function objFor(path) {
    if (path[0] === "$") { const [o, k] = path.slice(1).split("."); return [S[o], k]; }
    return [S.edit === "hib" ? S.hib : S.ref, path];
  }
  function renderForm() {
    const form = $("#formular"); let h = "";
    if (S.edit === "hib") {
      h += `<fieldset><legend>Configurația</legend><div class="camp"><label for="sel-preset">Arhitectura și tipul</label><span class="simbol"></span>
        <select id="sel-preset">${Object.keys(NUME_PRESET).map(k => `<option value="${k}"${k === S.key ? " selected" : ""}>${NUME_PRESET[k]}</option>`).join("")}</select><span class="um"></span></div>
        <p class="nota">La schimbarea configurației se încarcă datele exemplului Bigster pentru acea arhitectură.</p></fieldset>`;
    } else {
      h += `<p class="nota">Varianta convențională se simulează cu același model, pentru validare (§6.4) și pentru analiza de cost.</p>`;
    }
    for (const g of GRUPE) {
      if (g.hib && S.edit !== "hib") continue;
      let rows = "";
      for (const fd of g.f) {
        const [path, et, sim, um, scale0, dec, onlyTip] = fd;
        if (onlyTip && S.hib.tip !== onlyTip) continue;
        const [o, p] = objFor(path);
        let val = getP(o, p);
        if (val === undefined) continue;
        if (path === "$cost.UF" && S.hib.tip !== "PHEV") continue;
        const scale = typeof scale0 === "number" ? scale0 : 1;
        const disp = scale0 === "lista" ? val.map(x => fmt(x, 2)).join("; ") : fmt(val / scale, decimals(val / scale));
        rows += `<div class="camp"><label for="f-${path}">${et}</label><span class="simbol">${sim}</span>
          <input id="f-${path}" data-path="${path}" data-scale="${scale0 === undefined ? 1 : scale0}" value="${esc(disp)}" inputmode="decimal"${scale0 === "lista" ? ' class="lista"' : ""}><span class="um">${um}</span></div>`;
      }
      if (rows) h += `<fieldset><legend>${g.leg}</legend>${rows}</fieldset>`;
    }
    form.innerHTML = h;
    const sel = $("#sel-preset");
    if (sel) sel.addEventListener("change", () => { initState(sel.value); renderForm(); schedule(); });
  }
  function decimals(x) {
    const a = Math.abs(x);
    if (a === 0) return 0;
    for (let d = 0; d <= 4; d++) if (Math.abs(x * Math.pow(10, d) - Math.round(x * Math.pow(10, d))) < 1e-6) return d;
    return 4;
  }
  $("#formular").addEventListener("input", e => {
    const inp = e.target; if (!inp.dataset || !inp.dataset.path) return;
    const [o, p] = objFor(inp.dataset.path);
    if (inp.dataset.scale === "lista") {
      const arr = inp.value.split(/[;\s]+/).map(parseNum).filter(x => isFinite(x) && x > 0);
      if (arr.length) setP(o, p, arr); else return;
    } else {
      const v = parseNum(inp.value); if (!isFinite(v)) return;
      setP(o, p, v * parseFloat(inp.dataset.scale));
    }
    schedule();
  });
  document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
    S = null; initState(b.dataset.preset); S.edit = "hib"; syncComut(); renderForm(); schedule();
  }));
  document.querySelectorAll("[data-var]").forEach(b => b.addEventListener("click", () => { S.edit = b.dataset.var; syncComut(); renderForm(); }));
  function syncComut() { document.querySelectorAll("[data-var]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.var === S.edit))); }

  // ---------------------------------------------------------------- calculul
  let R = null, timer = null;
  function schedule() { clearTimeout(timer); $("#sumar").classList.add("lucru"); timer = setTimeout(compute, 250); }
  function compute() {
    try {
      const c = H.buildCfg(S.hib), cr = H.buildCfg(S.ref);
      const r = { c: c, cr: cr };
      r.D = H.wheelDemand(c.veh, V);
      r.ref = H.simulate(cr, V, null, "CS", true);
      r.ref.acc = H.accel0100(cr);
      if (S.hib.tip === "PHEV") { r.ph = H.runPHEV(c, V, S.cost.UF); r.cs = r.ph.cs; r.L = r.ph.L100_comb; }
      else { r.cs = H.runCS(c, V); r.L = r.cs.L100_corr; }
      r.acc = H.accel0100(c); r.vmax = H.vMax(c); r.grade = H.gradeMax(c, 30);
      r.tco = costs(r);
      R = r; S.ecms = null;
      $("#sumar").classList.remove("lucru");
      render();
    } catch (err) {
      $("#sumar").classList.remove("lucru");
      $("#sumar").innerHTML = `<div class="alerta">Calculul nu s-a putut face cu datele introduse: ${esc(err.message)}</div>`;
      console.error(err);
    }
  }
  function costs(r) {
    const k = S.cost, phev = S.hib.tip === "PHEV";
    const base = { km_an: k.km_an, ani: k.ani, pret_L: k.pret_L, pret_kWh: k.pret_kWh, rezidual: k.rezidual };
    const tr = H.tco(Object.assign({}, base, { L100: r.ref.L100, pret: k.pret_ref, mentenanta: k.mentenanta_ref, taxe: k.taxe_ref }));
    const th = H.tco(Object.assign({}, base, { L100: r.L, kWh100: phev ? r.ph.kWh100_comb : 0, pret: k.pret_ref + k.dP,
      mentenanta: k.mentenanta_ref * (1 - k.red_m), taxe: k.taxe_ref * (1 - k.red_t) }));
    const sav = (tr.C_en - th.C_en) / k.ani + k.mentenanta_ref * k.red_m + k.taxe_ref * k.red_t;
    return { ref: tr, hib: th, sav: sav, be: sav > 0 ? k.dP / sav : Infinity };
  }

  // ---------------------------------------------------------------- verificări
  function checks(r) {
    const c = r.c, p = c.ems, out = [], phev = S.hib.tip === "PHEV";
    const ok = (b) => b ? "ok" : "atentie";
    const cs = r.cs, lim = cs.limits;
    out.push(["Viteza maximă", `${fmt(r.vmax[0], 0)} km/h ≥ ${fmt(S.req.vmax, 0)} km/h`, ok(r.vmax[0] >= S.req.vmax)]);
    out.push(["Accelerarea 0–100 km/h", `${fmt(r.acc, 1)} s ≤ ${fmt(S.req.tacc, 1)} s`, ok(r.acc <= S.req.tacc + 1e-9)]);
    out.push(["Panta maximă la 30 km/h", `${fmt(r.grade, 0)} % ≥ ${fmt(S.req.panta, 0)} %`, ok(r.grade >= S.req.panta)]);
    if (phev) out.push(["Autonomia electrică WLTC", `${fmt(r.ph.range_km, 0)} km ≥ ${fmt(S.req.dEV, 0)} km`, ok(r.ph.range_km >= S.req.dEV)]);
    const err = (r.ref.L100 / S.ref.L_omol - 1) * 100;
    out.push(["Validarea modelului (referința convențională)", `${fmt(r.ref.L100, 2)} față de ${fmt(S.ref.L_omol, 2)} L/100 km: ${err >= 0 ? "+" : ""}${fmt(err, 1)} %`, ok(Math.abs(err) <= 5)]);
    const dsoc = (cs.soc_end - cs.soc0) * 100;
    out.push(["SOC final = SOC inițial (CS)", `ΔSOC = ${fmt(dsoc, 2)} % (SOC inițial iterat ${fmt(cs.soc0 * 100, 1)} %)`, ok(Math.abs(dsoc) <= 0.5)]);
    const lo = p.soc_min !== undefined ? p.soc_min : (p.soc_cs !== undefined ? Math.min(p.soc_cs, p.soc_low || 1) : 0);
    const hi = p.soc_max !== undefined ? p.soc_max : 1;
    out.push(["SOC în fereastra admisă", `${fmt(lim.soc_min * 100, 1)} … ${fmt(lim.soc_max * 100, 1)} % (admis ${fmt((lo - 0.02) * 100, 0)} … ${fmt(hi * 100, 0)} %)`,
      ok(lim.soc_min >= lo - 0.02 && lim.soc_max <= hi + 0.005)]);
    const parts = [];
    let worst = 0;
    for (const nm of ["ME", "GEN", "MG1", "MG2"]) if (lim[nm]) { parts.push(`${nm}: n ${fmt(lim[nm][0] * 100, 0)} %, M ${fmt(lim[nm][1] * 100, 0)} %`); worst = Math.max(worst, lim[nm][0], lim[nm][1]); }
    if (lim.MAI_T) { parts.push(`MAI: n ${fmt(lim.MAI_n * 100, 0)} %, M ${fmt(lim.MAI_T * 100, 0)} %`); worst = Math.max(worst, lim.MAI_n, lim.MAI_T); }
    out.push(["Limitele componentelor", parts.join("; "), ok(worst <= 1.0 + 1e-6)]);
    const nu = (lim.neurmarit_s || 0) / cs.n * 100;
    out.push(["Ciclul urmat", `puterea cerută neacoperită ${fmt(nu, 1)} % din timp`, ok(nu <= 1)]);
    const e = cs.energy, etr = c.gb ? c.gb.eta : (c.eta_tr || c.eta_red);
    const tr_exp = e.wheel_pos * (1 / etr - 1) + (e.wheel_neg - e.fric) * (1 - etr);
    const okb = Math.abs(e.closure) <= 0.005 && (S.hib.arch !== "P2" || Math.abs(e.tr_loss - tr_exp) <= 0.01 * e.src);
    out.push(["Bilanțul energetic închis", `abatere ${fmt(e.closure * 100, 2)} %` + (S.hib.arch === "P2" ? `; pierderi în transmisie ${fmt(e.tr_loss, 3)} kWh, după (6.2): ${fmt(tr_exp, 3)} kWh` : ""), ok(okb)]);
    return out;
  }

  // ---------------------------------------------------------------- grafice SVG
  function grafic({ titlu, xEt, yEt, serii, xMin, xMax, yMin, yMax, puncte, W, Hh }) {
    W = W || 640; Hh = Hh || 250;
    const m = { l: 56, r: 14, t: 10, b: 40 }, w = W - m.l - m.r, h = Hh - m.t - m.b;
    let ys = [], xs = [];
    serii.forEach(s => { s.y.forEach(v => isFinite(v) && ys.push(v)); (s.x || []).forEach(v => xs.push(v)); });
    (puncte || []).forEach(pt => { ys.push(pt[1]); xs.push(pt[0]); });
    const x0 = xMin !== undefined ? xMin : Math.min(...xs, 0), x1 = xMax !== undefined ? xMax : Math.max(...xs);
    let y0 = yMin !== undefined ? yMin : Math.min(...ys), y1 = yMax !== undefined ? yMax : Math.max(...ys);
    if (y1 === y0) { y1 += 1; y0 -= 1; }
    const tick = (a, b, n) => { const raw = (b - a) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(k => k * p).find(k => raw <= k); const r = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) r.push(+v.toFixed(10)); return [r, st]; };
    const [ty] = tick(y0, y1, 5), [tx] = tick(x0, x1, 6);
    const X = v => m.l + (v - x0) / (x1 - x0) * w, Y = v => m.t + h - (v - y0) / (y1 - y0) * h;
    let g = "";
    ty.forEach(v => g += `<line class="grila" x1="${m.l}" x2="${m.l + w}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0)}</text>`);
    tx.forEach(v => g += `<text class="ax" x="${X(v)}" y="${m.t + h + 16}" text-anchor="middle">${fmt(v, 0)}</text>`);
    g += `<line class="axa" x1="${m.l}" x2="${m.l + w}" y1="${m.t + h}" y2="${m.t + h}"/><line class="axa" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${m.t + h}"/>`;
    g += `<text class="ax-titlu" x="${m.l + w / 2}" y="${Hh - 4}" text-anchor="middle">${xEt}</text>`;
    g += `<text class="ax-titlu" transform="translate(13 ${m.t + h / 2}) rotate(-90)" text-anchor="middle">${yEt}</text>`;
    if (puncte) g += puncte.map(pt => `<circle class="punct" cx="${X(pt[0]).toFixed(1)}" cy="${Y(pt[1]).toFixed(1)}" r="1.6"/>`).join("");
    serii.forEach((s, i) => {
      const pts = s.y.map((v, k) => [X(s.x ? s.x[k] : k), Y(Math.min(Math.max(v, y0), y1))]);
      g += `<polyline class="serie serie-${s.cls !== undefined ? s.cls : i}${s.sub ? " subtire" : ""}${s.punctat ? " punctat" : ""}" points="${pts.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ")}"/>`;
    });
    const leg = serii.filter(s => s.nume).map((s, i) => `<span><i class="serie-${s.cls !== undefined ? s.cls : i}"></i>${s.nume}</span>`).join("") +
      (puncte && puncte.nume ? `<span><i class="punct-leg"></i>${puncte.nume}</span>` : "");
    return `<figure class="grafic"><figcaption>${titlu}</figcaption><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(titlu.replace(/<[^>]+>/g, ""))}">${g}</svg>${leg ? `<div class="legenda">${leg}</div>` : ""}</figure>`;
  }
  const col = (hist, k, f) => hist.map(r => f ? f(r) : r[k]);

  // ---------------------------------------------------------------- tabele
  const tabel = (cap, rows, cls) => `<div class="tabel-container"><table class="tabel${cls ? " " + cls : ""}"><thead><tr>${cap.map((c, i) => `<th${i ? ' class="num"' : ""}>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r => r.sectiune ? `<tr class="sectiune"><td colspan="${cap.length}">${r.sectiune}</td></tr>` : `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const insigna = s => `<span class="insigna ${s}">${s === "ok" ? "îndeplinită" : "neîndeplinită"}</span>`;

  // ---------------------------------------------------------------- taburi
  const TABURI = [["cerinte", "2. Cerințe de putere și energie"], ["dim", "3. Arhitectura și dimensionarea"], ["sim", "5–6. Strategia EMS și simularea WLTC"],
    ["ver", "6. Verificări"], ["opt", "7. Optimizarea (ECMS)"], ["tco", "8. Analiza tehnico-economică"]];
  function render() {
    if (window.PCMAI_SHELL) PCMAI_SHELL.rezultat(S, R);
    renderSumar();
    $("#taburi").innerHTML = TABURI.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === S.tab}">${t}</button>`).join("");
    $("#taburi").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { S.tab = b.dataset.tab; render(); }));
    const f = { cerinte: tabCerinte, dim: tabDim, sim: tabSim, ver: tabVer, opt: tabOpt, tco: tabTco }[S.tab];
    $("#continut").innerHTML = f();
    if (S.tab === "opt") bindOpt();
    // la tipărire: toate taburile
    $("#continut").insertAdjacentHTML("beforeend", `<div class="doar-tipar">${TABURI.filter(t => t[0] !== S.tab).map(([k, t]) => `<section class="foaie-tipar"><h2>${t}</h2>${{ cerinte: tabCerinte, dim: tabDim, sim: tabSim, ver: tabVer, opt: () => "", tco: tabTco }[k]()}</section>`).join("")}</div>`);
  }
  function renderSumar() {
    const r = R, phev = S.hib.tip === "PHEV", ch = checks(r), nOk = ch.filter(c => c[2] === "ok").length;
    const red = (1 - r.L / r.ref.L100) * 100;
    const k = [
      [phev ? "Consum ponderat" : "Consum (corectat ΔSOC)", fmt(r.L, 2), "L/100 km"],
      ["Reducere față de referință", fmt(red, 1), "%"],
      ["Emisii CO₂", fmt(r.L * H.CO2_PER_L * 10, 0), "g/km"],
      phev ? ["Autonomie electrică", fmt(r.ph.range_km, 0), "km (WLTC)"] : ["Distanță parcursă electric", fmt(r.cs.ev_share * 100, 0), "%"],
      ["0–100 km/h", fmt(r.acc, 1), "s"],
      ["TCO pe " + S.cost.ani + " ani", fmt(r.tco.hib.TCO, 0), "EUR"]
    ];
    $("#sumar").innerHTML = `<div class="kpiuri">${k.map(x => `<div class="kpi"><span class="kpi-et">${x[0]}</span><span class="kpi-v">${x[1]}</span><span class="kpi-um">${x[2]}</span></div>`).join("")}</div>
      <div class="stare ${nOk === ch.length ? "stare-ok" : "stare-atentie"}">${S.hib.nume || NUME_PRESET[S.key]}: ${nOk} din ${ch.length} verificări îndeplinite${nOk === ch.length ? "." : " – vezi fila Verificări."}</div>`;
  }

  function tabCerinte() {
    const r = R, D = r.D, veh = r.c.veh, n = D.vm.length;
    const dist = D.vm.reduce((a, b) => a + b, 0) / 1000;
    let Ep = 0, En = 0, Pmax = 0, Pmin = 0, amax = 0, amin = 0, stop = 0;
    D.P.forEach((P, i) => { if (P > 0) Ep += P; else En -= P; Pmax = Math.max(Pmax, P); Pmin = Math.min(Pmin, P); amax = Math.max(amax, D.a[i]); amin = Math.min(amin, D.a[i]); if (D.vm[i] < 0.05) stop++; });
    Ep /= 3.6e6; En /= 3.6e6;
    const eta = r.c.gb ? r.c.gb.eta : 0.95;
    const vs = [50, 80, 100, 130, 160, 180];
    const brk = D.P.filter(P => P < 0).map(P => -P), Eb = brk.reduce((a, b) => a + b, 0);
    const grid = [], frac = [];
    for (let Pe = 5; Pe <= 80; Pe++) { grid.push(Pe); frac.push(brk.reduce((a, b) => a + Math.min(b, Pe * 1e3 * 0.95), 0) / Eb * 100); }
    const pAt = q => grid[frac.findIndex(x => x >= q)];
    const Pacc = veh.delta * veh.m * Math.pow(100 / 3.6, 2) / (2 * S.req.tacc) / 1e3;
    const Paccv = Pacc / eta + H.pRoad(veh, 100) / 2 / 1e3;
    let h = `<div class="grafice">${grafic({ titlu: "Ciclul WLTC clasa 3b", xEt: "timpul [s]", yEt: "v [km/h]", serii: [{ y: V }], xMin: 0, xMax: 1800, yMin: 0 })}
      ${grafic({ titlu: "Puterea la roată", xEt: "timpul [s]", yEt: "P<sub>r</sub> [kW]".replace(/<[^>]+>/g, ""), serii: [{ y: D.P.map(x => x / 1e3), sub: true }], xMin: 0, xMax: 1800 })}</div>`;
    h += tabel(["Ciclul WLTC clasa 3b (§2.2)", "Valoare"], [
      ["Durata / distanța", `${n} s / ${fmt(dist, 2)} km`], ["Viteza medie / maximă", `${fmt(dist / n * 3600, 1)} / ${fmt(Math.max(...V), 1)} km/h`],
      ["Accelerația maximă / decelerația maximă", `${fmt(amax, 2)} / ${fmt(amin, 2)} m/s²`], ["Timp de staționare", `${fmt(stop / n * 100, 1)} %`],
      { sectiune: "Energia la roată (§2.3)" },
      ["Energia de tracțiune E<sub>r</sub><sup>+</sup>", `${fmt(Ep, 2)} kWh (${fmt(Ep * 1000 / dist, 0)} Wh/km)`],
      ["Energia disponibilă la frânare E<sub>r</sub><sup>−</sup>", `${fmt(En, 2)} kWh (${fmt(En / Ep * 100, 0)} % din E<sub>r</sub><sup>+</sup>)`],
      ["Puterea maximă la roată: tracțiune / frânare", `${fmt(Pmax / 1e3, 1)} / ${fmt(Pmin / 1e3, 1)} kW`]
    ]);
    h += "<br>" + tabel(["Viteza [km/h]", ...vs.map(String)], [["Puterea necesară (η<sub>tr</sub> = " + fmt(eta, 2) + ") [kW]", ...vs.map(v => fmt(H.pRoad(veh, v, 0, eta) / 1e3, 1))]], "compact");
    h += "<br>" + tabel(["Puterea cerută de performanțe (§2.4)", "Valoare"], [
      [`Viteza maximă cerută (${fmt(S.req.vmax, 0)} km/h)`, `${fmt(H.pRoad(veh, S.req.vmax, 0, eta) / 1e3, 1)} kW`],
      [`Accelerare 0–100 km/h în ${fmt(S.req.tacc, 1)} s: puterea medie / cu rezistențe`, `${fmt(Pacc, 1)} / ${fmt(Paccv, 1)} kW`],
      [`Panta de ${fmt(S.req.panta, 0)} % la 30 km/h`, `${fmt(H.pRoad(veh, 30, S.req.panta / 100, eta) / 1e3, 1)} kW`],
      ["Forța de rezistență la rulare / aerodinamică la 100 km/h", `${fmt(veh.m * H.G * veh.f, 0)} / ${fmt(0.5 * H.RHO_AIR * veh.CdA * Math.pow(100 / 3.6, 2), 0)} N`]
    ]);
    h += `<div class="grafice">${grafic({ titlu: "Energia de frânare recuperabilă în funcție de puterea ME (§3.3)", xEt: "puterea ME în regim de generator [kW]", yEt: "recuperabil [%]", serii: [{ y: frac, x: grid }], xMin: 5, xMax: 80, yMax: 100 })}</div>
      <p class="nota">90 % din energia de frânare se recuperează cu ${pAt(90)} kW, 95 % cu ${pAt(95)} kW (randament 0,95 la arbore).</p>`;
    return h;
  }

  function tabDim() {
    const r = R, c = r.c, a = S.hib.arch, phev = S.hib.tip === "PHEV", veh = c.veh, rows = [];
    const Pem = a === "P2" ? c.em.P : a === "S" ? c.em.P : c.mg1.P + c.mg2.P;
    const Hh = (a === "PS" ? c.mg2.P : Pem) / ((a === "PS" ? c.mg2.P : Pem) + c.ice.P_max);
    rows.push({ sectiune: "Componentele alese" });
    rows.push(["MAI: P<sub>max</sub> / M<sub>max</sub> / c<sub>e,min</sub>", `${fmt(c.ice.P_max, 0)} kW / ${fmt(c.ice.T_max, 0)} N·m / ${fmt(c.ice.bsfc_min, 0)} g/kWh`, ""]);
    for (const [k, nm] of [["em", a === "S" ? "Motorul de tracțiune" : "ME"], ["gen", "Generatorul"], ["mg1", "MG1"], ["mg2", "MG2"]]) if (c[k])
      rows.push([nm + ": P<sub>max</sub> / M<sub>max</sub> / n<sub>max</sub>", `${fmt(c[k].P, 0)} kW / ${fmt(c[k].T_max, 0)} N·m / ${fmt(c[k].n_max, 0)} rot/min`, ""]);
    rows.push(["Bateria: E / U<sub>n</sub> / P<sub>desc</sub>", `${fmt(c.bat.E, 1)} kWh / ${fmt(c.bat.U_n, 0)} V / ${fmt(c.bat.P_dis, 0)} kW`, ""]);
    rows.push(["Gradul de hibridizare H", fmt(Hh, 2), ""]);
    rows.push({ sectiune: "Verificările de dimensionare" });
    const etaV = c.gb ? c.gb.eta : (c.eta_tr || c.eta_red);
    const Pv = H.pRoad(veh, S.req.vmax, 0, etaV) / 1e3;
    if (a !== "S") rows.push([`P<sub>MAI</sub> ≥ P la ${fmt(S.req.vmax, 0)} km/h`, `${fmt(c.ice.P_max, 0)} ≥ ${fmt(Pv, 1)} kW`, insigna(c.ice.P_max >= Pv ? "ok" : "atentie")]);
    else rows.push([`P<sub>motor tracțiune</sub>·η ≥ P la ${fmt(S.req.vmax, 0)} km/h`, `${fmt(c.em.P * c.eta_red, 0)} ≥ ${fmt(Pv, 1)} kW`, insigna(c.em.P * c.eta_red >= Pv ? "ok" : "atentie")]);
    if (a === "P2" && r.vmax[1]) rows.push(["Viteza maximă numai cu MAI, pe trepte", `${fmt(r.vmax[0], 1)} km/h în treapta a ${r.vmax[1]}-a, la ${fmt(r.vmax[2], 0)} rot/min`, ""]);
    const PmBat = a === "PS" ? c.mg2.P - c.mg1.P : c.em.P;
    const etB = a === "PS" ? "(P<sub>MG2</sub> − P<sub>MG1</sub>)/0,93 (la sarcină maximă MG1 alimentează MG2)" : a === "S" ? "P<sub>motor tracțiune</sub>/0,93 (cu MAI oprit)" : "P<sub>ME</sub>/0,93";
    rows.push([`Puterea bateriei ≥ ${etB}`, `${fmt(c.bat.P_dis, 0)} ≥ ${fmt(PmBat / 0.93, 1)} kW`, insigna(c.bat.P_dis >= PmBat / 0.93 - 1e-9 ? "ok" : "atentie")]);
    if (!phev) {
      const Ek = 0.5 * veh.m * veh.delta * Math.pow(130 / 3.6, 2) / 3.6e6, p = c.ems;
      const ds = (p.soc_max !== undefined ? p.soc_max : p.soc_high + 0.05) - (p.soc_min !== undefined ? p.soc_min : p.soc_low - 0.05);
      const Emin = 0.7 * Ek / ds;
      rows.push([`Energia bateriei ≥ 0,7·E<sub>cin</sub>(130 km/h)/ΔSOC (ΔSOC = ${fmt(ds * 100, 0)} %)`, `${fmt(c.bat.E, 2)} ≥ ${fmt(Emin, 2)} kWh`, insigna(c.bat.E >= Emin ? "ok" : "atentie")]);
    } else {
      const cd = r.ph.cd, eEV = cd.kWh100 * (c.eta_charge || 0.9) / 100, ds = c.ems.soc_full - c.ems.soc_cs, Er = S.req.dEV * eEV / ds;
      rows.push(["Consumul de energie la bornele bateriei în regim CD, e<sub>EV</sub>", `${fmt(eEV * 1000, 0)} Wh/km`, ""]);
      rows.push([`Energia bateriei ≥ d<sub>EV</sub>·e<sub>EV</sub>/ΔSOC (ΔSOC = ${fmt(ds * 100, 0)} %)`, `${fmt(c.bat.E, 1)} ≥ ${fmt(Er, 1)} kWh`, insigna(c.bat.E >= Er ? "ok" : "atentie")]);
    }
    if (a === "PS") {
      const k = c.k, TM1 = c.ice.T_max / (1 + k), nc0 = c.mg1.n_max / (1 + k);
      const wr = S.req.vmax / 3.6 / veh.rw * c.i_f, nm2 = wr * c.i_mg2 * 30 / Math.PI;
      const vm = (1 + k) / k * 2000 * Math.PI / 30 / c.i_f * veh.rw * 3.6;
      rows.push(["Cuplul de reacție al MG1 la M<sub>max</sub> al MAI: M<sub>MAI</sub>/(1+k)", `${fmt(TM1, 1)} ≤ ${fmt(c.mg1.T_max, 0)} N·m`, insigna(TM1 <= c.mg1.T_max ? "ok" : "atentie")]);
      rows.push(["Cuplul transmis coroanei: k·M<sub>MAI</sub>/(1+k)", `${fmt(c.ice.T_max * k / (1 + k), 1)} N·m`, ""]);
      rows.push(["Turația maximă a MAI la vehicul oprit: n<sub>MG1,max</sub>/(1+k)", `${fmt(nc0, 0)} rot/min`, ""]);
      rows.push([`Turația MG2 la ${fmt(S.req.vmax, 0)} km/h`, `${fmt(nm2, 0)} ≤ ${fmt(c.mg2.n_max, 0)} rot/min`, insigna(nm2 <= c.mg2.n_max ? "ok" : "atentie")]);
      rows.push(["Punctul mecanic (MG1 oprit) la n<sub>MAI</sub> = 2000 rot/min", `${fmt(vm, 0)} km/h`, ""]);
    }
    if (a === "S") {
      const nm = S.req.vmax / 3.6 / veh.rw * c.i_em * 30 / Math.PI;
      rows.push([`Turația motorului de tracțiune la ${fmt(S.req.vmax, 0)} km/h`, `${fmt(nm, 0)} ≤ ${fmt(c.em.n_max, 0)} rot/min`, insigna(nm <= c.em.n_max ? "ok" : "atentie")]);
      rows.push(["Puterea generatorului ≥ puterea MAI la P<sub>opt</sub>", `${fmt(c.gen.P, 0)} ≥ ${fmt(c.ems.P_opt / 1e3, 0)} kW`, insigna(c.gen.P >= c.ems.P_opt / 1e3 ? "ok" : "atentie")]);
    }
    rows.push({ sectiune: "Performanțele (§3.6)" });
    rows.push(["Viteza maximă", `${fmt(r.vmax[0], 0)} km/h (cerut ≥ ${fmt(S.req.vmax, 0)})`, insigna(r.vmax[0] >= S.req.vmax ? "ok" : "atentie")]);
    rows.push(["Timpul 0–100 km/h", `${fmt(r.acc, 1)} s (cerut ≤ ${fmt(S.req.tacc, 1)}; referința ${fmt(r.ref.acc, 1)} s)`, insigna(r.acc <= S.req.tacc + 1e-9 ? "ok" : "atentie")]);
    rows.push(["Panta maximă la 30 km/h", `${fmt(r.grade, 0)} % (cerut ≥ ${fmt(S.req.panta, 0)})`, insigna(r.grade >= S.req.panta ? "ok" : "atentie")]);
    let h = tabel(["Mărime", "Valoare", "Verificare"], rows);
    // forța maximă la roată
    const vv = [], Fm = [], Fr = [];
    for (let v = 0; v <= 200; v += 2) { vv.push(v); Fm.push(Math.min(H.maxWheelForce(c, v / 3.6), veh.F_adh) / 1e3); Fr.push((veh.m * H.G * veh.f + 0.5 * H.RHO_AIR * veh.CdA * Math.pow(v / 3.6, 2)) / 1e3); }
    h += `<div class="grafice">${grafic({ titlu: "Forța maximă la roată și forța de rezistență", xEt: "viteza [km/h]", yEt: "F [kN]", serii: [{ x: vv, y: Fm, nume: "forța maximă (limitată de aderență)" }, { x: vv, y: Fr, nume: "rezistențe pe drum orizontal" }], xMin: 0, xMax: 200, yMin: 0 })}
      ${a === "PS" ? graficPS(c) : graficMAI(c, r.cs.hist, "Harta MAI și punctele de funcționare (regim CS)")}</div>`;
    return h;
  }
  function graficPS(c) {
    const k = c.k, vk = [], s = [[], [], []], m2 = [];
    for (let v = 0; v <= 180; v += 2) {
      vk.push(v); const wr = v / 3.6 / c.veh.rw * c.i_f;
      [1500, 2000, 3000].forEach((n, i) => s[i].push(((1 + k) * n * Math.PI / 30 - k * wr) * 30 / Math.PI));
      m2.push(wr * c.i_mg2 * 30 / Math.PI);
    }
    return grafic({ titlu: "Turațiile MG1 și MG2 (relația lui Willis)", xEt: "viteza [km/h]", yEt: "n [rot/min]",
      serii: [{ x: vk, y: s[0], nume: "MG1, n<sub>MAI</sub> = 1500" }, { x: vk, y: s[1], nume: "MG1, 2000" }, { x: vk, y: s[2], nume: "MG1, 3000" }, { x: vk, y: m2, nume: "MG2", cls: 3 }], xMin: 0, xMax: 180 });
  }
  function graficMAI(c, hist, titlu) {
    const ice = c.ice, nn = [], Tf = [];
    for (let n = 1000; n <= ice.n_max; n += 50) { nn.push(n); Tf.push(H.iceFullLoad(ice, n)); }
    const pts = hist.filter(r => r[9] > 0).map(r => [r[3], r[4]]); pts.nume = "puncte pe WLTC";
    const ool = ice.ool;
    return grafic({ titlu: titlu, xEt: "turația [rot/min]", yEt: "cuplul [N·m]", serii: [{ x: nn, y: Tf, nume: "sarcina totală" }, { x: ool.map(r => r[1]), y: ool.map(r => r[2]), nume: "linia de funcționare optimă", cls: 2 }],
      puncte: pts, xMin: 1000, xMax: ice.n_max, yMin: 0, yMax: Math.max(...Tf) * 1.08 });
  }

  function tabSim() {
    const r = R, cs = r.cs, phev = S.hib.tip === "PHEV", hist = cs.hist, PH = [[0, 589, "Low"], [589, 1022, "Medium"], [1022, 1477, "High"], [1477, 1800, "Extra High"]];
    const phase = (hh, a, b) => { let f = 0, d = 0; for (let i = a; i < b; i++) { f += hh[i][9]; d += hh[i][1] / 3.6; } return f / 1000 / H.RHO_FUEL / (d / 1000) * 100; };
    const on = hist.filter(x => x[9] > 0);
    const Pm = on.reduce((a, x) => a + x[10], 0) / Math.max(on.length, 1), nm = on.reduce((a, x) => a + x[3], 0) / Math.max(on.length, 1);
    let rows = [];
    if (phev) {
      const cd = r.ph.cd;
      rows = [["Consum de combustibil [L/100 km]", fmt(cd.L100, 2), fmt(cs.L100_corr, 2), fmt(r.ph.L100_comb, 2)],
        ["Energie de la rețea [kWh/100 km]", fmt(cd.kWh100, 1), "–", fmt(r.ph.kWh100_comb, 1)],
        ["Emisii CO₂ [g/km]", fmt(cd.L100 * H.CO2_PER_L * 10, 0), fmt(cs.L100_corr * H.CO2_PER_L * 10, 0), fmt(r.ph.L100_comb * H.CO2_PER_L * 10, 0)],
        ["Distanța parcursă electric", fmt(cd.ev_share * 100, 0) + " %", fmt(cs.ev_share * 100, 0) + " %", "–"],
        ["SOC final după un ciclu", fmt(cd.soc_end * 100, 1) + " %", fmt(cs.soc_end * 100, 1) + " %", "–"],
        ["Autonomia electrică echivalentă", "–", "–", fmt(r.ph.range_km, 0) + " km"]];
    }
    let h = phev ? tabel(["PHEV (§5.5)", "Regim CD", "Regim CS", `Ponderat (UF = ${fmt(S.cost.UF, 2)})`], rows) + "<br>" : "";
    h += tabel(["Rezultate în regim CS", S.hib.tip + " " + (NUME_PRESET[S.key] || "").split(" ").slice(1).join(" "), "Referința"], [
      ["Consum, corectat ΔSOC [L/100 km]", fmt(cs.L100_corr, 2), fmt(r.ref.L100, 2)],
      ["Consum necorectat [L/100 km]", fmt(cs.L100, 2), "–"],
      ["Reducerea consumului (CS)", fmt((1 - cs.L100_corr / r.ref.L100) * 100, 1) + " %", "–"],
      ["Emisii CO₂ [g/km]", fmt(cs.L100_corr * H.CO2_PER_L * 10, 0), fmt(r.ref.L100 * H.CO2_PER_L * 10, 0)],
      ["SOC inițial = final (iterat)", fmt(cs.soc0 * 100, 1) + " %", "–"],
      ["SOC minim / maxim pe ciclu", fmt(cs.limits.soc_min * 100, 1) + " / " + fmt(cs.limits.soc_max * 100, 1) + " %", "–"],
      ["Distanța parcursă electric", fmt(cs.ev_share * 100, 0) + " %", "–"],
      ["Timpul de funcționare al MAI / porniri", fmt(cs.t_ice / cs.n * 100, 1) + " % / " + cs.starts, fmt(r.ref.t_ice / r.ref.n * 100, 1) + " %"],
      ["Puterea medie / turația medie a MAI pornit", fmt(Pm, 1) + " kW / " + fmt(nm, 0) + " rot/min", "–"],
      ["Randamentul mediu al MAI", fmt(cs.energy.ice / cs.E_fuel_kWh * 100, 1) + " %", fmt(r.ref.energy.ice / r.ref.E_fuel_kWh * 100, 1) + " %"],
      ["Energia recuperată la frânare", fmt(cs.E_regen_kWh, 3) + " kWh", "–"]]);
    h += "<br>" + tabel(["Consumul pe faze [L/100 km]", ...PH.map(p => p[2])], [
      [S.hib.tip + " (CS)", ...PH.map(p => fmt(phase(hist, p[0], p[1]), 2))], ["Referința", ...PH.map(p => fmt(phase(r.ref.hist, p[0], p[1]), 2))]], "compact");
    h += `<p class="nota">Pe fazele separate SOC nu revine la valoarea inițială; numai consumul pe ciclu este corectat.</p>`;
    const t = col(hist, 0);
    h += `<div class="grafice">
      ${grafic({ titlu: "Puterile MAI și ale mașinilor electrice (regim CS)", xEt: "timpul [s]", yEt: "P [kW]", serii: [
        { y: col(hist, 10), nume: "MAI", sub: true, cls: 1 }, { y: col(hist, 6), nume: S.hib.arch === "PS" ? "MG2 (electric)" : "ME (electric)", sub: true, cls: 0 },
        ...(S.hib.arch !== "P2" ? [{ y: col(hist, 5), nume: S.hib.arch === "PS" ? "MG1" : "generator", sub: true, cls: 2 }] : [])], xMin: 0, xMax: 1800 })}
      ${grafic({ titlu: "Starea de încărcare a bateriei (regim CS)", xEt: "timpul [s]", yEt: "SOC [%]", serii: [{ y: col(hist, 8).map(x => x * 100), cls: 2 }], xMin: 0, xMax: 1800 })}
      ${phev ? grafic({ titlu: "Regim CD: SOC pe un ciclu, pornind de la SOC plin", xEt: "timpul [s]", yEt: "SOC [%]", serii: [{ y: col(r.ph.cd.hist, 8).map(x => x * 100), cls: 2 }], xMin: 0, xMax: 1800 }) : ""}
      ${graficMAI(r.c, hist, "Harta MAI: punctele de funcționare pe WLTC (CS)")}
      ${graficMAI(r.cr, r.ref.hist, "Referința: punctele de funcționare ale MAI")}</div>`;
    return h;
  }

  function tabVer() {
    const r = R, e = r.cs.energy;
    let h = tabel(["Verificare", "Valoare", "Stare"], checks(r).map(c => [c[0], c[1], insigna(c[2])]));
    h += "<br>" + tabel(["Bilanțul energetic pe WLTC, regim CS (§6.2)", "kWh"], [
      { sectiune: "Surse" }, ["Energia efectivă a MAI", fmt(e.ice, 3)], ["Variația energiei chimice a bateriei (+ descărcare)", fmt(r.cs.E_bat_int_kWh, 4)],
      { sectiune: "Consumatori și pierderi" }, ["Energia de tracțiune la roată E<sub>r</sub><sup>+</sup>", fmt(e.wheel_pos, 3)], ["Energia de frânare la roată E<sub>r</sub><sup>−</sup> (se scade)", fmt(-e.wheel_neg, 3)],
      ["Frâne cu fricțiune", fmt(e.fric, 3)], ["Pierderi în transmisie", fmt(e.tr_loss, 3)], ["Pierderi în mașinile electrice", fmt(e.em_loss, 3)],
      ["Pierderi în baterie", fmt(e.bat_loss, 3)], ["Consumatori auxiliari", fmt(e.aux, 3)],
      { sectiune: "Închiderea bilanțului" }, ["Abaterea (raportată la E<sub>r</sub><sup>+</sup>)", fmt(e.closure * 100, 2) + " %"], ["Energia combustibilului", fmt(r.cs.E_fuel_kWh, 2)]]);
    return h;
  }

  function tabOpt() {
    if (S.hib.arch !== "P2") return `<p class="nota">Metodele de optimizare din capitolul 7 sunt implementate pentru arhitectura paralel P2 (exemplul 1). Pentru celelalte arhitecturi, calibrați parametrii strategiei pe reguli din formular și urmăriți consumul corectat.</p>`;
    const r = R, e = S.ecms;
    let h = `<p class="nota">ECMS (§7.1): la fiecare pas se alege puterea MAI și treapta care minimizează ṁ<sub>c</sub> + s·P<sub>bat</sub>/Q<sub>i</sub>, cu s = s<sub>0</sub>[1 + k<sub>p</sub>(SOC<sub>ț</sub> − SOC)]. SOC țintă = SOC inițial al strategiei pe reguli (${fmt(r.cs.soc0 * 100, 1)} %). Calculul durează câteva secunde.</p>
      <div class="rand-optim"><label>s<sub>0</sub> <input id="ec-s" value="2,4" inputmode="decimal"></label><label>k<sub>p</sub> <input id="ec-kp" value="3" inputmode="decimal"></label>
      <button type="button" id="ec-run">Calculează ECMS</button><button type="button" id="ec-sweep">Tabelul s constant (k<sub>p</sub> = 0)</button></div>`;
    if (e && e.res) {
      const x = e.res;
      h += tabel(["Rezultat", "Strategia pe reguli", `ECMS (s<sub>0</sub> = ${fmt(e.s, 2)}, k<sub>p</sub> = ${fmt(e.kp, 1)})`], [
        ["Consum corectat [L/100 km]", fmt(r.cs.L100_corr, 2), fmt(x.L100_corr, 2)], ["SOC final", fmt(r.cs.soc_end * 100, 1) + " %", fmt(x.soc_end * 100, 1) + " %"],
        ["Timpul de funcționare al MAI", fmt(r.cs.t_ice / r.cs.n * 100, 1) + " %", fmt(x.t_ice / r.cs.n * 100, 1) + " %"],
        ["Diferența față de strategia pe reguli", "–", fmt((x.L100_corr / r.cs.L100_corr - 1) * 100, 1) + " %"]]);
      h += `<div class="grafice">${grafic({ titlu: "SOC: strategia pe reguli și ECMS", xEt: "timpul [s]", yEt: "SOC [%]", serii: [{ y: col(r.cs.hist, 8).map(v => v * 100), nume: "pe reguli" }, { y: x.soc.map(v => v * 100), nume: "ECMS", cls: 1 }], xMin: 0, xMax: 1800 })}</div>`;
    }
    if (e && e.sweep) h += "<br>" + tabel(["s", "Consum necorectat [L/100 km]", "SOC final [%]", "Consum corectat [L/100 km]"], e.sweep.map(q => [fmt(q[0], 1), fmt(q[1], 2), fmt(q[2] * 100, 1), fmt(q[3], 2)]));
    return h;
  }
  function bindOpt() {
    const run = $("#ec-run"); if (!run) return;
    const cfgT = () => { const c = H.buildCfg(S.hib); c.ems.soc_target = R.cs.soc0; return c; };
    run.addEventListener("click", () => {
      run.disabled = true; run.textContent = "Se calculează…";
      setTimeout(() => {
        const s = parseNum($("#ec-s").value), kp = parseNum($("#ec-kp").value);
        S.ecms = Object.assign(S.ecms || {}, { s: s, kp: kp, res: H.simulateECMS(cfgT(), V, s, R.cs.soc0, kp) }); render();
      }, 30);
    });
    $("#ec-sweep").addEventListener("click", e => {
      e.target.disabled = true; e.target.textContent = "Se calculează…";
      setTimeout(() => {
        const c = cfgT(), sw = [];
        for (const s of [2.0, 2.2, 2.4, 2.6, 2.8, 3.0]) { const x = H.simulateECMS(c, V, s, R.cs.soc0, 0); sw.push([s, x.L100, x.soc_end, x.L100_corr]); }
        S.ecms = Object.assign(S.ecms || {}, { sweep: sw }); render();
      }, 30);
    });
  }

  function tabTco() {
    const r = R, t = r.tco, k = S.cost, phev = S.hib.tip === "PHEV";
    let h = tabel([`Costul total de proprietate pe ${k.ani} ani [EUR] (§8.2)`, "Referința", S.hib.tip], [
      ["Achiziție − valoare reziduală", fmt(t.ref.P_net, 0), fmt(t.hib.P_net, 0)], ["Energie (combustibil + electricitate)", fmt(t.ref.C_en, 0), fmt(t.hib.C_en, 0)],
      ["Mentenanță", fmt(t.ref.C_m, 0), fmt(t.hib.C_m, 0)], ["Taxe", fmt(t.ref.C_t, 0), fmt(t.hib.C_t, 0)],
      ["<b>TCO</b>", "<b>" + fmt(t.ref.TCO, 0) + "</b>", "<b>" + fmt(t.hib.TCO, 0) + "</b>"],
      ["Combustibil consumat [L]", fmt(t.ref.L, 0), fmt(t.hib.L, 0)], ["Energie de la rețea [kWh]", "–", phev ? fmt(t.hib.kWh, 0) : "–"],
      ["Economia anuală față de referință [EUR/an]", "–", fmt(t.sav, 0)], ["Pragul de rentabilitate (§8.3)", "–", isFinite(t.be) ? fmt(t.be, 1) + " ani" : "nu se atinge"]]);
    // sensibilitate: kilometraj anual
    const km = [], a = [], b = [];
    for (let d = 5000; d <= 30000; d += 1000) {
      km.push(d / 1000);
      const base = { km_an: d, ani: k.ani, pret_L: k.pret_L, pret_kWh: k.pret_kWh, rezidual: k.rezidual };
      a.push(H.tco(Object.assign({}, base, { L100: r.ref.L100, pret: k.pret_ref, mentenanta: k.mentenanta_ref, taxe: k.taxe_ref })).TCO / 1000);
      b.push(H.tco(Object.assign({}, base, { L100: r.L, kWh100: phev ? r.ph.kWh100_comb : 0, pret: k.pret_ref + k.dP, mentenanta: k.mentenanta_ref * (1 - k.red_m), taxe: k.taxe_ref * (1 - k.red_t) })).TCO / 1000);
    }
    const pr = [], pa = [], pb = [];
    for (let pL = 1.2; pL <= 2.6 + 1e-9; pL += 0.1) {
      pr.push(pL);
      const base = { km_an: k.km_an, ani: k.ani, pret_L: pL, pret_kWh: k.pret_kWh, rezidual: k.rezidual };
      pa.push(H.tco(Object.assign({}, base, { L100: r.ref.L100, pret: k.pret_ref, mentenanta: k.mentenanta_ref, taxe: k.taxe_ref })).TCO / 1000);
      pb.push(H.tco(Object.assign({}, base, { L100: r.L, kWh100: phev ? r.ph.kWh100_comb : 0, pret: k.pret_ref + k.dP, mentenanta: k.mentenanta_ref * (1 - k.red_m), taxe: k.taxe_ref * (1 - k.red_t) })).TCO / 1000);
    }
    h += `<div class="grafice">${grafic({ titlu: "Sensibilitate: kilometrajul anual", xEt: "kilometraj anual [mii km]", yEt: "TCO [mii EUR]", serii: [{ x: km, y: a, nume: "referința" }, { x: km, y: b, nume: S.hib.tip }], xMin: 5, xMax: 30 })}
      ${grafic({ titlu: "Sensibilitate: prețul benzinei", xEt: "prețul benzinei [EUR/L]", yEt: "TCO [mii EUR]", serii: [{ x: pr, y: pa, nume: "referința" }, { x: pr, y: pb, nume: S.hib.tip }], xMin: 1.2, xMax: 2.6 })}</div>`;
    return h;
  }

  // ---------------------------------------------------------------- export
  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $("#btn-csv").addEventListener("click", () => {
    if (!R) return;
    const hdr = "regim;t [s];v [km/h];P_roata [kW];n_MAI [rot/min];M_MAI [N·m];P_MAI [kW];P_MG1/GEN el. [kW];P_ME/MG2 el. [kW];P_bat [kW];SOC [%];combustibil [g/s]";
    const line = (m, x) => [m, x[0], x[1], x[2], x[3], x[4], x[10], x[5], x[6], x[7], x[8] * 100, x[9]].map((v, i) => i ? String(+Number(v).toFixed(4)).replace(".", ",") : v).join(";");
    let rows = R.cs.hist.map(x => line("CS", x));
    if (R.ph) rows = R.ph.cd.hist.map(x => line("CD", x)).concat(rows);
    download("simulare_" + S.key + ".csv", hdr + "\n" + rows.join("\n"));
  });
  $("#btn-ciclu").addEventListener("click", () => download("wltc_clasa3b.csv", "t [s];v [km/h]\n" + V.map((v, i) => i + ";" + String(v).replace(".", ",")).join("\n")));
  $("#btn-print").addEventListener("click", () => window.print());

  initState(window.PCMAI_SHELL ? PCMAI_SHELL.exemplu("P2_HEV") : "P2_HEV"); if (window.PCMAI_SHELL) PCMAI_SHELL.restaureaza(S); renderForm(); compute();
})();
