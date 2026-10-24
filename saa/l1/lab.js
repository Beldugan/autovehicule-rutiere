/* SAA – Lucrarea 1. Sistemul de injecție de benzină multipunct – caracteristicile de funcționare (standul 1.4 MPI).
   Simulator: motorul K7J pe stand (machetă 3D), tester OBD cu date live și grafic, osciloscop cu 4 canale pe comenzile
   injectoarelor, cântarul rezervorului auxiliar cu cronometru; încălzire de la rece, regimuri stabilizate, consumatori,
   accelerare bruscă și decelerare cu întreruperea injecției. Fiecare student are injectoare, motor și calibrare proprii. */
"use strict";
const MD = MODELE["saa-l1"];
const { REG, CHEI_REG, REG_CONS, MINUTE } = MD;
const NUME_SCURT = { inj1: "Injector 1", inj2: "Injector 2", inj3: "Injector 3", inj4: "Injector 4", bat: "Tensiune baterie" };
const FAZA = { inj1: 0, inj2: 0.75, inj3: 0.25, inj4: 0.5 };           // ordinea de aprindere 1-3-4-2 (fracțiuni din ciclu)
const BAZA_REG = { ral: "ralanti", n1500: "1500", n2000: "2000", n2500: "2500", n3000: "3000" };

/* ------------------------------------------------------------------ starea standului */
const sim = {
  motor: false, ts: 0, tPorn: 0, T: 20, viteza: 5, reg: "ral", cons: false, n: 0, p: 101, ti: 0, tps: 0, t: 0,
  mod: "stab", tMod: 0, tReg: 0, n0: 3000, taiat: false, masa: 2500, cron: null, aparat: "obd",
  hist: [], ingheta: false, gc1: 2, gc2: 6,
  osc: { tdiv: 2e-3, ruleaza: true, c1: 2, c2: 4, buf: [], t0: 0, benzi: false,
    ch: [{ c: "inj1", on: true, vdiv: 10, poz: -3 }, { c: "inj3", on: false, vdiv: 10, poz: -3 }, { c: "inj4", on: false, vdiv: 10, poz: -3 }, { c: "inj2", on: false, vdiv: 10, poz: -3 }] }
};
function P() { return Cadru.P; }
function cheieReg() { return sim.reg + (sim.cons && (sim.reg === "ral" || sim.reg === "n2000") ? "c" : ""); }
function cald() { return sim.T >= 85; }
function stabil() { return sim.motor && sim.mod === "stab" && sim.tReg > 3 && Math.abs(sim.n - tintaN()) < 10; }
function tintaN() { return sim.reg === "ral" ? MD.ralanti(sim.T).n : REG[sim.reg].n; }
function tintaP() {
  const p = P(), k = cheieReg();
  if (sim.reg === "ral") return MD.presiune(p, k) + MD.ralanti(sim.T).dp;
  return REG[k] ? MD.presiune(p, k) : MD.presiune(p, sim.reg) + (sim.cons ? 3.5 : 0);
}
function tiStabil(n, p) { return MD.ti(P(), n, p, sim.T, sim.cons); }
function ubat() { return sim.motor ? MD.ubat(sim.cons) : 12.5; }
function debitGs() { if (!sim.motor || sim.ti <= 0) return 0; const m = Math.max(0, (sim.ti - MD.tmort(P(), ubat())) * P().qs); return m * MD.NCIL * sim.n / 2 / 60 / 1000; }

/* ------------------------------------------------------------------ semnalele injectoarelor */
function semnal(c, t) {
  const ub = ubat();
  if (c === "bat") return ub + (Math.random() - 0.5) * 0.04;
  if (!sim.motor || sim.n < 50 || sim.ti <= 0) return ub;
  const T = 120 / sim.n, ti = sim.ti / 1000, ph = (((t - FAZA[c] * T) % T) + T) % T;
  if (ph < ti) return 0.15;
  const dt = ph - ti;
  return ub + 52 * Math.exp(-dt / 0.00012) - 2.5 * Math.exp(-dt / 0.0006) * Math.cos(dt * 2 * Math.PI * 1800);
}

/* ------------------------------------------------------------------ dinamica motorului */
function pas(dtr) {
  const p = P(), dts = dtr * sim.viteza;                                  // timpul simulat (încălzire, consum, cronometru)
  sim.t += dtr;
  if (!sim.motor) { sim.n += (0 - sim.n) * (1 - Math.exp(-dtr / 0.4)); if (sim.n < 5) sim.n = 0; sim.ti = 0; sim.p += (101 - sim.p) * (1 - Math.exp(-dtr / 0.5)); return; }
  sim.ts += dts; sim.tPorn += dts;
  sim.T = MD.temperatura(p, sim.tPorn / 60);
  sim.tMod += dtr; sim.tReg += dtr;
  if (sim.mod === "acc") {
    const t = sim.tMod, nT = 3000;
    sim.n += (nT - sim.n) * (1 - Math.exp(-dtr / 0.45));
    sim.p = t < 0.3 ? 92 : sim.p + (tintaP() - sim.p) * (1 - Math.exp(-dtr / 0.35));
    const tb = tiStabil(sim.n, sim.p), tMax = MD.tiMax(p);
    sim.ti = t < 0.08 ? sim.tiAcc0 + (tMax - sim.tiAcc0) * t / 0.08 : t < 0.2 ? tMax : tb + (tMax - tb) * Math.exp(-(t - 0.2) / 0.35);
    sim.tps = 70;
    if (t > 3) { sim.mod = "stab"; sim.tReg = 0; }
  } else if (sim.mod === "dec") {
    const t = sim.tMod;
    sim.n = 800 + (sim.n0 - 800) * Math.exp(-t / p.tauN);
    sim.p += (19 - sim.p) * (1 - Math.exp(-dtr / 0.15)); sim.tps = 0;
    const d = MD.decel(p, sim.n0);
    sim.taiat = t >= p.tdel && d.taie && sim.n > p.nres;
    sim.ti = sim.taiat ? 0 : tiStabil(sim.n, MD.presiune(p, "ral"));
    if (sim.n < 820) { sim.mod = "stab"; sim.tReg = 0; sim.taiat = false; }
  } else {
    sim.n += (tintaN() - sim.n) * (1 - Math.exp(-dtr / 0.6));
    sim.p += (tintaP() - sim.p) * (1 - Math.exp(-dtr / 0.2));
    sim.ti = tiStabil(sim.n, sim.p);
    sim.tps = sim.reg === "ral" ? 1.2 : 3 + REG[sim.reg].n / 300;
  }
  // consumul din rezervorul auxiliar de pe cântar
  sim.masa -= debitGs() * dts;
  // graficul testerului (ultimele 8 s)
  if (!sim.ingheta) { sim.hist.push([sim.t, sim.n, sim.ti]); while (sim.hist.length && sim.hist[0][0] < sim.t - 8) sim.hist.shift(); }
  // cronometrul: măsurarea se anulează dacă regimul se schimbă
  if (sim.cron && sim.cron.k !== cheieReg()) { sim.cron = null; Cadru.mesajTemporar("Regimul s-a schimbat în timpul măsurării consumului – măsurarea a fost anulată.", "atentie"); }
}

/* ------------------------------------------------------------------ comenzile */
function pornire() {
  if (!$("#ck-exhaust").checked) return Cadru.mesajTemporar("Conectați exhaustarea înainte de pornire (NSSM).", "pericol");
  if (sim.motor) return;
  sim.motor = true; sim.reg = "ral"; sim.mod = "stab"; sim.tReg = 0; sim.n = sim.tPorn === 0 ? 1050 : 800;
  if (sim.tPorn === 0) sim.T = P().T0;
  actualizeazaPanou();
}
function opreste() { sim.motor = false; sim.cron = null; actualizeazaPanou(); }
function regim(k) {
  if (!sim.motor) return Cadru.mesajTemporar("Porniți întâi motorul.", "atentie");
  if (sim.mod !== "stab") return;
  sim.reg = k; sim.tReg = 0; actualizeazaPanou();
}
function accelerare() {
  if (!sim.motor) return Cadru.mesajTemporar("Porniți întâi motorul.", "atentie");
  if (!cald() || sim.reg !== "ral" || !stabil()) return Cadru.mesajTemporar("Accelerarea bruscă se face cu motorul cald, de la ralanti stabilizat.", "atentie");
  sim.tiAcc0 = sim.ti; sim.mod = "acc"; sim.tMod = 0; sim.reg = "n3000"; sim.ingheta = false; sim.cons = false;
  actualizeazaPanou();
}
function decelerare() {
  if (!sim.motor) return Cadru.mesajTemporar("Porniți întâi motorul.", "atentie");
  if (!cald() || sim.n < 2400 || sim.mod !== "stab") return Cadru.mesajTemporar("Decelerarea se face cu motorul cald, de la un regim stabilizat de cel puțin 2500 rot/min.", "atentie");
  sim.n0 = Math.round(sim.n); sim.mod = "dec"; sim.tMod = 0; sim.reg = "ral"; sim.ingheta = false;
  actualizeazaPanou();
}

