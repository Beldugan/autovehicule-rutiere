/* Instalația de climatizare 3D (realistă, materiale PBR) și animația ciclului frigorific.
   • creeazaStandClima – standul cu motor și instalația de climatizare cu TXV: compresorul cu ambreiaj electromagnetic și transmisia prin
     curea, condensatorul cu electroventilator, filtrul deshidrator, conducta de lichid, supapa de destindere pe peretele despărțitor, carcasa
     HVAC cu evaporatorul și suflanta, panoul de bord cu gurile de ventilație și comenzile climatizării; racordurile de service L și H,
     senzorul de presiune, eticheta agentului; setul manometric (manometrele cu scala de temperatură a agentului), termometrele cu clemă,
     sonda din gura de ventilație, termohigrometrul, detectorul de scurgeri, stația de recuperare–vidare–încărcare.
   • creeazaAnimatieClima – animația 2D a circuitului și a ciclului în diagrama p–h: climatizare cu TXV, climatizare cu orificiu calibrat
     și acumulator, pompă de căldură (încălzire), pompă de căldură cu R744 (transcritic). */
import * as THREE from "./vendor/three.module.min.js";
import * as MOT from "./motor3d.js?v=14";
import { scena, interactiune, particule, aplicaTransparent, materiale, mat, RB, texCanvas, ecran, V3 } from "./turbo3d.js?v=2";

