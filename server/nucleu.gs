/**
 * Registrul de prezență și referate – portalul de laborator Autovehicule Rutiere (FIMIM, UOC).
 * Același script se folosește pentru fiecare disciplină, într-o foaie de calcul separată (legată de clasa din Classroom).
 * Disciplina foii se alege la „Configurare inițială” și se păstrează în Proprietățile scriptului (DISCIPLINA).
 *
 *  - meniul „Laborator”: codul de sesiune pentru proiector, importul studenților din Classroom, configurarea;
 *  - doGet  ?action=start  : verifică codul sesiunii, marchează PREZENȚA și întoarce jetonul + seed-ul parametrilor individuali;
 *  - doPost action=trimite : verifică jetonul, verifică datele cu modelul lucrării (MODELE[cod].verifica),
 *                             creează documentul Google cu referatul, completează foaia lucrării și prezența („P+R”).
 * Fișierul Code.gs se generează din: comun/config.js + modelele lucrărilor + acest nucleu (tools/build_server.py).
 */

const TZ = "Europe/Bucharest";
const ORE_SLOT = 2;
const U = {
  num: function (v) { var x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : NaN; },
  regresie: regresie
};

/* ============================== meniu */
function onOpen() {
  const d = disc_();
  SpreadsheetApp.getUi().createMenu("Laborator" + (d ? " " + d : ""))
    .addItem("Afișează codul de sesiune (proiector)", "arataCod")
    .addItem("Importă studenții din Google Classroom", "importaStudenti")
    .addSeparator()
    .addItem("Colocviu: cheia cadrului didactic", "arataCheieProf")
    .addItem("Colocviu: exportă notele", "exportaNoteColocviu")
    .addSeparator()
    .addItem("Configurare inițială / schimbarea disciplinei", "configurare")
    .addToUi();
}
function props_() { return PropertiesService.getScriptProperties(); }
function disc_() { return props_().getProperty("DISCIPLINA") || ""; }
function infoDisc_() { return PORTAL.discipline[disc_()] || null; }
function nrLab_() { const d = infoDisc_(); return d ? (d.lucrari.length || d.sedinte || 14) : 7; }
function titluLab_(n) { const d = infoDisc_(); return d && d.lucrari[n - 1] ? d.lucrari[n - 1] : ("Ședința " + n); }
function secret_() { let s = props_().getProperty("SECRET"); if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props_().setProperty("SECRET", s); } return s; }
function hmacBytes_(msg) { return Utilities.computeHmacSha256Signature(msg, secret_()); }
function hmac_(msg) { return Utilities.base64EncodeWebSafe(hmacBytes_(msg)).replace(/=+$/, ""); }
function anunta_(mesaj) { Logger.log(mesaj); try { SpreadsheetApp.getUi().alert(mesaj); } catch (e) { } }

function configurare() {
  secret_();
  let d = disc_();
  try {
    const ui = SpreadsheetApp.getUi();
    const lista = Object.keys(PORTAL.discipline).map(k => k + " – " + PORTAL.discipline[k].nume).join("\n");
    const r = ui.prompt("Disciplina acestei foi", lista + "\n\nCodul disciplinei (de ex. MF):" + (d ? " (actual: " + d + ")" : ""), ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() === ui.Button.OK && r.getResponseText().trim()) d = r.getResponseText().trim().toUpperCase();
  } catch (e) { }
  if (!PORTAL.discipline[d]) d = d || "MF";
  props_().setProperty("DISCIPLINA", d);
  foaiePrezenta_(true);
  for (let l = 1; l <= nrLab_(); l++) foaieLab_(l, true);
  if (!props_().getProperty("FOLDER_ID")) {
    const f = DriveApp.createFolder("Referate " + PORTAL.discipline[d].nume + " – " + SpreadsheetApp.getActive().getName());
    props_().setProperty("FOLDER_ID", f.getId());
  }
  anunta_("Configurare încheiată pentru " + PORTAL.discipline[d].nume + ".\n\nPublicați scriptul: Implementare → Gestionați implementările → versiune nouă (sau Implementare nouă → Aplicație web: Execută ca Eu, Acces Oricine) și puneți adresa /exec în comun/config.js, la disciplina " + d + ".\n\nDosarul referatelor: " + DriveApp.getFolderById(props_().getProperty("FOLDER_ID")).getUrl());
}