/* ------------------------------------------------------------------ înregistrările */
function msgInreg(t) { $("#msg-inreg").textContent = t; }
const rot = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
function obd() { return { n: Math.round(sim.n), p: Math.round(sim.p), T: rot(sim.T, 1), ti: rot(sim.ti, 2) }; }
function inregIncalzire(e) {
  if (!sim.motor) return Cadru.mesajTemporar("Motorul nu funcționează.", "atentie");
  if (sim.reg !== "ral" || sim.mod !== "stab" || sim.cons) return Cadru.mesajTemporar("Corecția de încălzire se urmărește la ralanti, fără consumatori.", "atentie");
  if (sim.tReg < 2 || Math.abs(sim.n - tintaN()) > 12) return Cadru.mesajTemporar("Așteptați stabilizarea turației de ralanti.", "atentie");
  const tmin = sim.tPorn / 60, k = Math.round(tmin / 2) * 2;
  if (k > 14 || (k === 0 ? tmin > 0.7 : Math.abs(tmin - k) > 0.35)) return Cadru.mesajTemporar(`Citirile se fac din 2 în 2 minute (0, 2, …, 14 min). Acum: ${fmt(tmin, 1)} min – așteptați minutul ${Math.min(14, Math.ceil(tmin / 2) * 2)}.`, "atentie");
  const o = obd(), r = "m" + k;
  const ok = Cadru.inregistreaza(e, { log: { m: "inc", min: k, T: o.T, n: o.n, ti: o.ti }, celule: [{ t: "t11", r, c: "T", v: o.T.toFixed(1) }, { t: "t11", r, c: "n", v: String(o.n) }, { t: "t11", r, c: "ti", v: o.ti.toFixed(2) }] });
  if (ok) msgInreg(`Tabelul 1.1, minutul ${k}: T = ${fmt(o.T, 1)} °C, n = ${o.n} rot/min, t_i = ${fmt(o.ti, 2)} ms.`);
}
function verificaRegim() {
  if (!sim.motor) return "Motorul nu funcționează.";
  if (!cald()) return "Tabelul 1.2 se completează cu motorul cald (T ≥ 85 °C).";
  if (!stabil()) return "Așteptați stabilizarea regimului.";
  if (!REG[cheieReg()]) return "Regimul ales nu face parte din Tabelul 1.2 (consumatorii se pornesc doar la ralanti și la 2000 rot/min).";
  return "";
}
function inregRegim(e) {
  const m = verificaRegim(); if (m) return Cadru.mesajTemporar(m, "atentie");
  const k = cheieReg(), o = obd();
  const ok = Cadru.inregistreaza(e, { log: { m: "reg", k, n: o.n, p: o.p, ti: o.ti }, celule: [{ t: "t12", r: k, c: "n", v: String(o.n) }, { t: "t12", r: k, c: "p", v: String(o.p) }, { t: "t12", r: k, c: "tiD", v: o.ti.toFixed(2) }] });
  if (ok) msgInreg(`Tabelul 1.2 (${REG[k].et}): n = ${o.n} rot/min, p = ${o.p} kPa, t_i OBD = ${fmt(o.ti, 2)} ms.`);
}
function inregOsc(e) {
  const m = verificaRegim(); if (m) return Cadru.mesajTemporar(m, "atentie");
  if (sim.osc.ruleaza) return Cadru.mesajTemporar("Opriți imaginea (STOP), puneți cursorul A pe frontul descendent (începutul comenzii) și cursorul B pe vârful de autoinducție.", "atentie");
  const dt = Math.abs(sim.osc.c2 - sim.osc.c1) * sim.osc.tdiv * 1000, k = cheieReg();
  const ok = Cadru.inregistreaza(e, { log: { m: "tio", k, v: rot(dt, 2) }, celule: [{ t: "t12", r: k, c: "tiO", v: rot(dt, 2).toFixed(2) }] });
  if (ok) msgInreg(`Tabelul 1.2 (${REG[k].et}): t_i osciloscop = ${fmt(dt, 2)} ms.`);
}
function cronometru() {
  if (sim.cron) { // stop
    const c = sim.cron, dt = sim.ts - c.t0, mg = c.m0 - sim.masa; sim.cron = null;
    sim.ultimaMas = { k: c.k, dt: rot(dt, 1), mg: rot(Math.floor(mg * 10) / 10, 1), n: Math.round(sim.n), ti: rot(sim.ti, 2) };
    actualizeazaPanou(); return;
  }
  const m = verificaRegim(); if (m) return Cadru.mesajTemporar(m, "atentie");
  if (!REG_CONS.includes(cheieReg())) return Cadru.mesajTemporar("Consumul se măsoară la ralanti, 2000 și 3000 rot/min (fără consumatori).", "atentie");
  sim.cron = { k: cheieReg(), t0: sim.ts, m0: Math.floor(sim.masa * 10) / 10 }; sim.ultimaMas = null; actualizeazaPanou();
}
function inregConsum(e) {
  const u = sim.ultimaMas; if (!u) return Cadru.mesajTemporar("Faceți întâi o măsurare: START, așteptați 60…120 s, STOP.", "atentie");
  if (u.dt < 60) return Cadru.mesajTemporar("Durata măsurării trebuie să fie de cel puțin 60 s (rezoluția cântarului).", "atentie");
  const ok = Cadru.inregistreaza(e, { log: { m: "cons", k: u.k, dt: u.dt, mg: u.mg, n: u.n, ti: u.ti }, celule: [{ t: "t13", r: u.k, c: "n", v: String(u.n) }, { t: "t13", r: u.k, c: "ti", v: u.ti.toFixed(2) }, { t: "t13", r: u.k, c: "dt", v: u.dt.toFixed(1) }, { t: "t13", r: u.k, c: "m", v: u.mg.toFixed(1) }] });
  if (ok) msgInreg(`Tabelul 1.3 (${REG[u.k].et}): m = ${fmt(u.mg, 1)} g în Δt = ${fmt(u.dt, 1)} s.`);
}
function valGrafic(c) { const h = sim.hist; if (!h.length) return null; const t0 = h[h.length - 1][0] - 8, t = t0 + 8 * c / 10; let b = h[0]; for (const x of h) { if (x[0] <= t) b = x; else break; } return { t, n: b[1], ti: b[2] }; }
function inregTr(e, k) {
  if (!sim.ingheta) return Cadru.mesajTemporar("Înghețați graficul testerului după manevră, apoi plasați cursoarele.", "atentie");
  const a = valGrafic(sim.gc1), b = valGrafic(sim.gc2); if (!a) return;
  let v; if (k === "timax") v = rot(a.ti, 2); else if (k === "ncut" || k === "nres") v = Math.round(a.n); else v = rot(Math.abs(b.t - a.t), 2);
  const et = { timax: "t_i maxim la accelerare", ncut: "turația de întrerupere", nres: "turația de reluare", dur: "durata întreruperii" }[k];
  const ok = Cadru.inregistreaza(e, { log: { m: "tr", k, v, n0: sim.n0 }, celule: [{ t: "t14", r: k, c: "v", v: String(v) }] });
  if (ok) msgInreg(`Tabelul 1.4: ${et} = ${String(v).replace(".", ",")} ${k === "timax" ? "ms" : k === "dur" ? "s" : "rot/min"}.`);
}

