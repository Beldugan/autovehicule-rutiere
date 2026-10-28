/* Modulul S – simulare de sistem: ciclul motorului (modelul 0D, variația turației și a începutului injecției), vehiculul pe ciclu
   (redarea simulării capitolului 5 cu fluxurile de putere, modelul dinamic cu conducător), lanțurile hibride MHEV P0 / P2 / serie /
   serie-paralel / PHEV, motocicleta (transmisia pe treaptă fixă, varianta electrică). Teste de referință cu valorile ghidului. */
import { grafic, lim, fx, tabelVerificare, concluzie, comutatorStudii, V3, turboColor } from "./scena.js";
import * as SI from "./sistem.js";
import { schemaFlux } from "./flux3d.js";
import { cilindruReal } from "./cilindru-real.js?v=8";
import { creeazaUI } from "./ui.js";

/** regimul pentru autovehiculul 3D: stop / pornire / acc / croaziera / franare / ev */
function regim(v, dv, Pw, termic, hib) { if (v < 0.3 && Math.abs(Pw) < 0.3) return "stop"; if (Pw < -0.3) return "franare"; if (hib && !termic) return "ev"; return dv > 0.02 ? (v < 4 ? "pornire" : "acc") : "croaziera"; }
const tipV3D = (arh, tipH) => (arh === "PS" ? "fh" : arh === "P0" ? "mh" : arh === "BEV" || arh === "LCV" ? "bev" : "phev");
const PRINC = new Set(["bat", "em", "ice", "gen", "mg1", "roti"]);
const U = creeazaUI("vizualizare a simulării interne");
const nr = (v, d = 2) => fx(v, d);
const yl = (arrs, cu0 = true) => { const l = lim(arrs.flat(), cu0); return { ymin: l[0], ymax: l[1] }; };
const serie = (xs, ys, culoare, o = {}) => Object.assign({ tip: "linie", pts: xs.map((x, j) => [x, ys[j]]), culoare }, o);
const rar = (a, k) => a.filter((_, j) => j % k === 0);