export function creeazaStandClima(gazda, opt = {}) {
  // standul motorului comun (aceeași machetă realistă ca la celelalte lucrări), cu transmisia de accesorii, compresorul de climatizare
  // și circuitul A/C complet: condensatorul, filtrul deshidrator, conductele, racordurile de service, supapa de destindere, blocul HVAC
  const ST = MOT.creeazaStand(gazda, { racire: true, ac: true, interior: true, mod: "opac", vedere: "gen", onSelect: k => opt.laClic && opt.laClic({ ventilator: "ventilatorCond", ac: "senzorP" }[k] || k) });
  const sc = ST.scene, A = ST.mot.acAnc, S = { cont: ST.cont, canvas: ST.canvas, camera: ST.camera };
  const M = materiale(), clic = [], k_ = (o, k, et) => { o.userData.k = k; o.userData.et = et; clic.push(o); return o; };
  const add = (o, par = sc) => { o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  const box = (w, h, d, m, x, y, z, r = 0.006, par = sc) => { const o = add(new THREE.Mesh(RB(w, h, d, r), m), par); o.position.set(x, y, z); return o; };
  const cyl = (r1, r2, h, m, x, y, z, ax = "y", par = sc, seg = 32) => { const o = add(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m), par); o.position.set(x, y, z); if (ax === "x") o.rotation.z = Math.PI / 2; else if (ax === "z") o.rotation.x = Math.PI / 2; return o; };
  const crv = pts => new THREE.CatmullRomCurve3(pts.map(p => Array.isArray(p) ? V3(...p) : p.clone()));
  const tub = (pts, r, m, par = sc, seg = 60, rs = 12) => add(new THREE.Mesh(new THREE.TubeGeometry(crv(pts), seg, r, rs), m), par);
  const gri = mat({ color: 0x3b3f45, roughness: 0.55, metalness: 0.3 }), capA = mat({ color: 0x1f5fbf, roughness: 0.45 }), capR = mat({ color: 0xc62828, roughness: 0.45 }), galben = mat({ color: 0xf2c200, roughness: 0.5 });
  const Y0 = -0.82;                                                                        // podeaua
  /* ---------- zonele de identificare (invizibile) pe componentele circuitului A/C */
  const mH = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const zona = (w, h, d, x, y, z, k, et) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mH); o.position.set(x, y, z); sc.add(o); return k_(o, k, et); };
  const pZ = (c, u, k, et, r = 0.03) => { const p = c.getPointAt(u); return zona(r, r, r, p.x, p.y, p.z, k, et); };
  zona(0.17, 0.13, 0.13, 0.2, -0.04, 0.21, "compresor", "Compresorul cu piston axial și disc oscilant (cilindree variabilă, supapă de control electronică)");
  zona(0.05, 0.13, 0.13, 0.32, -0.04, 0.21, "ambreiaj", "Ambreiajul electromagnetic: fulia Poly-V pe rulment, bobina fixă, discul de antrenare cu arcuri lamelare");
  zona(0.64, 0.33, 0.03, -0.02, 0.05, -0.885, "condensator", "Condensatorul (în fața radiatorului): agentul cedează căldura și se lichefiază (2–3)");
  zona(0.06, 0.26, 0.06, 0.35, 0.04, -0.885, "deshidrator", "Filtrul deshidrator (rezervorul de lichid)");
  zona(0.07, 0.07, 0.05, A.VE.x, A.VE.y, A.VE.z, "txv", "Supapa de destindere termostatică (TXV, tip bloc) pe peretele parafoc (3–4)");
  zona(0.28, 0.22, 0.06, A.evap.x, A.evap.y, A.evap.z, "evaporator", "Evaporatorul în blocul HVAC: agentul se vaporizează preluând căldura aerului (4–1)");
  zona(0.22, 0.14, 0.22, 0.42, 0.28, 0.76, "suflanta", "Suflanta habitaclului (ventilatorul radial)");
  zona(0.04, 0.05, 0.04, A.H.x, A.H.y - 0.01, A.H.z, "racordH", "Racordul de service H (înaltă presiune, capac roșu)");
  zona(0.04, 0.05, 0.04, A.L.x, A.L.y - 0.01, A.L.z, "racordL", "Racordul de service L (joasă presiune, capac albastru, Ø mai mare)");
  pZ(A.cAsp, 0.45, "condJP", "Conducta de aspirație (JP, vapori reci): evaporator → compresor", 0.04); pZ(A.cLic, 0.6, "condIP", "Conducta de lichid (ÎP): filtrul deshidrator → TXV", 0.035); pZ(A.cRef, 0.35, "condIP", "Conducta de refulare (ÎP, gaz fierbinte): compresor → condensator", 0.035);
  // eticheta agentului, pe traversa superioară a radiatorului
  const eEt = ecran(512, 256); const etP = add(new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.075), new THREE.MeshBasicMaterial({ map: eEt.t }))); etP.position.set(-0.2, 0.245, -0.86); etP.rotation.x = -Math.PI / 2 + 0.35; etP.castShadow = false;
  box(0.17, 0.006, 0.09, mat({ color: 0x2a2d31, roughness: 0.6 }), -0.2, 0.238, -0.862).rotation.x = 0.35; k_(etP, "eticheta", "Eticheta instalației: tipul agentului frigorific, cantitatea, uleiul");
  /* ---------- particulele agentului pe conducte: refulare (gaz fierbinte), lichid, aspirație (vapori reci) */
  const PG = new THREE.Group(); sc.add(PG);
  const P = particule(PG, [{ k: "ref", pts: A.cRef.points, n: 30, col: 0xff3b2f }, { k: "lic", pts: A.cLic.points, n: 36, col: 0xffa020 }, { k: "asp", pts: A.cAsp.points, n: 26, col: 0x5fb6ff }], 0.0055);
  /* ---------- setul manometric pe suportul de lângă stand, furtunurile spre racorduri */
  const SM = V3(1.08, 0.5, 0.62), SMg = new THREE.Group(); SMg.position.copy(SM); SMg.rotation.y = 0.75; sc.add(SMg);
  box(0.03, SM.y - Y0 + 0.1, 0.03, gri, SM.x + 0.03, (SM.y + Y0) / 2 + 0.05, SM.z - 0.07, 0.003); box(0.03, 0.03, 0.12, gri, SM.x + 0.03, SM.y + 0.1, SM.z - 0.02, 0.003); box(0.3, 0.02, 0.3, gri, SM.x + 0.03, Y0 + 0.01, SM.z - 0.07, 0.004);
  { const corp = add(new THREE.Mesh(RB(0.17, 0.05, 0.04, 0.008), mat({ color: 0xc9a043, roughness: 0.35, metalness: 0.9 })), SMg); corp.position.y = -0.07; k_(corp, "setman", "Setul manometric: corpul cu robinetele L și H și racordul de serviciu");
    [[-0.06, capA], [0.06, capR]].forEach(([x, m]) => { const kn = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 20), m), SMg); kn.rotation.z = Math.PI / 2; kn.position.set(x * 1.45, -0.07, 0); }); }
  const eMan = [ecran(256, 256), ecran(256, 256)];
  [[-0.05, capA, 0], [0.05, capR, 1]].forEach(([x, m, i]) => { const r = add(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.025, 40), m), SMg); r.rotation.x = Math.PI / 2; r.position.set(x, 0, 0);
    const f = add(new THREE.Mesh(new THREE.CircleGeometry(0.037, 40), new THREE.MeshBasicMaterial({ map: eMan[i].t })), SMg); f.position.set(x, 0, 0.0131); f.castShadow = false; k_(r, "setman", i ? "Manometrul ÎP (roșu) – presiunea relativă și scala de temperatură a agentului" : "Manometrul JP (albastru) – presiunea relativă și scala de temperatură a agentului"); });
  const furtL = tub([[0, 0, 0], [0, 0, 0.01]], 0.005, capA), furtH = tub([[0, 0, 0], [0, 0, 0.01]], 0.005, capR), furtG = tub([[SM.x, SM.y - 0.1, SM.z], [SM.x + 0.05, SM.y - 0.5, SM.z + 0.05], [SM.x + 0.1, Y0 + 0.3, SM.z + 0.02]], 0.005, galben);
  const cuplaj = [A.L, A.H].map((p, i) => { const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.045, 16), i ? capR : capA)); c.position.copy(p).add(V3(0, 0.02, 0)); c.visible = false; return c; });
  let furtKey = "";
  function furtune(conectat) {
    const kk = String(conectat); if (kk === furtKey) return; furtKey = kk; SMg.updateMatrixWorld(true);
    [[furtL, A.L, -0.05], [furtH, A.H, 0.05]].forEach(([f, B0, x], i) => { const P0 = SMg.localToWorld(V3(x * 1.4, -0.1, 0)); let pts;
      if (conectat) { const B = B0.clone().add(V3(0, 0.045, 0)); pts = [P0, P0.clone().add(V3(0, -0.15, 0.05)), V3((P0.x + B.x) / 2, Math.min(P0.y, B.y) - 0.15, (P0.z + B.z) / 2 + 0.1), B.clone().add(V3(0, 0.12, 0.02)), B]; }
      else pts = [P0, P0.clone().add(V3(0.02 * (i ? 1 : -1), -0.3, 0.04)), P0.clone().add(V3(0.04 * (i ? 1 : -1), -0.6, 0.02)), P0.clone().add(V3(0.0, -0.4, -0.04))];
      f.geometry.dispose(); f.geometry = new THREE.TubeGeometry(crv(pts), 60, 0.005, 8); cuplaj[i].visible = !!conectat; }); }
  /* ---------- termometrele cu clemă (T lic înainte de TXV, T asp la compresor) și termometrul cu 2 canale pe cărucior */
  const TERM = new THREE.Group(); sc.add(TERM);
  const cLic = A.cLic.getPointAt(0.88), cAsp = A.cAsp.getPointAt(0.82);
  [[cLic, "Termometrul cu clemă T lic – lichidul înainte de TXV (subrăcirea)"], [cAsp, "Termometrul cu clemă T asp – aspirația compresorului (supraîncălzirea)"]].forEach(([p, et]) => {
    const c = add(new THREE.Mesh(RB(0.03, 0.026, 0.024, 0.005), mat({ color: 0xe9eef2, roughness: 0.4 })), TERM); c.position.copy(p).add(V3(0, 0.02, 0)); k_(c, "clema", et);
    const a = add(new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 16, Math.PI), M.crom), TERM); a.position.copy(p); });
  const CA = V3(1.1, Y0, 0.75), rosuC = mat({ color: 0xc62828, roughness: 0.45, metalness: 0.2 });
  box(0.46, 0.025, 0.34, rosuC, CA.x, Y0 + 0.62, CA.z, 0.006); box(0.46, 0.025, 0.34, rosuC, CA.x, Y0 + 0.25, CA.z, 0.006);
  [[-0.21, -0.15], [0.21, -0.15], [-0.21, 0.15], [0.21, 0.15]].forEach(([x, z]) => { box(0.02, 0.6, 0.02, gri, CA.x + x, Y0 + 0.33, CA.z + z, 0.003); cyl(0.025, 0.025, 0.02, M.cauc, CA.x + x, Y0 + 0.025, CA.z + z, "z"); });
  const TT = V3(CA.x - 0.1, Y0 + 0.65, CA.z); const tt = box(0.08, 0.025, 0.14, M.galben, TT.x, TT.y, TT.z, 0.01, TERM); tt.rotation.x = -0.2; k_(tt, "termometru", "Termometrul cu 2 canale (termocuplele cu clemă)");
  const eTT = ecran(256, 160); { const o = add(new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.038), new THREE.MeshBasicMaterial({ map: eTT.t })), TERM); o.position.set(TT.x, TT.y + 0.016, TT.z - 0.025); o.rotation.x = -Math.PI / 2 - 0.2; o.castShadow = false; }
  [[cLic, 0xffd400], [cAsp, 0x2e9e44]].forEach(([p, c]) => tub([p.clone().add(V3(0, 0.035, 0)), p.clone().add(V3(0.08, 0.1, 0.1)), V3((p.x + TT.x) / 2, Math.max(p.y, TT.y) + 0.1, (p.z + TT.z) / 2 + 0.1), V3(TT.x, TT.y + 0.02, TT.z - 0.07)], 0.0018, mat({ color: c, roughness: 0.5 }), TERM));
  /* ---------- sonda termometrului în gura de ventilație centrală a blocului HVAC; termohigrometrul */
  const GV = new THREE.Group(); sc.add(GV); const gp = V3(0.0, 0.47, 0.86);
  cyl(0.003, 0.003, 0.12, M.crom, gp.x, gp.y, gp.z - 0.02, "z", GV, 8); const gd = box(0.05, 0.09, 0.022, mat({ color: 0x1f6fd0, roughness: 0.6 }), gp.x + 0.02, gp.y - 0.07, gp.z + 0.06, 0.008, GV); k_(gd, "tgura", "Termometrul cu sondă în gura de ventilație (T gură)");
  const eGV = ecran(200, 100); { const o = add(new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.02), new THREE.MeshBasicMaterial({ map: eGV.t })), GV); o.position.set(gp.x + 0.02, gp.y - 0.055, gp.z + 0.072); o.castShadow = false; }
  const TH = V3(CA.x + 0.12, Y0 + 0.69, CA.z - 0.06); const th = box(0.06, 0.1, 0.025, mat({ color: 0xf2f2ee, roughness: 0.5 }), TH.x, TH.y, TH.z, 0.008); th.rotation.y = -0.4; k_(th, "termohigro", "Termohigrometrul: temperatura și umiditatea aerului ambiant");
  const eTH = ecran(200, 160); { const o = add(new THREE.Mesh(new THREE.PlaneGeometry(0.046, 0.036), new THREE.MeshBasicMaterial({ map: eTH.t }))); o.position.set(TH.x + 0.005, TH.y + 0.015, TH.z + 0.0128); o.rotation.y = -0.4; o.castShadow = false; }
  /* ---------- detectorul electronic de scurgeri */
  const DET = new THREE.Group(); sc.add(DET);
  { const c = add(new THREE.Mesh(RB(0.05, 0.16, 0.035, 0.012), mat({ color: 0xf2b705, roughness: 0.5 })), DET); k_(c, "detector", "Detectorul electronic de scurgeri (sensibilitate ≈ 3 g/an)");
    add(new THREE.Mesh(new THREE.TubeGeometry(crv([[0, 0.08, 0], [0, 0.16, 0.02], [0.04, 0.24, 0.06], [0.08, 0.26, 0.1]]), 30, 0.003, 6), M.crom), DET); }
  const ledDet = add(new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 8), new THREE.MeshBasicMaterial({ color: 0x113311 })), DET); ledDet.position.set(0, 0.06, 0.019);
  const PCT = { 1: A.L.clone(), 2: A.H.clone(), 3: V3(0.29, 0.02, 0.27), 4: A.inCond.clone().add(V3(0, -0.05, 0.03)) };
  /* ---------- stația de recuperare – vidare – încărcare */
  const STA = V3(-1.15, Y0, 0.55), stG = new THREE.Group(); stG.position.copy(STA); stG.rotation.y = 0.6; sc.add(stG);
  { const c = add(new THREE.Mesh(RB(0.5, 0.95, 0.45, 0.03), mat({ color: 0xeef1f4, roughness: 0.45 })), stG); c.position.y = 0.55; k_(c, "statie", "Stația automată de recuperare – reciclare – vidare – încărcare");
    const b = add(new THREE.Mesh(RB(0.51, 0.12, 0.46, 0.02), mat({ color: 0x1f5fbf, roughness: 0.5 })), stG); b.position.y = 1.03;
    [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]].forEach(([x, z]) => { const r = add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 20), M.cauc), stG); r.rotation.z = Math.PI / 2; r.position.set(x, 0.04, z); });
    [[-0.11, capA], [0.11, capR]].forEach(([x, m]) => { const g = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 32), m), stG); g.rotation.x = Math.PI / 2; g.position.set(x, 0.8, 0.228); });
    tub([[-0.15, 0.6, 0.23], [-0.2, 0.3, 0.35], [0, 0.15, 0.4], [0.15, 0.4, 0.3]], 0.006, capA, stG); tub([[0.15, 0.6, 0.23], [0.22, 0.3, 0.35], [0.05, 0.12, 0.42], [-0.1, 0.38, 0.32]], 0.006, capR, stG); }
  const eST = ecran(320, 200); { const o = add(new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.137), new THREE.MeshBasicMaterial({ map: eST.t })), stG); o.position.set(0, 0.95, 0.226); o.castShadow = false; }
  interactiune(S, clic, (k, et) => opt.laClic && opt.laClic(k, et));
  /* ---------- desenele ecranelor */
  function cadran(e, p, max, maj, ag, ts, col, ttl) {
    const { x } = e, R = 128; x.fillStyle = "#fbfbf7"; x.beginPath(); x.arc(R, R, R, 0, 7); x.fill();
    const ang = v => (-225 + 270 * Math.max(-0.1, Math.min(1.05, v / max))) * Math.PI / 180;
    for (let v = 0; v <= max + 1e-6; v += maj / 5) { const a = ang(v), M5 = Math.abs(v / maj - Math.round(v / maj)) < 1e-6; x.strokeStyle = "#111"; x.lineWidth = M5 ? 3.5 : 1.4; x.beginPath(); x.moveTo(R + Math.cos(a) * 120, R + Math.sin(a) * 120); x.lineTo(R + Math.cos(a) * (M5 ? 100 : 110), R + Math.sin(a) * (M5 ? 100 : 110)); x.stroke();
      if (M5) { x.fillStyle = "#111"; x.font = "bold 19px system-ui"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(Math.round(v)), R + Math.cos(a) * 86, R + Math.sin(a) * 86); } }
    if (ts) { x.fillStyle = col; x.font = "bold 13px system-ui"; ts.forEach(T => { const pp = ts.p(T); if (pp < 0 || pp > max) return; const a = ang(pp); x.fillText(String(T), R + Math.cos(a) * 64, R + Math.sin(a) * 64); }); x.fillText(`°C ${ag}`, R, R + 30); }
    x.fillStyle = "#333"; x.font = "bold 15px system-ui"; x.fillText(ttl, R, R + 52);
    const a = ang(p); x.strokeStyle = "#111"; x.lineWidth = 5; x.beginPath(); x.moveTo(R - Math.cos(a) * 18, R - Math.sin(a) * 18); x.lineTo(R + Math.cos(a) * 110, R + Math.sin(a) * 110); x.stroke(); x.fillStyle = "#111"; x.beginPath(); x.arc(R, R, 9, 0, 7); x.fill(); e.t.needsUpdate = true;
  }
  function lcd(e, linii, fundal = "#b5c2a6") { const { x, c } = e; x.fillStyle = fundal; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1b2416"; x.textAlign = "left";
    linii.forEach(([a, b], i) => { x.font = "bold 18px system-ui"; x.fillText(a, 10, 34 + i * (c.height - 20) / linii.length); x.font = "bold 30px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(b, c.width - 10, 38 + i * (c.height - 20) / linii.length); x.textAlign = "left"; }); e.t.needsUpdate = true; }
  function eticheta(ag, masa) { const { x } = eEt; x.fillStyle = "#fff"; x.fillRect(0, 0, 512, 256); x.fillStyle = ag === "R1234yf" ? "#0b5394" : "#1b2733"; x.fillRect(0, 0, 512, 60); x.fillStyle = "#fff"; x.font = "bold 36px system-ui"; x.textAlign = "center"; x.fillText("A/C  REFRIGERANT", 256, 44);
    x.fillStyle = "#111"; x.font = "bold 64px system-ui"; x.fillText(ag, 256, 130); x.font = "28px system-ui"; x.fillText(`${masa} ± 10 g · PAG ${ag === "R1234yf" ? "YF" : "46"} · GWP ${ag === "R1234yf" ? "< 1" : "1430"}`, 256, 180);
    if (ag === "R1234yf") { x.fillStyle = "#e08a00"; x.fillText("⚠ A2L – ușor inflamabil", 256, 225); } eEt.t.needsUpdate = true; }
  function statie(et) { const { x, c } = eST; x.fillStyle = "#06121d"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1f6fd0"; x.fillRect(0, 0, c.width, 34); x.fillStyle = "#fff"; x.font = "bold 18px system-ui"; x.textAlign = "left"; x.fillText("A/C SERVICE · program automat", 10, 23);
    ["Recuperare", "Vidare", "Test vid", "Ulei / trasor", "Încărcare", "Gata"].forEach((e, i) => { const on = et && et.i === i, gata = et && et.i > i; x.fillStyle = on ? "#ffb02e" : gata ? "#6dff8e" : "#567"; x.font = (on ? "bold " : "") + "17px system-ui"; x.fillText((gata ? "✓ " : on ? "▶ " : "  ") + e, 14, 60 + i * 22); });
    if (et) { x.fillStyle = "#cfe3f5"; x.font = "bold 22px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(et.txt || "", c.width - 12, 80); x.font = "15px system-ui"; x.fillText(et.sub || "", c.width - 12, 108); } eST.t.needsUpdate = true; }
  /* ---------- starea și bucla de actualizare */
  const V = { n: 0, ac: false, fan: 4, conectat: false, clame: false, sondaGura: false, pJP: 0, pIP: 0, Tlic: 25, Tasp: 25, Tgura: 25, Ta: 25, RH: 50, ag: "R1234yf", masa: 450, det: 0, detLeak: false, statie: null, Tev: 25 };
  let kM = "", kT = "", kG = "", kH = "", kE = "", kS = "", t = 0, tP = performance.now();
  const tsc = ag => { const a = [-10, 0, 10, 20, 30, 40, 50, 60]; a.p = T => opt.psat ? opt.psat(ag, T) - 1.01 : 0; return a; };
  const bucla = tt => { requestAnimationFrame(bucla); const dt = Math.min(0.1, (tt - tP) / 1000); tP = tt; if (!ST.cont.getClientRects().length) return; t += dt;
    const cuplat = V.n > 50 && V.ac, fl = cuplat ? 0.05 + V.n / 4000 * 0.12 : 0; P.actualizeaza({ ref: fl, lic: fl * 0.6, asp: fl * 1.2 }, dt); PG.visible = cuplat;
    furtune(V.conectat); furtG.visible = V.conectat; TERM.visible = V.clame; GV.visible = V.sondaGura;
    if (V.det) { DET.position.copy(PCT[V.det]).add(V3(-0.08, -0.26, -0.1)); DET.rotation.set(0, 0, 0); } else { DET.position.set(CA.x + 0.12, Y0 + 0.64, CA.z + 0.07); DET.rotation.set(-Math.PI / 2, 0, 0.3); }
    ledDet.material.color.set(V.det ? (V.detLeak ? (Math.sin(t * 20) > 0 ? 0xff2020 : 0x441111) : 0x33ff66) : 0x113311);
    const ts = tsc(V.ag);
    const k1 = `${V.pJP.toFixed(2)}|${V.pIP.toFixed(2)}|${V.ag}|${V.conectat}`; if (k1 !== kM) { kM = k1; cadran(eMan[0], V.conectat ? V.pJP : 0, 10, 2, V.ag, ts, "#1f5fbf", "JP · bar"); cadran(eMan[1], V.conectat ? V.pIP : 0, 35, 5, V.ag, ts, "#c62828", "ÎP · bar"); }
    const k2 = `${V.Tlic.toFixed(1)}|${V.Tasp.toFixed(1)}|${V.clame}`; if (k2 !== kT) { kT = k2; lcd(eTT, [["T lic", V.clame ? V.Tlic.toFixed(1) : "----"], ["T asp", V.clame ? V.Tasp.toFixed(1) : "----"]]); }
    const k3 = V.Tgura.toFixed(1); if (k3 !== kG) { kG = k3; lcd(eGV, [["°C", k3]], "#c9d6c0"); }
    const k4 = `${V.Ta}|${V.RH}`; if (k4 !== kH) { kH = k4; lcd(eTH, [["°C", V.Ta.toFixed(1)], ["%RH", String(Math.round(V.RH))]], "#d7dccc"); }
    const k5 = V.ag + V.masa; if (k5 !== kE) { kE = k5; eticheta(V.ag, V.masa); }
    const k6 = JSON.stringify(V.statie); if (k6 !== kS) { kS = k6; statie(V.statie); }
    ST.seteaza({ rpm: V.n, vent: V.n > 50 && (V.ac || V.pIP > 14), racire: { Tm: 88, Tr: 70, x: 0.5, Q: V.n / 4000, capVas: true } });
  };
  requestAnimationFrame(bucla);
  return { seteaza(o) { Object.assign(V, o); }, vedere(p, tg) { ST.vedere(p, tg); }, modCarcasa: m => ST.modCarcasa(m) };
}

/* ===================================================================== ANIMAȚIA 2D: circuitul și ciclul în diagrama p–h */
export const MODURI = {
  txv: { n: "Climatizare – supapă de destindere (TXV) și filtru deshidrator", d: "TXV dozează agentul astfel încât la ieșirea evaporatorului vaporii să fie ușor supraîncălziți (3…8 K): compresorul aspiră numai vapori. Filtrul deshidrator (pe partea ÎP) reține umiditatea și asigură lichid înainte de TXV." },
  ot: { n: "Climatizare – orificiu calibrat și acumulator", d: "Orificiul calibrat are secțiune fixă; agentul care iese din evaporator poate conține și lichid, de aceea acumulatorul de pe aspirație separă lichidul și protejează compresorul. Debitul se reglează prin cuplarea / decuplarea compresorului sau prin cilindree variabilă." },
  pc: { n: "Pompă de căldură (vehicul electric) – încălzire", d: "Valvele inversează rolurile: schimbătorul exterior (din fața vehiculului) devine evaporator și preia căldura aerului exterior chiar sub 0 °C; condensatorul interior (în carcasa HVAC) încălzește aerul habitaclului. COP = 2…3: pentru 1 kW electric se obțin 2…3 kW căldură, față de 1 kW cu rezistența PTC – autonomie mai mare iarna." },
  co2: { n: "Pompă de căldură cu R744 (CO₂) – ciclu transcritic", d: "CO₂ are temperatura critică de 31 °C: căldura se cedează în răcitorul de gaz deasupra punctului critic, fără condensare (presiuni de 80…130 bar). Eficient la temperaturi exterioare foarte scăzute; GWP = 1. Necesită componente pentru presiuni foarte mari și schimbător intern." }
};
export function creeazaAnimatieClima(gazda, opt = {}) {
  gazda.innerHTML = `<div class="ca-grila"><canvas class="ca-cv"></canvas><div class="ca-panou">
    <label class="camp">Varianta <select class="ca-mod">${Object.keys(MODURI).map(k => `<option value="${k}">${MODURI[k].n}</option>`).join("")}</select></label>
    <p class="nota ca-desc"></p>
    <label class="camp">Temperatura exterioară: <b class="ca-tav">30</b> °C <input type="range" class="ca-ta" min="-15" max="40" step="1" value="30"></label>
    <label class="camp">Turația compresorului: <b class="ca-nv">2000</b> rot/min <input type="range" class="ca-n" min="800" max="5000" step="100" value="2000"></label>
    <div class="ca-afis"></div></div></div>
    <style>.ca-grila{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:.8rem}.ca-cv{width:100%;height:clamp(420px,66vh,700px);display:block;border-radius:10px;border:1px solid var(--linie)}.ca-panou .camp{display:block;margin:.4rem 0}.ca-panou input[type=range],.ca-panou select{width:100%}
    .ca-afis{display:grid;grid-template-columns:1fr 1fr;gap:.35rem;margin:.5rem 0}.ca-afis div{background:var(--suprafata-2);border-radius:8px;padding:.3rem .5rem}.ca-afis span{display:block;font-size:.72rem;color:var(--text-sec)}.ca-afis b{font-size:1rem}@media(max-width:900px){.ca-grila{grid-template-columns:1fr}}</style>`;
  const $q = s => gazda.querySelector(s), cv = $q(".ca-cv");
  const st = { mod: "txv", Ta: 30, n: 2000, faza: 0 };
  const sel = $q(".ca-mod"); sel.addEventListener("change", () => { st.mod = sel.value; if (st.mod === "pc" || st.mod === "co2") { if (st.Ta > 15) { st.Ta = 0; $q(".ca-ta").value = 0; $q(".ca-tav").textContent = 0; } } else if (st.Ta < 15) { st.Ta = 30; $q(".ca-ta").value = 30; $q(".ca-tav").textContent = 30; } });
  $q(".ca-ta").addEventListener("input", e => { st.Ta = +e.target.value; $q(".ca-tav").textContent = st.Ta; });
  $q(".ca-n").addEventListener("input", e => { st.n = +e.target.value; $q(".ca-nv").textContent = st.n; });
  // proprietăți aproximative (diagrama p–h schematică): R1234yf și R744
  const R = {
    yf: { Tc: 94.7, pc: 33.8, ps: T => Math.exp(10.35 - 2513 / (T + 273.15)), hl: T => 200 + 1.32 * T + 0.0046 * T * T, hv: T => 362 + 0.55 * T - 0.0053 * T * T },
    co2: { Tc: 31, pc: 73.8, ps: T => Math.exp(10.9 - 2007 / (T + 273.15)), hl: T => 200 + 3.2 * T + 0.035 * T * T, hv: T => 430 - 1.2 * T - 0.065 * T * T }
  };
  function ciclu() {
    const co2 = st.mod === "co2", A = co2 ? R.co2 : R.yf, inc = st.mod === "pc" || co2, x = (st.n - 800) / 4200;
    let Tev, Tcd; if (!inc) { Tev = 6 - 7 * x + 0.12 * (st.Ta - 30); Tcd = st.Ta + 13 + 6 * x; } else { Tev = st.Ta - 8 - 5 * x; Tcd = 38 + 12 * x; }
    const SH = st.mod === "ot" ? 0 : 5, SC = 6, pE = A.ps(Tev);
    const h1 = st.mod === "ot" ? A.hv(Tev) - 4 : A.hv(Tev) + 0.85 * SH;
    let p2, h2, h3;
    if (co2) { p2 = 85 + 35 * x + Math.max(0, 15 - st.Ta) * 0.6; const Tgc = 38 + 6 * x; h3 = 260 + 1.8 * (Tgc - 30) - 0.25 * (p2 - 85); h2 = h1 + 66 + 25 * x; return { A, co2, inc, Tev, Tcd: Tgc, pE, p2, h1, h2, h3, h4: h3, SH, SC }; }
    p2 = A.ps(Tcd); h3 = A.hl(Tcd - SC); const pr = p2 / pE; h2 = h1 + 18 * Math.log(pr) / Math.log(2) * 1.15;
    return { A, co2, inc, Tev, Tcd, pE, p2, h1, h2, h3, h4: h3, SH, SC };
  }
  function desen(dt) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight; if (!W) return; if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext("2d"), cs = getComputedStyle(document.documentElement), fond = cs.getPropertyValue("--suprafata").trim() || "#fff", text = cs.getPropertyValue("--text").trim() || "#222", lin = cs.getPropertyValue("--linie").trim() || "#ccc";
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = fond; g.fillRect(0, 0, W, H);
    const c = ciclu(), inc = c.inc, co2 = c.co2;
    st.faza = (st.faza + dt * (0.08 + st.n / 25000)) % 1;
    /* ---- circuitul (jumătatea stângă) */
    const CW = W * 0.5, cx = CW * 0.5, cy = H * 0.5, L = Math.min(CW * 0.36, H * 0.33);
    const pos = { comp: [cx - L, cy - L * 0.25], ext: [cx, cy - L], exp: [cx + L, cy], int: [cx, cy + L] };
    // culorile stărilor: vapori ÎP fierbinți, lichid ÎP, amestec JP, vapori JP
    const COL = { ip: "#e53935", lic: "#fb8c00", am: "#ab47bc", jp: "#1e88e5" };
    const ret = [pos.comp, [pos.comp[0], pos.ext[1]], pos.ext, [pos.exp[0], pos.ext[1]], pos.exp, [pos.exp[0], pos.int[1]], pos.int, [pos.comp[0], pos.int[1]], pos.comp];
    const segCol = [COL.ip, COL.ip, COL.lic, COL.lic, COL.am, COL.am, COL.jp, COL.jp];
    g.lineWidth = 9; g.lineCap = "round"; for (let i = 0; i < ret.length - 1; i++) { g.strokeStyle = segCol[i]; g.beginPath(); g.moveTo(...ret[i]); g.lineTo(...ret[i + 1]); g.stroke(); }
    // particulele pe circuit
    const segL = []; let Ltot = 0; for (let i = 0; i < ret.length - 1; i++) { const d = Math.hypot(ret[i + 1][0] - ret[i][0], ret[i + 1][1] - ret[i][1]); segL.push(d); Ltot += d; }
    for (let k = 0; k < 40; k++) { let s = ((k / 40 + st.faza) % 1) * Ltot, i = 0; while (s > segL[i]) { s -= segL[i]; i++; } const f = s / segL[i], X = ret[i][0] + (ret[i + 1][0] - ret[i][0]) * f, Y = ret[i][1] + (ret[i + 1][1] - ret[i][1]) * f;
      g.fillStyle = "#fff"; g.beginPath(); g.arc(X, Y, 3, 0, 7); g.fill(); }
    // componentele
    const comp = (p, w, h, et, sub, col) => { g.fillStyle = col; g.strokeStyle = text; g.lineWidth = 1.5; g.beginPath(); g.roundRect(p[0] - w / 2, p[1] - h / 2, w, h, 8); g.fill(); g.stroke(); g.fillStyle = "#fff"; g.font = "bold 13px system-ui"; g.textAlign = "center"; g.fillText(et, p[0], p[1] - (sub ? 2 : -4)); if (sub) { g.font = "11px system-ui"; g.fillText(sub, p[0], p[1] + 13); } };
    comp(pos.comp, 110, 54, "Compresor", co2 ? "80…130 bar" : `${(st.n / 1000).toFixed(1)}k rot/min`, "#455a64");
    comp(pos.ext, 170, 50, inc ? (co2 ? "Răcitor de gaz (interior)" : "Condensator interior") : "Condensator (exterior)", inc ? "încălzește habitaclul" : "cedează căldură aerului", "#c62828");
    comp(pos.exp, 150, 50, st.mod === "ot" ? "Orificiu calibrat" : co2 ? "Supapă electronică" : "Supapă de destindere", st.mod === "ot" ? "secțiune fixă" : "TXV / EXV", "#6a1b9a");
    comp(pos.int, 170, 50, inc ? "Schimbător exterior" : "Evaporator (HVAC)", inc ? `preia căldură la ${st.Ta} °C` : "răcește aerul habitaclului", "#1565c0");
    if (st.mod === "ot") comp([pos.comp[0], pos.int[1] - L * 0.45], 100, 40, "Acumulator", "separă lichidul", "#0d47a1");
    else if (!co2) comp([pos.exp[0], pos.ext[1] + L * 0.45], 140, 40, "Filtru deshidrator", "", "#e65100");
    else comp([pos.exp[0], pos.ext[1] + L * 0.45], 110, 40, "Schimbător intern", "IHX", "#e65100");
    // aerul: săgețile de căldură
    const sag = (x, y, sus, col, t) => { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.5; for (let i = -1; i <= 1; i++) { const X = x + i * 30, y0 = y + (sus ? -30 : 30), y1 = y + (sus ? -62 : 62); g.beginPath(); g.moveTo(X, y0); g.lineTo(X, y1); g.stroke(); g.beginPath(); g.moveTo(X - 6, y1 + (sus ? 8 : -8)); g.lineTo(X, y1); g.lineTo(X + 6, y1 + (sus ? 8 : -8)); g.fill(); } g.font = "12px system-ui"; g.textAlign = "center"; g.fillText(t, x, y + (sus ? -70 : 80)); };
    sag(pos.ext[0], pos.ext[1], true, "#e53935", inc ? "căldură → habitaclu" : "căldură → aer exterior");
    sag(pos.int[0], pos.int[1], false, "#1e88e5", inc ? "căldură ← aer exterior" : "căldură ← aerul habitaclului");
    // legenda
    [["vapori ÎP (fierbinți)", COL.ip], ["lichid ÎP", COL.lic], ["amestec JP", COL.am], ["vapori JP (reci)", COL.jp]].forEach(([t, col], i) => { g.fillStyle = col; g.fillRect(14, 14 + i * 18, 22, 8); g.fillStyle = text; g.font = "12px system-ui"; g.textAlign = "left"; g.fillText(t, 42, 22 + i * 18); });
    /* ---- diagrama p–h (jumătatea dreaptă) */
    const X0 = CW + 50, X1 = W - 16, Y0 = H - 40, Y1 = 30, A = c.A, hmin = 150, hmax = co2 ? 520 : 470, pmin = co2 ? 10 : 1, pmax = co2 ? 160 : 40;
    const PX = h => X0 + (h - hmin) / (hmax - hmin) * (X1 - X0), PY = p => Y0 - (Math.log(p) - Math.log(pmin)) / (Math.log(pmax) - Math.log(pmin)) * (Y0 - Y1);
    g.strokeStyle = lin; g.lineWidth = 1; g.strokeRect(X0, Y1, X1 - X0, Y0 - Y1);
    g.fillStyle = text; g.font = "11px system-ui"; g.textAlign = "right"; (co2 ? [10, 20, 50, 100, 150] : [1, 2, 5, 10, 20, 40]).forEach(p => { g.fillText(String(p), X0 - 4, PY(p) + 4); g.strokeStyle = lin; g.beginPath(); g.moveTo(X0, PY(p)); g.lineTo(X1, PY(p)); g.stroke(); });
    g.textAlign = "center"; for (let h = 200; h <= hmax; h += 50) g.fillText(String(h), PX(h), Y0 + 14); g.fillText("h [kJ/kg]", (X0 + X1) / 2, Y0 + 30);
    g.save(); g.translate(X0 - 36, (Y0 + Y1) / 2); g.rotate(-Math.PI / 2); g.fillText(`p [bar abs.] – ${co2 ? "R744 (CO₂)" : "R1234yf"} (schematic)`, 0, 0); g.restore();
    // clopotul de saturație
    g.strokeStyle = "#888"; g.lineWidth = 2; g.beginPath(); const Tl0 = -30; for (let T = Tl0; T <= A.Tc; T += 1) { const p = A.ps(T), X = PX(A.hl(T)); T === Tl0 ? g.moveTo(X, PY(p)) : g.lineTo(X, PY(p)); } for (let T = A.Tc; T >= Tl0; T -= 1) g.lineTo(PX(A.hv(T)), PY(A.ps(T))); g.stroke();
    g.fillStyle = "#888"; g.font = "11px system-ui"; g.textAlign = "left"; g.fillText("lichid", PX(A.hl(Tl0)) + 4, PY(A.ps(Tl0)) - 4); g.textAlign = "right"; g.fillText("vapori", PX(A.hv(Tl0)) - 4, PY(A.ps(Tl0)) - 4);
    g.textAlign = "center"; g.fillText("punctul critic", PX((A.hl(A.Tc) + A.hv(A.Tc)) / 2), PY(A.pc) - 8);
    // ciclul 1-2-3-4
    const pts = [[c.h1, c.pE], [c.h2, c.p2], [c.h3, c.p2], [c.h4, c.pE]];
    g.strokeStyle = "#1f5f9e"; g.lineWidth = 3; g.beginPath(); pts.forEach(([h, p], i) => i ? g.lineTo(PX(h), PY(p)) : g.moveTo(PX(h), PY(p))); g.closePath(); g.stroke();
    pts.forEach(([h, p], i) => { g.fillStyle = "#1f5f9e"; g.beginPath(); g.arc(PX(h), PY(p), 5, 0, 7); g.fill(); g.fillStyle = text; g.font = "bold 13px system-ui"; g.textAlign = "center"; g.fillText(String(i + 1), PX(h) + (i === 1 || i === 0 ? 12 : -12), PY(p) + (i < 2 && i !== 0 ? -8 : i === 0 ? 16 : -8)); });
    // punctul care parcurge ciclul
    const per = [0, 0.25, 0.5, 0.75, 1], f = st.faza, i = Math.min(3, Math.floor(f * 4)), u = f * 4 - i, a = pts[i], b = pts[(i + 1) % 4];
    const hp = a[0] + (b[0] - a[0]) * u, pp = Math.exp(Math.log(a[1]) + (Math.log(b[1]) - Math.log(a[1])) * u); g.fillStyle = "#ff6f00"; g.beginPath(); g.arc(PX(hp), PY(pp), 6, 0, 7); g.fill();
    g.fillStyle = text; g.font = "12px system-ui"; g.textAlign = "left";
    g.fillText(co2 ? "2–3: răcirea gazului (transcritic)" : "2–3: condensare", PX((c.h2 + c.h3) / 2) - 40, PY(c.p2) - 8); g.fillText(inc ? "4–1: vaporizare (căldură din exterior)" : "4–1: vaporizare", PX(c.h4) + 6, PY(c.pE) + 16);
    const qe = c.h1 - c.h4, w = c.h2 - c.h1, qc = c.h2 - c.h3;
    $q(".ca-afis").innerHTML = `<div><span>p JP / T vap.</span><b>${c.pE.toFixed(1).replace(".", ",")} bar · ${c.Tev.toFixed(0)} °C</b></div><div><span>p ÎP / T ${co2 ? "ieș. răcitor" : "cond."}</span><b>${c.p2.toFixed(co2 ? 0 : 1).replace(".", ",")} bar · ${c.Tcd.toFixed(0)} °C</b></div>
      <div><span>${inc ? "căldură utilă q<sub>c</sub>" : "efect frigorific q<sub>e</sub>"}</span><b>${(inc ? qc : qe).toFixed(0)} kJ/kg</b></div><div><span>${inc ? "COP încălzire" : "COP răcire"}</span><b>${((inc ? qc : qe) / w).toFixed(1).replace(".", ",")}</b></div>`;
  }
  $q(".ca-desc").textContent = MODURI.txv.d; sel.addEventListener("change", () => { $q(".ca-desc").textContent = MODURI[sel.value].d; });
  let tP = performance.now(); const bucla = tt => { requestAnimationFrame(bucla); const dt = Math.min(0.1, (tt - tP) / 1000); tP = tt; if (!cv.getClientRects().length) return; desen(dt); }; requestAnimationFrame(bucla);
  return {};
}