/* ------------------------------------------------------------------ panourile */
function actualizeazaPanou() {
  $$("[data-aparat]").forEach(b => b.setAttribute("aria-pressed", b.dataset.aparat === sim.aparat ? "true" : "false"));
  $$(".panou-aparat").forEach(p => p.hidden = p.dataset.p !== sim.aparat);
  $$("[data-reg]").forEach(b => b.setAttribute("aria-pressed", b.dataset.reg === sim.reg && sim.motor ? "true" : "false"));
  $("#btn-cons").textContent = sim.cons ? "Consumatori: PORNIȚI (faruri, ventilator)" : "Consumatori: opriți";
  $("#btn-cron").textContent = sim.cron ? "■ STOP cronometru" : "▶ START măsurare consum";
  $("#btn-ing").textContent = sim.ingheta ? "Reia graficul" : "Îngheață graficul";
}
function liveOBD() {
  const el = $("#obd-live"); if (!el || el.getClientRects().length === 0) return;
  const on = sim.motor, r = (n, v, u) => `<tr><td>${n}</td><td><b>${v}</b></td><td>${u}</td></tr>`, o = obd();
  el.innerHTML = `<table class="tabel x431"><tbody>${r("Turație motor", on ? o.n : 0, "rot/min")}${r("Presiune colector (MAP)", o.p, "kPa")}${r("Temp. lichid răcire", fmt(sim.motor || sim.tPorn ? sim.T : P().T0, 1), "°C")}${r("Temp. aer admis", "27", "°C")}
    ${r("Poziție clapetă", fmt(sim.tps, 1), "%")}${r("Timp de injecție", on ? fmt(o.ti, 2) : "0,00", "ms")}${r("Tensiune baterie", fmt(ubat(), 1), "V")}${r("Injecție", !on ? "—" : sim.taiat ? "<span class='rau-t'>ÎNTRERUPTĂ</span>" : "activă", "")}${r("Buclă λ", on && cald() ? "închisă" : "deschisă (încălzire)", "")}</tbody></table>`;
}
function deseneazaGraficOBD() {
  const cv = $("#cv-obd"); if (!cv || !cv.getClientRects().length) return;
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = 190;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + "px"; }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = "#0f1720"; g.fillRect(0, 0, W, H);
  const m = { l: 34, r: 30, t: 10, b: 18 }, w = W - m.l - m.r, h = H - m.t - m.b, h0 = sim.hist, tEnd = h0.length ? h0[h0.length - 1][0] : 0;
  g.strokeStyle = "rgba(255,255,255,.08)"; for (let i = 0; i <= 8; i++) { const x = m.l + w * i / 8; g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke(); }
  for (let j = 0; j <= 4; j++) { const y = m.t + h * j / 4; g.beginPath(); g.moveTo(m.l, y); g.lineTo(m.l + w, y); g.stroke(); }
  const X = t => m.l + (t - (tEnd - 8)) / 8 * w, Yn = n => m.t + (1 - n / 4000) * h, Yt = v => m.t + (1 - v / 10) * h;
  g.lineWidth = 1.6;
  g.strokeStyle = "#4fd6ff"; g.beginPath(); h0.forEach((x, i) => i ? g.lineTo(X(x[0]), Yn(x[1])) : g.moveTo(X(x[0]), Yn(x[1]))); g.stroke();
  g.strokeStyle = "#ffb020"; g.beginPath(); h0.forEach((x, i) => i ? g.lineTo(X(x[0]), Yt(x[2])) : g.moveTo(X(x[0]), Yt(x[2]))); g.stroke();
  g.font = "10px system-ui"; g.fillStyle = "#4fd6ff"; g.fillText("n [rot/min]", 4, 10); ["4000", "2000", "0"].forEach((t, i) => g.fillText(t, 2, m.t + h * i / 2 + 4));
  g.fillStyle = "#ffb020"; g.textAlign = "right"; g.fillText("tᵢ [ms]", W - 2, 10); ["10", "5", "0"].forEach((t, i) => g.fillText(t, W - 4, m.t + h * i / 2 + 4)); g.textAlign = "left";
  g.fillStyle = "#9fb3c2"; g.fillText("ultimele 8 s", m.l + 4, H - 4);
  if (sim.ingheta) {
    [sim.gc1, sim.gc2].forEach((c, k) => { const x = m.l + w * c / 10; g.strokeStyle = k ? "#c9b6ff" : "#ff8a5a"; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke(); g.setLineDash([]); g.fillStyle = g.strokeStyle; g.fillText(k ? "B" : "A", x + 3, m.t + 10); });
    const a = valGrafic(sim.gc1), b = valGrafic(sim.gc2);
    $("#obd-cit").innerHTML = a ? `A: n = <b>${Math.round(a.n)}</b> rot/min · t<sub>i</sub> = <b>${fmt(a.ti, 2)}</b> ms &nbsp;|&nbsp; B: n = <b>${Math.round(b.n)}</b> · t<sub>i</sub> = <b>${fmt(b.ti, 2)}</b> ms &nbsp;|&nbsp; Δt = <b>${fmt(Math.abs(b.t - a.t), 2)}</b> s` : "";
  } else $("#obd-cit").textContent = "Graficul rulează. După manevră apăsați „Îngheață graficul” și trageți cursoarele A și B.";
}
function legaGraficOBD() {
  const cv = $("#cv-obd"); let trag = null;
  const poz = e => { const r = cv.getBoundingClientRect(); return clamp((e.clientX - r.left - 34) / (r.width - 64) * 10, 0, 10); };
  cv.addEventListener("pointerdown", e => { if (!sim.ingheta) return; const d = poz(e); trag = Math.abs(d - sim.gc1) < Math.abs(d - sim.gc2) ? "gc1" : "gc2"; sim[trag] = d; cv.setPointerCapture(e.pointerId); deseneazaGraficOBD(); });
  cv.addEventListener("pointermove", e => { if (trag) { sim[trag] = poz(e); deseneazaGraficOBD(); } });
  cv.addEventListener("pointerup", () => trag = null);
}
function cantarSVG() {
  const el = $("#cantar"); if (!el) return;
  const mas = Math.floor(sim.masa * 10) / 10, c = sim.cron, u = sim.ultimaMas, tcr = c ? sim.ts - c.t0 : u ? u.dt : 0;
  const niv = clamp(sim.masa / 2500, 0, 1);
  el.innerHTML = `<svg viewBox="0 0 320 170" aria-label="Rezervorul auxiliar pe cântar și cronometrul">
    <defs><linearGradient id="cnt" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e7eaee"/><stop offset="1" stop-color="#b6bdc5"/></linearGradient>
    <linearGradient id="benz" x1="0" x2="1"><stop offset="0" stop-color="#e8c25a"/><stop offset="1" stop-color="#c99a2e"/></linearGradient></defs>
    <rect x="18" y="20" width="96" height="100" rx="8" fill="rgba(220,235,245,.35)" stroke="#7b8794" stroke-width="2"/>
    <rect x="21" y="${23 + 94 * (1 - niv)}" width="90" height="${94 * niv}" rx="5" fill="url(#benz)" opacity=".9"/>
    <rect x="52" y="8" width="30" height="14" rx="3" fill="#c62828"/><path d="M67 8 C 67 -10, 130 -6, 140 10" stroke="#222" stroke-width="3" fill="none"/>
    <text x="66" y="75" text-anchor="middle" font-size="10" fill="#3a2a00" font-weight="700">benzină</text>
    <rect x="6" y="122" width="122" height="18" rx="4" fill="url(#cnt)" stroke="#6b7480"/><rect x="20" y="140" width="94" height="22" rx="4" fill="#2a2d31"/>
    <rect x="26" y="143" width="82" height="16" rx="2" fill="#b9c8a8"/><text x="104" y="156" text-anchor="end" font-family="'Courier New',monospace" font-weight="700" font-size="14" fill="#1c2416">${fmt(mas, 1)} g</text>
    <rect x="150" y="22" width="160" height="120" rx="12" fill="#1f2328" stroke="#000"/>
    <text x="230" y="44" text-anchor="middle" font-size="11" fill="#9fb3c2">Cronometru (timp ×${sim.viteza})</text>
    <rect x="164" y="54" width="132" height="40" rx="5" fill="#0d1a12"/><text x="230" y="83" text-anchor="middle" font-family="'Courier New',monospace" font-size="26" font-weight="700" fill="${c ? "#7dff9a" : "#d0d8e0"}">${fmt(tcr, 1)} s</text>
    <text x="230" y="112" text-anchor="middle" font-size="11" fill="#d0d8e0">${c ? `m₀ = ${fmt(c.m0, 1)} g · regim ${REG[c.k].et}` : u ? `Δm = ${fmt(u.mg, 1)} g · ${REG[u.k].et}` : "START / STOP"}</text>
    <text x="230" y="130" text-anchor="middle" font-size="10" fill="#9fb3c2">rezoluția cântarului 0,1 g</text>
  </svg>`;
}

/* ------------------------------------------------------------------ osciloscopul (4 canale) */
const TDIV = [0.5e-3, 1e-3, 2e-3, 5e-3, 10e-3, 20e-3, 50e-3, 0.1, 0.2, 0.5, 1];
const VDIV = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
function fmtT(s) { return s >= 1 ? fmt(s, 2) + " s" : s >= 1e-3 ? fmt(s * 1000, s >= 0.1 ? 0 : 2) + " ms" : fmt(s * 1e6, 0) + " µs"; }
const CULORI_CH = ["#ffe14d", "#4fd6ff", "#ff6bd6", "#6dff8e"];
const POZDEF = {};
const VDEF = { inj1: 10, inj2: 10, inj3: 10, inj4: 10, bat: 5 };
function achizitie() {
  const o = sim.osc, N = 1200, T = o.tdiv * 10;
  let t0 = sim.t - T;
  const c1 = o.ch[0].c;
  if (/^inj/.test(c1) && sim.motor && sim.n > 50 && o.tdiv < 0.1) { const per = 120 / sim.n, of = FAZA[c1] * per; t0 = Math.floor((sim.t - T - of) / per) * per + of - o.tdiv; }   // declanșare pe comanda injectorului de pe CH1
  o.buf = o.ch.map(ch => { if (!ch.on) return null; const b = new Float32Array(N); for (let i = 0; i < N; i++) b[i] = semnal(ch.c, t0 + T * i / (N - 1)); return b; });
  o.t0 = t0;
}
function oscPeEcran(cv) { const fe = document.fullscreenElement || document.webkitFullscreenElement; return (fe && fe.contains(cv)) || !!cv.closest(".ecran-plin"); }
function deseneazaOsc() {
  const cv = $("#cv-osc"); if (!cv || !cv.getClientRects().length) return;
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth;
  const o0 = sim.osc, nAct = o0.ch.filter(c => c.on).length, benzi = o0.benzi && nAct > 1;
  const Hmin = benzi ? 60 + 135 * nAct : (+cv.dataset.h || 320);       // canale separate: fiecare canal are banda lui (≈ 135 px)
  const H = oscPeEcran(cv) ? clamp(Math.round(window.innerHeight - cv.getBoundingClientRect().top - 110 + (cv.closest(".card") || cv).scrollTop), Hmin, 1400) : Hmin;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + "px"; }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const o = sim.osc, m = { l: 22, r: 8, t: 8, b: 8 }, w = W - m.l - m.r, h = H - m.t - m.b;
  g.fillStyle = "#0b1410"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(120,200,160,.18)"; g.lineWidth = 1;
  for (let i = 0; i <= 10; i++) { const x = m.l + w * i / 10; g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke(); }
  // benzile: în modul „canale separate” fiecare canal activ are banda lui, cu 8 diviziuni proprii
  const activ = o.ch.map((c, k) => c.on ? k : -1).filter(k => k >= 0), nb = benzi ? activ.length : 1;
  const banda = k => { const b = benzi ? activ.indexOf(k) : 0, hb = h / nb; return { y: m.t + b * hb, h: hb }; };
  for (let b = 0; b < nb; b++) {
    const y1 = m.t + b * h / nb, hb = h / nb;
    g.strokeStyle = "rgba(120,200,160,.18)"; for (let j = 0; j <= 8; j++) { const y = y1 + hb * j / 8; g.beginPath(); g.moveTo(m.l, y); g.lineTo(m.l + w, y); g.stroke(); }
    g.strokeStyle = "rgba(120,200,160,.4)"; for (let i = 0; i <= 50; i++) { const x = m.l + w * i / 50; g.beginPath(); g.moveTo(x, y1 + hb / 2 - 3); g.lineTo(x, y1 + hb / 2 + 3); g.stroke(); }
    if (b) { g.strokeStyle = "rgba(160,230,190,.65)"; g.lineWidth = 2; g.beginPath(); g.moveTo(m.l, y1); g.lineTo(m.l + w, y1); g.stroke(); g.lineWidth = 1; }
  }
  const y0 = (ch, k) => { const B = banda(k); return B.y + B.h / 2 - ch.poz * B.h / 8; }, Y = (ch, v, k) => y0(ch, k) - v / ch.vdiv * banda(k).h / 8;
  // canalele (în ordine inversă, CH1 deasupra)
  for (let k = 3; k >= 0; k--) {
    const ch = o.ch[k], b = o.buf[k], col = CULORI_CH[k]; if (!ch.on) continue;
    const B = banda(k), yz = clamp(y0(ch, k), B.y + 6, B.y + B.h - 6);
    if (benzi) { g.fillStyle = col; g.font = "700 11px system-ui"; g.fillText(`CH${k + 1} · ${NUME_SCURT[ch.c] || ch.c} · ${fmt(ch.vdiv, ch.vdiv < 1 ? 2 : 0)} V/div`, m.l + 6, B.y + 14); }
    g.fillStyle = col; g.beginPath(); g.moveTo(m.l - 2, yz); g.lineTo(m.l - 13, yz - 7); g.lineTo(m.l - 13, yz + 7); g.fill();
    g.fillStyle = "#0b1410"; g.font = "700 9px system-ui"; g.fillText(String(k + 1), m.l - 12, yz + 3);
    if (!b) continue;
    g.strokeStyle = col; g.lineWidth = 1.5; g.shadowColor = col; g.shadowBlur = 3; g.beginPath();
    b.forEach((v, i) => { const x = m.l + w * i / (b.length - 1), y = clamp(Y(ch, v, k), B.y + 1, B.y + B.h - 1); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.shadowBlur = 0;
  }
  // cursoarele
  [o.c1, o.c2].forEach((c, k) => { const x = m.l + w * c / 10; g.strokeStyle = k ? "#c9b6ff" : "#ff8a5a"; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, m.t); g.lineTo(x, m.t + h); g.stroke(); g.setLineDash([]); g.fillStyle = g.strokeStyle; g.font = "11px system-ui"; g.fillText(k ? "B" : "A", x + 3, m.t + 12); });
  // scalele canalelor
  g.font = "12px system-ui";
  if (benzi) { g.fillStyle = "#9fe6c0"; g.textAlign = "right"; g.fillText(`${fmtT(o.tdiv)}/div  ${o.ruleaza ? "RUN" : "STOP"}`, m.l + w - 6, m.t + 14); g.textAlign = "left"; }
  else {
    let xx = m.l + 8;
    g.fillStyle = "#9fe6c0"; const tt = `${fmtT(o.tdiv)}/div  ${o.ruleaza ? "RUN" : "STOP"}  `; g.fillText(tt, xx, m.t + h - 8); xx += g.measureText(tt).width + 6;
    o.ch.forEach((ch, k) => { if (!ch.on) return; const tx = `CH${k + 1} ${fmt(ch.vdiv, ch.vdiv < 1 ? 2 : 0)} V/div`; g.fillStyle = CULORI_CH[k]; g.fillText(tx, xx, m.t + h - 8); xx += g.measureText(tx).width + 12; });
  }
  // citirile cursoarelor
  const dt = (o.c2 - o.c1) * o.tdiv, val = (k, c) => o.buf[k] ? o.buf[k][Math.round(c / 10 * (o.buf[k].length - 1))] : NaN;
  let txt = `Δt = <b>${fmtT(Math.abs(dt))}</b> · 1/Δt = <b>${Math.abs(dt) > 0 ? fmt(1 / Math.abs(dt), 1) : "—"} Hz</b>`;
  o.ch.forEach((ch, k) => { if (ch.on && o.buf[k]) txt += `<br><span style="color:${CULORI_CH[k]}">CH${k + 1}</span> ${NUME_SCURT[ch.c] || ch.c}: U<sub>A</sub> = <b>${fmt(val(k, o.c1), 2)} V</b> · U<sub>B</sub> = <b>${fmt(val(k, o.c2), 2)} V</b>`; });
  $("#osc-cit").innerHTML = txt;
}
function legaOsc() {
  const cv = $("#cv-osc"); let trag = null;
  const pozDiv = e => { const r = cv.getBoundingClientRect(); return clamp((e.clientX - r.left - 22) / (r.width - 30) * 10, 0, 10); };
  cv.addEventListener("pointerdown", e => { const d = pozDiv(e); trag = Math.abs(d - sim.osc.c1) < Math.abs(d - sim.osc.c2) ? "c1" : "c2"; sim.osc[trag] = d; cv.setPointerCapture(e.pointerId); deseneazaOsc(); });
  cv.addEventListener("pointermove", e => { if (trag) { sim.osc[trag] = pozDiv(e); deseneazaOsc(); } });
  cv.addEventListener("pointerup", () => trag = null);
  $$(".osc-cutie .osc-canal").forEach((el, k) => {
    const ch = sim.osc.ch[k], on = el.querySelector("[data-ch-on]"), sc = el.querySelector("[data-ch-c]"), sv = el.querySelector("[data-ch-v]"), sp = el.querySelector("[data-ch-p]");
    const stil = () => el.classList.toggle("oprit", !ch.on);
    sc.value = ch.c; sv.value = String(ch.vdiv); sp.value = String(ch.poz); on.checked = ch.on; stil();
    on.addEventListener("change", () => { ch.on = on.checked; stil(); if (sim.osc.ruleaza) achizitie(); deseneazaOsc(); });
    sc.addEventListener("change", () => { ch.c = sc.value; ch.vdiv = VDEF[ch.c] || 1; sv.value = String(ch.vdiv); ch.poz = ch.c in POZDEF ? POZDEF[ch.c] : -2; sp.value = String(ch.poz); if (!ch.on) { ch.on = on.checked = true; stil(); } if (sim.osc.ruleaza) achizitie(); deseneazaOsc(); });
    sv.addEventListener("change", () => { ch.vdiv = +sv.value; deseneazaOsc(); });
    sp.addEventListener("change", () => { ch.poz = +sp.value; deseneazaOsc(); });
  });
}