/* ============================== codul de sesiune */
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function codSesiune_(lab, data) {
  const zi = Utilities.formatDate(data, TZ, "yyyy-MM-dd");
  const slot = Math.floor(Number(Utilities.formatDate(data, TZ, "H")) / ORE_SLOT);
  const b = hmacBytes_("cod|" + disc_() + "|" + lab + "|" + zi + "|" + slot);
  let c = ""; for (let i = 0; i < 6; i++) c += ALFABET[(b[i] + 256) % 32];
  return c;
}
function codValid_(lab, cod) {
  cod = String(cod || "").toUpperCase().trim();
  const acum = new Date();
  return [0, -ORE_SLOT * 60].some(min => codSesiune_(lab, new Date(acum.getTime() + min * 60000)) === cod);
}
function arataCod() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt("Codul sesiunii – " + (infoDisc_() || {}).nume, "Numărul lucrării / ședinței (1–" + nrLab_() + "):", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const lab = parseInt(r.getResponseText(), 10);
  if (!(lab >= 1 && lab <= nrLab_())) { ui.alert("Număr invalid."); return; }
  const acum = new Date(), cod = codSesiune_(lab, acum);
  const ora = Number(Utilities.formatDate(acum, TZ, "H")), h1 = Math.floor(ora / ORE_SLOT) * ORE_SLOT;
  const html = HtmlService.createHtmlOutput(
    `<div style="font-family:system-ui,sans-serif;text-align:center">
       <div style="font-size:18px;color:#555">${(infoDisc_() || {}).nume} – Lucrarea ${lab}<br>${titluLab_(lab)}</div>
       <div style="font-size:96px;font-weight:800;letter-spacing:.12em;margin:18px 0;color:#1f5f9e">${cod}</div>
       <div style="font-size:16px;color:#555">valabil ${h1}:00–${h1 + ORE_SLOT}:00</div>
     </div>`).setWidth(680).setHeight(330);
  ui.showModalDialog(html, "Cod de sesiune");
}

/* ============================== foi */
function col_(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function foaiePrezenta_(refaAntet) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName("Prezență");
  const n = nrLab_();
  const cap = ["Nume și prenume", "E-mail", "Grupa"]; for (let l = 1; l <= n; l++) cap.push("L" + l); cap.push("Prezențe", "Referate");
  if (!sh) { sh = ss.insertSheet("Prezență", 0); refaAntet = true; }
  if (refaAntet) {
    sh.getRange(1, 1, 1, cap.length).setValues([cap]).setFontWeight("bold").setBackground("#e8f0f9");
    sh.setFrozenRows(1); sh.setFrozenColumns(1); sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 230);
    for (let l = 1; l <= n; l++) sh.setColumnWidth(3 + l, 64);
  }
  return sh;
}
function randStudent_(email, nume, grupa) {
  const sh = foaiePrezenta_(false), n = nrLab_();
  const last = sh.getLastRow();
  const emails = last > 1 ? sh.getRange(2, 2, last - 1, 1).getValues().map(r => String(r[0]).toLowerCase().trim()) : [];
  const i = emails.indexOf(email);
  if (i >= 0) { const row = i + 2; if (grupa && !sh.getRange(row, 3).getValue()) sh.getRange(row, 3).setValue(grupa); return { sh, row }; }
  let row = emails.indexOf("") >= 0 ? emails.indexOf("") + 2 : last + 1;
  sh.getRange(row, 1, 1, 3).setValues([[nume, email, grupa]]);
  sh.getRange(row, 4 + n).setFormula(`=COUNTIF(D${row}:${col_(3 + n)}${row},"P*")`);
  sh.getRange(row, 5 + n).setFormula(`=COUNTIF(D${row}:${col_(3 + n)}${row},"*R*")`);
  return { sh, row };
}
const CAP_LAB = ["Trimis la", "Nume", "E-mail", "Grupa", "Început", "Durata determinărilor [min]", "Citiri", "Varianta individuală",
  "Rezultat (student)", "Rezultat (recalculat)", "Citiri incompatibile cu simulatorul", "Valori din tabel fără citire", "Răspunsuri corecte",
  "Lungime concluzii", "Integritate (aplicație)", "Motive / note", "Verdict server", "Document", "Versiune"];
