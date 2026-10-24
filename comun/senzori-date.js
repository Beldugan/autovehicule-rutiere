/* Atelierul senzorilor (DA L2): pentru fiecare senzor din catalog – modelul 3D (familia și dimensiunile), mufa (pin-out) și verificările animate.
   Pin-out-urile sunt exemple tipice (Bosch / Continental / VAG); numerotarea exactă se ia întotdeauna din schema producătorului.
   Funcțiile de verificare primesc s = mărimea de stimul (0…1) și d = starea aleasă (0 = senzor bun, 1… = defectele din lista def). */
const fr = x => x - Math.floor(x);
const lin = (s, a, b) => a + (b - a) * s;
const zg = t => Math.sin(t * 91371.7) * Math.sin(t * 37133.3 + 1.3);            // zgomot pseudo-aleator
const hash = n => fr(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const NTC = (r25, B = 3450) => T => r25 * Math.exp(B * (1 / (T + 273.15) - 1 / 298.15));
const INF = Infinity;

/* ---------- forme de undă reutilizate */
function ckp(t, rpm, A, d) {          // roata 60 − 2, senzor inductiv
  const pos = t * rpm, i = Math.floor(pos) % 60, f = fr(pos);
  if (i >= 58) return i === 59 && f > 0.7 ? -A * 1.6 * Math.sin(Math.PI * (f - 0.7) / 0.3) : A * 0.05 * Math.sin(2 * Math.PI * f);
  let a = A; if (d === 1 && i === 23) a *= 0.25; if (i === 57) a *= 1.25;
  return a * Math.sin(2 * Math.PI * f);
}
function hallFaza(t, rpm, decal = 0) {   // roată de fază cu 4 segmente inegale pe 720°
  const u = fr(t * rpm / 120 + decal), M = [[0.02, 0.14], [0.27, 0.33], [0.52, 0.71], [0.80, 0.86]];
  return M.some(([a, b]) => u > a && u < b);
}
function lin19(t, octeti, perCadru = 0.01) {    // cadru LIN la 19,2 kbit/s: 1 = recesiv (12 V)
  const tb = 1 / 19200, u = t % perCadru, b = Math.floor(u / tb);
  if (b < 13) return 0;                    // break
  if (b === 13) return 1;
  const k = b - 14, oct = Math.floor(k / 10), bit = k % 10; const L = [0x55, ...octeti];
  if (oct >= L.length) return 1;
  if (bit === 0) return 0; if (bit === 9) return 1;
  return (L[oct] >> (bit - 1)) & 1;
}
function can(t, sem = 1, rata = 500000) {     // bit dominant = 0; returnează [CAN-H, CAN-L]
  const b = Math.floor(t * rata), cadru = Math.floor(b / 130), k = b % 130;
  let dom = k < 108 ? hash(b * 3.1 + sem) > 0.55 : k < 111 ? false : false;
  if (k === 0) dom = true;
  return dom ? [3.5, 1.5] : [2.5, 2.5];
}
function sent(t, val = 0x7a3, tick = 3e-6) { // SENT: sincronizare 56 ticks, stare, 6 nibble-uri, CRC
  const nib = [0, (val >> 8) & 15, (val >> 4) & 15, val & 15, 8, 0, 3, 5], durate = [56, ...nib.map(n => 12 + n)];
  const T = durate.reduce((a, b) => a + b, 0) * tick; let u = t % T;
  for (const n of durate) { const L = n * tick; if (u < L) return u < 5 * tick ? 0.2 : 4.9; u -= L; }
  return 4.9;
}
function burst(t, t0, dur, f, A) { if (t < t0 || t > t0 + dur) return 0; const e = Math.sin(Math.PI * (t - t0) / dur); return A * e * Math.sin(2 * Math.PI * f * t); }

/* ---------- constructorii verificărilor */
const ohm = (t, pini, val, def, pasi, o = {}) => ({ t, ap: "ohm", pini, mufa: o.mufa || "deconectat", stim: o.stim, val, def, pasi, apN: o.apN });
const volt = (t, pini, val, def, pasi, o = {}) => ({ t, ap: "v", pini, mufa: o.mufa || "conectat", stim: o.stim, val, def, pasi, dec: o.dec });
const amp = (t, pini, val, def, pasi, o = {}) => ({ t, ap: "ma", pini, mufa: "serie", stim: o.stim, val, def, pasi });
const osc = (t, pini, unda, sc, def, pasi, o = {}) => ({ t, ap: "osc", pini, pini2: o.pini2, mufa: o.mufa || "conectat", stim: o.stim, unda, sc, def, pasi });
const tst = (t, randuri, def, pasi, o = {}) => ({ t, ap: "tester", randuri, dtc: o.dtc || [], stim: o.stim, def, pasi });
const S = (n, u, a, b, fix) => ({ n, u, a, b, fix });

/* ---------- verificări tip (șabloane) */
function tNTC(pini, r25, B, ctx, Tmin = 20, Tmax = 90) {
  const R = NTC(r25, B);
  return ohm(`Rezistența termistorului NTC în funcție de temperatură`, pini, (s, d) => d === 1 ? INF : d === 2 ? 0.4 : R(lin(s, Tmin, Tmax)) * (d === 3 ? 1.6 : 1),
    [["Senzor bun", `R scade după curba NTC (≈ ${(r25 / 1000).toFixed(1).replace(".", ",")} kΩ la 25 °C); comparați cu tabelul producătorului la 2–3 temperaturi.`],
     ["Întrerupt", "OL – ECU vede tensiune ≈ 5 V și afișează −40 °C (cod „circuit deschis / tensiune mare”)."],
     ["Scurtcircuit intern", "≈ 0 Ω – ECU vede ≈ 0 V și afișează peste 140 °C (cod „tensiune mică”)."],
     ["Derivă (îmbătrânit)", "R cu ≈ 60 % prea mare: ECU citește cu ≈ 10 °C mai puțin – fără cod, dar amestec bogat / ventilator pornit târziu."]],
    `Mufa desfăcută; ohmmetrul pe pinii senzorului. Încălziți senzorul (${ctx}) și urmăriți scăderea rezistenței.`, { stim: S("Temperatura senzorului", "°C", Tmin, Tmax) });
}
function tNTCvolt(pini, r25, B, Rp = 2490, Tmin = 20, Tmax = 90) {
  const R = NTC(r25, B);
  return volt("Tensiunea pe semnal, cu mufa cuplată (divizorul din ECU)", pini, (s, d) => { const r = d === 1 ? 1e9 : d === 2 ? 0.4 : R(lin(s, Tmin, Tmax)); return d === 3 ? 0 : 5 * r / (r + Rp); },
    [["Senzor bun", "Tensiunea scade lin cu temperatura (≈ 3,5 V la rece, ≈ 0,5…1 V cald)."], ["Senzor întrerupt", "≈ 5 V constant – ECU afișează −40 °C."], ["Senzor în scurt", "≈ 0 V – ECU afișează temperatura maximă."], ["Fir de semnal la masă", "0 V și cu mufa desfăcută – defectul este în cablaj, nu în senzor."]],
    "Contact pus, mufa cuplată, voltmetrul prin spatele mufei (sonde subțiri) între semnal și masa senzorului.", { stim: S("Temperatura senzorului", "°C", Tmin, Tmax) });
}
function tAlim(pini, U = 5, txt = "referința de 5 V") {
  return volt(`Alimentarea senzorului (${txt})`, pini, (s, d) => d === 1 ? 0 : d === 2 ? U - 0.8 : U + 0.02 * zg(s * 9),
    [["Corect", `${String(U).replace(".", ",")} V ± 0,1 V cu contactul pus.`], ["Lipsă alimentare", "0 V: fir întrerupt, siguranță arsă sau referința din ECU în scurt (alt senzor pe aceeași referință)."], ["Masă slabă / contact oxidat", `Tensiune mai mică cu ≈ 0,8 V: cădere de tensiune pe masă – măsurați căderea de tensiune între masa senzorului și masa ECU (≤ 0,1 V).`]],
    "Contact pus, mufa desfăcută; voltmetrul între pinul de alimentare și pinul de masă al mufei (partea cablajului).", { mufa: "cablaj" });
}
function tBobina(pini, R0, ctx) {
  return ohm(`Rezistența ${ctx}`, pini, (s, d) => d === 1 ? INF : d === 2 ? R0 * 0.15 : R0 * (1 + 0.0039 * (lin(s, 20, 80) - 20)),
    [["Bun", `≈ ${String(R0).replace(".", ",")} Ω la 20 °C (crește cu ≈ 0,4 %/°C).`], ["Întrerupt", "OL."], ["Spire în scurt", "Rezistență mult mai mică decât valoarea nominală."]],
    "Mufa desfăcută; ohmmetrul pe cei doi pini ai bobinei. Comparați cu valoarea din documentația de service.", { stim: S("Temperatura", "°C", 20, 80) });
}
function tCAN(pini) {
  return osc("Semnalele CAN-H și CAN-L pe osciloscop", [pini[0], "masa"], (t, s, d) => { const [h, l] = can(t); if (d === 1) return [h > 3 ? 3.5 : 2.5, 0.05]; if (d === 2) return [2.5 + (h - 2.5) * 0.15 + 0.03 * zg(t), 2.5 - (2.5 - l) * 0.15]; if (d === 3) return [h + 0.35 * Math.sin(t * 2e6) * (h > 3 ? 1 : 0.3), l - 0.35 * Math.sin(t * 2e6) * (l < 2 ? 1 : 0.3)]; return [h, l]; },
    { per: 1e-4, v: [0, 5], div: "10 µs/div · 1 V/div" },
    [["Magistrala bună", "Recesiv 2,5 V / 2,5 V; dominant CAN-H ≈ 3,5 V și CAN-L ≈ 1,5 V, imagini în oglindă, fronturi curate."], ["CAN-L în scurt la masă", "CAN-L ≈ 0 V; magistrala poate funcționa în mod degradat (CAN de confort) sau cade complet."], ["Terminație lipsă / fir întrerupt", "Diferență foarte mică între niveluri – rezistența dintre CAN-H și CAN-L (contact luat) ≈ 120 Ω în loc de 60 Ω."], ["Reflexii (ramificație lungă, fire nerăsucite)", "Oscilații pe fronturi – erori de cadru, coduri U0xxx intermitente."]],
    "Osciloscop cu 2 canale, CH1 pe CAN-H, CH2 pe CAN-L, masa la masa vehiculului. Cu contactul luat se măsoară și rezistența CAN-H–CAN-L (≈ 60 Ω).", { pini2: [pini[1], "masa"] });
}
function tLIN(pini, octeti, ctx) {
  return osc(`Cadrele LIN ale senzorului (${ctx})`, [pini[0], "masa"], (t, s, d) => { if (d === 1) return 12.3; if (d === 2) return 0.6; const b = lin19(t, octeti); return (b ? 12.2 : 0.9) + 0.08 * zg(t); },
    { per: 0.012, v: [-1, 15], div: "1 ms/div · 2 V/div" },
    [["Comunicare corectă", "Pauză (break) de 13 biți, octetul de sincronizare 0x55, identificatorul și datele; nivel recesiv ≈ U baterie, dominant < 2 V."], ["Senzorul nu răspunde", "Linie la ≈ 12 V fără cadre: senzor fără alimentare/masă sau defect; master-ul trece în modul de avarie."], ["Linia LIN la masă", "≈ 0 V permanent – toți participanții de pe linie sunt blocați."]],
    "Contact pus, osciloscop pe firul LIN (prin spatele mufei) față de masă, bază de timp 1 ms/div.");
}
function tRat(t, pini, Ufn, stim, def, pasi, o) { return volt(t, pini, Ufn, def, pasi, { stim, ...o }); }

/* ---------- datele pe senzori: m = [familia 3D, opțiuni], pini = [nr, funcția, firul tipic, valoarea / legătura] */
export const SENZORI = {
  ckp: { m: ["flansa", { L: 46, d: 16, mufa: "directa" }],
    pini: [[1, "Semnal + (capătul bobinei)", "negru", "tensiune alternativă la ECU"], [2, "Semnal − (celălalt capăt)", "alb", "masa de semnal din ECU"], [3, "Ecranare", "—", "masa ECU (doar la unele modele)"]],
    teste: [
      tBobina([1, 2], 880, "bobinei senzorului inductiv"),
      osc("Semnalul pe osciloscop la pornire și la turații diferite", [1, 2], (t, s, d) => { const rpm = lin(s, 250, 3000); const A = 0.3 + rpm * 0.004; const v = ckp(t, rpm / 60, d === 2 ? A * 0.3 : A, d); return d === 3 ? -v : v; },
        { per: s => 60 / lin(s, 250, 3000), v: [-16, 16], div: "1 rotație / ecran · 4 V/div" },
        [["Senzor bun", "Sinusoidă cu amplitudinea crescând cu turația, golul celor 2 dinți lipsă vizibil o dată pe rotație."], ["Dinte deteriorat", "O alternanță mai mică în mijlocul șirului – rateuri de aprindere false, P0300 / P0335 intermitent."], ["Întrefier prea mare", "Amplitudine de 3× mai mică; la pornire ECU nu recunoaște semnalul (motorul pornește greu)."], ["Fire inversate", "Semnal inversat: ECU detectează golul decalat – avans greșit, pornire dificilă."]],
        "Osciloscop între pinii 1 și 2 (prin spatele mufei), rotiți motorul cu demarorul, apoi la ralanti și accelerat.", { stim: S("Turația motorului", "rot/min", 250, 3000) })] },
  cmp: { m: ["flansa", { L: 30, d: 18, mufa: "directa" }],
    pini: [[1, "Alimentare 5 V (sau 12 V)", "roșu", "de la ECU / releu principal"], [2, "Semnal (colector deschis)", "verde", "0 / 5 V la ECU"], [3, "Masă", "maro", "masa de semnal ECU"]],
    teste: [tAlim([1, 3]),
      osc("Corelarea fazei: CMP (CH1) cu CKP (CH2)", [2, "masa"], (t, s, d) => { const rpm = 800 / 60 * 60; if (d === 1) return [4.9, ckp(t, 800 / 60, 3, 0) * 0.5]; return [hallFaza(t, 800, d === 2 ? 0.06 : 0) ? 0.25 : 4.9, ckp(t, 800 / 60, 3, 0) * 0.5]; },
        { per: 0.15, v: [-4, 6], div: "15 ms/div · CH1 2 V/div" },
        [["Bun", "Dreptunghiuri curate 0,2 / 4,9 V; fronturile cad mereu în aceleași poziții față de golul CKP."], ["Fără semnal", "5 V constant: senzor defect sau roata de fază lipsă – motorul pornește mai greu (injecție simultană), P0340."], ["Distribuție decalată (lanț întins / curea sărită)", "Fronturile CMP sunt deplasate cu 1–2 dinți față de golul CKP: P0016, pierdere de putere."]],
        "Osciloscop cu 2 canale: CH1 pe semnalul CMP, CH2 pe CKP, la ralanti.", { pini2: ["CKP", "masa"] })] },
  maf: { m: ["maf", {}],
    pini: [[1, "Semnal temperatură aer (NTC)", "galben", "divizor în ECU"], [2, "Alimentare +12 V", "roșu", "releul principal"], [3, "Masă", "maro", "masa ECU"], [4, "Semnal debit (frecvență)", "verde", "intrare de frecvență ECU"]],
    teste: [
      osc("Frecvența semnalului de debit la ralanti și la accelerare", [4, 3], (t, s, d) => { if (d === 2) return 0.1; const m = lin(s, 3, 60) * (d === 1 ? 0.78 : 1); const f = 1800 + m * 160; return fr(t * f) < 0.5 ? 4.8 : 0.2; },
        { per: 0.004, v: [-1, 6], div: "0,4 ms/div · 1 V/div" },
        [["Bun", "≈ 2,3 kHz la ralanti (3 g/s), > 10 kHz la sarcină plină; frecvența urmărește clapeta fără întârziere."], ["Element murdar", "Frecvență mai mică cu ≈ 20 %: ECU subestimează aerul – amestec sărac, LTFT mare pozitiv, fără cod."], ["Fără semnal", "Linie la 0 V – ECU folosește un model de rezervă (turația × clapeta), cod P0100."]],
        "Motor pornit, osciloscop pe semnal (pin 4) față de masa senzorului; măsurați frecvența la ralanti și la accelerare.", { stim: S("Debitul de aer", "g/s", 3, 60) }),
      tst("Date live: debit măsurat vs. calculat și corecțiile de amestec", [["Turație", (s) => `${Math.round(lin(s, 800, 3000))} rot/min`], ["Debit MAF", (s, d) => `${(lin(s, 3, 22) * (d === 1 ? 0.78 : 1)).toFixed(1)} g/s`], ["Debit calculat (din MAP)", (s) => `${lin(s, 3, 22).toFixed(1)} g/s`], ["STFT", (s, d) => d === 1 ? "+9 %" : "+1 %"], ["LTFT", (s, d) => d === 1 ? "+17 %" : "+2 %"]],
        [["Bun", "Debit măsurat ≈ calculat (± 10 %), corecții mici."], ["Element murdar", "Debit măsurat mai mic, LTFT > +15 %: curățați cu spray pentru MAF sau înlocuiți."]],
        "Testerul pe priza OBD, grup de date live „admisie”; motor cald, ralanti și 3000 rot/min.", { stim: S("Turația", "rot/min", 800, 3000), dtc: ["", "P0171 – amestec prea sărac (banc 1)"] })] },
  map: { m: ["bloc", { w: 34, h: 18, d: 26, stut: 1, mufa: 3 }],
    pini: [[1, "Masă", "maro", "masa senzorilor ECU"], [2, "Alimentare 5 V", "roșu", "referința ECU"], [3, "Semnal presiune", "verde", "0,5…4,5 V la ECU"]],
    teste: [
      volt("Caracteristica U = f(p) cu pompa de vid", [3, 1], (s, d) => { const p = lin(s, 101, 20); if (d === 1) return 4.23; return (p - 10) / 21.5 + (d === 2 ? 0.45 : 0); },
        [["Bun", "≈ 4,2 V la 101 kPa; scade liniar cu vidul (≈ 1,3 V la 38 kPa)."], ["Membrană fisurată / furtun spart", "Tensiunea nu scade la aplicarea vidului."], ["Derivă de offset", "Tensiunea mai mare cu ≈ 0,45 V la toate presiunile: ECU vede sarcină mai mare – amestec bogat."]],
        "Contact pus, motor oprit; pompa de vid manuală pe ștuțul senzorului, voltmetrul pe semnal (prin spatele mufei).", { stim: S("Presiunea absolută (pompa de vid)", "kPa", 101, 20) }),
      osc("Accelerare bruscă: răspunsul dinamic", [3, 1], (t, s, d) => { const u = fr(t / 3); const p = u < 0.3 ? 35 : u < 0.4 ? 95 - (u - 0.3) * 0 : 35 + 60 * Math.exp(-(u - 0.4) * 25); const pp = d === 1 ? 35 + (p - 35) * 0.25 : p; return (pp - 10) / 21.5 + 0.03 * zg(t); },
        { per: 3, v: [0, 5], div: "300 ms/div · 1 V/div", roll: true },
        [["Bun", "Salt rapid la ≈ 4 V la deschiderea clapetei și revenire sub 1,5 V la închidere."], ["Furtun înfundat / îngheț", "Răspuns leneș și redus – întârziere la accelerare, fum negru (diesel)."]],
        "Motor la ralanti, osciloscop în mod „roll” pe semnal; apăsați scurt accelerația până la capăt.")] },
  iat: { m: ["filet", { varf: "ntcAer", hex: 14, filet: 10, mufa: 2 }],
    pini: [[1, "Semnal (NTC)", "galben", "ECU, rezistență de polarizare 2,49 kΩ la 5 V"], [2, "Masă senzor", "maro", "masa ECU"]],
    teste: [tNTC([1, 2], 2000, 3400, "cu un uscător de păr", 20, 60), tNTCvolt([1, 2], 2000, 3400, 2490, 20, 60)] },
  tmap: { m: ["bloc", { w: 30, h: 22, d: 26, stut: 1, mufa: 4, ntc: true }],
    pini: [[1, "Masă", "maro", "masa senzorilor"], [2, "Semnal temperatură (NTC)", "galben", "ECU"], [3, "Alimentare 5 V", "roșu", "referința ECU"], [4, "Semnal presiune", "verde", "0,5…4,5 V"]],
    teste: [
      volt("Presiunea de supraalimentare la sarcină", [4, 1], (s, d) => { const p = lin(s, 100, 240) * (d === 1 ? lin(s, 1, 0.75) : 1); return 0.5 + 4 * (p - 20) / 280; },
        [["Bun", "≈ 1,6 V la presiunea atmosferică; ≈ 3,6 V la 240 kPa absolut."], ["Pierdere de presiune pe traseu", "Presiunea măsurată rămâne sub cea cerută la sarcină – furtun intercooler fisurat, P0299."]],
        "Probă de drum / pe stand cu testerul conectat; voltmetrul sau testerul pe semnalul de presiune, accelerare în treapta a 3-a.", { stim: S("Presiunea cerută", "kPa", 100, 240) }),
      tNTC([2, 1], 2000, 3400, "aerul de după intercooler", 20, 70)] },
  tps: { m: ["clapeta", {}],
    pini: [[1, "Motor clapetă +", "albastru", "punte H în ECU"], [2, "Masă senzori", "maro", "masa ECU"], [3, "Semnal pista 2", "alb", "4,5→0,5 V"], [4, "Motor clapetă −", "violet", "punte H în ECU"], [5, "Alimentare 5 V", "roșu", "referința ECU"], [6, "Semnal pista 1", "verde", "0,5→4,5 V"]],
    teste: [
      osc("Cele două piste la deschiderea clapetei (test activ)", [6, 2], (t, s, d) => { const a = 0.5 + 4 * s; let b = 4.5 - 4 * s; let x = a; if (d === 1 && s > 0.32 && s < 0.36) x = 0.2; if (d === 2) b += 0.6; return [x + 0.02 * zg(t), b + 0.02 * zg(t + 1)]; },
        { per: 8, v: [0, 5], div: "1 s/div · 1 V/div", roll: true },
        [["Bun", "Pista 1 crește 0,5→4,5 V, pista 2 scade 4,5→0,5 V, suma ≈ 5 V, fără întreruperi."], ["Pistă uzată (zonă moartă)", "Cădere scurtă la 0 V pe o porțiune: sacadări la accelerare constantă, cod de plauzibilitate."], ["Incoerență între piste", "Suma pistelor ≠ 5 V: ECU trece în mod avarie (clapetă fixă ≈ 7°, turație limitată), P2135."]],
        "Contact pus, osciloscop cu 2 canale pe pinii 6 și 3; deschideți clapeta cu testul activ al testerului (sau apăsând pedala).", { stim: S("Deschiderea clapetei", "%", 0, 100), pini2: [3, 2] }),
      tBobina([1, 4], 1.8, "motorului de curent continuu al clapetei")] },
  app: { m: ["pedala", {}],
    pini: [[1, "Alimentare 5 V pista 2", "roșu", "referința 2"], [2, "Alimentare 5 V pista 1", "roșu/alb", "referința 1"], [3, "Masă pista 1", "maro", "masa 1"], [4, "Semnal pista 1", "verde", "0,7…4,3 V"], [5, "Masă pista 2", "maro/alb", "masa 2"], [6, "Semnal pista 2", "galben", "0,35…2,15 V"]],
    teste: [
      osc("Pistele pedalei la apăsare lentă", [4, 3], (t, s, d) => { let a = 0.75 + 3.5 * s, b = 0.375 + 1.75 * s; if (d === 1 && s > 0.55 && s < 0.6) a = 0.3; if (d === 2) b = 0.375 + 1.2 * s; return [a, b]; },
        { per: 8, v: [0, 5], div: "1 s/div · 1 V/div", roll: true },
        [["Bun", "Două drepte, a doua la jumătate din prima, raport constant pe toată cursa."], ["Pistă întreruptă local", "Cădere scurtă pe pista 1 – ECU detectează incoerența, regim de avarie (turație limitată la 1200…1500 rot/min)."], ["Raport greșit", "Pista 2 nu mai urmează jumătatea pistei 1 – P2138."]],
        "Contact pus, motor oprit; osciloscop pe pinii 4 și 6, apăsați pedala lent până la capăt.", { stim: S("Cursa pedalei", "%", 0, 100), pini2: [6, 5] }),
      tAlim([2, 3], 5, "referința 1")] },
  knock: { m: ["knock", {}],
    pini: [[1, "Semnal +", "negru", "intrare diferențială ECU"], [2, "Semnal −", "gri", "intrare diferențială ECU"]],
    teste: [
      osc("Răspunsul la lovituri ușoare lângă senzor", [1, 2], (t, s, d) => { const u = fr(t / 0.5); const b = u < 0.12 ? Math.exp(-u * 40) * Math.sin(2 * Math.PI * 7000 * t) * (d === 1 ? 0.05 : d === 2 ? 0.3 : 1.2) : 0; return b + 0.02 * zg(t); },
        { per: 0.5, v: [-1.5, 1.5], div: "50 ms/div · 0,5 V/div" },
        [["Bun", "Fiecare lovitură produce o oscilație amortizată de câteva sute de mV."], ["Senzor fisurat / neconectat", "Nicio reacție – ECU reduce preventiv avansul (P0325), consum crescut."], ["Strâns cu cuplu greșit", "Amplitudine mică: senzorul este decuplat mecanic de bloc – strângeți la 20 N·m, fără șaibe."]],
        "Motor oprit, osciloscop între pinii senzorului; loviți ușor blocul lângă senzor cu o cheie (nu senzorul!)."),
      ohm("Rezistența de izolație a cristalului", [1, 2], (s, d) => d === 1 ? 1200 : 4.8e6,
        [["Bun", "> 1 MΩ (cristalul piezo nu conduce; unele variante au un rezistor de diagnoză ≈ 0,5…5 MΩ)."], ["Pătrundere umezeală", "Câțiva kΩ – semnal atenuat, cod de plauzibilitate."]],
        "Mufa desfăcută; ohmmetrul pe domeniul de MΩ între cei doi pini.")] },
  prail: { m: ["filet", { varf: "presiune", hex: 27, filet: 14, mufa: 3, corp: "metal" }],
    pini: [[1, "Masă", "maro", "masa senzorilor"], [2, "Semnal presiune", "verde", "0,5…4,5 V (sau SENT)"], [3, "Alimentare 5 V", "roșu", "referința ECU"]],
    teste: [
      volt("Tensiunea de offset cu motorul oprit și presiunea la pornire", [2, 1], (s, d) => { if (d === 1) return 0.95; if (d === 2) return 0.5 + 0.2 * s; return 0.5 + 3.4 * s; },
        [["Bun", "≈ 0,5 V fără presiune; crește la 3,5…4 V la pornire (35 MPa la GDI, 30 MPa la ralanti diesel)."], ["Offset mărit", "≈ 0,95 V cu motorul oprit: senzorul indică presiune inexistentă – pornire grea, P0191."], ["Pompa de înaltă presiune nu crește presiunea", "Tensiune aproape de offset la pornire – defect hidraulic (pompă, supapă de reglare), nu de senzor."]],
        "Voltmetrul pe semnal (prin spatele mufei). Contact pus (motor oprit), apoi porniți motorul.", { stim: S("Timp de la pornire", "s", 0, 3) }),
      tst("Presiunea cerută și cea reală", [["Turație", (s) => `${Math.round(lin(s, 800, 3500))} rot/min`], ["Presiune cerută", (s) => `${(lin(s, 35, 140)).toFixed(0)} bar`], ["Presiune reală", (s, d) => `${(lin(s, 35, 140) * (d === 1 ? lin(s, 1, 0.7) : 1)).toFixed(0)} bar`], ["Curent supapă reglare", (s, d) => `${(lin(s, 0.6, 1.1) + (d === 1 ? 0.35 : 0)).toFixed(2)} A`]],
        [["Bun", "Presiunea reală urmărește cererea (± 5 %)."], ["Pompă uzată / filtru colmatat", "Presiunea reală rămâne în urmă la sarcină, curentul supapei crește spre maxim – P0087."]],
        "Testerul, grupul de date „sistem de combustibil”, accelerare treptată.", { stim: S("Turația", "rot/min", 800, 3500), dtc: ["", "P0087 – presiune prea mică în rampă"] })] },
  pjp: { m: ["filet", { varf: "presiune", hex: 22, filet: 12, mufa: 3 }],
    pini: [[1, "Masă", "maro", "masa senzorilor"], [2, "Semnal", "verde", "0,5…4,5 V"], [3, "Alimentare 5 V", "roșu", "referința"]],
    teste: [
      volt("Presiunea pe tur comparată cu un manometru", [2, 1], (s, d) => d === 1 ? 0.5 + 0.4 * lin(s, 0, 6) * 0.6 : 0.5 + 0.4 * lin(s, 0, 6),
        [["Bun", "0,5 V la 0 bar, 0,4 V/bar; la 5 bar ≈ 2,5 V, egal cu manometrul."], ["Pompa din rezervor slabă", "Senzorul și manometrul indică amândouă presiune mică – defectul e în pompă/filtru."]],
        "Manometrul în paralel pe ștuțul de testare; contact pus (pompa pornește), voltmetrul pe semnal.", { stim: S("Presiunea pe tur", "bar", 0, 6) }),
      tAlim([3, 1])] },
  vvt: { m: ["flansa", { L: 30, d: 18, mufa: "directa" }],
    pini: [[1, "Alimentare 5 V", "roșu", "ECU"], [2, "Semnal", "verde", "0 / 5 V"], [3, "Masă", "maro", "ECU"]],
    teste: [
      osc("Decalajul arborelui cu came la comanda VVT", [2, "masa"], (t, s, d) => [hallFaza(t, 1500, (d === 1 ? 0 : s * 0.07)) ? 0.25 : 4.9, ckp(t, 25, 3, 0) * 0.5],
        { per: 0.08, v: [-4, 6], div: "8 ms/div" },
        [["Bun", "Fronturile CMP se deplasează față de CKP proporțional cu comanda (până la 40…50° RAC)."], ["Variator blocat", "Fronturile nu se mișcă la comandă: supapă de control blocată / ulei murdar – P0011."]],
        "Osciloscop cu 2 canale (CMP și CKP) și testul activ VVT din tester la ≈ 1500 rot/min.", { stim: S("Comanda VVT", "°RAC", 0, 40), pini2: ["CKP", "masa"] }),
      tst("Unghiul real vs. cerut", [["Unghi cerut", (s) => `${(s * 40).toFixed(0)} °RAC`], ["Unghi real", (s, d) => `${d === 1 ? "0" : (s * 39).toFixed(0)} °RAC`], ["Presiune ulei", () => "2,4 bar"], ["Factor comandă supapă", (s, d) => `${(20 + s * 60 + (d === 1 ? 20 : 0)).toFixed(0)} %`]],
        [["Bun", "Unghiul real urmează cererea în < 0,5 s."], ["Variator blocat", "Unghi real 0 indiferent de cerere – P0011 / P0016."]],
        "Testerul, date live VVT, motor cald.", { stim: S("Unghi cerut", "°RAC", 0, 40), dtc: ["", "P0011 – poziția arborelui cu came, avans excesiv / performanță"] })] },
  pozAct: { m: ["bloc", { w: 46, h: 30, d: 40, stut: 0, mufa: 5, ax: true }],
    pini: [[1, "Motor +", "albastru", "punte H"], [2, "Motor −", "violet", "punte H"], [3, "Alimentare 5 V", "roșu", "referința"], [4, "Semnal poziție", "verde", "0,5…4,5 V / SENT"], [5, "Masă senzor", "maro", "ECU"]],
    teste: [
      osc("Poziția reală în timpul testului activ", [4, 5], (t, s, d) => { const cer = 0.5 + 4 * (fr(t / 6) < 0.5 ? 0.9 : 0.1); return d === 1 ? Math.min(cer, 2.6) : cer - 0.15 * Math.exp(-fr(t / 3) * 20); },
        { per: 6, v: [0, 5], div: "0,6 s/div", roll: true },
        [["Bun", "Poziția urmează comanda complet, fără oscilații."], ["Clapetă EGR blocată de calamină", "Poziția se oprește la jumătate – P0405 / P0489, regenerări DPF dese."]],
        "Testul activ din tester; osciloscopul pe semnalul de poziție."),
      tBobina([1, 2], 3.5, "motorului actuatorului")] },
  l1: { m: ["filet", { varf: "lambda", hex: 22, filet: 18, mufa: 6, cablu: true }],
    pini: [[1, "IP – curent de pompare", "roșu", "ECU (CJ125 / CJ135)"], [2, "VM – masă virtuală", "galben", "≈ 2,5 V"], [3, "H− încălzire", "alb", "comandă PWM la masă (ECU)"], [4, "H+ încălzire", "gri", "+12 V releu"], [5, "IA / RT – rezistor de calibrare", "verde", "în mufă"], [6, "UN – tensiune Nernst", "negru", "ECU"]],
    teste: [
      ohm("Rezistența încălzitorului", [3, 4], (s, d) => d === 1 ? INF : 3.2 * (1 + 0.002 * (lin(s, 20, 60) - 20)),
        [["Bun", "≈ 2…4 Ω la 20 °C (LSU 4.9 ≈ 3,2 Ω)."], ["Încălzitor întrerupt", "OL – sonda nu ajunge la temperatura de lucru, P0030 / P0135, bucla λ rămâne deschisă."]],
        "Mufa desfăcută; ohmmetrul pe pinii încălzitorului (fire albe/gri).", { stim: S("Temperatura sondei", "°C", 20, 60) }),
      tst("Valoarea λ și curentul de pompare în regimuri diferite", [["Regim", (s) => s < 0.33 ? "ralanti" : s < 0.66 ? "accelerare" : "decelerare (injecție întreruptă)"], ["λ real", (s, d) => d === 1 ? "1,00" : s < 0.33 ? "1,00" : s < 0.66 ? "0,88" : "> 1,6 (aer)"], ["Curent IP", (s, d) => d === 1 ? "0,00 mA" : s < 0.33 ? "0,00 mA" : s < 0.66 ? "−0,9 mA" : "+2,5 mA"], ["Temperatura celulei", (s, d) => d === 2 ? "420 °C" : "780 °C"]],
        [["Bun", "λ = 1 la ralanti, < 1 la accelerare, foarte mare la decelerare (aer) – reacție în < 0,3 s."], ["Sondă blocată", "λ = 1,00 în toate regimurile – sondă defectă sau înlocuită de un emulator."], ["Încălzire insuficientă", "Temperatura celulei sub 700 °C – măsurare instabilă, P0135."]],
        "Testerul pe date live; motor cald, ralanti → accelerare bruscă → decelerare cu piciorul ridicat.", { stim: S("Succesiunea regimurilor", "", 0, 1), dtc: ["", "P2195 – sonda λ blocată pe sărac", "P0135 – circuitul încălzitorului sondei λ"] })] },
  l2: { m: ["filet", { varf: "lambda", hex: 22, filet: 18, mufa: 4, cablu: true }],
    pini: [[1, "Încălzire +12 V", "alb", "releu"], [2, "Încălzire − (comandă)", "alb", "ECU, PWM la masă"], [3, "Semnal − (masă)", "gri", "masa de semnal ECU"], [4, "Semnal +", "negru", "0,1…0,9 V la ECU"]],
    teste: [
      osc("Semnalul sondei aval comparat cu sonda amonte", [4, 3], (t, s, d) => { const am = 0.45 + 0.4 * Math.tanh(4 * Math.sin(2 * Math.PI * 1.2 * t)); const av = d === 1 ? am * 0.95 + 0.02 : d === 2 ? 0.12 + 0.01 * zg(t) : 0.68 + 0.03 * Math.sin(t * 0.7); return [av, am]; },
        { per: 4, v: [0, 1], div: "0,4 s/div · 0,1 V/div", roll: true },
        [["Catalizator și sondă bune", "Sonda aval rămâne la 0,6…0,75 V aproape constant, cât timp sonda amonte comută."], ["Catalizator epuizat", "Sonda aval copiază comutările sondei amonte – capacitatea de stocare a oxigenului a dispărut, P0420."], ["Aer fals la evacuare / sondă otrăvită", "≈ 0,1 V permanent – fisură înaintea sondei sau sondă defectă."]],
        "Motor cald la 2000 rot/min; CH1 pe semnalul sondei aval, CH2 pe sonda amonte (cu salt) sau date λ.", { pini2: ["λ amonte", "masa"] }),
      tBobina([1, 2], 9, "încălzitorului sondei")] },
  egt: { m: ["filet", { varf: "egt", hex: 12, filet: 10, mufa: 2, cablu: true }],
    pini: [[1, "Semnal (PT200)", "alb", "ECU, divizor la 5 V"], [2, "Masă senzor", "alb", "masa ECU"]],
    teste: [
      ohm("Rezistența PT200 în funcție de temperatură", [1, 2], (s, d) => { const T = lin(s, 20, 600); return d === 1 ? INF : d === 2 ? 200 * (1 + 0.00385 * T) * 0.7 : 200 * (1 + 0.00385 * T + 0.0000006 * T * T); },
        [["Bun", "≈ 215 Ω la 20 °C, ≈ 700 Ω la 600 °C (crește aproape liniar)."], ["Întrerupt (cablul fisurat de vibrații)", "OL – P0544, regenerarea filtrului de particule este blocată."], ["Derivă", "Valori cu 30 % mai mici – ECU vede temperaturi mai mici: risc de supraîncălzire a turbinei."]],
        "Senzorul demontat, ohmmetrul pe pini; încălziți vârful cu un pistol de aer cald și comparați cu un termocuplu.", { stim: S("Temperatura vârfului", "°C", 20, 600) }),
      tst("Temperaturile de evacuare în date live", [["EGT înainte de turbină", (s, d) => `${Math.round(lin(s, 300, 780) * (d === 1 ? 0.7 : 1))} °C`], ["EGT înainte de filtru", (s) => `${Math.round(lin(s, 260, 620))} °C`], ["Sarcina", (s) => `${Math.round(lin(s, 15, 90))} %`]],
        [["Bun", "Temperaturile cresc împreună cu sarcina; cea dinaintea turbinei este cea mai mare."], ["Senzor cu derivă", "Senzorul indică mai puțin decât cel din aval – implausibil, P2080."]],
        "Testerul pe date live, probă de drum cu accelerări.", { stim: S("Sarcina", "%", 15, 90), dtc: ["", "P2080 – plauzibilitatea senzorului de temperatură a gazelor"] })] },
  gpf: { m: ["bloc", { w: 40, h: 22, d: 30, stut: 2, mufa: 3 }],
    pini: [[1, "Semnal Δp", "verde", "0,5…4,5 V"], [2, "Masă", "maro", "masa senzorilor"], [3, "Alimentare 5 V", "roșu", "referința"]],
    teste: [
      volt("Δp la ralanti și la turație ridicată (motor oprit = 0)", [1, 2], (s, d) => { const q = s * s; if (d === 1) return 0.5; if (d === 2) return 0.5 - 0.35 * q; if (d === 3) return 0.5 + 3.6 * q; return 0.5 + 1.1 * q; },
        [["Filtru normal", "≈ 0,5 V cu motorul oprit; crește cu debitul (≈ 1,6 V la 3000 rot/min)."], ["Furtun desprins / înfundat", "Rămâne la 0,5 V – P2453, regenerarea nu mai e declanșată corect."], ["Furtunuri inversate", "Tensiunea scade sub 0,5 V la turație – Δp negativ, P2454."], ["Filtru colmatat", "Tensiune mare încă de la turații moderate – regenerare forțată / înlocuire."]],
        "Voltmetrul pe semnal; motor oprit, apoi ralanti și 3000 rot/min fără sarcină.", { stim: S("Turația", "rot/min", 0, 3000) }),
      tst("Δp și încărcarea calculată", [["Debit gaze", (s) => `${Math.round(lin(s, 30, 300))} m³/h`], ["Δp", (s) => `${(lin(s, 0.3, 12)).toFixed(1)} kPa`], ["Încărcare cenușă / funingine", () => "7 g / 15 g"], ["Ultima regenerare", () => "210 km"]],
        [["Bun", "Δp proporțional cu debitul; încărcarea calculată este plauzibilă."]],
        "Testerul, date live „filtru de particule”.", { stim: S("Debitul de gaze", "m³/h", 30, 300) })] },
  nox: { m: ["filet", { varf: "lambda", hex: 22, filet: 18, mufa: 4, cablu: true, modul: true }],
    pini: [[1, "Alimentare +12 V", "roșu", "releu"], [2, "Masă", "maro", "masă"], [3, "CAN-H", "portocaliu/negru", "magistrala de motor / SCR"], [4, "CAN-L", "portocaliu/maro", "magistrala de motor / SCR"]],
    teste: [tCAN([3, 4]),
      tst("Valoarea NOx înainte și după SCR", [["NOx amonte SCR", (s) => `${Math.round(lin(s, 120, 650))} ppm`], ["NOx aval SCR", (s, d) => `${Math.round(lin(s, 120, 650) * (d === 1 ? 0.8 : 0.08))} ppm`], ["Dozare AdBlue", (s) => `${(lin(s, 0.3, 2.2)).toFixed(1)} ml/min`], ["Senzor gata", () => "da (după încălzire)"]],
        [["SCR eficient", "NOx aval < 10 % din amonte (eficiență > 90 %)."], ["Eficiență redusă", "NOx aval aproape de amonte: AdBlue de calitate slabă, injector înfundat sau catalizator SCR îmbătrânit – P20EE."]],
        "Testerul, date live SCR, motor cald (> 200 °C la SCR).", { stim: S("Sarcina", "%", 10, 90), dtc: ["", "P20EE – eficiența catalizatorului SCR sub prag"] })] },
  pm: { m: ["filet", { varf: "lambda", hex: 22, filet: 18, mufa: 4, cablu: true, modul: true }],
    pini: [[1, "Alimentare +12 V", "roșu", "releu"], [2, "Masă", "maro", "masă"], [3, "CAN-H", "portocaliu/negru", "magistrala motorului"], [4, "CAN-L", "portocaliu/maro", "magistrala motorului"]],
    teste: [tCAN([3, 4]),
      tst("Ciclul de măsurare al senzorului de particule", [["Faza", (s) => s < 0.2 ? "regenerare (încălzire 750 °C)" : "acumulare"], ["Curent electrozi", (s, d) => s < 0.2 ? "0 µA" : `${(Math.pow(s, 2) * (d === 1 ? 30 : 1.5)).toFixed(2)} µA`], ["Timp până la prag", (s, d) => d === 1 ? "4 min" : "> 60 min"]],
        [["DPF bun", "Pragul de curent nu este atins în intervalul de monitorizare."], ["DPF fisurat", "Funinginea ajunge repede pe electrozi: timpul până la prag este scurt – P2002."]],
        "Testerul, date live, probă de drum cu motorul cald.", { stim: S("Timpul de acumulare", "", 0, 1), dtc: ["", "P2002 – eficiența filtrului de particule sub prag"] })] },
  evap: { m: ["bloc", { w: 30, h: 20, d: 22, stut: 1, mufa: 3 }],
    pini: [[1, "Masă", "maro", "masă"], [2, "Semnal", "verde", "≈ 2,5 V la 0 Pa"], [3, "Alimentare 5 V", "roșu", "referința"]],
    teste: [
      volt("Testul de etanșeitate: vidul din rezervor", [2, 1], (s, d) => { const u = s; const p = u < 0.4 ? -2 * u / 0.4 : -2 + (d === 1 ? 1.8 : 0.2) * (u - 0.4) / 0.6; return 2.5 + 0.5 * p; },
        [["Sistem etanș", "Vidul creat de supapa de purjare (≈ −2 kPa) se menține în faza de așteptare."], ["Bușon / furtun neetanș", "Vidul dispare repede: P0455 (scăpare mare) sau P0442 (mică)."]],
        "Testul de etanșeitate EVAP din tester; voltmetrul pe semnalul senzorului.", { stim: S("Timpul testului", "", 0, 1) }),
      tAlim([3, 1])] },
  ect: { m: ["filet", { varf: "ntc", hex: 19, filet: 12, mufa: 2 }],
    pini: [[1, "Semnal (NTC)", "albastru", "ECU, polarizare 2,49 kΩ la 5 V"], [2, "Masă senzor", "maro", "masa ECU"]],
    teste: [tNTC([1, 2], 2500, 3500, "într-un vas cu apă încălzită", 20, 95), tNTCvolt([1, 2], 2500, 3500, 2490, 20, 95),
      tst("Încălzirea motorului (termostatul)", [["Timp de la pornire", (s) => `${Math.round(s * 12)} min`], ["Temperatura lichidului", (s, d) => `${Math.round(d === 1 ? 20 + 50 * s : Math.min(90, 20 + 120 * s))} °C`], ["Temperatura aerului", () => "18 °C"]],
        [["Bun", "La pornire la rece ECT ≈ IAT; crește la 85…95 °C în 6…10 min și rămâne constant."], ["Termostat blocat deschis", "Temperatura crește lent și nu atinge 80 °C – P0128 (nu e defect de senzor)."]],
        "Testerul, pornire la rece, urmăriți ECT și IAT.", { stim: S("Timp", "min", 0, 12), dtc: ["", "P0128 – temperatura lichidului sub pragul termostatului"] })] },
  nivRacire: { m: ["nivRez", {}],
    pini: [[1, "Semnal", "albastru", "intrare digitală / bord"], [2, "Masă", "maro", "masă"]],
    teste: [
      ohm("Contactul reed acționat de plutitor", [1, 2], (s, d) => d === 1 ? 0.3 : s < 0.5 ? INF : 0.3,
        [["Bun", "Plutitorul sus (nivel corect): contact deschis (OL); plutitorul jos: < 1 Ω."], ["Reed lipit", "Contact permanent închis: martor aprins deși nivelul este corect."]],
        "Senzorul demontat; ohmmetrul pe pini, întoarceți senzorul pentru a mișca plutitorul.", { stim: S("Poziția plutitorului", "", 0, 1) }),
      volt("Tensiunea la mufă, cu nivel corect și scăzut", [1, 2], (s, d) => d === 1 ? 0 : s < 0.5 ? 11.8 : 0.1,
        [["Bun", "≈ 12 V cu nivel corect (contact deschis, rezistență de polarizare), ≈ 0 V la nivel minim."], ["Fir de semnal la masă", "0 V permanent – martor aprins; verificați cablajul."]],
        "Contact pus, voltmetrul pe pinul de semnal (prin spate).", { stim: S("Nivelul", "", 0, 1) })] },
  uleiP: { m: ["filet", { varf: "presiune", hex: 24, filet: 12, mufa: 3, corp: "metal" }],
    pini: [[1, "Alimentare 5 V", "roșu", "referința"], [2, "Semnal", "verde", "0,5…4,5 V pe 0…10 bar"], [3, "Masă", "maro", "masa senzorilor"]],
    teste: [
      volt("Presiunea uleiului la ralanti și la turație", [2, 3], (s, d) => { const p = d === 1 ? lin(s, 0.6, 1.8) : lin(s, 1.5, 4.5); return 0.5 + 0.4 * p; },
        [["Bun", "≥ 1,5 bar la ralanti cu motorul cald; 3,5…4,5 bar la 3000 rot/min."], ["Presiune insuficientă", "< 1 bar la ralanti: lagăre uzate, pompă, sită de aspirație înfundată – confirmați cu manometrul mecanic!"]],
        "Voltmetrul pe semnal; motor cald, ralanti apoi 3000 rot/min. Confirmați cu un manometru montat în locul senzorului.", { stim: S("Turația", "rot/min", 800, 3000) }),
      tAlim([1, 3])] },
  uleiN: { m: ["flansa", { L: 60, d: 30, mufa: "directa", plat: true }],
    pini: [[1, "Alimentare +12 V", "roșu", "KL15"], [2, "Masă", "maro", "masă"], [3, "Semnal PWM", "verde", "ECU / tablou"]],
    teste: [
      osc("Telegrama PWM: temperatura, apoi nivelul uleiului", [3, 2], (t, s, d) => { if (d === 1) return 0.1; const u = fr(t / 0.3); const tw = u < 0.33 ? 0.4 + 0.3 * s : u < 0.66 ? (d === 2 ? 0.15 : 0.75) : 0.5; return fr(t / 0.1) < tw ? 11.5 : 0.3; },
        { per: 0.3, v: [-1, 14], div: "30 ms/div · 2 V/div" },
        [["Bun", "Trei impulsuri pe ciclu: durata primului = temperatura, al doilea = nivelul, al treilea = diagnoză."], ["Fără semnal", "0 V – martorul de ulei semnalizează defect de senzor."], ["Nivel scăzut", "Al doilea impuls scurt – completați uleiul (cu motorul oprit și pe orizontală)."]],
        "Contact pus, osciloscop pe ieșirea PWM.", { stim: S("Temperatura uleiului", "°C", 20, 110) }),
      tAlim([1, 2], 12.4, "+12 V")] },
  ac: { m: ["filet", { varf: "presiune", hex: 22, filet: 12, mufa: 3, corp: "metal", schrader: true }],
    pini: [[1, "Masă", "maro", "masa"], [2, "Semnal", "verde", "0,5…4,5 V"], [3, "Alimentare 5 V", "roșu", "referința"]],
    teste: [
      volt("Presiunea de înaltă presiune cu compresorul pornit", [2, 1], (s, d) => { const p = d === 1 ? lin(s, 6, 6.5) : d === 2 ? lin(s, 6, 27) : lin(s, 6, 15); return 0.5 + 4 * p / 35; },
        [["Bun", "≈ 6 bar oprit (depinde de temperatura exterioară), 12…16 bar în funcționare."], ["Lipsă agent frigorific", "Presiunea nu crește: compresorul este oprit de protecție – verificați încărcarea cu stația."], ["Condensator înfundat / electroventilator oprit", "Presiune foarte mare (> 25 bar): compresorul este oprit la prag."]],
        "Motor pornit, A/C pornit, voltmetrul pe semnal; comparați cu manometrele stației de climatizare.", { stim: S("Timp de la pornirea A/C", "s", 0, 60) }),
      tst("Presiunea și comanda compresorului", [["Presiune înaltă", (s) => `${lin(s, 6, 15).toFixed(1)} bar`], ["Temperatura exterioară", () => "24 °C"], ["Comandă supapă compresor", (s) => `${Math.round(lin(s, 0, 0.6) * 1000)} mA`], ["Electroventilator", (s) => s > 0.5 ? "treapta 1" : "oprit"]],
        [["Bun", "Presiune plauzibilă față de temperatura exterioară."]],
        "Testerul, date live climatronic.", { stim: S("Timp", "s", 0, 60) })] },
  tExt: { m: ["tempAer", {}],
    pini: [[1, "Semnal (NTC)", "galben", "modulul de bord / climatronic"], [2, "Masă", "maro", "masă"]],
    teste: [tNTC([1, 2], 10000, 3950, "cu mâna sau cu un uscător", 0, 40), tNTCvolt([1, 2], 10000, 3950, 10000, 0, 40)] },
  tHab: { m: ["modul", { w: 42, h: 14, d: 30, culoare: "plasticGri", grila: true, mufa: 4 }],
    pini: [[1, "Semnal NTC", "galben", "climatronic"], [2, "Masă NTC", "maro", "climatronic"], [3, "Ventilator +", "roșu", "+12 V"], [4, "Ventilator −", "negru", "masă"]],
    teste: [tNTC([1, 2], 10000, 3950, "cu aerul din habitaclu", 15, 35),
      amp("Curentul micromotorului de aspirație", [3, 4], (s, d) => d === 1 ? 0 : 38 + 2 * zg(s),
        [["Bun", "≈ 30…50 mA, ventilatorul aspiră aer peste NTC."], ["Ventilator blocat (praf)", "0 mA sau curent mare de blocare – temperatura citită este greșită, climatizarea reglează eronat."]],
        "Ampermetrul în serie pe alimentarea ventilatorului (pin 3).")] },
  solar: { m: ["solar", {}],
    pini: [[1, "Alimentare 5 V", "roșu", "climatronic"], [2, "Semnal", "verde", "0…4 V după lumină"], [3, "Masă", "maro", "masă"]],
    teste: [
      volt("Semnalul la acoperire și la lumină puternică", [2, 3], (s, d) => d === 1 ? 0.05 : 0.2 + 3.6 * s,
        [["Bun", "Tensiunea crește cu lumina; acoperit cu mâna → aproape 0 V."], ["Fotodiodă defectă", "0 V indiferent de lumină – climatizarea nu compensează radiația solară."]],
        "Contact pus; voltmetrul pe semnal, acoperiți senzorul și luminați-l cu o lanternă puternică.", { stim: S("Iluminarea", "%", 0, 100) }),
      tAlim([1, 3])] },
  umid: { m: ["modul", { w: 30, h: 12, d: 30, culoare: "plastic", mufa: 3, sticla: true }],
    pini: [[1, "Alimentare +12 V", "roșu", "KL15"], [2, "Masă", "maro", "masă"], [3, "LIN", "violet", "climatronic"]],
    teste: [tLIN([3, 2], [0x31, 0x5a, 0x12, 0x44], "umiditate + temperatura parbrizului"),
      tst("Valorile senzorului în date live", [["Umiditate relativă", (s) => `${Math.round(lin(s, 35, 92))} %`], ["Temperatura parbrizului", (s) => `${(lin(s, 12, 4)).toFixed(1)} °C`], ["Punct de rouă", (s) => `${(lin(s, -2, 3)).toFixed(1)} °C`], ["Recirculare automată", (s) => s > 0.7 ? "dezactivată (risc de aburire)" : "permisă"]],
        [["Bun", "Când temperatura parbrizului se apropie de punctul de rouă, sistemul oprește recircularea și pornește A/C pentru dezaburire."]],
        "Testerul, date live climatronic; respirați spre senzor pentru a crește umiditatea.", { stim: S("Umiditatea", "%", 35, 92) })] },
  vssFS: { m: ["flansa", { L: 28, d: 16, mufa: "cablu" }],
    pini: [[1, "Alimentare (≈ 12 V de la ESC)", "maro", "ieșire alimentare ESC"], [2, "Semnal (curent 7 / 14 mA)", "alb", "rezistor de măsură în ESC"]],
    teste: [
      osc("Curentul senzorului activ la rotirea roții (pe rezistorul de 115 Ω)", [2, "rez"], (t, s, d) => { if (d === 2) return 0; const f = lin(s, 5, 60); const k = Math.floor(t * f); let h = fr(t * f) < 0.5; if (d === 1 && k % 48 > 30 && k % 48 < 34) h = false; return (h ? 14 : 7) * 0.115 + 0.01 * zg(t); },
        { per: 0.2, v: [0, 2], div: "20 ms/div · 0,2 V/div (7 mA ≙ 0,8 V)" },
        [["Bun", "Dreptunghiuri între 0,8 V (7 mA) și 1,6 V (14 mA), frecvență proporțională cu viteza, amplitudine constantă."], ["Inel magnetic deteriorat / murdar", "Impulsuri lipsă la fiecare rotație – ABS intervine fals la viteze mici, C0035…C0050."], ["Senzor întrerupt", "0 mA – ESC dezactivat, martorii ABS/ESC aprinși."]],
        "Osciloscop pe un rezistor de 115 Ω înseriat cu firul de semnal (sau adaptor în mufă); rotiți roata cu mâna.", { stim: S("Turația roții", "rot/min", 6, 75) }),
      amp("Curentul în repaus, pe un dinte și pe un gol", [1, 2], (s, d) => d === 2 ? 0 : d === 1 ? 2.1 : s < 0.5 ? 7 : 14,
        [["Bun", "7 mA sau 14 mA după poziția inelului magnetic; se schimbă la rotirea ușoară a roții."], ["Inversat / senzor greșit montat", "≈ 2 mA – senzor defect sau alimentare greșită."], ["Circuit întrerupt", "0 mA."]],
        "Contact pus, ampermetrul (domeniul mA) în serie cu firul de semnal; rotiți roata câte puțin.", { stim: S("Poziția inelului (pol N / S)", "", 0, 1) })] },
  stop: { m: ["contact", {}],
    pini: [[1, "+12 V (KL15)", "roșu", "siguranță"], [2, "Contact NO → lămpi stop / ECU", "negru/roșu", "închis la apăsare"], [3, "+12 V (KL15)", "roșu", "siguranță"], [4, "Contact NC → ECU (plauzibilitate)", "verde", "deschis la apăsare"]],
    teste: [
      osc("Cele două contacte la apăsarea pedalei", [2, "masa"], (t, s, d) => { const p = fr(t / 4) < 0.5; const a = p ? 12 : 0, b = p ? 0 : 12; if (d === 1) return [p && fr(t / 4) > 0.15 ? 12 : 0, b]; return [a, b]; },
        { per: 8, v: [-1, 14], div: "0,8 s/div · 2 V/div", roll: true },
        [["Reglat corect", "Cele două semnale se inversează simultan, la primii 2…5 mm de cursă."], ["Contact dereglat", "Semnalul NO apare mult mai târziu: lămpile stop se aprind cu întârziere, cod P0571, tempomatul nu se dezactivează corect."]],
        "Contact pus, osciloscop cu 2 canale pe pinii 2 și 4; apăsați și eliberați pedala.", { pini2: [4, "masa"] }),
      tst("Starea contactelor în ECU motor și ESC", [["Pedala", (s) => s > 0.5 ? "apăsată" : "liberă"], ["Contact lumini stop", (s, d) => (d === 1 ? s > 0.8 : s > 0.5) ? "închis" : "deschis"], ["Contact pedală (NC)", (s) => s > 0.5 ? "deschis" : "închis"], ["Presiune ESC", (s) => `${Math.round(s * 40)} bar`]],
        [["Bun", "Contactele își schimbă starea împreună, la începutul cursei."], ["Dereglat", "Contactul NO comută târziu – incoerență cu presiunea ESC."]],
        "Testerul, date live ECU motor.", { stim: S("Cursa pedalei", "%", 0, 100), dtc: ["", "P0571 – contactul pedalei de frână, circuit A"] })] },
  pFrana: { m: ["modul", { w: 70, h: 60, d: 60, culoare: "alu", hidraulic: true, mufa: 6 }],
    pini: [[1, "+12 V pompă (KL30)", "roșu (gros)", "siguranță 40 A"], [2, "Masă pompă", "maro (gros)", "masă"], [3, "+12 V electronică (KL30)", "roșu", "siguranță"], [4, "KL15", "negru", "contact"], [5, "CAN-H", "portocaliu/negru", "magistrala șasiu"], [6, "CAN-L", "portocaliu/maro", "magistrala șasiu"]],
    teste: [
      tst("Presiunea din pompa centrală la apăsarea pedalei", [["Cursa pedalei", (s) => `${Math.round(s * 100)} %`], ["Presiune pompă centrală", (s, d) => `${Math.round((d === 1 ? 0 : 1) * Math.pow(s, 1.6) * 120)} bar`], ["Contact stop", (s) => s > 0.05 ? "închis" : "deschis"]],
        [["Bun", "Presiunea crește progresiv cu cursa, 0 bar cu pedala liberă."], ["Senzor defect", "0 bar indiferent de pedală: ESC dezactivat, asistența la frânare de urgență lipsește – C1275."]],
        "Testerul, date live ESC; apăsați progresiv pedala cu motorul pornit.", { stim: S("Cursa pedalei", "%", 0, 100), dtc: ["", "C1275 – senzorul de presiune de frânare, semnal implausibil"] }),
      tCAN([5, 6])] },
  nivFrana: { m: ["nivRez", { frana: true }],
    pini: [[1, "Semnal (contact reed)", "albastru", "tablou de bord"], [2, "Masă", "maro", "masă"]],
    teste: [
      ohm("Contactul la nivel minim", [1, 2], (s, d) => d === 1 ? INF : s < 0.5 ? INF : 0.4,
        [["Bun", "Nivel corect: deschis; nivel minim: închis (< 1 Ω)."], ["Reed defect", "Nu se închide la nivel minim – nivelul scăzut (scurgere sau plăcuțe uzate) nu mai este semnalizat!"]],
        "Mufa desfăcută; ohmmetrul pe pini, coborâți plutitorul (scoateți lichid cu o seringă sau apăsați plutitorul).", { stim: S("Nivelul lichidului", "", 0, 1) }),
      volt("Tensiunea la tablou", [1, 2], (s, d) => s < 0.5 ? 11.9 : 0.1,
        [["Bun", "≈ 12 V la nivel corect, ≈ 0 V la nivel minim – martorul se aprinde."]],
        "Contact pus; voltmetrul pe pinul de semnal.", { stim: S("Nivelul lichidului", "", 0, 1) })] },
  uzura: { m: ["uzura", {}],
    pini: [[1, "Semnal (buclă)", "albastru", "modulul de frână / tablou"], [2, "Masă / retur buclă", "maro", "masă"]],
    teste: [
      ohm("Continuitatea buclei din garnitură", [1, 2], (s, d) => d === 1 ? INF : d === 2 ? 0.3 : (s > 0.8 ? INF : 0.3),
        [["Plăcuțe bune", "< 1 Ω (bucla intactă); la uzura limită bucla se rupe → OL."], ["Bucla ruptă (plăcuțe la limită)", "OL – înlocuiți plăcuțele și senzorul (este de unică folosință)."], ["Fir prins sub plăcuță", "Uzură semnalizată prematur sau deloc – verificați traseul firului."]],
        "Mufa desfăcută; ohmmetrul pe cei doi pini ai senzorului.", { stim: S("Uzura plăcuței", "%", 0, 100) }),
      volt("Tensiunea pe semnal la modul", [1, 2], (s, d) => d === 1 ? 5 : 0.05,
        [["Bun", "≈ 0 V (bucla trage semnalul la masă)."], ["Buclă ruptă", "≈ 5 V – martorul de uzură aprins."]],
        "Contact pus, voltmetrul pe semnal (prin spatele mufei).")] },
  volan: { m: ["sas", {}],
    pini: [[1, "+12 V (KL30)", "roșu", "siguranță"], [2, "Masă", "maro", "masă"], [3, "CAN-H", "portocaliu/negru", "magistrala șasiu"], [4, "CAN-L", "portocaliu/maro", "magistrala șasiu"]],
    teste: [
      tst("Unghiul volanului de la un capăt la altul", [["Unghi volan", (s, d) => `${(lin(s, -540, 540) + (d === 1 ? 14 : 0)).toFixed(1)}°`], ["Viteză de virare", () => "90 °/s"], ["Stare senzor", (s, d) => d === 1 ? "necalibrat" : "calibrat"]],
        [["Bun", "0° ± 2° cu roțile drepte, ≈ ±540° la capete, simetric."], ["Necalibrat (după geometrie / înlocuire)", "Unghi ≠ 0 cu roțile drepte: ESC intervine nejustificat în viraje – calibrare de bază cu testerul (C0051)."]],
        "Testerul, date live ESC; rotiți volanul de la un capăt la altul, apoi aduceți roțile drepte.", { stim: S("Rotirea volanului", "°", -540, 540), dtc: ["", "C0051 – senzorul unghiului volanului, necalibrat"] }),
      tCAN([3, 4])] },
  esc: { m: ["modul", { w: 60, h: 22, d: 50, culoare: "plastic", mufa: 6, urechi: true }],
    pini: [[1, "+12 V (KL15)", "roșu", "siguranță"], [2, "Masă", "maro", "masă"], [3, "CAN-H", "portocaliu/negru", "CAN privat ESC"], [4, "CAN-L", "portocaliu/maro", "CAN privat ESC"], [5, "Masă electronică", "maro", "masă"], [6, "Neconectat", "—", "—"]],
    teste: [
      tst("Girația și accelerația laterală într-un viraj", [["Girație ψ̇", (s, d) => `${(Math.sin(s * Math.PI) * 18 + (d === 1 ? 4 : 0)).toFixed(1)} °/s`], ["Accelerație laterală", (s) => `${(Math.sin(s * Math.PI) * 4.2).toFixed(2)} m/s²`], ["Unghi volan", (s) => `${Math.round(Math.sin(s * Math.PI) * 90)}°`], ["Viteza", () => "40 km/h"]],
        [["Bun", "Girația, accelerația laterală și unghiul volanului sunt coerente; în repaus 0 ± 0,5 °/s."], ["Offset de girație", "≈ 4 °/s în linie dreaptă: ESC frânează fără motiv – calibrare sau înlocuire (C0196)."]],
        "Testerul, date live ESC; probă de drum cu un viraj de 90°.", { stim: S("Virajul", "", 0, 1), dtc: ["", "C0196 – senzorul de girație, plauzibilitate"] }),
      tCAN([3, 4])] },
  cuplu: { m: ["cuplu", {}],
    pini: [[1, "Alimentare 5 V", "roșu", "modulul EPS"], [2, "Semnal 1 (SENT)", "verde", "EPS"], [3, "Semnal 2 (SENT)", "galben", "EPS (redundant)"], [4, "Masă", "maro", "masă"]],
    teste: [
      osc("Telegramele SENT ale senzorului de cuplu", [2, 4], (t, s, d) => d === 1 ? 4.9 : sent(t, Math.round(2048 + s * 1500)) + 0.03 * zg(t),
        { per: 8e-4, v: [-0.5, 5.5], div: "80 µs/div · 1 V/div" },
        [["Bun", "Impuls de sincronizare de 56 tick-uri, apoi nibble-urile de date; durata lor se schimbă cu cuplul."], ["Fără semnal", "5 V constant – asistența direcției se reduce/oprește, martor EPS."]],
        "Contact pus; osciloscop pe semnalul 1, bază de timp 80 µs/div; rotiți ușor volanul.", { stim: S("Cuplul la volan", "N·m", 0, 6) }),
      tst("Cuplul la volan și asistența", [["Cuplu senzor 1", (s) => `${(s * 6).toFixed(2)} N·m`], ["Cuplu senzor 2", (s, d) => `${(s * 6 + (d === 1 ? 1.2 : 0)).toFixed(2)} N·m`], ["Curent motor EPS", (s) => `${Math.round(s * 60)} A`]],
        [["Bun", "Cele două canale identice; curentul de asistență crește cu cuplul."], ["Canale incoerente", "Diferență între canale – EPS oprește asistența (C0545), calibrare la înlocuirea casetei."]],
        "Testerul, date live EPS, motor pornit.", { stim: S("Cuplul la volan", "N·m", 0, 6) })] },
  rezEps: { m: ["rezolver", { mic: true }],
    pini: [[1, "R1 – excitație +", "roșu", "EPS"], [2, "R2 – excitație −", "negru", "EPS"], [3, "S1 – sinus +", "galben", "EPS"], [4, "S3 – sinus −", "albastru", "EPS"], [5, "S2 – cosinus +", "verde", "EPS"], [6, "S4 – cosinus −", "maro", "EPS"]],
    teste: [
      ohm("Rezistențele înfășurărilor", [1, 2], (s, d) => d === 1 ? INF : 8.5,
        [["Bun", "R1–R2 ≈ 5…15 Ω, S1–S3 și S2–S4 ≈ 10…30 Ω și egale între ele; izolație față de carcasă > 10 MΩ."], ["Înfășurare întreruptă", "OL – motorul nu mai poate fi comandat (poziție necunoscută)."]],
        "Mufa desfăcută; ohmmetrul pe perechile de pini."),
      osc("Semnalele sin și cos modulate la rotirea rotorului", [3, 4], (t, s, d) => { const th = 2 * Math.PI * t * 4; const c = Math.sin(2 * Math.PI * 10000 * t); return [2 * Math.sin(th) * c, d === 1 ? 0.02 * zg(t) : 2 * Math.cos(th) * c]; },
        { per: 0.25, v: [-3, 3], div: "25 ms/div" },
        [["Bun", "Două purtătoare de 10 kHz modulate în amplitudine de sin θ și cos θ, decalate cu 90°."], ["Înfășurarea cos întreruptă", "Lipsește canalul 2 – EPS/motorul electric se oprește, cod de rezolver."]],
        "Contact pus, motorul rotit încet; osciloscop diferențial pe S1–S3 și S2–S4.", { pini2: [5, 6] })] },
  tpmsFS: { m: ["tpms", {}],
    pini: [],
    teste: [
      tst("Citirea senzorului cu testerul TPMS (activare LF 125 kHz)", [["ID senzor", () => "1A2B3C4D"], ["Presiune", (s, d) => d === 1 ? "—" : `${(lin(s, 1.6, 2.6)).toFixed(2)} bar`], ["Temperatură", (s, d) => d === 1 ? "—" : "22 °C"], ["Baterie", (s, d) => d === 1 ? "nu răspunde" : d === 2 ? "SLABĂ" : "OK"], ["Frecvență", () => "433,92 MHz"]],
        [["Bun", "Senzorul răspunde la activare cu ID-ul, presiunea, temperatura și starea bateriei."], ["Bateria descărcată / senzor defect", "Nu răspunde – înlocuiți senzorul (bateria nu se schimbă separat)."], ["Baterie slabă", "Răspunde, dar raportează baterie slabă: înlocuire preventivă."]],
        "Țineți testerul TPMS lângă ventil și activați senzorul; comparați presiunea cu un manometru.", { stim: S("Presiunea în pneu", "bar", 1.6, 2.6) }),
      tst("Învățarea pozițiilor și avertizarea la presiune mică", [["Roata FS", (s) => `${(lin(s, 2.4, 1.5)).toFixed(2)} bar`], ["Roata FD", () => "2,40 bar"], ["Roata SS", () => "2,20 bar"], ["Roata SD", () => "2,20 bar"], ["Avertizare", (s, d) => d === 1 ? "poziții neînvățate (ID-uri vechi)" : s > 0.7 ? "PRESIUNE MICĂ FS" : "—"]],
        [["Bun", "Avertizarea apare când presiunea scade cu ≈ 20 % față de cea nominală."], ["Senzor neînvățat", "După schimbarea senzorului/roților ID-urile nu sunt înregistrate: martor TPMS clipind – procedura de învățare cu testerul."]],
        "Testerul pe OBD, modulul TPMS; dezumflați o roată lent.", { stim: S("Presiunea în roata FS", "bar", 2.4, 1.5) })] },
  nivel: { m: ["parghie", {}],
    pini: [[1, "Alimentare 5 V", "roșu", "modulul faruri / suspensie"], [2, "Semnal", "verde", "0,5…4,5 V"], [3, "Masă", "maro", "masă"]],
    teste: [
      volt("Semnalul la încărcarea portbagajului", [2, 3], (s, d) => d === 1 ? 2.4 : 2.5 - 1.4 * s,
        [["Bun", "≈ 2,5 V la sarcina de referință; scade la coborârea caroseriei (spate încărcat)."], ["Pârghie ruptă / tijă desprinsă", "Valoare fixă: farurile nu se corectează – orbesc la încărcare."]],
        "Contact pus; voltmetrul pe semnal, încărcați treptat portbagajul (sau apăsați spatele).", { stim: S("Sarcina în portbagaj", "kg", 0, 300) }),
      tAlim([1, 3])] },
  cutieN: { m: ["flansa", { L: 26, d: 14, mufa: "directa" }],
    pini: [[1, "Alimentare 12 V", "roșu", "TCU (în mecatronică)"], [2, "Semnal", "verde", "frecvență"], [3, "Masă", "maro", "TCU"]],
    teste: [
      osc("Turația arborelui de intrare", [2, 3], (t, s, d) => { const f = lin(s, 400, 3000); return fr(t * f) < 0.5 ? (d === 1 && fr(t * 3) < 0.2 ? 0.3 : 11.6) : 0.3; },
        { per: 0.01, v: [-1, 14], div: "1 ms/div" },
        [["Bun", "Dreptunghiuri cu frecvența proporțională cu turația arborelui."], ["Impulsuri pierdute (șpan pe magnet)", "Lipsesc impulsuri: schimbări bruște, cod de plauzibilitate a turației (P0715)."]],
        "Accesul este doar la mufa mecatronicii; osciloscop pe semnal, motor la ralanti în D cu frâna apăsată / pe stand.", { stim: S("Turația arborelui", "rot/min", 800, 3000) }),
      tst("Patinarea ambreiajelor din turațiile cutiei", [["Treapta", () => "3"], ["Turație intrare", (s) => `${Math.round(lin(s, 1500, 3500))} rot/min`], ["Turație ieșire", (s, d) => `${Math.round(lin(s, 1500, 3500) / 1.32 * (d === 1 ? 0.93 : 1))} rot/min`], ["Patinare", (s, d) => d === 1 ? "7 %" : "0 %"]],
        [["Bun", "n_intrare / n_ieșire = raportul treptei; patinare 0."], ["Ambreiaj uzat", "Raport mai mare decât cel nominal: patinare la sarcină – P0730/P0733."]],
        "Testerul, date live TCU, probă de drum în treapta a 3-a.", { stim: S("Accelerare", "", 0, 1), dtc: ["", "P0733 – raport greșit treapta 3"] })] },
  cutieP: { m: ["filet", { varf: "presiune", hex: 19, filet: 10, mufa: 3 }],
    pini: [[1, "Alimentare 5 V", "roșu", "TCU"], [2, "Semnal", "verde", "0,5…4,5 V"], [3, "Masă", "maro", "TCU"]],
    teste: [
      tst("Presiunea și temperatura uleiului de transmisie", [["Temperatura ATF", (s) => `${Math.round(lin(s, 20, 95))} °C`], ["Presiune principală", (s, d) => `${(lin(s, 6, 14) * (d === 1 ? 0.6 : 1)).toFixed(1)} bar`], ["Curent EDS principal", (s) => `${Math.round(lin(s, 300, 700))} mA`]],
        [["Bun", "Presiunea urmează comanda electrovalvei."], ["Presiune insuficientă", "Pompă uzată, filtru înfundat sau nivel ATF scăzut – schimbări cu întârziere."]],
        "Testerul, date live TCU.", { stim: S("Sarcina", "", 0, 1) }),
      tNTC([2, 3], 5000, 3600, "în ulei încălzit", 20, 100)] },
  radar: { m: ["radar", {}],
    pini: [[1, "+12 V (KL30)", "roșu", "siguranță"], [2, "Masă", "maro", "masă"], [3, "KL15", "negru", "contact"], [4, "CAN-H (ADAS)", "portocaliu/negru", "CAN FD"], [5, "CAN-L (ADAS)", "portocaliu/maro", "CAN FD"], [6, "CAN privat (cameră)", "verde", "fuziune"]],
    teste: [
      tst("Unghiul de montaj și calibrarea", [["Unghi orizontal (azimut)", (s, d) => `${(d === 1 ? 1.8 : 0.1).toFixed(1)}°`], ["Unghi vertical (elevație)", () => "0,2°"], ["Stare", (s, d) => d === 1 ? "necalibrat" : "calibrat"], ["Obstrucție (murdărie, gheață)", (s, d) => d === 2 ? "DA" : "nu"]],
        [["Bun", "Unghiuri în toleranță (± 0,3°)."], ["Dereglat după o lovitură / reparație", "Azimut 1,8°: ACC urmărește vehiculul de pe banda vecină – calibrare cu țintă (statică) sau pe drum (dinamică)."], ["Senzor obstrucționat", "ACC / AEB dezactivate temporar – curățați radomul; nu vopsiți peste el."]],
        "Testerul, modulul radar, citirea unghiurilor de montaj.", { dtc: ["", "U3000 – modul necalibrat", "C110F – senzor blocat (obstrucție)"] }),
      tCAN([4, 5])] },
  camF: { m: ["camera", { fata: true }],
    pini: [[1, "KL15", "negru", "contact"], [2, "Masă", "maro", "masă"], [3, "CAN-H", "portocaliu/negru", "CAN FD ADAS"], [4, "CAN-L", "portocaliu/maro", "CAN FD ADAS"]],
    teste: [
      tst("Calibrarea camerei după schimbarea parbrizului", [["Unghi tangaj", (s, d) => `${(d === 1 ? -1.6 : -0.1).toFixed(1)}°`], ["Unghi ruliu", () => "0,0°"], ["Recunoaștere marcaje", (s, d) => d === 1 ? "nesigură" : "OK"], ["Calibrare", (s, d) => d === 1 ? "necesară" : "finalizată"]],
        [["Bun", "Unghiuri în toleranță, marcaje recunoscute."], ["Necalibrată", "Asistentul de bandă greșește traiectoria – calibrare statică cu panou sau dinamică pe drum."]],
        "Testerul, modulul camerei frontale."),
      tAlim([1, 2], 12.5, "KL15")] },
  pdcF1: { m: ["pdc", {}],
    pini: [[1, "Alimentare +8…12 V", "roșu", "modulul PDC"], [2, "Semnal / date", "verde", "bidirecțional (impuls de comandă și ecou)"], [3, "Masă", "maro", "masă"]],
    teste: [
      osc("Semnalul membranei: emisie și ecou", [2, 3], (t, s, d) => { const dist = lin(s, 0.3, 1.8); const te = 2 * dist / 343; const u = t % 0.025; return burst(u, 0.0005, 0.0007, 48000, 4) + (d === 1 ? 0 : burst(u, 0.0005 + te, 0.0006, 48000, 1.2 / dist)) + (d === 2 ? burst(u, 0.0012, 0.004, 48000, 1.5) : 0); },
        { per: 0.0125, v: [-5, 5], div: "1,25 ms/div" },
        [["Bun", "Trenul de emisie, apoi ecoul la t = 2·d / 343 m/s (≈ 5,8 ms pentru 1 m)."], ["Fără ecou", "Obstacolul nu este detectat – membrană vopsită/fisurată sau orientată greșit."], ["Membrană care „sună” (oscilație prelungită)", "Senzorul detectează fals obstacole apropiate – membrană lovită sau murdară."]],
        "Treapta R cuplată; osciloscop pe firul de semnal, obstacol la distanțe diferite.", { stim: S("Distanța până la obstacol", "m", 0.3, 1.8) }),
      tst("Distanțele măsurate de fiecare senzor", [["Senzor față 1", (s) => `${Math.round(lin(s, 30, 180))} cm`], ["Senzor față 2", (s, d) => d === 1 ? "—" : `${Math.round(lin(s, 32, 182))} cm`], ["Senzor față 3", () => "> 250 cm"], ["Senzor față 4", () => "> 250 cm"]],
        [["Bun", "Distanțele corespund obstacolului real (± 5 cm)."], ["Senzor defect", "Nu raportează distanța – PDC indică defect; schimbați senzorul și verificați mufa."]],
        "Testerul, date live PDC; obstacol în fața senzorilor.", { stim: S("Distanța", "cm", 30, 180) })] },
  camS: { m: ["camera", {}],
    pini: [[1, "Alimentare +6…12 V", "roșu", "modulul de parcare"], [2, "Masă", "maro", "masă"], [3, "Video (coaxial FAKRA / LVDS)", "—", "unitatea multimedia"]],
    teste: [
      osc("Semnalul video analogic (CVBS) al camerei", [3, 2], (t, s, d) => { if (d === 1) return 0; const L = 64e-6; const u = t % L; if (u < 4.7e-6) return -0.3; if (u < 10e-6) return 0 + 0.15 * Math.sin(2 * Math.PI * 3.58e6 * u) * (u > 5.5e-6 && u < 8e-6 ? 1 : 0); return 0.1 + 0.6 * (0.5 + 0.5 * Math.sin(u * 4e5 + Math.floor(t / L) * 0.05)) + 0.02 * zg(t); },
        { per: 1.3e-4, v: [-0.6, 1.0], div: "13 µs/div · 0,2 V/div" },
        [["Bun", "Impuls de sincronizare −0,3 V la fiecare linie (64 µs), apoi luminanța 0…0,7 V."], ["Fără semnal (cablu coaxial întrerupt)", "Ecran negru – verificați mufa FAKRA și alimentarea camerei."]],
        "Treapta R cuplată; osciloscop pe ieșirea video (variantele analogice).", {}),
      tAlim([1, 2], 6.5, "+6,5 V de la modul")] },
  lidar: { m: ["radar", { lidar: true }],
    pini: [[1, "+12 V", "roșu", "siguranță"], [2, "Masă", "maro", "masă"], [3, "Ethernet T1 P", "verde", "100/1000BASE-T1"], [4, "Ethernet T1 N", "verde/alb", "100/1000BASE-T1"]],
    teste: [
      tst("Starea lidarului și a legăturii Ethernet", [["Link Ethernet", (s, d) => d === 1 ? "căzut" : "1000BASE-T1 activ"], ["Puncte / s", (s, d) => d === 1 ? "0" : "1,2 mil."], ["Fereastra optică", (s, d) => d === 2 ? "murdară (reflectivitate 40 %)" : "curată"]],
        [["Bun", "Legătură activă, nor de puncte complet."], ["Legătură căzută", "Cablu de date deteriorat – funcțiile ADAS de nivel 2+ dezactivate."], ["Fereastră murdară", "Rază de detecție redusă – curățare (sistemul de spălare)."]],
        "Testerul, modulul lidar."),
      tAlim([1, 2], 12.6, "+12 V")] },
  ploaie: { m: ["ploaie", {}],
    pini: [[1, "Alimentare +12 V (KL15)", "roșu", "siguranță"], [2, "LIN", "violet", "modulul de bord (BCM)"], [3, "Masă", "maro", "masă"]],
    teste: [tLIN([2, 3], [0x22, 0x09, 0x70, 0x01], "intensitatea ploii, lumina ambientală"),
      tst("Reacția la picături de apă", [["Intensitate ploaie", (s, d) => d === 1 ? "0" : `${Math.round(s * 15)} / 15`], ["Ștergătoare", (s, d) => d === 1 ? "oprite" : s < 0.1 ? "oprite" : s < 0.6 ? "interval" : "rapid"], ["Lumină ambientală", () => "4800 lx"], ["Faruri automate", () => "stinse"]],
        [["Bun", "Pulverizați apă pe parbriz: senzorul raportează ploaie, ștergătoarele pornesc."], ["Cuplaj optic pierdut (după schimbarea parbrizului)", "Nicio reacție – înlocuiți gelul/padul optic dintre senzor și parbriz."]],
        "Testerul, date live BCM; comutatorul ștergătoarelor pe AUTO.", { stim: S("Cantitatea de apă", "", 0, 1) })] },
  ibs: { m: ["ibs", {}],
    pini: [[1, "KL30 (alimentare și măsurarea tensiunii)", "roșu", "borna + a bateriei"], [2, "LIN", "violet", "BCM / gateway / DME"]],
    teste: [tLIN([2, 1], [0x4c, 0x2d, 0xf1, 0x7b], "U, I, T, SOC"),
      tst("Valorile senzorului bateriei", [["Tensiune", (s) => `${(lin(s, 12.6, 14.4)).toFixed(2)} V`], ["Curent", (s) => `${(lin(s, -2.5, 38)).toFixed(1)} A`], ["SOC (starea de încărcare)", (s, d) => d === 1 ? "35 %" : "82 %"], ["Baterie înregistrată", (s, d) => d === 1 ? "70 Ah AGM (veche!)" : "80 Ah EFB"]],
        [["Bun", "Valori plauzibile; bateria înregistrată = bateria montată."], ["Baterie neînregistrată după înlocuire", "Strategia de încărcare este greșită, stop-start dezactivat, SOC eronat – înregistrați/codați bateria nouă."]],
        "Testerul, date live gestiune energie; pornire motor și consumatori.", { stim: S("Pornirea motorului", "", 0, 1) })] },
  comb: { m: ["plutitor", {}],
    pini: [[1, "Pompă +12 V", "negru (gros)", "releul pompei / modulul de comandă"], [2, "Masă pompă", "maro (gros)", "masă"], [3, "Semnal nivel", "violet", "tablou de bord"], [4, "Masă senzor nivel", "maro/alb", "tablou"]],
    teste: [
      ohm("Rezistența traductorului de nivel cu plutitorul", [3, 4], (s, d) => { let r = lin(s, 300, 50); if (d === 1 && s > 0.45 && s < 0.5) r = INF; return r; },
        [["Bun", "Gol ≈ 300 Ω, plin ≈ 50 Ω (valori tipice), variație continuă."], ["Pistă uzată", "Întreruperi în zona frecvent folosită – indicatorul sare / afișează gol."]],
        "Modulul demontat (sau mufa la flanșă desfăcută); ohmmetrul pe pinii 3–4, mișcați încet brațul plutitorului.", { stim: S("Poziția plutitorului (gol → plin)", "%", 0, 100) }),
      amp("Curentul absorbit de pompa de combustibil", [1, 2], (s, d) => { const I = d === 1 ? 9.5 : 5.2; return (I + 0.3 * zg(s * 50)) * 1000; },
        [["Bun", "≈ 4…7 A, constant (pe osciloscop cu clește se văd ondulațiile colectorului)."], ["Pompă uzată / filtru înfundat", "Curent mare (> 8 A) și presiune mică – înlocuiți pompa/filtrul."]],
        "Clește ampermetric pe firul de alimentare al pompei, contact pus (sau motor pornit).", {})] },
  ocupare: { m: ["covoras", {}],
    pini: [[1, "Semnal covoraș", "galben", "modulul airbag"], [2, "Masă covoraș", "maro", "modulul airbag"]],
    teste: [
      ohm("Rezistența covorașului la încărcare", [1, 2], (s, d) => d === 1 ? INF : lin(s, 2200, 380),
        [["Bun", "Scade cu greutatea ocupantului (valori orientative)."], ["Covoraș întrerupt", "OL – airbagul pasagerului este dezactivat / martor airbag aprins."]],
        "Mufa desfăcută (baterie deconectată, procedura de siguranță airbag!); ohmmetrul pe covoraș.", { stim: S("Greutatea pe scaun", "kg", 0, 80) }),
      tst("Clasificarea ocupantului", [["Greutate estimată", (s) => `${Math.round(s * 80)} kg`], ["Clasă", (s) => s < 0.15 ? "gol" : s < 0.45 ? "copil / scaun de copil" : "adult"], ["Airbag pasager", (s) => s < 0.45 ? "DEZACTIVAT" : "ACTIVAT"]],
        [["Bun", "Clasificarea urmează greutatea; martorul „PASSENGER AIRBAG OFF” corect."], ["Calibrare pierdută", "Clasificare greșită – calibrarea „scaun gol” cu testerul."]],
        "Testerul, modulul airbag.", { stim: S("Greutatea", "kg", 0, 80) })] },
  crashF: { m: ["modul", { w: 30, h: 16, d: 26, culoare: "plastic", mufa: 2, urechi: true }],
    pini: [[1, "PSI5 + (alimentare și date)", "galben", "modulul airbag"], [2, "PSI5 − (masă)", "galben/negru", "modulul airbag"]],
    teste: [
      osc("Impulsurile de curent PSI5 (pe rezistorul de măsură)", [1, 2], (t, s, d) => { if (d === 1) return 0; const T = 228e-6, u = t % T; const b = Math.floor(u / 8e-6); const bit = hash(b + Math.floor(t / T) * 0.3) > 0.5; const h = b < 13 ? (fr(u / 8e-6) < 0.5) !== bit : false; return 0.35 + (h ? 1.3 : 0) + 0.02 * zg(t); },
        { per: 3e-4, v: [0, 2], div: "30 µs/div" },
        [["Bun", "Telegrame Manchester de curent (≈ +26 mA peste curentul de repaus), sincronizate de modul."], ["Fără comunicare", "Martorul airbag aprins, B0xxx (senzor de impact nu comunică)."]],
        "Doar cu adaptoare dedicate; în practică verificarea se face cu testerul (circuit de siguranță!).", {}),
      tst("Starea senzorilor de impact", [["Senzor frontal stânga", (s, d) => d === 1 ? "nu comunică" : "OK"], ["Senzor frontal dreapta", () => "OK"], ["Senzor ușă stânga (presiune)", () => "OK"], ["Evenimente de impact memorate", () => "0"]],
        [["Bun", "Toți senzorii comunică, niciun eveniment."], ["Senzor deteriorat / mufă oxidată", "Martor airbag; după un impact senzorul se înlocuiește obligatoriu."]],
        "Testerul, modulul airbag; nu măsurați cu ohmmetrul circuitele detonatoarelor.", { dtc: ["", "B1652 – senzorul de impact frontal stânga, comunicație"] })] },
  centura: { m: ["catarama", {}],
    pini: [[1, "Alimentare / semnal (Hall)", "galben", "modulul airbag"], [2, "Masă", "galben/maro", "modulul airbag"]],
    teste: [
      amp("Curentul senzorului Hall al cataramei", [1, 2], (s, d) => d === 1 ? 0 : s < 0.5 ? 5 : 15,
        [["Bun", "≈ 5 mA necuplată, ≈ 15 mA cuplată (două niveluri diferite, ambele ≠ 0)."], ["Circuit întrerupt", "0 mA – martor airbag, avertizare centură permanentă."]],
        "Ampermetrul în serie; cuplați și decuplați limba centurii.", { stim: S("Centura", "", 0, 1) }),
      tst("Starea cataramelor în date live", [["Șofer", (s) => s < 0.5 ? "necuplată" : "cuplată"], ["Pasager", () => "necuplată"], ["Avertizare centură", (s) => s < 0.5 ? "ACTIVĂ" : "—"]],
        [["Bun", "Starea urmează cuplarea."]],
        "Testerul, modulul airbag.", { stim: S("Centura șoferului", "", 0, 1) })] },
  cheie: { m: ["cheie", {}],
    pini: [],
    teste: [
      tst("Recunoașterea cheii (keyless) și bateria", [["Antenă LF habitaclu", () => "OK"], ["Cheie detectată", (s, d) => d === 1 ? "nu" : "da – cheia 1"], ["Tensiune baterie cheie", (s, d) => d === 1 ? "2,1 V" : "3,0 V"], ["Transponder (imobilizator)", () => "autorizat"]],
        [["Bun", "Cheia detectată de antenele LF și autorizată."], ["Baterie descărcată", "Keyless nu funcționează – pornire prin poziția de urgență (cheia lângă bobina transponderului)."]],
        "Testerul, modulul keyless / imobilizator."),
      tst("Semnalul RF al telecomenzii", [["Frecvență", () => "433,92 MHz"], ["Nivel recepționat", (s, d) => d === 1 ? "−95 dBm (slab)" : `${Math.round(lin(s, -40, -70))} dBm`], ["Cod rulant", (s, d) => d === 2 ? "desincronizat" : "valid"]],
        [["Bun", "Semnal puternic, cod valid."], ["Semnal slab", "Bateria cheii sau antena receptorului – raza de acțiune scade."], ["Cod desincronizat", "Resincronizare (procedura din manual) sau cu testerul."]],
        "Detector RF / testerul, apăsați butoanele telecomenzii.", { stim: S("Distanța", "m", 1, 20) })] },
  rezolver: { m: ["rezolver", {}],
    pini: [[1, "R1 – excitație +", "roșu", "invertor"], [2, "R2 – excitație −", "negru", "invertor"], [3, "S1 – sinus +", "galben", "invertor"], [4, "S3 – sinus −", "albastru", "invertor"], [5, "S2 – cosinus +", "verde", "invertor"], [6, "S4 – cosinus −", "maro", "invertor"]],
    teste: [
      ohm("Rezistențele înfășurărilor rezolverului", [3, 4], (s, d) => d === 1 ? INF : 22,
        [["Bun", "Sin și cos egale (≈ 15…35 Ω), excitația ≈ 8…15 Ω; izolație față de carcasă > 10 MΩ."], ["Înfășurare întreruptă", "OL – mașina electrică nu mai poate fi comandată (P0A3F)."]],
        "Sistemul de înaltă tensiune deconectat (procedura HV!), mufa rezolverului desfăcută."),
      osc("Semnalele rezolverului la rotirea rotorului", [3, 4], (t, s, d) => { const th = 2 * Math.PI * t * lin(s, 2, 8); const c = Math.sin(2 * Math.PI * 10000 * t); return [2 * Math.sin(th) * c, 2 * Math.cos(th + (d === 1 ? 0.6 : 0)) * c]; },
        { per: 0.25, v: [-3, 3], div: "25 ms/div" },
        [["Bun", "Anvelopele sin și cos defazate exact 90°, amplitudini egale."], ["Rezolver decalat (după înlocuire)", "Unghi de offset greșit – cuplu redus, vibrații; se face învățarea offsetului cu testerul."]],
        "Roțile motoare ridicate, mașina electrică rotită încet; osciloscop diferențial pe sin și cos.", { stim: S("Turația rotorului", "rot/min", 120, 480), pini2: [5, 6] })] },
  curHV: { m: ["curent", {}],
    pini: [[1, "Alimentare +5 V", "roșu", "BMS / invertor"], [2, "Masă", "maro", "masă"], [3, "Semnal curent", "verde", "2,5 V ± 2 V"], [4, "Referință 2,5 V", "alb", "intrare de referință"]],
    teste: [
      volt("Semnalul la curent zero și la descărcare / încărcare", [3, 2], (s, d) => { const I = lin(s, -200, 200); return 2.5 + 2 * I / 400 + (d === 1 ? 0.12 : 0); },
        [["Bun", "2,5 V la curent zero; ± 2 V la ± 400 A (liniar)."], ["Offset de zero", "2,62 V la curent zero: BMS integrează un curent fals – SOC derivă, avertizări de echilibru."]],
        "Voltmetrul pe semnal față de masă, vehicul în READY; frânare regenerativă / accelerare pe stand.", { stim: S("Curentul bateriei", "A", -200, 200) }),
      tAlim([1, 2])] },
  celule: { m: ["cmu", {}],
    pini: [[1, "Celula 1 +", "roșu", "senzor tensiune"], [2, "Celula 2 +", "roșu", "senzor tensiune"], [3, "Celula 3 +", "roșu", "senzor tensiune"], [4, "Celula 3 − (masa modulului)", "negru", "referință"], [5, "NTC modul", "galben", "CMU"], [6, "NTC masă", "maro", "CMU"]],
    teste: [
      tst("Tensiunile celulelor și temperaturile modulelor", [["Celula min / max", (s, d) => d === 1 ? "3,48 / 3,79 V" : "3,71 / 3,73 V"], ["Dezechilibru", (s, d) => d === 1 ? "310 mV" : "20 mV"], ["Temperatura min / max", (s) => `${Math.round(lin(s, 22, 34))} / ${Math.round(lin(s, 24, 37))} °C`], ["SOH", (s, d) => d === 1 ? "71 %" : "94 %"]],
        [["Bun", "Celulele echilibrate (< 50 mV), temperaturi apropiate."], ["Celulă slăbită", "Dezechilibru mare – modulul se înlocuiește sau se echilibrează; autonomie redusă."]],
        "Testerul, BMS, date live; condus cu sarcină.", { stim: S("Sarcina", "", 0, 1) }),
      tNTC([5, 6], 10000, 3950, "a modulului de baterie", 15, 45)] },
  izol: { m: ["modul", { w: 70, h: 26, d: 50, culoare: "plasticGri", mufa: 4, urechi: true }],
    pini: [[1, "HV+ (măsură)", "portocaliu", "bara HV+ (prin rezistențe mari)"], [2, "HV− (măsură)", "portocaliu", "bara HV−"], [3, "Șasiu", "maro", "masa vehiculului"], [4, "CAN", "portocaliu/negru", "BMS"]],
    teste: [
      ohm("Rezistența de izolație cu megohmmetrul (500 / 1000 V)", ["HV+", "șasiu"], (s, d) => d === 1 ? 0.18e6 : 550e6,
        [["Bun", "Sute de MΩ (minim 500 Ω/V ⇒ > 0,2 MΩ la 400 V; în practică > 100 MΩ)."], ["Izolație degradată (umezeală, cablu ros)", "≈ 0,18 MΩ: BMS deschide contactorii, vehiculul nu mai intră în READY."]],
        "Doar personal calificat HV: deconectare, verificarea lipsei tensiunii, apoi megohmmetrul între fiecare bară HV și șasiu.", { apN: "Megohmmetru 1000 V" }),
      tst("Monitorul de izolație în date live", [["Rizolație HV+ – șasiu", (s, d) => d === 1 ? "180 kΩ" : "> 5 MΩ"], ["Rizolație HV− – șasiu", () => "> 5 MΩ"], ["Stare", (s, d) => d === 1 ? "AVERTIZARE izolație" : "OK"]],
        [["Bun", "Valori de ordinul MΩ."], ["Defect de izolație", "Avertizare și interzicerea pornirii – localizați componenta deconectând pe rând consumatorii HV."]],
        "Testerul, modulul BMS.", { dtc: ["", "P0AA6 – defect de izolație al sistemului HV"] })] },
  inj1: null
};