/* ------------------------------------------------------------------ calculele determinărilor */
function miniGrafic(titlu, pts, ox, oy, linie, xl, yl) {
  if (pts.length < 2) return "";
  const W = 300, H = 170, m = { l: 36, r: 10, t: 22, b: 28 }, w = W - m.l - m.r, h = H - m.t - m.b;
  const X = x => m.l + (x - ox[0]) / (ox[1] - ox[0]) * w, Y = y => m.t + (1 - (y - oy[0]) / (oy[1] - oy[0])) * h;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="mini-grafic" role="img" aria-label="${titlu}"><text x="${W / 2}" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">${titlu}</text>`;
  for (let i = 0; i <= 4; i++) { const x = m.l + w * i / 4, y = m.t + h * i / 4; s += `<line x1="${x}" y1="${m.t}" x2="${x}" y2="${m.t + h}" stroke="currentColor" opacity=".12"/><line x1="${m.l}" y1="${y}" x2="${m.l + w}" y2="${y}" stroke="currentColor" opacity=".12"/>`;
    s += `<text x="${x}" y="${H - 14}" font-size="9" text-anchor="middle" fill="currentColor">${fmt(ox[0] + (ox[1] - ox[0]) * i / 4, 0)}</text><text x="${m.l - 4}" y="${m.t + h - h * i / 4 + 3}" font-size="9" text-anchor="end" fill="currentColor">${fmt(oy[0] + (oy[1] - oy[0]) * i / 4, oy[1] < 5 ? 1 : 0)}</text>`; }
  if (linie) s += `<line x1="${X(ox[0])}" y1="${Y(linie(ox[0]))}" x2="${X(ox[1])}" y2="${Y(linie(ox[1]))}" stroke="var(--serie-1)" stroke-dasharray="5 3" stroke-width="1.5"/>`;
  pts.forEach(([x, y]) => s += `<circle cx="${X(x)}" cy="${Y(y)}" r="3.5" fill="var(--serie-0)"/>`);
  return s + `<text x="${m.l + w / 2}" y="${H - 2}" font-size="10" text-anchor="middle" fill="currentColor">${xl}</text><text x="10" y="${m.t + h / 2}" font-size="10" text-anchor="middle" fill="currentColor" transform="rotate(-90 10 ${m.t + h / 2})">${yl}</text></svg>`;
}
function calculeazaSAA1(D) {
  const o = MD.prelucreaza(D.t, { num }), t = D.t, cel = { t11: {}, t12: {}, t13: {} }, rele = { t12: {} };
  const tic = num(t.t12.ral.tiD), tm = o.tmort;
  const kpts = [];
  MINUTE.forEach(k => { const v = num(t.t11[k].ti), T = num(t.t11[k].T); const kk = Number.isFinite(v) && Number.isFinite(tic) ? v / tic : NaN, kc = Number.isFinite(kk) && Number.isFinite(tm) ? (v - tm) / (tic - tm) : NaN;
    cel.t11[k] = { k: fmt(kk, 3), kc: fmt(kc, 3) }; if (Number.isFinite(kk) && Number.isFinite(T)) kpts.push([T, Number.isFinite(kc) ? kc : kk]); });
  const ppts = [];
  CHEI_REG.forEach(k => { const r = t.t12[k], n = num(r.n), tiv = Number.isFinite(num(r.tiO)) ? num(r.tiO) : num(r.tiD), dc = n > 0 && Number.isFinite(tiv) ? tiv / (120000 / n) * 100 : NaN;
    cel.t12[k] = { dc: fmt(dc, 1) }; rele.t12[k] = { dc: dc > 80 }; const p = num(r.p), tiD = num(r.tiD); if (Number.isFinite(p) && Number.isFinite(tiD) && !REG[k].c) ppts.push([p, tiD]); });
  REG_CONS.forEach(k => { const c = o.cons[k]; cel.t13[k] = c ? { Ch: fmt(c.Ch, 3), minj: fmt(c.minj, 2) } : { Ch: "", minj: "" }; });
  const regP = ppts.length >= 2 ? MD.regresie(ppts.map(p => p[0]), ppts.map(p => p[1])) : null;
  const rez = [
    ["Debitul efectiv al injectorului q<sub>s</sub> (panta m<sub>inj</sub> = f(t<sub>i</sub>))", Number.isFinite(o.qs) ? `<span style='color:var(--accent)'>${fmt(o.qs, 3)}</span> mg/ms (${fmt(o.qs * 60, 0)} g/min)` : "min. 2 regimuri în Tabelul 1.3"],
    ["Timpul mort t<sub>mort</sub> (intersecția cu axa t<sub>i</sub>)", Number.isFinite(o.tmort) ? `${fmt(o.tmort, 3)} ms` : "—"],
    ["Corecția de încălzire la pornire k<sub>ECT</sub> (t = 0)", Number.isFinite(o.kECT0) ? `${fmt(o.kECT0, 3)}` + (Number.isFinite(tm) ? ` (corectată pentru t<sub>mort</sub>: ${fmt((num(t.t11.m0.ti) - tm) / (tic - tm), 3)})` : "") : "—"],
    ["Factorul de umplere la 3000 rot/min", Number.isFinite(o.dc3000) ? `${fmt(o.dc3000, 1)} %` : "—"],
    ["Dreapta t<sub>i</sub> = a·p + b (motor cald, fără consumatori)", regP ? `a = ${fmt(regP.a, 4)} ms/kPa; b = ${fmt(regP.b, 3)} ms` : "—"]
  ];
  const verdicte = [];
  if (Number.isFinite(o.qs)) verdicte.push(o.qs > 1.8 && o.qs < 3.2 ? { tip: "ok", text: `q<sub>s</sub> = ${fmt(o.qs, 2)} mg/ms ≈ ${fmt(o.qs * 60 / 0.745, 0)} cm³/min benzină – în domeniul injectoarelor MPI pentru motoare de 1,4 l.` } : { tip: "atentie", text: "Debitul rezultat este în afara domeniului obișnuit – verificați măsurările de consum și t<sub>i</sub>." });
  if (Number.isFinite(o.tmort)) verdicte.push(o.tmort > 0.3 && o.tmort < 1.4 ? { tip: "ok", text: `t<sub>mort</sub> = ${fmt(o.tmort, 2)} ms – valoare tipică la 13,9 V.` } : { tip: "atentie", text: "Timpul mort rezultat nu este plauzibil (0,4…1,2 ms): punctele din Tabelul 1.3 sunt prea apropiate sau eronate." });
  const g1 = miniGrafic("k_ECT = f(T_motor)", kpts, [10, 100], [0.8, 2.2], null, "T [°C]", "k_ECT");
  const g2 = miniGrafic("t_i = f(p) – motor cald", ppts, [15, 45], [2, 4.5], regP ? x => regP.a * x + regP.b : null, "p [kPa]", "t_i [ms]");
  if (g1 || g2) verdicte.push({ tip: "", text: `<div class="mini-grila">${g1}${g2}</div>` });
  const pts = []; REG_CONS.forEach(k => { const c = o.cons[k], T = num(t.t13[k].ti); if (c && Number.isFinite(T)) pts.push([T, c.minj]); });
  const serii = [{ tip: "pct", pts, culoare: 0 }];
  if (o.reg) serii.push({ tip: "linie", pts: [[0, o.reg.b], [4.5, o.reg.a * 4.5 + o.reg.b]], culoare: 1, punctat: true });
  return {
    celule: cel, rele, rezultate: rez, verdicte, titluGrafic: "Masa injectată pe ciclu m<sub>inj</sub> = f(t<sub>i</sub>) – determinarea q<sub>s</sub> și t<sub>mort</sub>",
    grafic: { xmin: 0, xmax: 4.5, ymin: -1, ymax: 9, xticks: [0, 1, 2, 3, 4], xlab: "tᵢ [ms]", ylab: "m_inj [mg]", serii },
    legenda: [["din consumul măsurat", "var(--serie-0)", "pct"], ["dreapta de regresie (panta = q_s)", "var(--serie-1)"]],
    principal: { eticheta: "q_s [mg/ms]", valoare: Number.isFinite(o.qs) ? +o.qs.toFixed(3) : null }, o
  };
}