function foaieLab_(lab, refaAntet) {
  const ss = SpreadsheetApp.getActive(), nume = "L" + lab + " – referate";
  let sh = ss.getSheetByName(nume);
  if (!sh) { sh = ss.insertSheet(nume); refaAntet = true; }
  if (refaAntet) { sh.getRange(1, 1, 1, CAP_LAB.length).setValues([CAP_LAB]).setFontWeight("bold").setBackground("#e8f0f9").setWrap(true); sh.setFrozenRows(1); }
  return sh;
}

/* ============================== import din Classroom */
function importaStudenti() {
  const ui = SpreadsheetApp.getUi();
  let cursuri = [];
  try { cursuri = (Classroom.Courses.list({ teacherId: "me", courseStates: ["ACTIVE", "PROVISIONED"], pageSize: 100 }).courses || []); }
  catch (e) { cursuri = []; }
  const lista = cursuri.map((c, i) => `${i + 1}. ${c.name}${c.section ? " – " + c.section : ""}${c.courseState === "PROVISIONED" ? " (invitație neacceptată)" : ""}`).join("\n");
  const r = ui.prompt("Alegeți cursul",
    (lista ? lista + "\n\n" : "Contul acestui script nu are cursuri Classroom ca profesor.\n\n") +
    "0. Cursul nu este în listă (este pe alt cont Google): import din foaia „Import studenți”, în care lipiți lista exportată din Classroom (Nume, E-mail, Grupa).\n\nNumărul cursului:", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const k = parseInt(r.getResponseText(), 10);
  if (k === 0 || !cursuri.length) return importDinFoaie_();
  const c = cursuri[k - 1]; if (!c) return;
  props_().setProperty("COURSE_ID", c.id);
  let tok = null, n = 0;
  do {
    const res = Classroom.Courses.Students.list(c.id, { pageToken: tok, pageSize: 100 });
    (res.students || []).forEach(s => { randStudent_(String(s.profile.emailAddress || "").toLowerCase(), s.profile.name.fullName, c.section || ""); n++; });
    tok = res.nextPageToken;
  } while (tok);
  sorteazaPrezenta_();
  ui.alert(`Importați/actualizați: ${n} studenți din „${c.name}”.`);
}
function sorteazaPrezenta_() { const sh = foaiePrezenta_(false); if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(5 + nrLab_(), sh.getLastColumn())).sort(1); }
/** import din foaia „Import studenți” (coloanele: Nume și prenume | E-mail | Grupa) */
function importDinFoaie_() {
  const ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName("Import studenți");
  if (!sh || sh.getLastRow() < 2) {
    if (!sh) { sh = ss.insertSheet("Import studenți"); sh.getRange(1, 1, 1, 3).setValues([["Nume și prenume", "E-mail", "Grupa"]]).setFontWeight("bold").setBackground("#e8f0f9"); sh.setFrozenRows(1); sh.setColumnWidth(1, 240); sh.setColumnWidth(2, 260); }
    ss.setActiveSheet(sh);
    ui.alert("Am pregătit foaia „Import studenți”.\n\nLipiți de la rândul 2 lista studenților (Nume și prenume, E-mail, Grupa) – de exemplu din Classroom: cursul → Persoane, sau din lista primită de la secretariat – apoi rulați din nou Laborator → Importă studenții și alegeți 0.");
    return;
  }
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  let n = 0, fara = 0;
  v.forEach(([nume, email, grupa]) => {
    email = String(email || "").toLowerCase().trim(); nume = String(nume || "").trim();
    if (!nume) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { fara++; return; }
    randStudent_(email, nume, String(grupa || "").trim()); n++;
  });
  sorteazaPrezenta_();
  ui.alert(`Importați/actualizați: ${n} studenți din foaia „Import studenți”.` + (fara ? `\n${fara} rânduri fără e-mail valid au fost sărite.` : ""));
}