/* ================================================================== MAS / MAC: ciclul motorului (model 0D) */
function studiuCiclu0D(corp, ctx) {
  const r = ctx.R, D = r.date, X = window.PCMAI_EXTRA, mac = D.tip === "MAC";
  const vp0 = X.vibeImplicit(r);
  const par = mac
    ? `${U.camp("phi0", "începutul arderii φ<sub>0</sub> (° după PMI)", vp0[0][1], 0.5)}${U.camp("d1", "durata arderii rapide", vp0[0][2], 1, "°")}${U.camp("d2", "durata arderii difuzive", vp0[1][2], 1, "°")}${U.camp("m1", "exponentul Vibe m (rapidă)", 2, 0.1)}${U.camp("m2", "exponentul Vibe m (difuzivă)", 1, 0.1)}`
    : `${U.camp("phi0", "începutul arderii φ<sub>0</sub> (° după PMI)", vp0[0][1], 0.5)}${U.camp("d1", "durata arderii Δφ", vp0[0][2], 1, "°")}${U.camp("m1", "exponentul Vibe m", vp0[0][3], 0.1)}`;
  const parT = par + `${U.camp("eta_c", "randamentul arderii η<sub>c</sub>", mac ? 0.99 : 0.97, 0.005)}${U.camp("Tw", "temperatura pereților", 450, 10, "K")}${U.camp("n", "turația", D.n_P, 100, "rot/min")}${U.camp("pas", "pasul de integrare", 0.25, 0.05, "°RAC")}${U.bifa("wo", "transfer de căldură Woschni", true)}`;
  const z = U.zonaLucru(corp, "", parT), sc3 = z.sc3;
  const st = U.redare(z, 721, (k) => `${k}° RAC`, 2);
  const G = { pa: grafic(z.graf, "Presiunea în cilindru p(α): modelul 0D și ciclul de calcul"), T: grafic(z.graf, "Temperatura gazelor T(φ) și fracția arsă x<sub>b</sub>"), q: grafic(z.graf, "Viteza de degajare a căldurii și pierderea prin pereți"), pv: grafic(z.graf, "Diagrama p–V (logaritmică)") };
  let Z, pa, cil, Tmn, Tmx, mot, Z2;
  function calc() {
    const p = U.citeste(z.par);
    const vp = mac ? [[r.g_v, p.phi0, p.d1, p.m1], [1 - r.g_v, p.phi0, p.d2, p.m2]] : [[1, p.phi0, p.d1, p.m1]];
    const o = { eta_c: p.eta_c, T_w: p.Tw, pas: p.pas, woschni: p.wo, n: p.n };
    Z = X.model0D(r, vp, o); Z2 = X.model0D(r, vp, Object.assign({}, o, { pas: p.pas / 2 })); mot = X.model0D(r, vp, Object.assign({}, o, { eta_c: 1e-9 }));
    pa = X.pAlfa0D(r, Z);
    Tmn = Math.min(...Z.arr.map((q) => q.T)); Tmx = Z.T_max;
    U.SC.goleste(U.SC.grup); cil = cilindruReal({ D: r.D_r / 1000, S: r.S_r / 1000, L: r.S_r / 2 / D.lam / 1000, eps: D.eps, tip: D.tip, dist: { dsa: D.dsa, isa: D.isa, dse: D.dse, ise: D.ise } }); U.SC.grup.add(cil.G); sc3.vedere("sect", [-1, 0, 0]); sc3.incadreaza([1, 0.35, 0.45], [0, 0, 0]); { const t = sc3.ctl.target; sc3.camera.position.sub(t).multiplyScalar(1.1).add(t); sc3.ctl.update(); }
    U.SC.legenda("Temperatura gazelor", Tmn, Tmx, "K", (v) => nr(v, 0));
    const dW = Math.abs(Z.W_hp - Z2.W_hp) / Math.abs(Z2.W_hp) * 100, pcMot = mot.arr.reduce((a, q) => (Math.abs(q.phi) < Math.abs(a.phi) ? q : a)).p;
    z.rez.innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th>Mărime</th><th class="num">Model 0D</th><th class="num">Ciclul de calcul</th><th>Unitate</th></tr></thead><tbody>
      <tr><td>Presiunea maximă / unghiul ei</td><td class="num">${nr(Z.p_max, 3)} la ${nr(Z.phi_pmax, 1)}°</td><td class="num">${nr(r.p_max, 3)} (p<sub>z</sub> = ${nr(r.p_z, 3)})</td><td>MPa</td></tr>
      <tr><td>Temperatura maximă</td><td class="num">${nr(Z.T_max, 0)}</td><td class="num">${nr(r.T_z, 0)}</td><td>K</td></tr>
      <tr><td>Presiunea medie indicată p<sub>i</sub></td><td class="num">${nr(Z.p_i, 4)}</td><td class="num">${nr(r.p_i, 4)}</td><td>MPa</td></tr>
      <tr><td>Randamentul indicat η<sub>i</sub></td><td class="num">${nr(Z.eta_i, 4)}</td><td class="num">${nr(r.eta_i, 4)}</td><td>–</td></tr>
      <tr><td>Coeficientul de rotunjire echivalent p<sub>i,ÎP</sub>/p<sub>it</sub></td><td class="num">${nr(Z.p_i_hp / r.p_it, 3)}</td><td class="num">${nr(D.phi_r, 3)}</td><td>–</td></tr>
      <tr><td>Fracțiile arse 10 / 50 / 90 %</td><td class="num">${nr(Z.MFB10, 1)} / ${nr(Z.MFB50, 1)} / ${nr(Z.MFB90, 1)}</td><td class="num">—</td><td>° după PMI</td></tr>
      <tr><td>Căldura pierdută prin pereți (din Q<sub>i</sub>)</td><td class="num">${nr(Z.frac_Qw * 100, 1)}</td><td class="num">—</td><td>%</td></tr>
      <tr><td>Combustibil pe ciclu și cilindru</td><td class="num">${nr(Z.m_f * 1e6, 2)}</td><td class="num">—</td><td>mg</td></tr>
      <tr><td>Presiunea la PMI fără ardere (antrenat) / p<sub>c</sub></td><td class="num">${nr(pcMot, 3)}</td><td class="num">${nr(r.p_c, 3)}</td><td>MPa</td></tr>
      <tr><td>Lucrul de înaltă presiune: pas ${p.pas}° / ${p.pas / 2}°</td><td class="num" colspan="2">${nr(Z.W_hp * 1e3, 2)} J / ${nr(Z2.W_hp * 1e3, 2)} J · variație ${nr(dW, 3)} %</td><td></td></tr>
      </tbody></table></div><p class="nota">Modelul: monozonal, legea Vibe a degajării căldurii, transfer Woschni, proprietățile reale ale gazelor (aceleași tabele u, i ca în calculul clasic), integrare Heun. Încărcătura la PME din capitolul 2 (p<sub>a</sub>, T<sub>a</sub>); la altă turație se păstrează umplerea.</p>`;
    const dpi = (Z.p_i / r.p_i - 1) * 100;
    z.ver.innerHTML = `<h3>Concluzii</h3>${concluzie(dW < 1 ? "ok" : "av", `Lucrul indicat variază cu ${nr(dW, 3)} % la înjumătățirea pasului (criteriul: sub 1 %).`)}
      ${concluzie(Math.abs(pcMot / r.p_c - 1) < 0.1 ? "ok" : "av", `Fără ardere (cilindru antrenat), presiunea la PMI este ${nr(pcMot, 3)} MPa, față de p<sub>c</sub> = ${nr(r.p_c, 3)} MPa din capitolul 3 (politropa n<sub>1</sub> = ${nr(r.n_1, 4)}); diferența provine din transferul de căldură calculat local.`)}
      ${concluzie(Math.abs(dpi) < 10 ? "ok" : "av", `p<sub>i</sub> din modelul 0D diferă cu ${nr(dpi, 1)} % de calculul clasic; φ<sub>r</sub> = ${nr(D.phi_r, 2)} adoptat la capitolul 7 corespunde aici unui raport ${nr(Z.p_i_hp / r.p_it, 3)}.`)}
      ${concluzie(Z.MFB50 > 0 && Z.MFB50 < 15 ? "ok" : "av", `Centrul arderii (MFB50) este la ${nr(Z.MFB50, 1)}° după PMI${Z.MFB50 > 0 && Z.MFB50 < 15 ? ", în zona uzuală a randamentului maxim (≈ 5…12°)" : " – se recomandă corectarea avansului"}.`)}`;
  }
  function grafice() {
    const k = Math.floor(st.k), xt = [0, 90, 180, 270, 360, 450, 540, 630, 720];
    const diag = r.diagrama;
    G.pa.deseneaza({ xmin: 0, xmax: 720, xticks: xt, xlab: "α [°RAC] (PMI-ardere la 360°)", ylab: "p [MPa]", ymin: 0, ymax: Math.ceil(Math.max(Z.p_max, r.p_z) + 0.5),
      serii: [serie(diag.map((q) => q.alfa), diag.map((q) => q.p), 1, { punctat: true }), serie(pa.map((q) => q[0]), pa.map((q) => q[1]), 0), { tip: "pct", pts: [[k, pa[k][1]]], culoare: 0 }], legenda: [["model 0D", 0], ["ciclul de calcul", 1]] });
    const A = Z.arr, ph = A.map((q) => q.phi), j = Math.max(0, Math.min(A.length - 1, Math.round((k - 360 + 180) / (A[1].phi - A[0].phi))));
    G.T.deseneaza({ xmin: -180, xmax: 180, xticks: [-180, -90, 0, 90, 180], xlab: "φ [° față de PMI-ardere]", ylab: "T [K] · x_b·1000", ymin: 0, ymax: Math.ceil(Z.T_max / 500) * 500,
      serii: [serie(ph, A.map((q) => q.T), 1), serie(ph, A.map((q) => q.x * 1000), 0), ...(k >= 180 && k <= 540 ? [{ tip: "pct", pts: [[A[j].phi, A[j].T]], culoare: 1 }] : [])], legenda: [["T", 1], ["x_b × 1000", 0]] });
    G.q.deseneaza({ xmin: -40, xmax: 100, xlab: "φ [°]", ylab: "dQ/dφ [J/°]", ...yl([A.map((q) => q.dQb * 1e3), A.map((q) => q.dQw * 1e3)]),
      serii: [serie(ph, A.map((q) => q.dQb * 1e3), 4), serie(ph, A.map((q) => q.dQw * 1e3), 3)], legenda: [["degajarea căldurii", 4], ["pierderea prin pereți", 3]] });
    const Vs = A.map((q) => q.V * 1e6);
    G.pv.deseneaza({ xlog: true, ylog: true, xmin: Math.floor(Math.min(...Vs) * 0.9), xmax: Math.ceil(Math.max(...Vs) * 1.1), ymin: 0.05, ymax: Math.ceil(Z.p_max * 1.3), xlab: "V [cm³]", ylab: "p [MPa]",
      serii: [serie(diag.map((q) => q.V), diag.map((q) => q.p), 1, { punctat: true }), serie(Vs, A.map((q) => q.p), 0), serie(mot.arr.map((q) => q.V * 1e6), mot.arr.map((q) => q.p), 2, { gros: 1 })], legenda: [["0D cu ardere", 0], ["0D antrenat", 2], ["ciclul de calcul", 1]] });
  }
  z.par.addEventListener("change", () => { calc(); grafice(); });
  calc(); grafice();
  let tg = 0;
  return {
    pas(dt) {
      if (st.ruleaza) st.k = (st.k + dt * 60 * st.viteza / 2) % 720;
      const k = st.k, A = Z.arr, phi = k - 360; let T, xb = 0, dx = 0, inj = 0;
      if (phi >= -180 && phi <= 180) { const j = Math.max(0, Math.min(A.length - 1, Math.round((phi + 180) / (A[1].phi - A[0].phi)))); T = A[j].T; xb = A[j].x; dx = A[j].dQb / Math.max(1e-9, Z.Q_f) ; }
      else T = k < 180 ? r.T_a : D.T_r;
      if (mac) { const soi = Z.vp[0][1] - 4; inj = phi > soi - 6 && phi < soi + 30 ? Math.min(1, (phi - soi + 6) / 6) * (phi < soi + 24 ? 1 : (soi + 30 - phi) / 6) : 0; }
      cil.pozeaza(k, T, phi >= -180 && phi <= 180 ? xb : 0, dx, Tmn, Tmx, inj, turboColor);
      const pk = pa[Math.floor(k)][1];
      U.SC.hud(`α = <b>${Math.floor(k)}°</b> RAC · ${k < 180 ? "admisia" : k < 360 ? "comprimarea" : k < 540 ? "arderea și destinderea" : "evacuarea"}<br>p = <b>${nr(pk, 2)} MPa</b> · T = <b>${nr(T, 0)} K</b> · x<sub>b</sub> = <b>${nr(xb * 100, 0)} %</b>`);
      st.afis(); tg += dt; if (tg > 0.15) { tg = 0; grafice(); }
    },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; }
  };
}

/* ------------------------------------------------------------------ variația turației (un singur parametru) */
function studiuTuratie(corp, ctx) {
  const r = ctx.R, D = r.date, X = window.PCMAI_EXTRA;
  const z = U.zonaLucru(corp, "", `${U.camp("nmin", "turația minimă", Math.round(D.n_P * 0.3 / 100) * 100, 100, "rot/min")}${U.camp("nmax", "turația maximă", Math.round(D.n_P * 1.1 / 100) * 100, 100, "rot/min")}${U.camp("np", "numărul de puncte", 7, 1)}`, true);
  const G1 = grafic(z.graf, "Presiunea medie indicată și randamentul indicat în funcție de turație"), G2 = grafic(z.graf, "Fracțiunea de căldură pierdută prin pereți și presiunea maximă");
  function calc() {
    const p = U.citeste(z.par), ns = Array.from({ length: p.np }, (_, j) => p.nmin + (p.nmax - p.nmin) * j / (p.np - 1)), R = ns.map((n) => X.model0D(r, null, { n, pas: 0.5 }));
    z.rez.innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th class="num">n [rot/min]</th><th class="num">p<sub>i</sub> [MPa]</th><th class="num">η<sub>i</sub></th><th class="num">p<sub>max</sub> [MPa]</th><th class="num">Q<sub>w</sub>/Q<sub>i</sub> [%]</th><th class="num">P<sub>i</sub> motor [kW]</th></tr></thead><tbody>
      ${R.map((q, j) => `<tr><td class="num">${nr(ns[j], 0)}</td><td class="num">${nr(q.p_i, 4)}</td><td class="num">${nr(q.eta_i, 4)}</td><td class="num">${nr(q.p_max, 3)}</td><td class="num">${nr(q.frac_Qw * 100, 1)}</td><td class="num">${nr(q.p_i * 1e3 * q.Vh * 1e3 * D.i_cil * ns[j] / 120 / (D.tau === 2 ? 0.5 : 1) / 1, 1)}</td></tr>`).join("")}</tbody></table></div>
      <p class="nota">Se modifică numai turația; geometria, umplerea (p<sub>a</sub>, T<sub>a</sub>) și legea arderii (în grade RAC) rămân aceleași. P<sub>i</sub> = i·W<sub>i</sub>·n/120 (patru timpi).</p>`;
    const d = R[R.length - 1].frac_Qw < R[0].frac_Qw;
    z.ver.innerHTML = `<h3>Concluzii</h3>${concluzie(d ? "ok" : "av", `La turație mai mare, timpul de schimb de căldură pe ciclu scade: Q<sub>w</sub>/Q<sub>i</sub> trece de la ${nr(R[0].frac_Qw * 100, 1)} % la ${nr(R[R.length - 1].frac_Qw * 100, 1)} %, iar η<sub>i</sub> crește de la ${nr(R[0].eta_i, 4)} la ${nr(R[R.length - 1].eta_i, 4)}.`)}
      ${concluzie("nd", "Efectele turației asupra umplerii, frecării și arderii (durata în grade crește cu turația) nu sunt incluse – ele cer un model de schimb de gaze și o lege de ardere calibrată.")}`;
    G1.deseneaza({ xmin: p.nmin, xmax: p.nmax, xlab: "n [rot/min]", ylab: "p_i [MPa] · η_i", ...yl([R.map((q) => q.p_i), R.map((q) => q.eta_i)], false), serii: [serie(ns, R.map((q) => q.p_i), 0), serie(ns, R.map((q) => q.eta_i), 1), { tip: "pct", pts: ns.map((n, j) => [n, R[j].p_i]), culoare: 0 }], legenda: [["p_i", 0], ["η_i", 1]] });
    G2.deseneaza({ xmin: p.nmin, xmax: p.nmax, xlab: "n [rot/min]", ylab: "Q_w/Q_i [%] · p_max [MPa]", ...yl([R.map((q) => q.frac_Qw * 100), R.map((q) => q.p_max)]), serii: [serie(ns, R.map((q) => q.frac_Qw * 100), 3), serie(ns, R.map((q) => q.p_max), 4)], legenda: [["Q_w/Q_i", 3], ["p_max", 4]] });
  }
  z.par.addEventListener("change", calc); calc();
  return { raport() { return z.rez.innerHTML + z.ver.innerHTML; } };
}