/* ------------------------------------------------------------------ conținut didactic (după îndrumar, revizuit) */
const HTML_TEORIE = `
<div class="nssm"><h3>Norme specifice de securitate și sănătate în muncă</h3><ul>
<li>La deconectarea conectorului injectorului, în circuit apar vârfuri de autoinducție de 40…70 V: sonda osciloscopului se montează cu motorul oprit, folosind adaptoare cu vârf izolat (back-probe), fără a înțepa izolația.</li>
<li>Circuitul de combustibil este sub presiune (≈ 3…4 bar) și după oprirea motorului: nu se desfac racordurile rampei. Sistemul de măsurare a consumului (vas gradat sau rezervor auxiliar pe cântar) se montează numai de cadrul didactic, cu motorul oprit și circuitul depresurizat.</li>
<li>Benzina se manipulează numai în vase închise și etichetate, departe de surse de aprindere; lângă stand trebuie să existe extinctor; scurgerile se șterg imediat.</li>
<li>Lucrarea începe cu motorul rece: după încălzire, colectorul și țeava de evacuare depășesc 300 °C și nu se ating.</li>
<li>Accelerările se fac progresiv, numai la comanda cadrului didactic; se evită turațiile de peste 3500 rot/min pe standul fără sarcină. Cablurile aparatelor se trec departe de curea, fulii și electroventilator.</li></ul></div>
<h2>1.1. Scopul lucrării</h2>
<p>Determinarea experimentală a caracteristicilor de funcționare ale sistemului de injecție multipunct: dependența duratei de injecție de regim, corecțiile de regim (pornire la rece și încălzire, accelerare, decelerare) și consumul orar de combustibil. Din compararea consumului măsurat cu cel calculat se determină debitul efectiv al injectorului și timpul mort. Datele obținute sunt folosite la lucrarea 2 pentru validarea modelului de calcul al injecției.</p>
<h2>1.2. Noțiuni teoretice</h2>
<p>La motorul cu injecție multipunct (MPI) fiecare cilindru are propriul injector, montat în colectorul de admisie, în fața supapei de admisie. Calculatorul (ECU) stabilește masa de combustibil pe ciclu din masa de aer aspirată – calculată din presiunea din colector (MAP) și turație sau măsurată cu un debitmetru (MAF) – astfel încât amestecul să fie stoichiometric (λ = 1).</p>
<p>Injectorul este o electrovalvă: ECU comută la masă înfășurarea, iar cantitatea injectată este proporțională cu durata deschiderii t<sub>i</sub> la o diferență de presiune constantă între rampă și colector. La deschidere există o întârziere electromecanică (timpul mort), compensată de ECU în funcție de tensiunea bateriei.</p>
<div class="ec"><span>m<sub>inj</sub> = q<sub>s</sub>·(t<sub>i</sub> − t<sub>mort</sub>) [mg]</span><span class="nr">(1.1)</span></div>
<div class="ec"><span>T<sub>ciclu</sub> = 120 000/n [ms]</span><span class="nr">(1.2)</span></div>
<div class="ec"><span>DC = t<sub>i</sub>/T<sub>ciclu</sub>·100 [%]</span><span class="nr">(1.3)</span></div>
<p>unde q<sub>s</sub> este debitul static al injectorului [mg/ms], n – turația [rot/min], T<sub>ciclu</sub> – durata unui ciclu motor, iar DC – factorul de umplere (duty cycle). Durata de injecție de bază t<sub>b</sub> se citește dintr-o hartă a ECU, în funcție de turație și de presiunea din colector, și se înmulțește cu factori de corecție:</p>
<div class="ec"><span>t<sub>i</sub> = t<sub>b</sub>(n, p)·k<sub>ECT</sub>·k<sub>acc</sub>·k<sub>λ</sub> + t<sub>mort</sub>(U<sub>bat</sub>)</span><span class="nr">(1.4)</span></div>
<p>unde k<sub>ECT</sub> este corecția de temperatură (supraunitară la motor rece, pentru compensarea condensării combustibilului pe pereții reci), k<sub>acc</sub> – îmbogățirea la accelerare, iar k<sub>λ</sub> – corecția de buclă închisă a sondei λ (apropiată de 1 la un motor în stare bună). La decelerare, cu clapeta închisă și turația peste un prag, ECU întrerupe injecția (t<sub>i</sub> = 0) și o reia la o turație ceva mai mare decât ralantiul, pentru a evita oprirea motorului.</p>
<figure><img src="img/fig1_1.jpg" alt="Fig. 1.1 Schema sistemului de injecție multipunct" loading="lazy"><figcaption>Fig. 1.1. Schema sistemului de injecție multipunct și punctele de măsură</figcaption></figure>
<figure><img src="img/fig1_2.jpg" alt="Fig. 1.2 Comanda injectorului și corecția de încălzire" loading="lazy"><figcaption>Fig. 1.2. Comanda injectorului (stânga) și corecția de încălzire (dreapta) – valori exemplificative</figcaption></figure>
<p>Consumul orar măsurat se determină din masa de combustibil consumată m [g] într-un interval Δt [s]. Împărțind consumul la numărul de injecții pe oră se obține masa injectată pe ciclu, care, reprezentată în funcție de t<sub>i</sub> pentru mai multe regimuri, este o dreaptă: panta ei este debitul efectiv q<sub>s</sub>, iar intersecția cu axa t<sub>i</sub> este timpul mort.</p>
<div class="ec"><span>C<sub>h</sub> = 3,6·m/Δt [kg/h]</span><span class="nr">(1.5)</span></div>
<div class="ec"><span>m<sub>inj</sub> = C<sub>h</sub>·10<sup>6</sup>/(i·(n/2)·60) [mg]</span><span class="nr">(1.6)</span></div>
<figure><img src="img/fig1_3.jpg" alt="Fig. 1.3 Durata de injecție și determinarea q_s și t_mort" loading="lazy"><figcaption>Fig. 1.3. Durata de injecție în funcție de presiunea din colector și determinarea lui q<sub>s</sub> și t<sub>mort</sub> (valori exemplificative)</figcaption></figure>
<div class="nota-indrumar"><h3>Completări și corecturi față de îndrumarul tipărit</h3><ul>
<li><b>Diferența de presiune pe injector.</b> Îndrumarul afirmă că diferența de presiune este „menținută constantă de regulator”. Acest lucru este valabil la sistemele cu retur și regulator referit la presiunea din colector (schema din Fig. 1.1). La sistemele fără retur (regulatorul în modulul pompei din rezervor, frecvente la motoarele actuale), presiunea din rampă este constantă față de atmosferă, iar diferența pe injector scade când crește presiunea din colector; ECU compensează prin calcul.</li>
<li><b>Corecția de încălzire.</b> Raportul k<sub>ECT</sub> = t<sub>i</sub>/t<sub>i,cald</sub> din îndrumar include și timpul mort, care nu depinde de temperatură, deci subestimează îmbogățirea reală. Corecția aplicată masei de combustibil este k<sub>ECT</sub> = (t<sub>i</sub> − t<sub>mort</sub>)/(t<sub>i,cald</sub> − t<sub>mort</sub>); în Tabelul 1.1 sunt calculate ambele (după determinarea t<sub>mort</sub> din Tabelul 1.3). Rămâne și efectul ralantiului rece (turație și MAP mai mari), astfel că valoarea măsurată este o corecție „globală” de ralanti.</li>
<li><b>Relația (1.6)</b> presupune injecție secvențială (o injecție pe ciclu la fiecare cilindru). La injecția simultană sau pe grupe injectorul acționează de două ori pe ciclu cu jumătate din cantitate: masa pe ciclu rămâne aceeași, dar t<sub>i</sub> măsurat pe osciloscop este cel al unei singure injecții.</li>
<li><b>t<sub>i</sub> afișat de tester</b> poate include sau nu timpul mort, după constructor; de aceea se compară cu durata măsurată pe osciloscop (de la frontul descendent până la vârful de autoinducție).</li>
<li><b>Exemplul numeric:</b> un consum de 0,72 kg/h (≈ 0,97 l/h) la ralanti este mare pentru un motor de 1,4 l cald (tipic 0,5…0,8 l/h); calculele rămân corecte ca metodă.</li>
<li><b>Factorul de umplere</b> nu trebuie să depășească ≈ 80…85 % la sarcină plină și turație maximă – peste această valoare injectorul nu mai are timp să se închidă complet, iar debitul nu mai crește liniar.</li></ul></div>
<h2>1.4. Modul de lucru (în simulator)</h2>
<ol><li>Identificați pe macheta 3D componentele din Fig. 1.1 (injectoarele, rampa, senzorii MAP, CTS, CKP, clapeta).</li>
<li>Cu motorul rece și oprit: bifați exhaustarea și adaptoarele back-probe; osciloscopul este pe comanda injectorului cilindrului 1, iar testerul OBD pe priza de diagnoză.</li>
<li>Porniți motorul rece și, din 2 în 2 minute (timpul se poate accelera ×5 sau ×10), notați temperatura lichidului, turația de ralanti și t<sub>i</sub> până la ≈ 90 °C (Tabelul 1.1).</li>
<li>Cu motorul cald măsurați t<sub>i</sub> (tester și osciloscop) și presiunea din colector la regimurile din Tabelul 1.2; la ralanti și la 2000 rot/min repetați cu consumatorii porniți.</li>
<li>La ralanti, 2000 și 3000 rot/min măsurați masa de combustibil consumată în 60…120 s cu cântarul și cronometrul (Tabelul 1.3).</li>
<li>Executați o accelerare bruscă de la ralanti la 3000 rot/min și apoi o decelerare cu clapeta închisă; înghețați graficul testerului și citiți cu cursoarele t<sub>i</sub> maxim, turațiile de întrerupere și de reluare a injecției și durata întreruperii (Tabelul 1.4).</li>
<li>Opriți motorul.</li></ol>
<h2>1.7. Interpretarea rezultatelor</h2>
<ul><li>Corecția de încălzire are orientativ valori de 1,3…2 la pornirea la rece și scade continuu până la 1 la ≈ 80…85 °C; turația de ralanti este mai mare la rece și scade odată cu încălzirea.</li>
<li>La un sistem speed-density, t<sub>i</sub> crește aproape liniar cu presiunea din colector; abaterile de la dreaptă arată variația eficienței volumetrice cu turația (vezi lucrarea 2).</li>
<li>Întreruperea injecției la decelerare apare orientativ peste 1500…1800 rot/min, iar reluarea sub 1100…1300 rot/min; valorile exacte depind de calibrare.</li>
<li>Un debit efectiv al injectorului mult diferit de cel nominal indică o presiune de alimentare diferită de cea prescrisă sau injectoare uzate – verificarea lor face obiectul disciplinei Diagnosticarea autovehiculelor.</li></ul>
<h2>1.8. Relevanță practică</h2>
<p>Harta duratei de injecție, corecțiile de regim și debitul efectiv al injectoarelor sunt datele de bază ale calibrării ECU. Aceleași măsurători se folosesc în proiecte de licență și cercetare despre combustibili alternativi (E10, E85, GPL) sau despre sisteme de injecție pentru prototipuri.</p>`;
function htmlProbleme() {
  return `<h2>Exemplu rezolvat (din îndrumar)</h2>
<p>La ralanti (n = 800 rot/min, t<sub>i</sub> = 3,8 ms) se consumă m = 12 g în Δt = 60 s, iar la 3000 rot/min (t<sub>i</sub> = 2,6 ms) m = 27 g în 60 s:</p>
<div class="ec"><span>C<sub>h</sub> = 3,6·12/60 = 0,72 kg/h; &nbsp; m<sub>inj</sub> = 0,72·10<sup>6</sup>/(4·400·60) = 7,5 mg</span><span class="nr">(1.7–1.8)</span></div>
<div class="ec"><span>la 3000 rot/min: C<sub>h</sub> = 1,62 kg/h; m<sub>inj</sub> = 1,62·10<sup>6</sup>/(4·1500·60) = 4,5 mg</span></div>
<div class="ec"><span>q<sub>s</sub> = (7,5 − 4,5)/(3,8 − 2,6) = 2,5 mg/ms; &nbsp; t<sub>mort</sub> = 3,8 − 7,5/2,5 = 0,8 ms</span><span class="nr">(1.9–1.10)</span></div>
<div class="problema"><h3>Problema 1</h3><p>Calculați factorul de umplere la 3000 rot/min pentru t<sub>i</sub> = 2,6 ms. Ce valoare ar avea la 6000 rot/min și t<sub>i</sub> = 14 ms (sarcină plină)?</p><details class="sol"><summary>Rezolvare</summary><p>T<sub>ciclu</sub> = 40 ms → DC = 6,5 %; la 6000 rot/min T<sub>ciclu</sub> = 20 ms → DC = 70 %, sub limita practică de ≈ 80…85 %.</p></details></div>
<div class="problema"><h3>Problema 2</h3><p>Injectorul are q<sub>s</sub> = 2,4 mg/ms și t<sub>mort</sub> = 0,85 ms. Ce t<sub>i</sub> comandă ECU pentru o masă de 6 mg pe ciclu? Cu cât crește t<sub>i</sub> dacă motorul este rece, cu k<sub>ECT</sub> = 1,6?</p><details class="sol"><summary>Rezolvare</summary><p>t<sub>i</sub> = 6/2,4 + 0,85 = 3,35 ms; la rece m = 9,6 mg → t<sub>i</sub> = 4,85 ms (+1,5 ms). Raportul t<sub>i</sub>/t<sub>i,cald</sub> = 1,45 &lt; 1,6 – efectul timpului mort.</p></details></div>
<div class="problema"><h3>Problema 3</h3><p>Exprimați q<sub>s</sub> = 2,5 mg/ms în cm³/min (ρ<sub>benzină</sub> = 0,745 g/cm³), unitatea folosită în cataloagele de injectoare.</p><details class="sol"><summary>Rezolvare</summary><p>2,5 mg/ms = 2,5 g/s = 150 g/min → 150/0,745 ≈ 201 cm³/min.</p></details></div>`;
}
const INTREBARI = [
  ["De ce durata de injecție este mai mare la motorul rece?", "Pe pereții reci ai colectorului și ai cilindrului o parte din benzină condensează și nu participă la ardere; ECU compensează prin k<sub>ECT</sub> &gt; 1 pentru ca amestecul efectiv să rămână inflamabil. În plus, ralantiul rece este mai ridicat (debit de aer mai mare)."],
  ["De ce, la un sistem speed-density, t<sub>i</sub> este aproape proporțională cu presiunea din colector?", "Masa de aer pe ciclu este m = η<sub>v</sub>·p·V<sub>c</sub>/(R·T); la temperatură și η<sub>v</sub> aproape constante ea crește liniar cu p, iar masa de combustibil (λ = 1) și t<sub>i</sub> − t<sub>mort</sub> la fel."],
  ["Ce reprezintă intersecția dreptei m<sub>inj</sub> = f(t<sub>i</sub>) cu axa t<sub>i</sub>?", "Timpul mort: durata de comandă pentru care injectorul nu apucă să se deschidă (m<sub>inj</sub> = 0)."],
  ["Ce avantaje are întreruperea injecției la decelerare și de ce injecția se reia la o turație mai mare decât ralantiul?", "Reduce consumul și emisiile de HC, evită supraîncălzirea catalizatorului și mărește frâna de motor; se reia mai sus de ralanti ca motorul să nu se oprească (inerția și întârzierea până la arderea primelor injecții)."],
  ["Cum se modifică t<sub>i</sub> la ralanti când se pornesc consumatorii electrici? Explicați.", "Crește: alternatorul se încarcă mai mult, ECU deschide aerul de ralanti pentru a menține turația, presiunea din colector crește și, odată cu ea, masa de aer și de combustibil; scade și U<sub>bat</sub>, deci crește ușor t<sub>mort</sub>."]
];
const TEST = [
  { q: "Timpul mort al injectorului depinde în principal de:", o: ["turație", "tensiunea bateriei", "temperatura aerului", "poziția clapetei"], c: 1, e: "Curentul crește mai lent la tensiune mică, deci deschiderea întârzie." },
  { q: "La 3000 rot/min durata unui ciclu motor în 4 timpi este:", o: ["20 ms", "40 ms", "60 ms", "120 ms"], c: 1, e: "T = 120 000/n." },
  { q: "Panta dreptei m<sub>inj</sub> = f(t<sub>i</sub>) este:", o: ["timpul mort", "debitul efectiv al injectorului", "consumul orar", "factorul de umplere"], c: 1, e: "m = q<sub>s</sub>(t<sub>i</sub> − t<sub>mort</sub>)." },
  { q: "Corecția k<sub>ECT</sub> la pornirea la rece este:", o: ["subunitară", "egală cu 1", "supraunitară (≈ 1,3…2)", "zero"], c: 2, e: "Compensează condensarea combustibilului pe pereții reci." },
  { q: "La decelerare cu clapeta închisă, peste pragul de turație, t<sub>i</sub> devine:", o: ["maxim", "egal cu t<sub>mort</sub>", "zero (injecție întreruptă)", "egal cu cel de ralanti"], c: 2, e: "Întreruperea injecției la decelerare." },
  { q: "Consumul m = 12 g în 60 s corespunde la:", o: ["0,2 kg/h", "0,72 kg/h", "7,2 kg/h", "12 kg/h"], c: 1, e: "C<sub>h</sub> = 3,6·m/Δt." }
];