/* ============================== API */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function seed_(email, lab, start) { const b = hmacBytes_("seed|" + email + "|" + disc_() + "|" + lab + "|" + start); return ((b[0] & 255) << 24 | (b[1] & 255) << 16 | (b[2] & 255) << 8 | (b[3] & 255)) >>> 0; }

function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.action === "ping") return json_({ ok: true, disc: disc_() });
    if (p.disc && p.disc !== disc_() && /^colocviu/.test(p.action || "")) return json_({ ok: false, eroare: "Registrul acesta este pentru altă disciplină." });
    if (p.action === "colocviuTest") return json_(apiColocviuTest_(p));
    if (p.action === "colocviuLista") return json_(apiColocviuLista_(p));
    if (p.action !== "start") return json_({ ok: false, eroare: "Acțiune necunoscută." });
    if (p.disc && p.disc !== disc_()) return json_({ ok: false, eroare: "Registrul acesta este pentru altă disciplină." });
    const lab = parseInt(p.lab, 10), email = String(p.email || "").toLowerCase().trim(), nume = String(p.nume || "").trim().slice(0, 80), grupa = String(p.grupa || "").trim().slice(0, 40);
    if (!(lab >= 1 && lab <= nrLab_())) return json_({ ok: false, eroare: "Lucrare invalidă." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json_({ ok: false, eroare: "E-mail invalid." });
    if (PORTAL.domeniuEmail && !email.endsWith("@" + PORTAL.domeniuEmail)) return json_({ ok: false, eroare: "Folosiți adresa instituțională @" + PORTAL.domeniuEmail + "." });
    if (!codValid_(lab, p.cod)) return json_({ ok: false, eroare: "Codul sesiunii nu este corect sau a expirat. Cereți-l cadrului didactic." });
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const { sh, row } = randStudent_(email, nume, grupa);
      const cel = sh.getRange(row, 3 + lab), acum = new Date();
      if (!String(cel.getValue()).startsWith("P")) cel.setValue("P");
      cel.setNote((cel.getNote() ? cel.getNote() + "\n" : "") + "prezent: " + Utilities.formatDate(acum, TZ, "dd.MM.yyyy HH:mm"));
      cel.setBackground("#e5f4ea");
      const start = acum.toISOString();
      return json_({ ok: true, start, token: hmac_("tok|" + email + "|" + disc_() + "|" + lab + "|" + start), seed: seed_(email, lab, start) });
    } finally { lock.releaseLock(); }
  } catch (err) { return json_({ ok: false, eroare: String(err.message || err) }); }
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.disc && d.disc !== disc_() && /^colocviu/.test(d.action || "")) return json_({ ok: false, eroare: "Registrul acesta este pentru altă disciplină." });
    if (d.action === "colocviuTrimite") return json_(apiColocviuTrimite_(d));
    if (d.action === "colocviuBifa") return json_(apiColocviuBifa_(d));
    if (d.action === "colocviuExport") return json_(apiColocviuExport_(d));
    if (d.action !== "trimite") return json_({ ok: false, eroare: "Acțiune necunoscută." });
    const lab = parseInt(d.lab, 10), st = d.student || {}, email = String(st.email || "").toLowerCase().trim();
    if (d.disc && d.disc !== disc_()) return json_({ ok: false, eroare: "Registrul acesta este pentru altă disciplină." });
    if (hmac_("tok|" + email + "|" + disc_() + "|" + lab + "|" + d.start) !== d.token) return json_({ ok: false, eroare: "Sesiune invalidă: reîncepeți laboratorul cu codul din sală." });
    if ((Date.now() - Date.parse(d.start)) / 864e5 > 21) return json_({ ok: false, eroare: "Termenul de predare a expirat." });
    const ver = verifica_(lab, d, email);
    const lock = LockService.getScriptLock(); lock.waitLock(30000);
    let url;
    try {
      const doc = creeazaDoc_(lab, d);
      url = doc.getUrl();
      const sh = foaieLab_(lab, false);
      const versiune = sh.getLastRow() > 1 ? sh.getRange(2, 3, sh.getLastRow() - 1, 1).getValues().filter(r => String(r[0]).toLowerCase() === email).length + 1 : 1;
      const integ = d.integritate || {};
      sh.appendRow([new Date(), st.nume, email, st.grupa, new Date(d.start), ver.durata, (d.log || []).length, d.variantaText || "",
        d.principal ? (d.principal.eticheta + " = " + d.principal.valoare) : "", ver.principal ? (ver.principal.eticheta + " = " + ver.principal.valoare) : "",
        ver.incompatibile, ver.faraCitire, ver.total ? ver.corecte + "/" + ver.total : "—",
        String(d.concluzii || "").length, integ.status || "?", [].concat(ver.motive || [], integ.note || []).join("; "), ver.verdict, url, versiune]);
      sh.getRange(sh.getLastRow(), CAP_LAB.indexOf("Verdict server") + 1).setBackground(ver.verdict === "OK" ? "#e5f4ea" : "#fdf0e1");
      const { sh: sp, row } = randStudent_(email, st.nume, st.grupa);
      const cel = sp.getRange(row, 3 + lab);
      cel.setRichTextValue(SpreadsheetApp.newRichTextValue().setText("P+R").setLinkUrl(url).build());
      cel.setNote((cel.getNote() ? cel.getNote() + "\n" : "") + "referat v" + versiune + ": " + Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm") + " · " + ver.verdict);
      cel.setBackground(ver.verdict === "OK" ? "#cfe9d8" : "#fde2c4");
    } finally { lock.releaseLock(); }
    return json_({ ok: true, docUrl: url });
  } catch (err) { return json_({ ok: false, eroare: String(err.message || err) }); }
}