/* ------------------------------------------------------------------ MAC: variația începutului injecției */
function studiuSOI(corp, ctx) {
  const r = ctx.R, X = window.PCMAI_EXTRA, vp0 = X.vibeImplicit(r);
  const z = U.zonaLucru(corp, "", `${U.camp("soi0", "SOI de bază (°RAC, PMS ardere = 360°)", 350, 1)}${U.camp("d", "pasul variației", 2, 0.5, "°")}`, true);
  const G = grafic(z.graf, "Presiunea în cilindru pentru trei începuturi ale injecției (aceeași cantitate de combustibil)");
  function calc() {
    const p = U.citeste(z.par), cazuri = [-1, 0, 1].map((s) => p.soi0 + s * p.d), R = cazuri.map((soi) => X.model0D(r, vp0.map((v) => [v[0], v[1] + (soi - p.soi0), v[2], v[3]]), { pas: 0.25 }));
    const mf = R[1].m_f * 1e6, conv = SI.testMAC(mf, r.date.i_cil, r.date.n_P);
    z.rez.innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th class="num">SOI [°RAC]</th><th class="num">înainte de PMS [°]</th><th class="num">p<sub>max</sub> [MPa]</th><th class="num">φ<sub>pmax</sub> [°]</th><th class="num">MFB50 [°]</th><th class="num">W<sub>i,ÎP</sub> [J]</th><th class="num">η<sub>i</sub></th></tr></thead><tbody>
      ${R.map((q, j) => `<tr><td class="num">${cazuri[j]}</td><td class="num">${360 - cazuri[j]}</td><td class="num">${nr(q.p_max, 3)}</td><td class="num">${nr(q.phi_pmax, 1)}</td><td class="num">${nr(q.MFB50, 1)}</td><td class="num">${nr(q.W_hp * 1e3, 1)}</td><td class="num">${nr(q.eta_i, 4)}</td></tr>`).join("")}</tbody></table></div>
      ${tabelVerificare([["Debitul pentru 20 mg, 4 cilindri, 2000 rot/min", "ṁ", SI.testMAC(20, 4, 2000).kgh, 4.8, "kg/h", 3, 1e-6], ["Durata unui grad la 2000 rot/min", "Δt", SI.testMAC().us, 83.333, "µs", 3, 1e-3], ["Injecția de 1 ms la 2000 rot/min", "Δα", SI.testMAC().inj1ms, 12, "°", 2, 1e-6]], "Conversii de verificare")}
      <p class="nota">Proiectul: ${nr(mf, 2)} mg/ciclu/cilindru, ${r.date.i_cil} cilindri, ${r.date.n_P} rot/min → ${nr(conv.kgh, 2)} kg/h în modelul 0D (capitolul 7: C<sub>h</sub> = ${nr(r.C_h, 2)} kg/h). Întârzierea la autoaprindere se consideră constantă la variația SOI (ipoteză).</p>`;
    z.ver.innerHTML = `<h3>Concluzii</h3>${concluzie("ok", `Avansarea injecției cu ${p.d}° crește p<sub>max</sub> de la ${nr(R[1].p_max, 2)} la ${nr(R[0].p_max, 2)} MPa și mută maximul spre PMS; întârzierea o reduce la ${nr(R[2].p_max, 2)} MPa.`)}
      ${concluzie("nd", "Emisiile (NO<sub>x</sub>, particule) și zgomotul de ardere nu se pot concluziona fără modele calibrate; tendința nu este universală.")}`;
    const A = R.map((q) => X.pAlfa0D(r, q));
    G.deseneaza({ xmin: 300, xmax: 480, xticks: [300, 330, 360, 390, 420, 450, 480], xlab: "α [°RAC]", ylab: "p [MPa]", ymin: 0, ymax: Math.ceil(Math.max(...R.map((q) => q.p_max)) + 1), serii: A.map((a, j) => serie(a.map((q) => q[0]), a.map((q) => q[1]), j)), legenda: cazuri.map((c, j) => [`SOI ${c}°`, j]) });
  }
  z.par.addEventListener("change", calc); calc();
  return { raport() { return z.rez.innerHTML + z.ver.innerHTML; } };
}

/* ================================================================== vehiculul: redarea simulării proiectului (capitolul 5) */
function seriiProiect(ctx) {
  const t = ctx.tip, R = ctx.R, S = ctx.S;
  if (t === "BEV" && R.r1 && R.r1.hist) return { arh: "BEV", hist: R.r1.hist.map((x) => ({ t: x[0], v: x[1], Pw: x[2], Pem: x[3], Pb: x[4], soc: x[5], Tb: x[6], I: x[7] })), titlu: "WLTC clasa 3b (capitolul 5)" };
  if (t === "LCV" && R.route && R.route.hist) return { arh: "LCV", hist: R.route.hist.map((x) => ({ t: x[0], v: x[1], Pw: x[2], Pem: x[3], Pb: x[4], soc: x[5], Tb: x[6] })), titlu: "traseul de livrări al temei (capitolul 5)" };
  if (t === "HEV" && R.cs && R.cs.hist) {
    const arh = S.hib.arch, H = (R.ph ? R.ph.cd.hist.concat(R.cs.hist.map((x) => [x[0] + R.ph.cd.hist.length].concat(x.slice(1)))) : R.cs.hist);
    return { arh: arh === "PS" ? "PS" : arh === "S" ? "S" : "P2", hist: H.map((x) => ({ t: x[0], v: x[1], Pw: x[2], nI: x[3], MI: x[4], P1: x[5], P2: x[6], Pb: x[7], soc: x[8], f: x[9], Pice: x[10] })), titlu: R.ph ? "WLTC: regimul CD urmat de CS (capitolele 5–6)" : "WLTC în regim CS (capitolele 5–6)" };
  }
  return null;
}
function puteriFlux(arh, q) {
  const Pf = q.f != null ? q.f * 43.5 : 0;
  if (arh === "BEV" || arh === "LCV") return { Pb: q.Pb, Pem: q.Pem, Pw: q.Pw };
  if (arh === "P2") return { Pf, Pice: q.Pice, Pem: q.P2, Pax: q.Pw / 0.95, Pw: q.Pw, Pb: q.Pb };
  if (arh === "S") return { Pf, Pice: q.Pice, Pgen: -q.P1, Pb: q.Pb, Pem: q.P2, Pw: q.Pw };
  if (arh === "PS") return { Pf, Pice: q.Pice, P1m: -q.P1, P1e: -q.P1, Pring: q.Pw, P2e: q.P2, Pb: q.Pb, Pw: q.Pw };
  return {};
}
function studiuRedare(corp, ctx) {
  const sp = seriiProiect(ctx);
  if (!sp) { corp.innerHTML = `<div class="mod-incomplet">Simularea capitolului 5 nu este disponibilă.</div>`; return null; }
  const H = sp.hist, N = H.length, hib = sp.arh === "P2" || sp.arh === "S" || sp.arh === "PS";
  const z = U.zonaLucru(corp, "", `<p class="nota" style="grid-column:1/-1">Redarea simulării ${sp.titlu}, calculată de motorul de calcul al îndrumarului (model cvasistatic, pas de 1 s), pe autovehiculul 3D al laboratoarelor: viteza, turația motorului termic, puterea bateriei, SOC și fluxurile de energie urmează rezultatele proiectului secundă cu secundă.</p>`, "v3d");
  const st = U.redare(z, N, (k) => `${H[k].t.toFixed(0)} s`, 5);
  const kc = () => H[Math.floor(st.k)], kp = () => H[Math.max(0, Math.floor(st.k) - 1)];
  U.vehicul(z.v3d, tipV3D(sp.arh), () => { const q = kc(), p = kp(); return { v: q.v / 3.6, rpm: hib ? (q.Pice > 0.3 ? Math.max(900, q.nI || 0) : 0) : 0, Pel: q.Pb, soc: q.soc, reg: regim(q.v / 3.6, (q.v - p.v) / 3.6, q.Pw, hib && q.Pice > 0.3, hib) }; });
  const G1 = grafic(z.graf, "Viteza vehiculului"), G2 = grafic(z.graf, hib ? "Puterile: la roată, termic, baterie" : "Puterile: la roată, motor, baterie"), G3 = grafic(z.graf, "Starea de încărcare a bateriei (SOC)");
  const t = H.map((q) => q.t), Ns = Math.max(1, Math.floor(N / 900));
  const tr = (k) => rar(H, Ns).map(k);
  let dist = 0, E = 0, fuel = 0; H.forEach((q, j) => { if (j) { const dt = q.t - H[j - 1].t; dist += q.v / 3.6 * dt; E += q.Pb * dt / 3600; fuel += (q.f || 0) * dt; } });
  z.rez.innerHTML = `<table class="tabel"><tbody><tr><td>Durata / distanța</td><td class="num">${nr(t[N - 1], 0)} s / ${nr(dist / 1000, 2)} km</td></tr><tr><td>Energia netă la bornele bateriei</td><td class="num">${nr(E, 3)} kWh (${nr(E / (dist / 1e5), 2)} kWh/100 km)</td></tr>
    <tr><td>SOC inițial → final</td><td class="num">${nr(H[0].soc * 100, 1)} % → ${nr(H[N - 1].soc * 100, 1)} %</td></tr>${hib ? `<tr><td>Combustibil</td><td class="num">${nr(fuel / 1000, 3)} kg (${nr(fuel / 1000 / 0.745 / (dist / 1e5), 2)} L/100 km, ρ = 0,745 kg/L)</td></tr>` : ""}</tbody></table>`;
  z.ver.innerHTML = hib ? `<h3>Concluzii</h3>${concluzie(Math.abs(H[N - 1].soc - H[0].soc) <= 0.005 ? "ok" : "av", `|SOC<sub>final</sub> − SOC<sub>inițial</sub>| = ${nr(Math.abs(H[N - 1].soc - H[0].soc), 4)} (criteriul charge-sustaining: ≤ 0,005)${Math.abs(H[N - 1].soc - H[0].soc) <= 0.005 ? "" : "; consumul se corectează cu ΔSOC (capitolul 6)"}.`)}` : "";
  const desen = () => { const k = Math.floor(st.k), q = H[k];
    G1.deseneaza({ xmin: 0, xmax: t[N - 1], xlab: "t [s]", ylab: "v [km/h]", ymin: 0, ymax: Math.ceil(Math.max(...H.map((h) => h.v)) / 10) * 10 + 10, serii: [serie(tr((q) => q.t), tr((q) => q.v), 0, { gros: 1.2 }), { tip: "pct", pts: [[q.t, q.v]], culoare: 1 }] });
    G2.deseneaza({ xmin: 0, xmax: t[N - 1], xlab: "t [s]", ylab: "P [kW]", ...yl([H.map((h) => h.Pw), H.map((h) => h.Pb)]), serii: [serie(tr((q) => q.t), tr((q) => q.Pw), 0, { gros: 1 }), ...(hib ? [serie(tr((q) => q.t), tr((q) => q.Pice), 1, { gros: 1 })] : []), serie(tr((q) => q.t), tr((q) => q.Pb), 2, { gros: 1 }), { tip: "linie", punctat: true, pts: [[q.t, -200], [q.t, 400]], culoare: 3 }], legenda: [["roată", 0], ...(hib ? [["termic", 1]] : []), ["baterie", 2]] });
    G3.deseneaza({ xmin: 0, xmax: t[N - 1], xlab: "t [s]", ylab: "SOC [%]", ...yl([H.map((h) => h.soc * 100)], false), serii: [serie(tr((q) => q.t), tr((q) => q.soc * 100), 0), { tip: "pct", pts: [[q.t, q.soc * 100]], culoare: 1 }] }); };
  desen();
  let tg = 0, kAnt = 0;
  return {
    pas(dt) {
      if (st.ruleaza) st.k = (st.k + dt * st.viteza) % (N - 1);
      const k = Math.floor(st.k);
      st.afis(); tg += dt; if (tg > 0.25 && k !== kAnt) { tg = 0; kAnt = k; desen(); }
    },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; }
  };
}

/* ------------------------------------------------------------------ vehiculul electric cu conducător (model dinamic, înainte) */
function dateVehiculElectric(ctx) {
  const R = ctx.R, c = ctx.tip === "LCV" ? (R.cFull || R.c) : R.c; if (!c) return null;
  const d0 = c.drives[0], em = d0.em, b = c.bat, E = window.EV || window.LCV;
  return { m: c.veh.m, Crr: c.veh.f, CdA: c.veh.CdA, rho: 1.202, Rw: c.veh.rw, eta_tr: 0.9, eta_reg: 0.7, E: b.E_nom, SOC0: 0.9, SOCmin: b.soc_min, SOCmax: b.soc_max, aux: c.veh.P_aux || 300,
    Pdis: (b.P_dis || 100) * 1e3, Pchg: (b.P_chg || 50) * 1e3, i: Array.isArray(d0.i) ? d0.i[0] : d0.i, T_em: em.T_max, P_em: em.P * 1e3, n_em: em.n_max,
    Uoc: b.U_nom, Rint: E && E.rPack ? E.rPack(b, 25) : 0.1, Q: b.np * b.Q_Ah, Imin: -1e4, Imax: 1e4 };
}
function studiuDinamic(corp, ctx, referinta) {
  const d0 = referinta ? Object.assign({}, referinta.d) : dateVehiculElectric(ctx);
  if (!d0) { corp.innerHTML = `<div class="mod-incomplet">Lipsesc datele vehiculului.</div>`; return null; }
  const moto = referinta && referinta.moto, arh = moto ? "MOTO_E" : ctx.tip === "LCV" ? "LCV" : "BEV";
  const par = `${U.camp("m", "masa", d0.m, 10, "kg")}${U.camp("Crr", "rezistența la rulare C<sub>rr</sub>", d0.Crr, 0.001)}${U.camp("CdA", "C<sub>x</sub>·A", d0.CdA, 0.01, "m²")}${U.camp("eta_tr", "η baterie → roată", d0.eta_tr, 0.01)}${U.camp("eta_reg", "η roată → baterie", d0.eta_reg, 0.01)}
    ${U.camp("aux", "auxiliari", d0.aux / 1e3, 0.1, "kW")}${U.camp("i", "raportul de transmitere", d0.i, 0.1)}${U.camp("T_em", "cuplul maxim EM", d0.T_em, 5, "N·m")}${U.camp("P_em", "puterea maximă EM", d0.P_em / 1e3, 1, "kW")}
    ${U.alege("cic", "ciclul", [["120", "ciclul didactic de 120 s"], ...(window.WLTC3B && !moto ? [["wltc", "WLTC clasa 3b"]] : [])], "120")}${U.bifa("rez", "baterie U<sub>oc</sub>–R<sub>int</sub>", !!referinta && !moto)}${U.bifa("reg", "recuperare activă", true)}`;
  const z = U.zonaLucru(corp, "", par, moto ? false : "v3d"), sc3 = z.sc3;
  let fl = null; const et = {};
  if (moto) { fl = schemaFlux(arh); U.SC.grup.add(fl.G); sc3.vedere("transp"); sc3.incadreaza([1.6, 1.2, 2.2], [0, 0.4, 0]); Object.entries(fl.N).forEach(([k, n]) => { if (PRINC.has(k)) et[k] = U.SC.eticheta(n.et); }); }
  else U.vehicul(z.v3d, "bev", () => { if (!s || !st) return null; const k = Math.floor(st.k), H = s.H, kp = Math.max(0, k - 1); return { v: H.v[k] / 3.6, rpm: 0, Pel: H.Pb[k], soc: H.soc[k], reg: regim(H.v[k] / 3.6, (H.v[k] - H.v[kp]) / 3.6, H.T[k] * H.v[k], false, false) }; });
  const G1 = grafic(z.graf, "Viteza cerută și realizată (conducător PI cu anticipare)"), G2 = grafic(z.graf, "Puterea bateriei și cuplul motorului"), G3 = grafic(z.graf, "SOC, curentul și tensiunea bateriei");
  let st = null, s = null, s2 = null, cyc = null, d = null;
  function calc() {
    const p = U.citeste(z.par); d = Object.assign({}, d0, { m: p.m, Crr: p.Crr, CdA: p.CdA, eta_tr: p.eta_tr, eta_reg: p.reg ? p.eta_reg : 1e-9, aux: p.aux * 1e3, i: p.i, T_em: p.T_em, P_em: p.P_em * 1e3 });
    if (p.cic === "wltc") { const V = window.WLTC3B; cyc = SI.ciclu(0.1, V.map((v, j) => [j, v])); } else cyc = SI.ciclu(0.1);
    s = SI.simElectricDinamic(d, cyc, { rezistiva: p.rez }); s2 = SI.simElectricDinamic(d, SI.ciclu(0.05, p.cic === "wltc" ? window.WLTC3B.map((v, j) => [j, v]) : undefined), { rezistiva: p.rez });
    const imp = SI.simElectricImpus(Object.assign({}, d, { Pdis: Infinity }), cyc), dE = Math.abs(s.E_kWh - s2.E_kWh) / Math.abs(s2.E_kWh) * 100;
    if (!st) st = U.redare(z, cyc.t.length, (k) => `${cyc.t[k].toFixed(1)} s`, p.cic === "wltc" ? 20 : 2); st.N = cyc.t.length; z.comenzi.querySelector('[data-a="t"]').max = cyc.t.length - 1; st.k = 0;
    const st50 = SI.testBEV50(d);
    z.rez.innerHTML = `<div class="tabel-container"><table class="tabel"><thead><tr><th>Mărime</th><th class="num">Model dinamic (conducător)</th><th class="num">Viteză impusă</th><th>Unitate</th></tr></thead><tbody>
      <tr><td>Distanța</td><td class="num">${nr(s.dist_km, 4)}</td><td class="num">${nr(imp.dist_km, 4)}</td><td>km</td></tr>
      <tr><td>Energia netă la bornele bateriei</td><td class="num">${nr(s.E_kWh, 4)}</td><td class="num">${nr(imp.E_kWh, 4)}</td><td>kWh</td></tr>
      <tr><td>Consumul</td><td class="num">${nr(s.e100, 2)}</td><td class="num">${nr(imp.e100, 2)}</td><td>kWh/100 km</td></tr>
      <tr><td>Abaterea maximă de viteză / pași limitați</td><td class="num">${nr(s.eMax, 2)} km/h / ${s.nLim}</td><td class="num">—</td><td></td></tr>
      <tr><td>Energia disipată de frânele mecanice</td><td class="num">${nr(s.Efr_kWh * 1000, 1)}</td><td class="num">${nr(imp.Efr_kWh * 1000, 1)}</td><td>Wh</td></tr>
      <tr><td>SOC final</td><td class="num">${nr(s.socF * 100, 3)}</td><td class="num">${nr(imp.socF * 100, 3)}</td><td>%</td></tr>
      <tr><td>Energia la pas 0,1 s / 0,05 s</td><td class="num" colspan="2">${nr(s.E_kWh, 5)} / ${nr(s2.E_kWh, 5)} kWh · variație ${nr(dE, 3)} %</td><td></td></tr>
      </tbody></table></div><p class="nota">Ecuația de mișcare: m·dv/dt = F<sub>motor</sub> − F<sub>frână</sub> − m·g·C<sub>rr</sub> − ρ·C<sub>x</sub>A·v²/2 (ρ = ${d.rho} kg/m³); cuplul EM limitat la min(T<sub>max</sub>, P<sub>max</sub>/ω); recuperarea limitată de cuplul EM și de puterea de încărcare, restul de frânare – frâna mecanică; inerțiile rotative neglijate.</p>`;
    const conc = [concluzie(dE < 1 ? "ok" : "av", `Energia variază cu ${nr(dE, 3)} % la înjumătățirea pasului (criteriul: sub 1 %).`),
      concluzie(s.eMax < 2 ? "ok" : "av", `Conducătorul urmărește ciclul cu o abatere maximă de ${nr(s.eMax, 2)} km/h${s.nLim ? `; limitele de cuplu/putere au fost atinse în ${s.nLim} pași` : ""}.`),
      concluzie("ok", `La ${referinta ? "mers stabilizat cu" : ""} 50 km/h: F = ${nr(st50.F, 3)} N, P<sub>roată</sub> = ${nr(st50.Pw / 1e3, 3)} kW, P<sub>bat</sub> = ${nr(st50.Pb / 1e3, 3)} kW, ${nr(st50.e, 3)} kWh/100 km.`)];
    if (!referinta && ctx.R && ctx.R.rw) conc.push(concluzie("nd", `Consumul pe WLTC din capitolul 5 (${nr(ctx.R.rw.e_grid || 0, 1)} kWh/100 km de la rețea, cu harta de pierderi a motorului) nu se compară direct cu acest model cu randamente constante.`));
    z.ver.innerHTML = `<h3>Concluzii</h3>${conc.join("")}${referinta ? referinta.extra(d) : ""}`;
    desen();
  }
  function desen() {
    const k = Math.floor(st.k), H = s.H, t = cyc.t, n = Math.max(1, Math.floor(t.length / 1200)), r = (a) => rar(a, n), tt = r(t);
    G1.deseneaza({ xmin: 0, xmax: t[t.length - 1], xlab: "t [s]", ylab: "v [km/h]", ymin: 0, ymax: Math.ceil(Math.max(...H.vr) / 10) * 10 + 10, serii: [serie(tt, r(H.vr), 1, { punctat: true }), serie(tt, r(H.v), 0, { gros: 1.4 }), { tip: "pct", pts: [[t[k], H.v[k]]], culoare: 0 }], legenda: [["cerută", 1], ["realizată", 0]] });
    G2.deseneaza({ xmin: 0, xmax: t[t.length - 1], xlab: "t [s]", ylab: "P [kW] · T/10 [N·m]", ...yl([H.Pb, H.T.map((v) => v / 10)]), serii: [serie(tt, r(H.Pb), 2, { gros: 1.2 }), serie(tt, r(H.T.map((v) => v / 10)), 4, { gros: 1 }), { tip: "linie", punctat: true, pts: [[t[k], -1e3], [t[k], 1e3]], culoare: 3 }], legenda: [["P baterie", 2], ["cuplul EM / 10", 4]] });
    const ok = H.I.some((v) => v !== 0);
    G3.deseneaza({ xmin: 0, xmax: t[t.length - 1], xlab: "t [s]", ylab: ok ? "SOC [%] · I/10 [A]" : "SOC [%]", ...yl([H.soc.map((v) => v * 100), ...(ok ? [H.I.map((v) => v / 10)] : [])], false), serii: [serie(tt, r(H.soc.map((v) => v * 100)), 0), ...(ok ? [serie(tt, r(H.I.map((v) => v / 10)), 1, { gros: 1 })] : [])], legenda: [["SOC", 0], ...(ok ? [["I / 10", 1]] : [])] });
  }
  z.par.addEventListener("change", calc); calc();
  let tg = 0;
  return {
    pas(dt) {
      if (st.ruleaza) st.k = (st.k + dt * st.viteza / cyc.dt) % (cyc.t.length - 1);
      const k = Math.floor(st.k), H = s.H, Pw = (H.T[k] * d.i / d.Rw) * H.v[k] / 3.6 / 1e3;
      if (fl) { fl.seteaza({ Pb: H.Pb[k], Pem: H.T[k] * H.n[k] * Math.PI / 30 / 1e3, Pw }); fl.anim(dt, st.ruleaza ? H.v[k] / 3.6 * Math.min(1, st.viteza / 5) : 0); }
      const val = { bat: H.Pb[k], inv: H.Pb[k], em: H.T[k] * H.n[k] * Math.PI / 30 / 1e3, red: Pw, roti: Pw };
      if (fl) Object.entries(fl.N).forEach(([kk, n]) => { if (!et[kk]) return; et[kk].pune(n.p.clone().add(V3(0, (n.h || 0.2) / 2 + 0.08, 0))); et[kk].text(`${n.et}${val[kk] != null ? ` <b>${nr(val[kk], 1)} kW</b>` : ""}`); });
      if (fl) U.SC.hud(`t = <b>${cyc.t[k].toFixed(1)} s</b> · v = <b>${nr(H.v[k], 1)}</b> / ${nr(H.vr[k], 1)} km/h · M<sub>EM</sub> = <b>${nr(H.T[k], 0)} N·m</b> · n = <b>${nr(H.n[k], 0)} rot/min</b><br>SOC = <b>${nr(H.soc[k] * 100, 2)} %</b>${H.I[k] ? ` · I = <b>${nr(H.I[k], 1)} A</b> · U = <b>${nr(H.U[k], 1)} V</b>` : ""}${H.Fbr[k] > 1 ? " · frâna mecanică activă" : ""}`);
      st.afis(); tg += dt; if (tg > 0.25) { tg = 0; desen(); }
    },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; }
  };
}

/* ------------------------------------------------------------------ testele de referință BEV (ghid §11–13) */
function extraBEV(d) {
  const b50 = SI.testBEV50(SI.DATE.BEV), bat = SI.testBaterie20(), inc = SI.testIncarcare(), c = SI.ciclu(0.1);
  const a = SI.simElectricImpus(SI.DATE.BEV, c), nr0 = SI.simElectricImpus(SI.DATE.BEV, c, { regen: false }), aux0 = SI.simElectricImpus(SI.DATE.BEV, c, { aux: 0 });
  return `<h3>Teste de referință (vehiculul de referință: 1600 kg, C<sub>rr</sub> 0,010, C<sub>x</sub>A 0,65 m², η 0,90 / 0,70)</h3>
    ${tabelVerificare([["Forța la 50 km/h", "F", b50.F, 233.759, "N", 3, 0.01], ["Puterea la roată", "P<sub>roată</sub>", b50.Pw / 1e3, 3.247, "kW", 3, 0.02], ["Puterea bateriei (1 kW auxiliari)", "P<sub>bat</sub>", b50.Pb / 1e3, 4.607, "kW", 3, 0.02],
      ["Consumul idealizat", "e", b50.e, 9.215, "kWh/100 km", 3, 0.01], ["Energia pentru 10 km", "E<sub>10</sub>", b50.E10, 0.9215, "kWh", 4, 0.01], ["Autonomia cu 42 kWh", "R", b50.R, 455.8, "km", 1, 0.05],
      ["Curentul la 20 kW (U<sub>oc</sub> 400 V, R 0,1 Ω)", "I", bat.I, 50.641, "A", 3, 0.01], ["Tensiunea la borne", "U", bat.U, 394.936, "V", 3, 0.001], ["Pierderea I²R", "P<sub>p</sub>", bat.Pp, 256.45, "W", 2, 0.01],
      ["Încărcarea 0,20 → 0,80 (60 kWh): energia stocată", "E<sub>s</sub>", inc.Es, 36, "kWh", 3, 1e-6], ["Energia din rețea (η 0,90)", "E<sub>r</sub>", inc.Er, 40, "kWh", 3, 1e-6], ["Timpul la 7,2 kW", "t", inc.t, 5.556, "h", 3, 0.01],
      ["Distanța ciclului de 120 s", "d", a.dist_km, 0.833333, "km", 6, 1e-4]])}
    <table class="tabel"><thead><tr><th>Ciclul de 120 s cu stoc ideal (viteză impusă)</th><th class="num">E<sub>bat</sub> [Wh]</th><th class="num">consum [kWh/100 km]</th></tr></thead><tbody>
    <tr><td>recuperare activă, auxiliari 1 kW</td><td class="num">${nr(a.E_kWh * 1e3, 2)}</td><td class="num">${nr(a.e100, 3)}</td></tr><tr><td>recuperare inactivă</td><td class="num">${nr(nr0.E_kWh * 1e3, 2)}</td><td class="num">${nr(nr0.e100, 3)}</td></tr>
    <tr><td>auxiliari 0 kW</td><td class="num">${nr(aux0.E_kWh * 1e3, 2)}</td><td class="num">${nr(aux0.e100, 3)}</td></tr></tbody></table>
    ${concluzie("ok", `Recuperarea economisește ${nr((nr0.E_kWh - a.E_kWh) * 1e3, 1)} Wh pe ciclu (${nr((1 - a.E_kWh / nr0.E_kWh) * 100, 1)} %); auxiliarii de 1 kW consumă ${nr((a.E_kWh - aux0.E_kWh) * 1e3, 1)} Wh în 120 s.`)}`;
}
function extraMotoE() {
  const t = SI.testMotoE();
  return `<h3>Teste de referință (motocicleta electrică didactică)</h3>${tabelVerificare([["Forța la 50 km/h", "F", t.F, 85.541, "N", 3, 0.01], ["Puterea la roată", "P<sub>roată</sub>", t.Pw / 1e3, 1.188, "kW", 3, 0.05], ["Puterea bateriei", "P<sub>bat</sub>", t.Pb / 1e3, 1.55, "kW", 3, 0.05], ["Consumul", "e", t.e, 3.1, "kWh/100 km", 3, 0.05], ["Autonomia cu 3,5 kWh", "R", t.R, 112.9, "km", 1, 0.05]])}
    ${concluzie("ok", `Puterea aerodinamică crește cu v³: la 80 km/h consumul devine ${nr(SI.testBEV50(SI.DATE.MOTO_E, 80).e, 2)} kWh/100 km, față de ${nr(t.e, 2)} la 50 km/h.`)}`;
}

/* ------------------------------------------------------------------ hibridele: strategiile pe ciclul de 120 s (nivelul A) */
function studiuHibrid(corp, ctx) {
  const arhP = ctx.S && ctx.S.hib ? ctx.S.hib.arch : "P2", tipP = ctx.S && ctx.S.hib ? ctx.S.hib.tip : "HEV";
  const implicit = tipP === "PHEV" ? "PHEV" : arhP;
  const z = U.zonaLucru(corp, "", `${U.alege("arh", "arhitectura", [["P0", "Mild hybrid 48 V – P0"], ["P2", "Full hybrid paralel P2"], ["S", "Hibrid serie"], ["PS", "Serie-paralel (planetar)"], ["PHEV", "Plug-in P2 (CD → CS)"]], implicit)}${U.camp("rep", "repetări ale ciclului", implicit === "S" ? 30 : 1, 1)}${U.camp("soc0", "SOC inițial", "", 0.01)}`, "v3d");
  const Gv = grafic(z.graf, "Viteza și modul de funcționare"), Gp = grafic(z.graf, "Puterile termicului, ale mașinii electrice și ale bateriei"), Gs = grafic(z.graf, "Starea de încărcare a bateriei");
  let st = null, fl = null, et = {}, R = null, arh = null, cyc = null, ser = null, arhV = null;
  function calc() {
    const p = U.citeste(z.par); arh = p.arh;
    if (arh !== arhV) { arhV = arh; U.vehicul(z.v3d, tipV3D(arh === "PHEV" ? "P2" : arh), () => { if (!ser || !st) return null; const k = Math.floor(st.k), kp = Math.max(0, k - 1), v = (ser.v[k] || 0) / 3.6, dv = ((ser.v[k] || 0) - (ser.v[kp] || 0)) / 3.6, Pw = (ser.Pice[k] || 0) + (ser.Pem[k] || 0);
      return { v, rpm: ser.n ? ser.n[k] : ser.Pice[k] > 0.3 ? 1100 + 45 * ser.Pice[k] : 0, Pel: ser.Pb[k], soc: ser.soc[k], reg: regim(v, dv, Pw, ser.Pice[k] > 0.3, true) }; }); }
    const D = SI.DATE[arh], o = Number.isFinite(p.soc0) ? { soc0: p.soc0 } : {};
    let ver = [], extra = "";
    if (arh === "PHEV") {
      R = SI.simPHEV(D, o); const R2 = SI.simPHEV(D, { soc0: 0.27 }), t = SI.testPHEV(D);
      ser = { t: R.S.t, v: R.S.t.map(() => null), Pice: R.S.Pice, Pem: R.S.Pem, Pb: R.S.Pem.map((x, j) => x), soc: R.S.soc, mod: R.S.mod };
      z.rez.innerHTML = `<table class="tabel"><thead><tr><th>Călătoria (ciclul de 120 s repetat până la regimul CS + 3 cicluri)</th><th class="num">SOC inițial ${nr(o.soc0 ?? D.SOC0, 2)}</th><th class="num">SOC inițial 0,27</th></tr></thead><tbody>
        <tr><td>Repetări / distanța</td><td class="num">${R.rep} / ${nr(R.dist_km, 2)} km</td><td class="num">${R2.rep} / ${nr(R2.dist_km, 2)} km</td></tr>
        <tr><td>Distanța în regim CD</td><td class="num">${nr(R.distCD_km, 2)} km</td><td class="num">—</td></tr>
        <tr><td>Electricitatea la borne</td><td class="num">${nr(R.Eb_kWh, 3)} kWh</td><td class="num">${nr(R2.Eb_kWh, 3)} kWh</td></tr>
        <tr><td>Energia din rețea pentru refacerea SOC (η 0,90)</td><td class="num">${nr(R.Eretea_kWh, 3)} kWh</td><td class="num">${nr(R2.Eretea_kWh, 3)} kWh</td></tr>
        <tr><td>Combustibilul</td><td class="num">${nr(R.fuel_kg, 3)} kg</td><td class="num">${nr(R2.fuel_kg, 3)} kg</td></tr>
        <tr><td>SOC final</td><td class="num">${nr(R.socF, 3)}</td><td class="num">${nr(R2.socF, 3)}</td></tr></tbody></table>`;
      ver = [["Energia disponibilă 0,90 → 0,25", "E", t.E, 9.75, "kWh", 2, 1e-6], ["Distanța electrică la 0,18 kWh/km", "d<sub>EV</sub>", t.km, 54.17, "km", 2, 0.01], ["Energia din rețea", "E<sub>r</sub>", t.Er, 10.833, "kWh", 3, 0.01], ["Timpul la 7,2 kW", "t", t.t, 1.505, "h", 3, 0.05]];
      extra = concluzie("ok", `Electricitatea și combustibilul se raportează separat: pornind plin, ${nr(R.distCD_km, 1)} km se parcurg în CD cu ${nr(R.EbCD_kWh, 2)} kWh (${nr(R.EbCD_kWh / R.distCD_km * 100, 1)} kWh/100 km pe acest ciclu); un consum unic în L/100 km fără contextul încărcării nu are sens.`);
    } else {
      cyc = SI.ciclu(arh === "S" ? 0.5 : 0.1, undefined, Math.max(1, Math.round(p.rep)));
      R = arh === "P0" ? SI.simMHEV(D, cyc) : arh === "P2" ? SI.simP2(D, cyc, o) : arh === "S" ? SI.simSerie(D, cyc, o) : SI.simPS(D, cyc, o);
      const H = R.H; ser = { t: cyc.t, v: H.v, Pice: H.Pice, Pem: arh === "PS" ? H.P2 : arh === "S" ? H.Pem : H.Pem, P1: H.P1 || H.Pgen, Pb: H.Pb, soc: H.soc, mod: H.mod || H.on.map((x) => (x ? "grup pornit" : "grup oprit")), n: H.n || H.nc || (H.on ? H.on.map((x) => (x ? 2500 : 0)) : null) };
      const R2 = arh === "P0" ? SI.simMHEV(D, SI.ciclu(0.05)) : arh === "P2" ? SI.simP2(D, SI.ciclu(0.05), o) : arh === "PS" ? SI.simPS(D, SI.ciclu(0.05), o) : null;
      const R1 = arh === "P0" ? SI.simMHEV(D, SI.ciclu(0.1)) : arh === "P2" ? SI.simP2(D, SI.ciclu(0.1), o) : arh === "PS" ? SI.simPS(D, SI.ciclu(0.1), o) : null;
      const dF = R2 ? Math.abs(R1.fuel_kg - R2.fuel_kg) / Math.max(1e-12, R2.fuel_kg) * 100 : null;
      const asist = arh === "P0" ? SI.simMHEV(D, cyc, { asistenta: false }) : null;
      z.rez.innerHTML = `<table class="tabel"><tbody><tr><td>Distanța</td><td class="num">${nr(R.dist_km, 3)} km</td></tr><tr><td>Combustibilul</td><td class="num">${nr(R.fuel_kg * 1000, 1)} g (${nr(R.kg100, 3)} kg/100 km)</td></tr>
        <tr><td>Energia netă la bornele bateriei</td><td class="num">${nr(R.Eb_kWh * 1000, 1)} Wh</td></tr><tr><td>SOC inițial → final</td><td class="num">${nr(R.soc0 ?? D.SOC0, 3)} → ${nr(R.socF, 3)}</td></tr>
        ${arh === "P0" ? `<tr><td>Curentul maxim al bateriei</td><td class="num">${nr(R.Imax, 1)} A (limita ${D.Ilim} A)</td></tr><tr><td>Fără asistență (același SOC inițial)</td><td class="num">${nr(asist.fuel_kg * 1000, 1)} g combustibil, SOC final ${nr(asist.socF, 3)}</td></tr>` : ""}
        ${arh === "P2" || arh === "S" ? `<tr><td>Porniri ale termicului</td><td class="num">${R.nPorniri}</td></tr>` : ""}${arh === "PS" ? `<tr><td>Pași cu limitele MG1/MG2 depășite / puterea DC maximă</td><td class="num">${R.viol} / ${nr(R.maxDC / 1e3, 1)} kW</td></tr>` : ""}
        ${dF != null ? `<tr><td>Combustibilul la pas 0,1 s / 0,05 s</td><td class="num">variație ${nr(dF, 3)} %</td></tr>` : ""}</tbody></table>`;
      if (arh === "P0") { const t = SI.testMHEV(); ver = [["Puterea electrică la 10 kW mecanic", "P<sub>el</sub>", t.Pe / 1e3, 11.111, "kW", 3, 0.01], ["Curentul fără auxiliari", "I", t.I, 231.48, "A", 2, 0.01], ["Curentul cu 0,5 kW auxiliari", "I<sub>t</sub>", t.It, 241.9, "A", 2, 0.01], ["Turația EM la 1000 rot/min", "n<sub>EM</sub>", t.nEM, 2500, "rot/min", 0, 1e-9], ["Puterea permisă de 50 N·m", "P", t.Plim / 1e3, 13.09, "kW", 2, 0.05]]; }
      if (arh === "P2") { const t = SI.testP2(); ver = [["Cuplul termicului (15 kW, 2000 rot/min)", "T<sub>MAI</sub>", t.Ti, 71.62, "N·m", 2, 0.01], ["Cuplul EM (5 kW)", "T<sub>EM</sub>", t.Te, 23.87, "N·m", 2, 0.02], ["Cuplul total", "T", t.T, 95.49, "N·m", 2, 0.01], ["Puterea electrică a EM", "P<sub>el</sub>", t.Pel / 1e3, 5.556, "kW", 3, 0.01], ["Debitul de combustibil", "ṁ", t.mf, 3.924, "kg/h", 3, 0.01]]; }
      if (arh === "S") { const t = SI.testSerie(); ver = [["Puterea DC a tracțiunii (20 kW la roți)", "P<sub>DC</sub>", t.Pdc / 1e3, 23.392, "kW", 3, 0.01], ["Cu auxiliari", "P<sub>DC</sub>+aux", t.Pdca / 1e3, 24.392, "kW", 3, 0.01], ["Puterea termicului (SOC constant)", "P<sub>MAI</sub>", t.Pice / 1e3, 27.102, "kW", 3, 0.01], ["Debitul de combustibil", "ṁ", t.mf, 7.091, "kg/h", 3, 0.01], ["Randamentul combustibil–roată", "η", t.eta, 0.246, "–", 3, 0.2]]; }
      if (arh === "PS") { ver = []; }
      const dS = Math.abs(R.socF - (R.soc0 ?? D.SOC0));
      extra = (dF != null ? concluzie(dF < 1 ? "ok" : "av", `Combustibilul variază cu ${nr(dF, 3)} % la înjumătățirea pasului (criteriul: sub 1 %).`) : "") +
        (arh === "P0" ? concluzie(R.Imax <= D.Ilim ? "ok" : "rau", `Curentul bateriei de 48 V rămâne sub limita de ${D.Ilim} A (maxim ${nr(R.Imax, 1)} A). P0 nu are mod EV independent de termic.`) : "") +
        (arh === "S" ? concluzie("ok", `Termostatul pornește grupul la SOC ≤ ${D.socOn} și îl oprește la SOC ≥ ${D.socOff}: ${R.nPorniri} porniri în ${Math.round(p.rep)} cicluri; ${R.nLim ? `limitarea tracțiunii în ${R.nLim} pași` : "fără limitarea tracțiunii"}.`) : "") +
        (arh === "PS" ? concluzie(R.viol ? "rau" : "ok", R.viol ? `Strategia adoptată depășește limitele MG1/MG2 în ${R.viol} pași – punctele nu sunt admisibile cinematic.` : "Toate punctele respectă relația Willis și limitele adoptate ale MG1 (±30 kW, ±60 N·m, 10 000 rot/min) și MG2 (±50 kW, ±150 N·m, 12 000 rot/min).") : "") +
        (arh !== "S" ? concluzie(dS <= 0.005 ? "ok" : "av", `|ΔSOC| = ${nr(dS, 4)} pe parcurs (criteriul charge-sustaining ≤ 0,005)${dS <= 0.005 ? "" : ": comparația de consum cere corectarea cu ΔSOC sau repetarea până la regimul periodic"}.`) : "");
    }
    z.ver.innerHTML = (ver.length ? `<h3>Repere analitice</h3>${tabelVerificare(ver)}` : "") + `<h3>Concluzii</h3>${extra}`;
    if (!st) st = U.redare(z, ser.t.length, (k) => `${(ser.t[k] || 0).toFixed(0)} s`, 5);
    st.N = ser.t.length; st.k = 0; z.comenzi.querySelector('[data-a="t"]').max = ser.t.length - 1;
    desen();
  }
  function desen() {
    const k = Math.floor(st.k), t = ser.t, n = Math.max(1, Math.floor(t.length / 1500)), r = (a) => rar(a, n), tt = r(t), xm = t[t.length - 1];
    if (ser.v[0] != null) Gv.deseneaza({ xmin: 0, xmax: xm, xlab: "t [s]", ylab: "v [km/h]", ymin: 0, ymax: 60, serii: [serie(tt, r(ser.v), 0, { gros: 1.2 }), { tip: "pct", pts: [[t[k], ser.v[k]]], culoare: 1 }], adnotari: [{ x: t[k], y: 55, text: ser.mod[k] || "" }] });
    else Gv.deseneaza({ xmin: 0, xmax: xm, xlab: "t [s]", ylab: "mod", ymin: 0, ymax: 1, serii: [], adnotari: [{ x: xm * 0.02, y: 0.5, text: `modul curent: ${ser.mod[k] || ""}` }] });
    Gp.deseneaza({ xmin: 0, xmax: xm, xlab: "t [s]", ylab: "P [kW]", ...yl([ser.Pice, ser.Pem, ser.Pb]), serii: [serie(tt, r(ser.Pice), 1, { gros: 1 }), serie(tt, r(ser.Pem), 0, { gros: 1 }), serie(tt, r(ser.Pb), 2, { gros: 1 }), { tip: "linie", punctat: true, pts: [[t[k], -500], [t[k], 500]], culoare: 3 }], legenda: [["termic (mecanic)", 1], ["EM / MG2", 0], ["baterie", 2]] });
    Gs.deseneaza({ xmin: 0, xmax: xm, xlab: "t [s]", ylab: "SOC", ...yl([ser.soc], false), serii: [serie(tt, r(ser.soc), 0), { tip: "pct", pts: [[t[k], ser.soc[k]]], culoare: 1 }] });
  }
  z.par.addEventListener("change", calc); calc();
  let tg = 0;
  return {
    pas(dt) {
      if (st.ruleaza) st.k = (st.k + dt * st.viteza / ((ser.t[1] - ser.t[0]) || 1)) % (ser.t.length - 1);
      const k = Math.floor(st.k), v = ser.v[k] || 0, Pf = ser.Pice[k] / 0.32;
      const P = arh === "P0" ? { Pf, Pice: ser.Pice[k], Pw: ser.Pice[k] + ser.Pem[k], Pem: ser.Pem[k], Pb: ser.Pb[k] }
        : arh === "S" ? { Pf, Pice: ser.Pice[k], Pgen: ser.P1[k], Pb: ser.Pb[k], Pem: ser.Pem[k], Pw: ser.Pem[k] * 0.85 }
        : arh === "PS" ? { Pf, Pice: ser.Pice[k], P1m: -ser.P1[k], P1e: -ser.P1[k], Pring: ser.Pice[k] * 0.72, P2e: ser.Pem[k], Pb: ser.Pb[k], Pw: ser.Pem[k] + ser.Pice[k] * 0.72 }
        : { Pf, Pice: ser.Pice[k], Pem: ser.Pem[k], Pax: ser.Pice[k] + ser.Pem[k], Pw: (ser.Pice[k] + ser.Pem[k]) * 0.95, Pb: ser.Pb[k] };
      void P;
      const val = { bat: ser.Pb[k], inv: ser.Pb[k], em: ser.Pem[k], ice: ser.Pice[k], rez: Pf, gen: ser.P1 ? ser.P1[k] : null, mg1: ser.P1 ? ser.P1[k] : null, roti: P.Pw, red: P.Pw };
      void val;
      st.afis(); tg += dt; if (tg > 0.3) { tg = 0; desen(); }
    },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; }
  };
}

/* ------------------------------------------------------------------ motocicleta: transmisia pe treaptă fixă */
function studiuMotoTransmisie(corp, ctx) {
  const R = ctx.R, S = ctx.S, d = S.d;
  const z = U.zonaLucru(corp, "", `${U.camp("n", "turația motorului", 6000, 100, "rot/min")}${U.camp("ip", "raportul primar", 3, 0.05)}${U.camp("ig", "raportul treptei", 1, 0.05)}${U.camp("i0", "transmisia finală", 3, 0.05)}${U.camp("rw", "raza dinamică a roții", 0.3, 0.005, "m")}`), sc3 = z.sc3;
  const fl = schemaFlux("MOTO_T"); U.SC.grup.add(fl.G); sc3.incadreaza([1.6, 1.1, 2.2], [0, 0.4, 0]); const et = {}; Object.entries(fl.N).forEach(([k, n]) => { if (PRINC.has(k)) et[k] = U.SC.eticheta(n.et); });
  const G = grafic(z.graf, "Viteza în fiecare treaptă a motocicletei proiectate în funcție de turație");
  let r = null;
  function calc() {
    const p = U.citeste(z.par); r = SI.testMotoTreapta(p.n, p.ip, p.ig, p.i0, p.rw);
    const rs = R.rs || [], rw = R.veh ? R.veh.rw : 0.3, nP = d.n_P;
    z.rez.innerHTML = tabelVerificare([["Raportul total", "i", r.it, 9, "–", 3, 1e-9], ["Turația roții", "n<sub>roată</sub>", r.nr, 666.667, "rot/min", 3, 1e-4], ["Viteza ideală (fără alunecare)", "v", r.v, 75.398, "km/h", 3, 1e-3]]) +
      `<table class="tabel"><thead><tr><th>Motocicleta proiectată: treapta</th>${rs.map((_, j) => `<th class="num">${j + 1}</th>`).join("")}</tr></thead><tbody><tr><td>Raportul total</td>${rs.map((x) => `<td class="num">${nr(x, 3)}</td>`).join("")}</tr>
      <tr><td>Viteza la n<sub>P</sub> = ${nP} rot/min [km/h]</td>${rs.map((x) => `<td class="num">${nr(nP / x * Math.PI / 30 * rw * 3.6, 1)}</td>`).join("")}</tr></tbody></table><p class="nota">Raza dinamică a roții din proiect: ${nr(rw, 3)} m; viteza maximă din capitolul 9: ${nr(R.vmax || 0, 0)} km/h.</p>`;
    z.ver.innerHTML = `<h3>Concluzii</h3>${concluzie("ok", "Randamentele se aplică cuplului și puterii, nu raportului cinematic: viteza la o turație dată depinde numai de rapoarte și de raza roții.")}${concluzie("nd", "Stabilitatea la înclinare, oscilațiile (shimmy/weave) și manevrabilitatea nu rezultă dintr-un model longitudinal.")}`;
    const ns = [0, d.n_max || nP * 1.15];
    G.deseneaza({ xmin: 0, xmax: ns[1], xlab: "n [rot/min]", ylab: "v [km/h]", ymin: 0, ymax: Math.ceil(ns[1] / rs[rs.length - 1] * Math.PI / 30 * rw * 3.6 / 20) * 20 || 200, serii: rs.map((x, j) => serie(ns, ns.map((n) => n / x * Math.PI / 30 * rw * 3.6), j % 6)), legenda: rs.map((_, j) => [`treapta ${j + 1}`, j % 6]) });
  }
  z.par.addEventListener("change", calc); calc();
  return { pas(dt) { const p = U.citeste(z.par), P = (R.car && R.car.M_max ? R.car.M_max : 40) * p.n * Math.PI / 30 / 1e3 * 0.6; fl.seteaza({ Pf: P / 0.3, Pice: P, Pw: P * 0.92 }); fl.anim(dt, r.v / 3.6);
      Object.entries(fl.N).forEach(([kk, n]) => { if (!et[kk]) return; et[kk].pune(n.p.clone().add(V3(0, (n.h || 0.2) / 2 + 0.06, 0))); }); et.roti.text(`roata <b>${nr(r.nr, 0)} rot/min</b> · <b>${nr(r.v, 1)} km/h</b>`); U.SC.hud(`n = <b>${p.n} rot/min</b> · i = <b>${nr(r.it, 2)}</b>`); },
    raport() { return z.rez.innerHTML + z.ver.innerHTML; } };
}

/* ------------------------------------------------------------------ montarea */
function listaStudii(ctx) {
  const t = ctx.tip;
  if (t === "MAS") return [{ id: "0d", nume: "Ciclul motorului – model 0D" }, { id: "n", nume: "Variația turației" }];
  if (t === "MAC") return [{ id: "0d", nume: "Ciclul motorului – model 0D" }, { id: "n", nume: "Variația turației" }, { id: "soi", nume: "Începutul injecției (SOI)" }];
  if (t === "BEV") return [{ id: "red", nume: "Proiectul pe WLTC – fluxurile de putere" }, { id: "din", nume: "Model dinamic cu conducător" }, { id: "ref", nume: "Teste de referință BEV" }];
  if (t === "LCV") return [{ id: "red", nume: "Tura zilnică – fluxurile de putere" }, { id: "din", nume: "Model dinamic cu conducător" }, { id: "ref", nume: "Teste de referință BEV" }];
  if (t === "HEV") return [{ id: "red", nume: "Proiectul pe WLTC – fluxurile de putere" }, { id: "hib", nume: "Arhitecturi și strategii (ciclul de 120 s)" }];
  if (t === "MOTO") return [{ id: "tr", nume: "Transmisia pe treaptă fixă" }, { id: "me", nume: "Varianta electrică" }];
  return [];
}
export default {
  monteaza(el, ctx, shell) {
    const sk = U.schelet(el, "Modulul S · simulare de sistem", "Propulsorul ca sistem de componente legate prin fluxuri de energie: ciclul motorului rezolvat pe unghi (model 0D), vehiculul pe ciclul de conducere cu bateria, mașinile electrice și strategia de gestionare a energiei; fiecare studiu are bilanțul și testul de convergență la înjumătățirea pasului.", "simulator intern · model 0D și model de vehicul");
    let id0 = null, c = ctx;
    function porneste(id) {
      id0 = id; U.studiu = null;
      const f = { "0d": (k) => studiuCiclu0D(k, c), n: (k) => studiuTuratie(k, c), soi: (k) => studiuSOI(k, c), red: (k) => studiuRedare(k, c), din: (k) => studiuDinamic(k, c),
        ref: (k) => studiuDinamic(k, c, { d: SI.DATE.BEV, extra: extraBEV }), hib: (k) => studiuHibrid(k, c), tr: (k) => studiuMotoTransmisie(k, c),
        me: (k) => studiuDinamic(k, c, { d: SI.DATE.MOTO_E, moto: true, extra: extraMotoE }) };
      try { U.studiu = f[id](sk.corp); if (U.studiu) U.studiu.gazda = sk.corp; shell.stareModul("S", "ok", "calculat"); }
      catch (e) { console.error(e); sk.corp.insertAdjacentHTML("beforeend", `<div class="alerta">Studiul nu s-a putut calcula: ${e.message}</div>`); shell.stareModul("S", "inv", "eroare de calcul"); }
    }
    const lista = listaStudii(c);
    comutatorStudii(sk.studii, lista, porneste, lista[0].id); porneste(lista[0].id);
    return { actualizeaza(n) { c = n; porneste(id0); }, arata(b) { U.activ = b; if (U.SC) U.SC.activ(b); } };
  },
  raport(ctx) {
    const t = ctx.tip, R = ctx.R;
    if ((t === "MAS" || t === "MAC") && window.PCMAI_EXTRA) { const Z = window.PCMAI_EXTRA.model0D(R);
      return `<table class="tabel"><tbody><tr><td>Model 0D: p<sub>max</sub> / unghiul</td><td>${nr(Z.p_max, 3)} MPa la ${nr(Z.phi_pmax, 1)}° după PMI</td></tr><tr><td>T<sub>max</sub></td><td>${nr(Z.T_max, 0)} K</td></tr><tr><td>p<sub>i</sub> (0D / calcul clasic)</td><td>${nr(Z.p_i, 4)} / ${nr(R.p_i, 4)} MPa</td></tr><tr><td>η<sub>i</sub> (0D / calcul clasic)</td><td>${nr(Z.eta_i, 4)} / ${nr(R.eta_i, 4)}</td></tr><tr><td>MFB10 / 50 / 90</td><td>${nr(Z.MFB10, 1)} / ${nr(Z.MFB50, 1)} / ${nr(Z.MFB90, 1)}°</td></tr><tr><td>Căldura pierdută prin pereți</td><td>${nr(Z.frac_Qw * 100, 1)} %</td></tr></tbody></table>`; }
    if (t === "BEV" || t === "LCV") { const d = dateVehiculElectric(ctx); if (!d) return ""; const s = SI.simElectricDinamic(d, SI.ciclu(0.1)), b = SI.testBEV50(d);
      return `<table class="tabel"><tbody><tr><td>Model dinamic, ciclul de 120 s: energia / consumul</td><td>${nr(s.E_kWh * 1e3, 1)} Wh / ${nr(s.e100, 2)} kWh/100 km</td></tr><tr><td>Abaterea maximă de viteză</td><td>${nr(s.eMax, 2)} km/h</td></tr><tr><td>50 km/h: F / P<sub>roată</sub> / P<sub>bat</sub></td><td>${nr(b.F, 1)} N / ${nr(b.Pw / 1e3, 2)} kW / ${nr(b.Pb / 1e3, 2)} kW</td></tr></tbody></table>`; }
    if (t === "HEV") { const p = SI.simP2(SI.DATE.P2, SI.ciclu(0.1)), sr = SI.testSerie(), w = SI.testP2();
      return `<table class="tabel"><tbody><tr><td>P2 pe ciclul de 120 s (nivel A)</td><td>${nr(p.fuel_kg * 1e3, 1)} g, SOC ${nr(p.soc0, 2)} → ${nr(p.socF, 3)}</td></tr><tr><td>P2 la 2000 rot/min, 15 + 5 kW</td><td>${nr(w.Ti, 2)} + ${nr(w.Te, 2)} = ${nr(w.T, 2)} N·m</td></tr><tr><td>Serie: puterea termicului la 20 kW la roți</td><td>${nr(sr.Pice / 1e3, 3)} kW, η = ${nr(sr.eta, 3)}</td></tr></tbody></table>`; }
    if (t === "MOTO") { const r = SI.testMotoTreapta(), e = SI.testMotoE(); return `<table class="tabel"><tbody><tr><td>Treapta fixă, i = 9, 6000 rot/min</td><td>${nr(r.v, 3)} km/h</td></tr><tr><td>Varianta electrică la 50 km/h</td><td>${nr(e.e, 2)} kWh/100 km, autonomie ${nr(e.R, 1)} km</td></tr></tbody></table>`; }
    return "";
  }
};