/* ------------------------------------------------------------------ 3D: motorul pe stand */
function porneste3D() {
  const el = $("#motor3d"); if (!el) return;
  import(BAZA_COMUN + "motor3d.js?v=4").then(m => {
    const ET = { inj1: "injector 1", inj2: "injector 2", inj3: "injector 3", inj4: "injector 4", map: "MAP", ect: "CTS", ckp: "CKP", tps: "clapetă / TPS", clap: "corp clapetă", iat: "IAT", l1: "λ amonte", can: "canistră" };
    SV.m3d = m.creeazaStand(el, { etichete: ET, onSelect: () => { } });
    SV.m3d.selecteaza("inj1", false);
  }).catch(e => { el.innerHTML = `<p class="nota">Macheta 3D nu poate fi afișată în acest browser.</p>`; console.warn(e); });
}
const SV = {};

/* ------------------------------------------------------------------ definiția lucrării */
Cadru.porneste({
  disc: "SAA", nr: 1, cod: "saa-l1",
  titlu: "Sistemul de injecție de benzină multipunct – caracteristicile de funcționare",
  scurt: "Injecția multipunct",
  subtitlu: "Laborator virtual – standul motorului 1.4 MPI, tester OBD, osciloscop, cântar și cronometru",
  parametri: MD.parametri,
  parametriDemo() { return MD.parametri(20261001); },
  date: [{ k: "i", et: "Număr de cilindri i", v: 4, fix: true }, { k: "Vs", et: "Cilindree [cm³]", v: 1390, fix: true }, { k: "rho", et: "ρ benzină [g/cm³]", v: 0.745, fix: true }],
  tabele: [
    { id: "t11", titlu: "Tabelul 1.1. Corecția de încălzire (ralanti, fără consumatori)", antetRand: "t [min]", nota: "k<sub>ECT</sub> = t<sub>i</sub>/t<sub>i,cald</sub> (t<sub>i,cald</sub> = t<sub>i</sub> OBD la ralanti din Tabelul 1.2); k<sub>ECT,c</sub> = (t<sub>i</sub> − t<sub>mort</sub>)/(t<sub>i,cald</sub> − t<sub>mort</sub>), cu t<sub>mort</sub> din Tabelul 1.3.",
      randuri: MINUTE.map(k => ({ k, et: k.slice(1) })),
      coloane: [{ k: "T", t: "T motor [°C]", intrare: true }, { k: "n", t: "n ralanti [rot/min]", intrare: true }, { k: "ti", t: "t<sub>i</sub> [ms]", intrare: true }, { k: "k", t: "k<sub>ECT</sub> [–]" }, { k: "kc", t: "k<sub>ECT,c</sub> [–]" }] },
    { id: "t12", titlu: "Tabelul 1.2. Durata de injecție în funcție de regim (motor cald)", antetRand: "Regim",
      randuri: CHEI_REG.map(k => ({ k, et: REG[k].et })),
      coloane: [{ k: "n", t: "n [rot/min]", intrare: true }, { k: "p", t: "p [kPa]", intrare: true }, { k: "tiO", t: "t<sub>i</sub> osciloscop [ms]", intrare: true }, { k: "tiD", t: "t<sub>i</sub> OBD [ms]", intrare: true }, { k: "dc", t: "DC [%]" }] },
    { id: "t13", titlu: "Tabelul 1.3. Consumul orar", antetRand: "Regim",
      randuri: REG_CONS.map(k => ({ k, et: REG[k].et })),
      coloane: [{ k: "n", t: "n [rot/min]", intrare: true }, { k: "ti", t: "t<sub>i</sub> [ms]", intrare: true }, { k: "dt", t: "Δt [s]", intrare: true }, { k: "m", t: "m [g]", intrare: true }, { k: "Ch", t: "C<sub>h,măs</sub> [kg/h]" }, { k: "minj", t: "m<sub>inj</sub> [mg]" }] },
    { id: "t14", titlu: "Tabelul 1.4. Regimuri tranzitorii", antetRand: "Mărime",
      randuri: [{ k: "timax", et: "t<sub>i</sub> maxim la accelerare [ms]" }, { k: "ncut", et: "Turația de întrerupere a injecției [rot/min]" }, { k: "nres", et: "Turația de reluare a injecției [rot/min]" }, { k: "dur", et: "Durata întreruperii [s]" }],
      coloane: [{ k: "v", t: "Valoare", intrare: true }] }
  ],
  inaltimeGrafic: 320,
  calculeaza: calculeazaSAA1,
  intrebari() {
    return [
      { id: "q1", u: "mg/ms", text: "Debitul efectiv al injectorului q<sub>s</sub> (panta dreptei m<sub>inj</sub> = f(t<sub>i</sub>) prin punctele voastre din Tabelul 1.3):", textSimplu: "Debitul efectiv al injectorului q_s" },
      { id: "q2", u: "ms", text: "Timpul mort t<sub>mort</sub> (intersecția aceleiași drepte cu axa t<sub>i</sub>):", textSimplu: "Timpul mort al injectorului" },
      { id: "q3", u: "", text: "Corecția de încălzire k<sub>ECT</sub> = t<sub>i</sub>/t<sub>i,cald</sub> la pornire (t = 0 din Tabelul 1.1; t<sub>i,cald</sub> = t<sub>i</sub> OBD la ralanti din Tabelul 1.2):", textSimplu: "Corecția de încălzire la pornire" },
      { id: "q4", u: "%", text: "Factorul de umplere DC la 3000 rot/min, cu t<sub>i</sub> măsurat pe osciloscop (Tabelul 1.2):", textSimplu: "Factorul de umplere la 3000 rot/min" }
    ];
  },
  cerinte(D) {
    const l = [], t = D.t;
    const m = MINUTE.filter(k => t.t11[k].ti !== "").length; if (m < 6) l.push(`Tabelul 1.1: ${m}/8 citiri (minim 6)`);
    const r = CHEI_REG.filter(k => t.t12[k].tiD !== "").length; if (r < 7) l.push(`Tabelul 1.2: t_i OBD (${r}/7 regimuri)`);
    const o = CHEI_REG.filter(k => t.t12[k].tiO !== "").length; if (o < 3) l.push(`Tabelul 1.2: t_i osciloscop (${o}/7, minim 3, inclusiv 3000)`);
    if (t.t12.n3000.tiO === "") l.push("Tabelul 1.2: t_i osciloscop la 3000 rot/min");
    const c = REG_CONS.filter(k => t.t13[k].m !== "").length; if (c < 3) l.push(`Tabelul 1.3: consumul (${c}/3 regimuri)`);
    ["timax", "ncut", "nres", "dur"].forEach(k => { if (t.t14[k].v === "") l.push(`Tabelul 1.4: ${{ timax: "t_i maxim", ncut: "turația de întrerupere", nres: "turația de reluare", dur: "durata întreruperii" }[k]}`); });
    return l;
  },
  exemplu(D) {
    const t = D.t;
    Object.assign(t.t13.ral, { n: "800", ti: "3.80", dt: "60", m: "12" }); Object.assign(t.t13.n3000, { n: "3000", ti: "2.60", dt: "60", m: "27" });
  },
  vehicul3d: {
    titluTab: "Pe autovehicul (3D)",
    titlu: "Injecția în mers – autoturism cu motor 1.4 MPI",
    intro: `<p>Același motor, montat în autoturism. Porniți motorul și urmăriți pe osciloscopul din colț comanda injectorului 1 (CH1) împreună cu MAP (CH2): la accelerare t<sub>i</sub> crește odată cu presiunea din colector, iar la ridicarea piciorului de pe pedală, peste ≈ 1500 rot/min, injecția se întrerupe (linia rămâne la tensiunea bateriei) și se reia aproape de ralanti. Puteți afișa oricare alt senzor al motorului.</p>`,
    dupa: `<p class="nota">Modelul semnalelor este tipic, nu cel individual de pe stand.</p>`,
    optiuni: () => ({ sistem: "senzori", selInitial: "inj1", canale: ["map"] })
  },
  referat: {
    scop: "Determinarea caracteristicilor sistemului de injecție multipunct: corecția de încălzire, t<sub>i</sub> în funcție de regim, consumul orar, debitul efectiv și timpul mort al injectorului, regimurile tranzitorii.",
    relatii: "m<sub>inj</sub> = q<sub>s</sub>(t<sub>i</sub> − t<sub>mort</sub>); &nbsp; T<sub>ciclu</sub> = 120 000/n; &nbsp; DC = t<sub>i</sub>/T<sub>ciclu</sub>·100; &nbsp; C<sub>h</sub> = 3,6·m/Δt; &nbsp; m<sub>inj</sub> = C<sub>h</sub>·10<sup>6</sup>/(i·n/2·60).",
    varianta: () => "Standul 1.4 MPI cu injectoare (debit, timp mort), eficiență volumetrică și calibrare (încălzire, accelerare, decelerare) proprii fiecărui student.",
    indicatii: "Comentați forma corecției de încălzire, liniaritatea t_i = f(p), efectul consumatorilor, valorile q_s și t_mort comparate cu cele de catalog și regimurile tranzitorii…"
  },
  subsol: "Modelul: motor speed-density de 1,39 l (4 cilindri, injecție secvențială, λ = 1), eficiență volumetrică dependentă de turație, injector cu debit static și timp mort dependent de tensiune, corecții de încălzire, accelerare și decelerare. Valorile sunt individuale.",
  continut: { teorie: HTML_TEORIE, probleme: htmlProbleme, intrebari: INTREBARI, test: TEST },
  sim: {
    html: `<div class="sim-grila">
    <div class="card sim-scena scena">
      <button type="button" class="btn-ecran" id="btn-ecran">⛶ Ecran complet</button>
      <div id="motor3d"><p class="nota">Se încarcă macheta 3D…</p></div>
      <div class="afisaje">
        <div class="afisaj"><span>Turație</span><b id="af-n">0</b><small>rot/min</small></div>
        <div class="afisaj"><span>Temperatura motorului</span><b id="af-T">—</b><small>°C</small></div>
        <div class="afisaj"><span>Timp de injecție</span><b id="af-ti">—</b><small>ms (tester)</small></div>
        <div class="afisaj"><span>Timp de la pornire</span><b id="af-t">—</b><small id="af-v">min</small></div>
      </div>
      <div class="osc-cutie">
        <div class="osc-bara">
          <b>Osciloscop – 4 canale</b>
          <label>Timp/div <select id="osc-t">${TDIV.map(v => `<option value="${v}">${fmtT(v)}</option>`).join("")}</select></label>
          <button type="button" id="osc-run">STOP</button>
          <label>Afișare <select id="osc-mod"><option value="benzi">canale separate</option><option value="supr">canale suprapuse</option></select></label>
          <span class="nota" style="margin:0">declanșare pe comanda de pe CH1</span>
        </div>
        <div class="osc-canale">${[0, 1, 2, 3].map(k => `<div class="osc-canal" style="--cc:${CULORI_CH[k]}">
          <label><input type="checkbox" data-ch-on="${k}"${k === 0 ? " checked" : ""}> <b>CH${k + 1}</b></label>
          <select data-ch-c="${k}" aria-label="Semnalul pe canalul ${k + 1}">${Object.entries(NUME_SCURT).map(([c, n]) => `<option value="${c}">${n}</option>`).join("")}</select>
          <select data-ch-v="${k}" aria-label="V/div canalul ${k + 1}">${VDIV.map(v => `<option value="${v}">${String(v).replace(".", ",")} V/div</option>`).join("")}</select>
          <select data-ch-p="${k}" aria-label="Poziția nivelului de 0 V, canalul ${k + 1}">${[4, 3, 2, 1, 0, -1, -2, -3, -4].map(v => `<option value="${v}">0 V la ${v > 0 ? "+" : ""}${v} div</option>`).join("")}</select>
        </div>`).join("")}</div>
        <canvas id="cv-osc" data-h="300" height="300" aria-label="Ecranul osciloscopului; trageți cursoarele A și B"></canvas>
        <p class="nota" id="osc-cit"></p>
      </div>
    </div>
    <aside class="card sim-comenzi">
      <h2>Pregătire (NSSM)</h2>
      <label class="bifa"><input type="checkbox" id="ck-exhaust"> Exhaustarea conectată la țeava de evacuare</label>
      <label class="bifa"><input type="checkbox" id="ck-backprobe" checked> Sonda osciloscopului pe injectorul 1, cu adaptor back-probe</label>
      <h2>Motorul</h2>
      <div class="rand-butoane"><button type="button" class="primar" id="btn-porn">Pornește (motor rece)</button><button type="button" id="btn-stop">Oprește</button></div>
      <div class="rand-butoane regimuri">${Object.entries(BAZA_REG).map(([k, t]) => `<button type="button" data-reg="${k}">${t === "ralanti" ? "Ralanti" : t + " rot/min"}</button>`).join("")}</div>
      <button type="button" class="lat" id="btn-cons">Consumatori</button>
      <div class="rand-butoane"><button type="button" id="btn-acc">Accelerare bruscă</button><button type="button" id="btn-dec">Decelerare (clapetă închisă)</button></div>
      <label class="camp">Timpul simulat (încălzire, consum) <select id="sel-viteza"><option value="1">×1 (timp real)</option><option value="5" selected>×5</option><option value="10">×10</option></select></label>
      <h2>Instrumentul</h2>
      <div class="comutator-aparat" role="group"><button type="button" data-aparat="obd">Tester OBD</button><button type="button" data-aparat="osc">Osciloscop</button><button type="button" data-aparat="cantar">Cântar</button></div>
      <div class="panou-aparat" data-p="obd">
        <div class="tableta"><div class="ecran-tester"><div class="tester-antet"><span>TESTER OBD</span><span>date live</span><span></span></div><div id="obd-live"></div>
          <canvas id="cv-obd" height="190" aria-label="Graficul turației și al timpului de injecție"></canvas><p class="nota" id="obd-cit"></p></div></div>
        <div class="rand-butoane"><button type="button" class="primar" id="btn-inc">● Încălzire → Tabelul 1.1</button><button type="button" class="primar" id="btn-reg">● Regim → Tabelul 1.2</button></div>
        <button type="button" class="lat" id="btn-ing">Îngheață graficul</button>
        <div class="rand-butoane mic"><button type="button" data-tr="timax">t<sub>i</sub> max (A)</button><button type="button" data-tr="ncut">n întrerupere (A)</button><button type="button" data-tr="nres">n reluare (A)</button><button type="button" data-tr="dur">durata (A–B)</button></div>
      </div>
      <div class="panou-aparat" data-p="osc" hidden>
        <p class="nota">Opriți imaginea (STOP); cursorul A pe frontul descendent (începutul comenzii), cursorul B pe vârful de autoinducție (sfârșitul comenzii).</p>
        <button type="button" class="primar lat" id="btn-osc">● t<sub>i</sub> osciloscop (A–B) → Tabelul 1.2</button>
      </div>
      <div class="panou-aparat" data-p="cantar" hidden>
        <div id="cantar" class="cantar"></div>
        <button type="button" class="lat" id="btn-cron">▶ START măsurare consum</button>
        <button type="button" class="primar lat" id="btn-mas">● Trece măsurarea în Tabelul 1.3</button>
      </div>
      <p class="nota" id="msg-inreg" aria-live="polite"></p>
      <details class="setari"><summary>Afișare</summary><label class="bifa"><input type="checkbox" id="ck-et" checked> Etichete pe machetă</label></details>
    </aside>
  </div>`,
    init(C) {
      legaOsc(); legaGraficOBD(); porneste3D();
      $("#osc-t").value = String(sim.osc.tdiv);
      $("#osc-t").addEventListener("change", e => { sim.osc.tdiv = +e.target.value; });
      $("#osc-mod").addEventListener("change", e => { sim.osc.benzi = e.target.value === "benzi"; deseneazaOsc(); });
      $("#osc-run").addEventListener("click", () => { sim.osc.ruleaza = !sim.osc.ruleaza; $("#osc-run").textContent = sim.osc.ruleaza ? "STOP" : "RUN"; deseneazaOsc(); });
      ecranComplet($(".sim-grila"), $("#btn-ecran"));
      ["fullscreenchange", "webkitfullscreenchange"].forEach(ev => document.addEventListener(ev, () => setTimeout(deseneazaOsc, 120)));
      $("#btn-porn").addEventListener("click", pornire);
      $("#btn-stop").addEventListener("click", opreste);
      $$("[data-reg]").forEach(b => b.addEventListener("click", () => regim(b.dataset.reg)));
      $("#btn-cons").addEventListener("click", () => { if (sim.mod !== "stab") return; sim.cons = !sim.cons; sim.tReg = 0; actualizeazaPanou(); });
      $("#btn-acc").addEventListener("click", accelerare);
      $("#btn-dec").addEventListener("click", decelerare);
      $("#sel-viteza").addEventListener("change", e => { sim.viteza = +e.target.value; });
      $$("[data-aparat]").forEach(b => b.addEventListener("click", () => { sim.aparat = b.dataset.aparat; actualizeazaPanou(); deseneazaOsc(); }));
      $("#btn-inc").addEventListener("click", inregIncalzire);
      $("#btn-reg").addEventListener("click", inregRegim);
      $("#btn-osc").addEventListener("click", inregOsc);
      $("#btn-ing").addEventListener("click", () => { sim.ingheta = !sim.ingheta; actualizeazaPanou(); deseneazaGraficOBD(); });
      $$("[data-tr]").forEach(b => b.addEventListener("click", e => inregTr(e, b.dataset.tr)));
      $("#btn-cron").addEventListener("click", cronometru);
      $("#btn-mas").addEventListener("click", inregConsum);
      sim.T = P().T0; actualizeazaPanou();
      C.mesaj("Bifați exhaustarea, porniți motorul rece și urmăriți încălzirea (Tabelul 1.1) la ralanti.", "");
    },
    aplicaEval(P2) { sim.T = P2.T0; },
    reset() { Object.assign(sim, { motor: false, ts: 0, tPorn: 0, n: 0, ti: 0, mod: "stab", reg: "ral", cons: false, masa: 2500, cron: null, ultimaMas: null, hist: [], ingheta: false }); sim.T = P().T0; },
    cadru(dt0, C, vizibil) {
      const acum = performance.now(), dt = Math.min(0.1, Math.max(0, (acum - (sim._t || acum)) / 1000)); sim._t = acum;
      pas(dt);
      if (sim.osc.ruleaza && (vizibil || sim.aparat === "osc")) achizitie();
      if (!vizibil) return;
      if (SV.m3d) SV.m3d.seteaza({ rpm: sim.n, tps: sim.tps, selectat: "inj1", decuplat: {}, vent: sim.cons, tEv: sim.motor ? 200 + sim.T * 2 + sim.n * 0.05 : 25, eticheteVizibile: !($("#ck-et") && !$("#ck-et").checked) });
      if (SV.m3d && SV.sonda !== sim.aparat) { SV.sonda = sim.aparat; SV.m3d.sonda(sim.aparat === "osc" ? "inj1" : null, "osc"); }
      if (acum - (this._ta || 0) > 120) {
        this._ta = acum;
        deseneazaOsc(); liveOBD(); deseneazaGraficOBD(); if (sim.aparat === "cantar") cantarSVG();
        $("#af-n").textContent = fmt(sim.n, 0); $("#af-T").textContent = fmt(sim.motor || sim.tPorn ? sim.T : P().T0, 1);
        $("#af-ti").textContent = sim.motor ? (sim.taiat ? "0 (întrerupt)" : fmt(sim.ti, 2)) : "—";
        $("#af-t").textContent = fmt(sim.tPorn / 60, 1); $("#af-v").textContent = `min (timp ×${sim.viteza})`;
        C.stare(1, sim.motor ? `motor pornit – ${sim.mod === "acc" ? "accelerare" : sim.mod === "dec" ? "decelerare" : REG[cheieReg()] ? REG[cheieReg()].et : BAZA_REG[sim.reg]}${stabil() ? " · stabilizat" : ""}` : "motor oprit", sim.motor ? "inc" : "");
        C.stare(2, sim.motor ? (cald() ? "motor cald" : "încălzire") : "");
        if (sim.motor && !$("#ck-exhaust").checked) C.mesajAuto("Exhaustarea nu este conectată!", "pericol"); else C.mesajAuto("");
      }
    },
    redeseneaza() { deseneazaOsc(); deseneazaGraficOBD(); },
    formule() {
      const p = P(), n = sim.n, T = n > 0 ? 120000 / n : NaN;
      return [
        ["Durata ciclului și factorul de umplere (1.2–1.3)", sim.motor ? `T<sub>ciclu</sub> = 120 000/${fmt(n, 0)} = ${fmt(T, 1)} ms; DC = ${fmt(sim.ti, 2)}/${fmt(T, 1)}·100 = <span class="rez">${fmt(sim.ti / T * 100, 1)} %</span>` : "—"],
        ["Consumul instantaneu (debit din cântar)", sim.motor ? `<span class="rez">${fmt(debitGs() * 3.6, 3)} kg/h</span>` : "—"],
        ["Măsurarea în curs", sim.cron ? `Δt = ${fmt(sim.ts - sim.cron.t0, 1)} s; m = ${fmt(sim.cron.m0 - sim.masa, 1)} g` : "—"]
      ];
    }
  }
});