/* ============================== verificarea cu modelul lucrării */
function verifica_(lab, d, email) {
  const out = { incompatibile: "", faraCitire: "", corecte: 0, total: 0, motive: [], durata: "", verdict: "OK", principal: null };
  const log = (d.log || []).filter(l => l.ms != null);
  if (log.length) out.durata = Math.round(Number(log[log.length - 1].ms) / 6000) / 10;
  if (out.durata !== "" && out.durata < PORTAL.referat.minDurataMin) out.motive.push("determinări în mai puțin de " + PORTAL.referat.minDurataMin + " min");
  const M = MODELE[d.cod];
  if (M && M.verifica) {
    try {
      const v = M.verifica(d, M.parametri(seed_(email, lab, d.start)), U);
      Object.assign(out, { incompatibile: v.incompatibile, faraCitire: v.faraCitire, corecte: v.corecte, total: v.total, principal: v.principal });
      if (v.incompatibile) out.motive.push(v.incompatibile + " citiri incompatibile cu simulatorul");
      if (v.faraCitire) out.motive.push(v.faraCitire + " valori din tabele fără citire în jurnal");
      (v.motive || []).forEach(m => out.motive.push(m));
      if (d.principal && v.principal && isFinite(Number(d.principal.valoare)) && isFinite(Number(v.principal.valoare)) && Math.abs(d.principal.valoare - v.principal.valoare) > Math.abs(v.principal.valoare) * 0.01 + 1e-9) out.motive.push("rezultatul raportat diferă de cel recalculat");
    } catch (e) { out.motive.push("verificarea modelului a eșuat: " + e.message); }
  } else out.motive.push("lucrare fără model de verificare pe server");
  const integ = d.integritate || {};
  if (integ.status && integ.status !== "OK") out.motive.push("aplicația a semnalat: " + (integ.motive || []).join(", "));
  out.verdict = out.motive.length ? "DE VERIFICAT" : "OK";
  return out;
}

/* ============================== documentul Google cu referatul */
function dosarLab_(lab) {
  let id = props_().getProperty("FOLDER_ID");
  if (!id) { id = DriveApp.createFolder("Referate " + ((infoDisc_() || {}).nume || "")).getId(); props_().setProperty("FOLDER_ID", id); }
  const root = DriveApp.getFolderById(id), nume = "L" + lab + " – " + titluLab_(lab);
  const it = root.getFoldersByName(nume);
  return it.hasNext() ? it.next() : root.createFolder(nume);
}
function creeazaDoc_(lab, d) {
  const st = d.student || {}, inf = infoDisc_() || { nume: "", an: "" };
  const doc = DocumentApp.create(`L${lab} – ${st.nume} – ${st.grupa} – referat`);
  const b = doc.getBody();
  b.setMarginTop(50).setMarginBottom(50).setMarginLeft(60).setMarginRight(60);
  b.appendParagraph(PORTAL.univ + " · " + PORTAL.facultate + " · " + PORTAL.program + ", " + inf.an).editAsText().setFontSize(9).setForegroundColor("#555555");
  b.appendParagraph(inf.nume + " – laborator").editAsText().setFontSize(9).setForegroundColor("#555555");
  b.appendParagraph(`Referat – Lucrarea ${lab}. ${titluLab_(lab)}`).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  b.appendTable([["Student", st.nume || ""], ["E-mail", st.email || ""], ["Grupa", st.grupa || ""],
    ["Începutul lucrării (prezență)", Utilities.formatDate(new Date(d.start), TZ, "dd.MM.yyyy HH:mm")], ["Trimis la", Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm")]]
    .concat(d.variantaText ? [["Varianta individuală", d.variantaText]] : []));
  let k = 1;
  b.appendParagraph(`${k++}. Determinări`).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (d.tabeleText || []).forEach(t => { b.appendParagraph(t.titlu).editAsText().setBold(true); if (t.randuri.length) b.appendTable([t.antet].concat(t.randuri)); });
  if (d.grafic && String(d.grafic).indexOf("base64,") > 0) {
    try { const img = Utilities.newBlob(Utilities.base64Decode(String(d.grafic).split("base64,")[1]), "image/png", "grafic.png"); const im = b.appendImage(img); const w = 460; im.setHeight(Math.round(im.getHeight() * w / im.getWidth())).setWidth(w); } catch (e) { }
  }
  if ((d.rezultateText || []).length) { b.appendParagraph(`${k++}. Rezultate`).setHeading(DocumentApp.ParagraphHeading.HEADING2); b.appendTable(d.rezultateText); }
  if ((d.intrebari || []).length) {
    b.appendParagraph(`${k++}. Întrebări individuale`).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    d.intrebari.forEach((q, i) => b.appendParagraph(`${i + 1}. ${q.text} – răspuns: ${(d.raspunsuri || {})[q.id] || "—"} ${q.unitate || ""}`));
  }
  b.appendParagraph(`${k++}. Concluzii`).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  String(d.concluzii || "").split(/\n+/).forEach(par => b.appendParagraph(par));
  b.appendHorizontalRule();
  b.appendParagraph(`Document generat de aplicația de laborator. Cod de verificare: ${hmac_("doc|" + st.email + "|" + d.start + "|" + d.trimisLa).slice(0, 12)}`).editAsText().setFontSize(8).setForegroundColor("#777777");
  doc.saveAndClose();
  const f = DriveApp.getFileById(doc.getId());
  f.moveTo(dosarLab_(lab));
  try { f.addViewer(st.email); } catch (e) { }
  return doc;
}
