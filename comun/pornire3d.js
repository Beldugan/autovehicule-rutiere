/* Sistemul de pornire 3D (materiale PBR) – generatorul demarorului și cele două scene care îl folosesc:
   • creeazaStandPornire – standul motorului 1.4 MPI cu volantul (coroana dințată), demarorul cu releul electromagnetic,
     alternatorul cu cureaua, bateria EFB/AGM cu senzorul IBS și siguranța de putere, cablurile de plus și de masă, consumatorii
     (proiectoarele și electroventilatorul), panoul cu cheia și siguranța pompei de combustibil, aparatele de pe cărucior
     (osciloscopul cu cleștele ampermetric DC, multimetrul cu sondele în punctele U2/U3, testerul de baterie) și masa cu panopliile
     (demarorul secționat, alternatorul-demaror BSG 48 V, bateria Li-ion 48 V, convertorul DC/DC 48/12 V);
   • creeazaAnimatiePornire – animația cuplării și antrenării (demarorul clasic și cel cu reductor planetar, secționate)
     și arhitectura mild-hybrid 48 V (repornire, recuperare la frânare, asistare, oprire) cu fluxurile de energie.
   Axa demarorului este axa X (pinionul spre −X, spre volant); unități: metri. */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { ataseazaViz } from "./viz3d.js?v=1";

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (o) => { const m = new THREE.MeshStandardMaterial(o); m.envMapIntensity = 0.75; return m; };
const RB = (a, b, c, r = 0.004) => new RoundedBoxGeometry(a, b, c, 2, Math.min(r, a / 2.01, b / 2.01, c / 2.01));
function texCanvas(w, h, f, rep) { const c = document.createElement("canvas"); c.width = w; c.height = h; f(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; }
function ecran(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, x: c.getContext("2d"), t }; }
function eticheta(text, sub, w = 512, h = 128, fond = "#f5f5f0", cul = "#1b2733") { const e = ecran(w, h); e.x.fillStyle = fond; e.x.fillRect(0, 0, w, h); e.x.fillStyle = cul; e.x.textAlign = "center"; e.x.font = `bold ${Math.round(h * 0.32)}px system-ui`; e.x.fillText(text, w / 2, sub ? h * 0.45 : h * 0.62); if (sub) { e.x.font = `${Math.round(h * 0.22)}px system-ui`; e.x.fillText(sub, w / 2, h * 0.82); } e.t.needsUpdate = true; return e.t; }

/* ------------------------------------------------------------------ materiale */
function materiale() {
  const tFonta = texCanvas(128, 128, (x, w, h) => { x.fillStyle = "#5c6066"; x.fillRect(0, 0, w, h); for (let i = 0; i < 2000; i++) { const v = 70 + Math.random() * 50; x.fillStyle = `rgba(${v},${v + 4},${v + 8},.35)`; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } }, [3, 3]);
  const tInd = texCanvas(128, 64, (x, w, h) => { x.fillStyle = "#3a3d42"; x.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { x.fillStyle = "#c87533"; x.fillRect(i * 8 + 2, 0, 4, h); } }, [1, 1]);
  const tCol = texCanvas(128, 32, (x, w, h) => { for (let i = 0; i < 24; i++) { x.fillStyle = i % 2 ? "#d08a45" : "#b56a2c"; x.fillRect(i * w / 24, 0, w / 24 - 1, h); } }, [1, 1]);
  return {
    fonta: mat({ color: 0x8a8e94, map: tFonta, roughness: 0.75, metalness: 0.5 }),
    alu: mat({ color: 0xc4c9ce, roughness: 0.45, metalness: 0.75, side: THREE.DoubleSide }), aluL: mat({ color: 0xd9dde1, roughness: 0.22, metalness: 0.95 }),
    otel: mat({ color: 0x8e959c, roughness: 0.4, metalness: 0.85, side: THREE.DoubleSide }), crom: mat({ color: 0xeef1f4, roughness: 0.12, metalness: 1 }),
    jug: mat({ color: 0x2a2d31, roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }), magnet: mat({ color: 0x5b6470, roughness: 0.35, metalness: 0.7 }),
    indus: mat({ map: tInd, roughness: 0.45, metalness: 0.6 }), colector: mat({ map: tCol, roughness: 0.3, metalness: 0.9 }), perie: mat({ color: 0x2b2b2b, roughness: 0.9 }),
    negru: mat({ color: 0x1b1d20, roughness: 0.55 }), cauc: mat({ color: 0x131416, roughness: 0.88, side: THREE.DoubleSide }), plastic: mat({ color: 0x24272b, roughness: 0.5, side: THREE.DoubleSide }),
    cupru: mat({ color: 0xc87533, roughness: 0.3, metalness: 0.95 }), alama: mat({ color: 0xc9a043, roughness: 0.3, metalness: 1 }),
    rosu: mat({ color: 0xc62828, roughness: 0.45 }), galben: mat({ color: 0xf2b705, roughness: 0.55 }), albastru: mat({ color: 0x1f5fbf, roughness: 0.5 }),
    bobina: mat({ color: 0xb8692a, roughness: 0.35, metalness: 0.8, emissive: 0xff6a00, emissiveIntensity: 0 }), taiat: mat({ color: 0xc8202a, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide })
  };
}

/* ------------------------------------------------------------------ angrenaje */
/** roată dințată (dinți drepți, profil trapezoidal simplificat) în planul YZ, axa X; z dinți, raza de vârf ra, lățimea b */
function roataDintata(z, ra, b, m, adanc = 0.12) {
  const s = new THREE.Shape(), rf = ra * (1 - adanc), N = z * 4;
  for (let k = 0; k <= N; k++) { const a = k / N * Math.PI * 2, f = (k % 4), r = f === 1 || f === 2 ? ra : rf, x = r * Math.cos(a), y = r * Math.sin(a); if (k === 0) s.moveTo(x, y); else s.lineTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth: b, bevelEnabled: false, curveSegments: 2 }); g.translate(0, 0, -b / 2); g.rotateY(Math.PI / 2);
  const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o;
}

/* ------------------------------------------------------------------ generatorul demarorului
   opt: { M, sectiune: bool, reductor: bool }. Originea: fața pinionului cuplat (x = 0); corpul spre +X; releul deasupra (+Y).
   întoarce { G, clic[], carcase[], seteaza({ cupl 0…1, rotA, rotP, bobina 0…1, contact 0…1 }), ancore{ t30, t50, masa } } */
export function construiesteDemaror(opt = {}) {
  const M = opt.M || materiale(), G = new THREE.Group(), clic = [], carcase = [], S = !!opt.sectiune, RED = opt.reductor !== false;
  const k_ = (o, k, et) => { o.userData.k = k; o.userData.et = et; clic.push(o); return o; };
  const add = (o, par = G) => { o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  const T0 = S ? 0 : 0, TL = S ? Math.PI * 1.5 : Math.PI * 2;
  // cilindru coaxial (axa X) între x0 și x1; deschis în secțiune (sfert decupat spre +Y/+Z)
  const tubX = (r1, r2, x0, x1, m, par = G, plin = false, seg = 40) => { const g = new THREE.CylinderGeometry(r2, r1, x1 - x0, seg, 1, !plin && S, plin ? 0 : T0, plin ? Math.PI * 2 : TL); g.rotateZ(-Math.PI / 2); const o = add(new THREE.Mesh(g, m), par); o.position.x = (x0 + x1) / 2; return o; };
  const carc = o => { o.material = o.material.clone(); o.userData.m0 = { t: o.material.transparent, op: o.material.opacity }; carcase.push(o); return o; };
  const xm = RED ? 0.125 : 0.105, xe = xm + 0.09;
  /* ---- pinionul cu roata liberă (glisează pe arborele canelat) */
  const PIN = new THREE.Group(); G.add(PIN);
  const pin = roataDintata(10, 0.02, 0.02, M.otel); pin.position.x = 0.01; PIN.add(pin); k_(pin, "pinion", "Pinionul (10 dinți, oțel călit) – angrenează coroana volantului numai în timpul pornirii");
  const rl = tubX(0.026, 0.026, 0.022, 0.05, M.aluL, PIN, true); k_(rl, "pinion", "Roata liberă cu role: transmite cuplul demaror → motor; după pornire pinionul se rotește liber (protejează indusul)");
  const gul = tubX(0.02, 0.02, 0.05, 0.058, M.otel, PIN, true); k_(gul, "furca", "Inelul de antrenare al roții libere, în care intră furca");
  const arb = tubX(0.008, 0.008, -0.004, xm + 0.005, M.crom, G, true); k_(arb, "arbore", "Arborele de antrenare cu caneluri elicoidale (pinionul se rotește puțin la cuplare și intră mai ușor)");
  /* ---- carcasa din față (aluminiu turnat): nasul, flanșa de prindere pe carcasa ambreiajului */
  const nas = carc(tubX(0.03, 0.033, -0.006, 0.04, M.alu)); nas.geometry.dispose();
  { const g = new THREE.CylinderGeometry(0.033, 0.03, 0.046, 40, 1, true, 4.86, S ? 2.6 : 4.08); g.rotateZ(-Math.PI / 2); nas.geometry = g; nas.position.x = 0.017; }
  k_(nas, "carcasaF", "Carcasa din față (aluminiu) – nasul deschis spre coroană, lagărul arborelui");
  const fc = carc(tubX(0.045, 0.045, 0.04, 0.09, M.alu)); k_(fc, "carcasaF", "Carcasa din față (aluminiu) – conține furca și roata liberă");
  const fl = add(new THREE.Mesh(RB(0.008, 0.13, 0.05, 0.004), M.alu)); fl.position.set(0.046, -0.01, 0); carc(fl); k_(fl, "carcasaF", "Flanșa de prindere a demarorului pe carcasa ambreiajului (2 șuruburi)");
  [-1, 1].forEach(s => { const o = add(new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.003, 8, 20), M.alu)); o.rotation.y = Math.PI / 2; o.position.set(0.046, -0.01 + s * 0.058, 0); });
  /* ---- furca (pârghia) cu pivotul */
  const FUR = new THREE.Group(); FUR.position.set(0.068, 0.04, 0); G.add(FUR);
  { const b1 = add(new THREE.Mesh(RB(0.006, 0.05, 0.018, 0.002), M.otel), FUR); b1.position.set(0, -0.025, 0); k_(b1, "furca", "Furca (pârghia) de cuplare: tirantul releului o rotește în jurul pivotului și împinge pinionul spre coroană");
    const b2 = add(new THREE.Mesh(RB(0.006, 0.03, 0.012, 0.002), M.otel), FUR); b2.position.set(0, 0.014, 0); b2.rotation.z = -0.3;
    const pv = add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 12), M.crom), FUR); pv.rotation.x = Math.PI / 2; }
  /* ---- releul electromagnetic (solenoidul): bobinele, plonjorul, contactele principale, bornele 30, 50 și M */
  const yS = 0.052, REL = new THREE.Group(); G.add(REL);
  const rc = carc(tubX(0.025, 0.025, 0.06, 0.135, M.otel, REL)); rc.position.y = yS; k_(rc, "releu", "Releul electromagnetic (solenoidul) al demarorului: bobina de atragere și bobina de menținere, plonjorul, contactele principale");
  const bob = tubX(0.021, 0.021, 0.075, 0.118, M.bobina, REL, true); bob.position.y = yS; k_(bob, "releu", "Bobinele releului: atragere (în serie cu indusul, scurtcircuitată la închiderea contactelor) și menținere (la masă)");
  const PL = new THREE.Group(); REL.add(PL);
  const plj = tubX(0.011, 0.011, 0.056, 0.09, M.crom, PL, true); plj.position.y = yS; k_(plj, "releu", "Plonjorul (miezul mobil) – trage furca și închide contactele principale (puntea de contact)");
  const tir = add(new THREE.Mesh(RB(0.026, 0.006, 0.006, 0.002), M.otel), PL); tir.position.set(0.064, yS - 0.002, 0);
  const pct = tubX(0.016, 0.016, 0.121, 0.125, M.cupru, PL, true); pct.position.y = yS; k_(pct, "releu", "Puntea de contact (cupru) – închide circuitul de putere borna 30 → indus");
  const cap = carc(tubX(0.025, 0.022, 0.135, 0.15, M.plastic, REL)); cap.position.y = yS; k_(cap, "releu", "Capacul releului (bachelită) cu bornele 30, 50 și M");
  const b30 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.022, 14), M.alama)); b30.rotation.z = Math.PI / 2; b30.position.set(0.16, yS + 0.01, 0.009); k_(b30, "borne", "Borna 30 (plus permanent de la baterie, cablul de putere 25…35 mm²)");
  const b30p = add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 6), M.otel)); b30p.rotation.z = Math.PI / 2; b30p.position.set(0.157, yS + 0.01, 0.009);
  const b50 = add(new THREE.Mesh(RB(0.014, 0.006, 0.0015, 0.0005), M.alama)); b50.position.set(0.155, yS - 0.012, -0.008); k_(b50, "borne", "Borna 50 (comanda de pornire: cheia / releul de pornire al sistemului stop-start)");
  const bM = add(new THREE.Mesh(RB(0.03, 0.003, 0.008, 0.001), M.cupru)); bM.position.set(0.15, yS - 0.025, 0.012); bM.rotation.z = -0.9; k_(bM, "borne", "Borna M: banda de cupru releu → periile indusului");
  /* ---- reductorul planetar (demarorul „întărit” al sistemelor stop-start) */
  if (RED) { const rg = carc(tubX(0.04, 0.04, 0.09, xm, M.alu)); k_(rg, "reductor", "Reductorul planetar (i ≈ 4…5): indus mic și rapid, cuplu mare pe pinion; coroana interioară din poliamidă armată");
    const cor = tubX(0.034, 0.034, 0.098, 0.118, mat({ color: 0xe3dccb, roughness: 0.6, side: THREE.DoubleSide }), G); k_(cor, "reductor", "Coroana interioară a reductorului (poliamidă armată – amortizează șocurile)");
    const PLN = new THREE.Group(); PLN.position.x = 0.108; G.add(PLN); G.userData.planet = PLN;
    for (let k = 0; k < 3; k++) { const p = roataDintata(12, 0.012, 0.016, M.otel); const a = k / 3 * Math.PI * 2; p.position.set(0, Math.cos(a) * 0.02, Math.sin(a) * 0.02); PLN.add(p); k_(p, "reductor", "Sateliții reductorului planetar"); }
    const sol = roataDintata(10, 0.008, 0.018, M.crom); sol.position.x = 0.108; G.add(sol); G.userData.sol = sol; }
  /* ---- motorul de curent continuu: jugul cu magneți permanenți, indusul, colectorul, periile, capacul din spate */
  const jug = carc(tubX(0.04, 0.04, xm, xe, M.jug)); k_(jug, "stator", "Jugul statorului (țeavă de oțel) cu magneți permanenți (sau bobine de excitație serie la demaroarele mari)");
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; if (S && Math.cos(a) > 0 && Math.sin(a) < 0) continue;
    const g = new THREE.CylinderGeometry(0.036, 0.036, 0.07, 10, 1, true, a - 0.38, 0.76); g.rotateZ(-Math.PI / 2); const o = add(new THREE.Mesh(g, M.magnet)); o.position.x = xm + 0.045; o.material = M.magnet; k_(o, "stator", "Magneții permanenți (ferită) – excitația motorului de curent continuu"); }
  const IND = new THREE.Group(); G.add(IND);
  const ind = tubX(0.029, 0.029, xm + 0.008, xe - 0.018, M.indus, IND, true); k_(ind, "indus", "Indusul (rotorul): pachet de tole cu bobinaj din bare de cupru; cuplul mare la turație mică cere curent mare");
  const col = tubX(0.017, 0.017, xe - 0.016, xe - 0.002, M.colector, IND, true); k_(col, "colector", "Colectorul (lamele de cupru izolate) – comută curentul în bobinajul indusului");
  [0, 1, 2, 3].forEach(k => { const a = k / 4 * Math.PI * 2 + Math.PI / 4; const p = add(new THREE.Mesh(RB(0.008, 0.012, 0.006, 0.001), M.perie)); p.position.set(xe - 0.009, Math.cos(a) * 0.024, Math.sin(a) * 0.024); p.lookAt(V3(xe - 0.009, 0, 0)); k_(p, "colector", "Periile de grafit cu cupru (+ și −) și port-periile cu arcuri"); });
  const cs = carc(tubX(0.04, 0.034, xe, xe + 0.018, M.alu)); k_(cs, "capac", "Capacul din spate (lagărul indusului, port-periile)");
  [[0.028, 0.028], [-0.028, -0.028]].forEach(([y, z]) => { const t = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, xe - 0.04, 8), M.crom)); t.rotation.z = Math.PI / 2; t.position.set((0.04 + xe) / 2 + 0.008, y, z); });
  const strap = add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0.152, yS - 0.03, 0.016), V3(0.16, yS - 0.04, 0.03), V3(xm + 0.03, 0.04, 0.03)]), 12, 0.003, 6), M.cupru)); k_(strap, "borne", "Banda de cupru de la borna M a releului la peria pozitivă");
  return {
    G, clic, carcase, ancore: { t30: V3(0.17, yS + 0.01, 0.009), t50: V3(0.162, yS - 0.012, -0.008), masa: V3(0.046, -0.07, 0) },
    seteaza(u) {
      const c = u.cupl || 0; PIN.position.x = 0.016 * (1 - c); PIN.rotation.x = (u.rotP || 0) + (1 - c) * 0.25;
      FUR.rotation.z = -0.32 * c; PL.position.x = -0.012 * c; IND.rotation.x = u.rotA || 0;
      if (G.userData.planet) { G.userData.planet.rotation.x = (u.rotA || 0) / 4.5; G.userData.planet.children.forEach(p => p.rotation.x = -(u.rotA || 0) * 0.8); G.userData.sol.rotation.x = u.rotA || 0; }
      arb.rotation.x = u.rotP || 0; M.bobina.emissiveIntensity = 0.9 * (u.bobina || 0); pct.position.x = -0.002 * (u.contact || 0);
    }
  };
}

/* ------------------------------------------------------------------ scena, interacțiunea, particulele (ca la turbo3d) */
function scena(gazda, cam0, tinta, o = {}) {
  gazda.innerHTML = `<div class="m3d a3d"><canvas></canvas><div class="m3d-ajutor">trageți = rotire · rotița = zoom</div></div>`;
  const cont = gazda.querySelector(".m3d"), canvas = cont.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 2, 0.005, 30); camera.position.set(...cam0);
  const ctl = new OrbitControls(camera, canvas); ctl.target.set(...tinta); ctl.enableDamping = true; ctl.minDistance = o.min || 0.08; ctl.maxDistance = o.max || 3; ctl.maxPolarAngle = Math.PI * 0.6;
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(...(o.sun || [0.8, 1.6, 1.0])); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const L = o.umbra || 0.6; Object.assign(sun.shadow.camera, { left: -L, right: L, top: L, bottom: -L, near: 0.1, far: 6 }); sun.shadow.bias = -0.0004; scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50555a, 0.5));
  const tema = () => { const t = document.documentElement.getAttribute("data-theme"), inchis = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); scene.background = new THREE.Color(inchis ? 0x1a1f25 : 0xdfe4e8); };
  tema(); window.addEventListener("schimbare-tema", tema);
  const viz = ataseazaViz({ renderer, scene, camera, cont, profil: Object.assign({ titlu: "Temperatura suprafețelor", T0: 20, Tmin: 15, Tmax: 120 }, o.vizProfil || {}) });
  return { cont, canvas, renderer, scene, camera, ctl, viz,
    porneste(fn) { let tP = performance.now(); const bucla = t => { requestAnimationFrame(bucla); const dt = Math.min(0.1, (t - tP) / 1000); tP = t; if (!cont.getClientRects().length) return; fn(dt);
      ctl.update(); const w = cont.clientWidth, h = cont.clientHeight; if (canvas.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } renderer.render(scene, camera); }; requestAnimationFrame(bucla); } };
}
function interactiune(S, clic, laClic) {
  const tip = document.createElement("div"); tip.className = "a3d-tip"; tip.hidden = true; S.cont.appendChild(tip);
  const rc = new THREE.Raycaster(), mp = new THREE.Vector2(); let jos = null;
  const isVis = o => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
  const tinta = e => { const r = S.canvas.getBoundingClientRect(); mp.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rc.setFromCamera(mp, S.camera); const h = rc.intersectObjects(clic.filter(o => isVis(o)), false)[0]; return h ? h.object : null; };
  S.canvas.addEventListener("pointerdown", e => { jos = [e.clientX, e.clientY]; });
  S.canvas.addEventListener("pointerup", e => { if (!jos || Math.hypot(e.clientX - jos[0], e.clientY - jos[1]) > 5) return; const o = tinta(e); if (o && laClic) laClic(o.userData.k, o.userData.et); });
  S.canvas.addEventListener("pointermove", e => { if (e.buttons) { tip.hidden = true; return; } const o = tinta(e); S.canvas.style.cursor = o ? "pointer" : "";
    if (o) { const r = S.cont.getBoundingClientRect(); tip.textContent = o.userData.et; tip.style.left = (e.clientX - r.left + 14) + "px"; tip.style.top = (e.clientY - r.top + 10) + "px"; tip.hidden = false; } else tip.hidden = true; });
  S.canvas.addEventListener("pointerleave", () => { tip.hidden = true; });
}
function particule(par, cai, raza = 0.0035) {
  let NP = 0; cai.forEach(c => { c.curba = new THREE.CatmullRomCurve3(c.pts); c.L = c.curba.getLength(); c.s = Array.from({ length: c.n }, (_, k) => k / c.n); NP += c.n; });
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(raza, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }), NP); im.renderOrder = 5; par.add(im);
  let j = 0; const cc = new THREE.Color(); cai.forEach(c => { for (let k = 0; k < c.n; k++) im.setColorAt(j++, cc.setHex(c.col)); });
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), s1 = V3(1, 1, 1), s0 = V3(0, 0, 0);
  return { im, actualizeaza(v, dt) { let j = 0; cai.forEach(c => { const w = v[c.k] || 0; c.s.forEach((s, k) => { let sN = (s + w * dt / c.L) % 1; if (sN < 0) sN += 1; if (!(sN >= 0 && sN < 1)) sN = 0; c.s[k] = sN; m4.compose(c.curba.getPointAt(sN), q0, Math.abs(w) > 1e-4 ? s1 : s0); im.setMatrixAt(j++, m4); }); }); im.instanceMatrix.needsUpdate = true; } };
}
function aplicaTransparent(carcase, on) { carcase.forEach(o => { const m = o.material; m.transparent = on || o.userData.m0.t; m.opacity = on ? 0.2 : o.userData.m0.op; m.depthWrite = !on; m.needsUpdate = true; o.castShadow = !on; }); }

/* ------------------------------------------------------------------ componente de sistem: alternatorul, BSG 48 V, bateriile, DC/DC */
function alternator(M, r = 0.065) {
  const g = new THREE.Group(), cyl = (r1, r2, h, m, x) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, h, 36), m); o.rotation.z = -Math.PI / 2; o.position.x = x; o.castShadow = true; g.add(o); return o; };
  const c1 = cyl(r, r, 0.05, M.alu, 0), c2 = cyl(r, r * 0.9, 0.045, M.alu, 0.046);
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; const f = new THREE.Mesh(RB(0.08, 0.004, 0.012, 0.001), M.alu); f.position.set(0.02, Math.cos(a) * (r - 0.004), Math.sin(a) * (r - 0.004)); f.rotation.x = a; g.add(f); }
  const v = cyl(r * 0.85, r * 0.85, 0.008, M.otel, -0.032), ful = cyl(0.028, 0.028, 0.03, M.otel, -0.055);
  const cp = cyl(r * 0.75, r * 0.6, 0.02, M.plastic, 0.078);
  const bp = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.02, 10), M.alama); bp.rotation.z = Math.PI / 2; bp.position.set(0.095, 0.03, 0.02); g.add(bp);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.014, 12), M.rosu); cap.rotation.z = Math.PI / 2; cap.position.set(0.095, 0.03, 0.02); g.add(cap);
  return { g, rot: [v, ful], parti: [c1, c2, cp], bplus: V3(0.1, 0.03, 0.02) };
}
function bsg(M) {
  const g = new THREE.Group(), cyl = (r1, r2, h, m, x) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, h, 40), m); o.rotation.z = -Math.PI / 2; o.position.x = x; o.castShadow = true; g.add(o); return o; };
  const c = cyl(0.075, 0.075, 0.1, mat({ color: 0x9aa1a8, roughness: 0.4, metalness: 0.75 }), 0.02);
  [-0.02, 0.02, 0.05].forEach(x => cyl(0.078, 0.078, 0.006, M.alu, x));
  const ful = cyl(0.03, 0.03, 0.032, M.otel, -0.05);
  const inv = new THREE.Mesh(RB(0.06, 0.05, 0.13, 0.008), M.alu); inv.position.set(0.1, 0.0, 0); g.add(inv);
  const et = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.035), new THREE.MeshBasicMaterial({ map: eticheta("BSG 48 V", "invertor integrat", 512, 160, "#1b2733", "#ffd34d") })); et.position.set(0.1, 0.0, 0.0661); g.add(et);
  [[0.06, 0.07], [0.09, 0.07]].forEach(([x, y]) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 12), M.negru); t.position.set(x, y, -0.03); g.add(t); });
  return { g, ful };
}
function baterie(M, eticheta1, eticheta2, cul = 0x24272b, d = [0.28, 0.19, 0.175]) {
  const g = new THREE.Group(), [L, H, W] = d;
  const c = new THREE.Mesh(RB(L, H, W, 0.01), mat({ color: cul, roughness: 0.55 })); c.castShadow = c.receiveShadow = true; g.add(c);
  const cap = new THREE.Mesh(RB(L + 0.004, 0.02, W + 0.004, 0.006), mat({ color: 0x2c2f33, roughness: 0.5 })); cap.position.y = H / 2 - 0.006; g.add(cap);
  const et = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.86, H * 0.55), new THREE.MeshBasicMaterial({ map: eticheta(eticheta1, eticheta2, 512, 200, "#e8edf2", "#0d2a4d") })); et.position.set(0, -0.01, W / 2 + 0.0026); g.add(et);
  return { g, c };
}

/* ===================================================================== STANDUL: motorul 1.4 MPI cu sistemul de pornire și aparatele */
export function creeazaStandPornire(gazda, opt = {}) {
  const S = scena(gazda, [1.6, 1.25, 1.8], [0.15, 0.55, 0.15], { min: 0.15, max: 5, umbra: 1.7, sun: [1.5, 3, 2] }), sc = S.scene;
  const M = materiale(), clic = [], k_ = (o, k, et) => { o.traverse ? o.traverse(c => { if (c.isMesh) { c.userData.k = k; c.userData.et = et; clic.push(c); } }) : 0; return o; };
  const add = (o, par = sc) => { o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  const box = (w, h, d, m, x, y, z, r = 0.006, par = sc) => { const o = add(new THREE.Mesh(RB(w, h, d, r), m), par); o.position.set(x, y, z); return o; };
  const cyl = (r1, r2, h, m, x, y, z, ax = "y", par = sc, seg = 32) => { const o = add(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m), par); o.position.set(x, y, z); if (ax === "x") o.rotation.z = Math.PI / 2; else if (ax === "z") o.rotation.x = Math.PI / 2; return o; };
  const tub = (pts, r, m, par = sc, seg = 48, rs = 12) => add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => Array.isArray(p) ? V3(...p) : p.clone())), seg, r, rs), m), par);
  const carcase = [];
  // podeaua, peretele, marcajul
  const pod = add(new THREE.Mesh(new THREE.PlaneGeometry(9, 7), mat({ color: 0x8d949b, roughness: 0.4, metalness: 0.1 }))); pod.rotation.x = -Math.PI / 2; pod.castShadow = false;
  const per = add(new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), mat({ color: 0xe9ecef, roughness: 0.9 }))); per.position.set(0, 1.7, -1.4); per.castShadow = false;
  [-1, 1].forEach(s => { const l = add(new THREE.Mesh(new THREE.PlaneGeometry(0.06, 5), mat({ color: 0xf2c94c, roughness: 0.6 }))); l.rotation.x = -Math.PI / 2; l.position.set(s * 1.35, 0.001, 0.3); l.castShadow = false; });
  /* ---------- cadrul standului și raftul bateriei */
  const albastru = mat({ color: 0x1f3f8f, roughness: 0.45, metalness: 0.4 });
  [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]].forEach(([x, z]) => box(0.05, 0.36, 0.05, albastru, x, 0.18, z, 0.004));
  [-0.32, 0.32].forEach(z => box(1.2, 0.05, 0.05, albastru, 0, 0.36, z, 0.004)); [-0.55, 0.55].forEach(x => box(0.05, 0.05, 0.69, albastru, x, 0.36, 0, 0.004));
  [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]].forEach(([x, z]) => cyl(0.03, 0.03, 0.03, M.cauc, x, 0.015, z));
  [-0.3, 0.3].forEach(x => { box(0.06, 0.06, 0.06, M.cauc, x, 0.41, -0.05, 0.01); box(0.03, 0.1, 0.08, albastru, x, 0.47, -0.05, 0.004); });
  box(0.4, 0.025, 0.36, albastru, 0.78, 0.36, 0.2, 0.004); [[0.96, 0.04], [0.96, 0.36]].forEach(([x, z]) => box(0.04, 0.36, 0.04, albastru, x, 0.18, z, 0.004)); box(0.4, 0.04, 0.04, albastru, 0.78, 0.36, 0.36, 0.004);
  /* ---------- motorul 1.4 MPI: blocul, chiulasa, capacul, baia, distribuția */
  const fontaB = mat({ color: 0x55595e, roughness: 0.7, metalness: 0.5 }), aluC = mat({ color: 0xa9afb5, roughness: 0.55, metalness: 0.6 });
  k_(box(0.46, 0.27, 0.22, fontaB, 0, 0.64, -0.05, 0.01), "motor", "Blocul motor 1.4 MPI (K7J) – 4 cilindri în linie");
  for (let k = 0; k < 5; k++) box(0.012, 0.22, 0.012, fontaB, -0.2 + k * 0.1, 0.64, 0.062, 0.003);
  box(0.47, 0.11, 0.22, aluC, 0, 0.83, -0.05, 0.01); k_(box(0.44, 0.07, 0.19, M.alu, 0, 0.92, -0.05, 0.02), "motor", "Capacul culbutorilor (1.4 MPI)");
  { const pl = add(new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.035), new THREE.MeshBasicMaterial({ map: eticheta("1.4 MPI", "", 256, 64, "#c4c9ce", "#1b2733") }))); pl.rotation.x = -Math.PI / 2; pl.position.set(0.05, 0.956, -0.04); pl.castShadow = false; }
  box(0.46, 0.08, 0.2, fontaB, 0, 0.47, -0.05, 0.01); box(0.05, 0.42, 0.24, M.plastic, 0.26, 0.7, -0.05, 0.01);
  box(0.42, 0.06, 0.07, M.plastic, 0, 0.8, -0.2, 0.012);                                                    // colectorul de admisie
  for (let k = 0; k < 4; k++) tub([[-0.15 + k * 0.1, 0.79, 0.06], [-0.15 + k * 0.1, 0.77, 0.12], [-0.05 + k * 0.03, 0.62, 0.16], [0.0, 0.5, 0.17]], 0.014, mat({ color: 0x6b5446, roughness: 0.75, metalness: 0.5 }));
  /* ---------- volantul cu coroana dințată (vizibil prin fereastra carcasei ambreiajului) */
  const VOL = new THREE.Group(); VOL.position.set(-0.31, 0.6, -0.05); sc.add(VOL);
  const vd = add(new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.02, 64), M.otel), VOL); vd.rotation.z = Math.PI / 2; k_(vd, "volant", "Volantul motorului (oțel / fontă)");
  const cor = roataDintata(110, 0.172, 0.022, M.crom, 0.07); VOL.add(cor); k_(cor, "coroana", "Coroana dințată a volantului (≈ 110…130 dinți, călită) – raportul pinion/coroană ≈ 1:11…1:13");
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 6), M.crom), VOL); b.rotation.z = Math.PI / 2; b.position.set(-0.012, Math.cos(a) * 0.05, Math.sin(a) * 0.05); }
  { const g = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 64, 1, true, Math.PI * 0.55, Math.PI * 1.25); g.rotateZ(Math.PI / 2); const ch = add(new THREE.Mesh(g, aluC)); ch.position.set(-0.3, 0.6, -0.05); ch.material = aluC.clone(); ch.material.side = THREE.DoubleSide; k_(ch, "motor", "Carcasa ambreiajului (fereastra de vizitare deschisă pentru observarea coroanei)"); }
  /* ---------- demarorul (cu reductor planetar, varianta întărită stop-start) */
  const DEM = construiesteDemaror({ M, reductor: true });
  const pAx = V3(-0.322, 0.6 - 0.192 * Math.sin(0.62), -0.05 + 0.192 * Math.cos(0.62));          // axa pinionului la distanța ra + rp de axa volantului
  DEM.G.position.copy(pAx); sc.add(DEM.G); DEM.carcase.forEach(o => carcase.push(o)); DEM.clic.forEach(o => clic.push(o));
  DEM.G.updateMatrixWorld(true); const T30 = DEM.G.localToWorld(DEM.ancore.t30.clone()), CARC = DEM.G.localToWorld(V3(0.12, -0.035, 0.03));
  /* ---------- transmisia accesoriilor: fulia arborelui cotit, alternatorul, rola întinzătoare, cureaua Poly-V */
  const FC = V3(0.3, 0.52, -0.05), ALT = alternator(M); ALT.g.position.set(0.355, 0.8, 0.12); sc.add(ALT.g); ALT.g.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); k_(ALT.g, "alternator", "Alternatorul (14 V, 90…150 A) cu regulator – reîncarcă bateria după pornire și alimentează consumatorii");
  const fc = cyl(0.06, 0.06, 0.03, M.otel, FC.x, FC.y, FC.z, "x"); const fcr = cyl(0.045, 0.045, 0.034, M.cauc, FC.x - 0.002, FC.y, FC.z, "x");
  const RT = V3(0.3, 0.68, 0.1), rt = cyl(0.025, 0.025, 0.03, M.otel, RT.x, RT.y, RT.z, "x"); k_(rt, "curea", "Rola întinzătoare automată a curelei");
  const FA = V3(0.3, 0.8, 0.12);
  { const cur = new THREE.CatmullRomCurve3([V3(0.3, FC.y - 0.062, FC.z), V3(0.3, FC.y, FC.z - 0.062), V3(0.3, FC.y + 0.05, FC.z - 0.04), V3(0.3, FA.y + 0.0, FA.z - 0.03), V3(0.3, FA.y + 0.03, FA.z), V3(0.3, FA.y, FA.z + 0.03), V3(0.3, RT.y + 0.02, RT.z + 0.026), V3(0.3, RT.y - 0.03, RT.z + 0.02), V3(0.3, FC.y + 0.03, FC.z + 0.06), V3(0.3, FC.y - 0.035, FC.z + 0.05)], true);
    const b = add(new THREE.Mesh(new THREE.TubeGeometry(cur, 120, 0.006, 6, true), M.cauc)); b.scale.set(1, 1, 1); k_(b, "curea", "Cureaua Poly-V (antrenează alternatorul; la sistemul mild-hybrid – BSG-ul, în ambele sensuri)"); }
  /* ---------- bateria 12 V (EFB / AGM), siguranța de putere, senzorul IBS, cablurile */
  const BAT = baterie(M, opt.etichetaBaterie || "EFB 12 V 72 Ah", opt.etichetaBaterie2 || "680 A (EN) · START-STOP"); BAT.g.position.set(0.78, 0.468, 0.2); sc.add(BAT.g); k_(BAT.c, "baterie", "Bateria de pornire 12 V (EFB sau AGM – rezistă ciclurilor repetate ale sistemului stop-start)");
  const BP = V3(0.67, 0.575, 0.25), BM = V3(0.89, 0.575, 0.25);
  [[BP, M.rosu, "Borna (+) a bateriei"], [BM, M.negru, "Borna (−) a bateriei"]].forEach(([p, m, et]) => { const b = cyl(0.011, 0.012, 0.022, M.plastic, p.x, p.y - 0.004, p.z); const c = cyl(0.016, 0.016, 0.014, m, p.x, p.y + 0.006, p.z); k_(c, "baterie", et); });
  const ibs = box(0.04, 0.022, 0.05, M.negru, BM.x, BM.y + 0.018, BM.z - 0.03, 0.004); k_(ibs, "ibs", "Senzorul de baterie IBS (pe borna −): măsoară curentul, tensiunea și temperatura, estimează SOC/SOH; inhibă stop-start-ul sub prag");
  tub([[BM.x, BM.y + 0.03, BM.z - 0.055], [BM.x - 0.05, BM.y + 0.06, BM.z - 0.1], [0.6, 0.68, 0.0]], 0.0025, M.negru);
  const PF = V3(0.6, 0.52, 0.3), pf = box(0.05, 0.06, 0.04, M.plastic, PF.x, PF.y, PF.z, 0.005); k_(pf, "prefuse", "Siguranța de putere (pre-fuse, megafuse) – protejează cablurile alternatorului și ale consumatorilor; circuitul demarorului nu are siguranță");
  const cMain = [[BP.x, BP.y + 0.012, BP.z], [BP.x - 0.02, BP.y + 0.06, BP.z + 0.03], [PF.x + 0.02, PF.y + 0.07, PF.z + 0.02], [PF.x, PF.y + 0.03, PF.z]];
  k_(tub(cMain, 0.008, M.rosu), "cablu", "Cablul (+) principal al bateriei (aici se montează cleștele pentru curentul de încărcare / descărcare)");
  const cDem = [[PF.x - 0.01, PF.y - 0.02, PF.z], [0.5, 0.42, 0.38], [0.15, 0.42, 0.33], [-0.02, 0.46, 0.25], [T30.x + 0.03, T30.y, T30.z + 0.03], [T30.x, T30.y, T30.z]];
  k_(tub(cDem, 0.0085, M.rosu, sc, 80), "cablu", "Cablul de putere (+) al demarorului (25…35 mm², fără siguranță) – borna 30");
  const BPL = ALT.g.localToWorld(ALT.bplus.clone()); k_(tub([[PF.x + 0.01, PF.y + 0.02, PF.z - 0.02], [0.55, 0.7, 0.2], [BPL.x + 0.05, BPL.y + 0.05, BPL.z + 0.03], [BPL.x, BPL.y, BPL.z]], 0.005, M.rosu), "cablu", "Cablul de încărcare alternator (B+) → baterie");
  const cMasa = [[BM.x, BM.y + 0.03, BM.z - 0.03], [BM.x, 0.62, 0.05], [0.6, 0.5, -0.12], [0.3, 0.44, 0.0], [0.05, 0.45, 0.07], [CARC.x + 0.05, CARC.y, CARC.z]];
  k_(tub(cMasa, 0.008, M.negru, sc, 80), "masa", "Cablul de masă baterie (−) → bloc motor (circuitul de întoarcere al curentului de pornire)");
  k_(tub([[0.2, 0.47, 0.01], [0.24, 0.39, 0.0], [0.24, 0.36, -0.05]], 0.006, M.cupru), "masa", "Banda de masă (tresă) bloc motor → caroserie / cadru");
  /* ---------- consumatorii standului: proiectoarele și electroventilatorul */
  box(0.6, 0.2, 0.02, M.plastic, -0.2, 0.23, 0.42, 0.006); [-0.4, 0.0].forEach(x => box(0.02, 0.22, 0.02, albastru, x, 0.11, 0.42, 0.003));
  const far = [], matFar = mat({ color: 0xf6f3e6, emissive: 0xfff2c0, emissiveIntensity: 0, roughness: 0.15 });
  [-0.4, -0.27].forEach(x => { const c = cyl(0.045, 0.05, 0.05, M.plastic, x, 0.25, 0.44, "z"); const l = add(new THREE.Mesh(new THREE.CircleGeometry(0.044, 32), matFar)); l.position.set(x, 0.25, 0.4655); k_(c, "consumatori", "Proiectoarele (2 × 55 W) – consumatori ai standului"); far.push(l); });
  const lumina = new THREE.PointLight(0xfff2c0, 0, 1.6); lumina.position.set(-0.33, 0.25, 0.6); sc.add(lumina);
  const VENT = new THREE.Group(); VENT.position.set(-0.03, 0.25, 0.44); sc.add(VENT);
  { const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 8, 40), M.plastic), VENT); k_(r, "consumatori", "Electroventilatorul de răcire (≈ 250 W) – consumator al standului");
    const P = new THREE.Group(); VENT.add(P); VENT.userData.p = P; for (let k = 0; k < 7; k++) { const p = add(new THREE.Mesh(RB(0.012, 0.06, 0.003, 0.001), M.plastic), P); const a = k / 7 * Math.PI * 2; p.position.set(Math.sin(a) * 0.035, Math.cos(a) * 0.035, 0); p.rotation.z = -a; p.rotation.y = 0.5; } }
  { const pl = add(new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.035), new THREE.MeshBasicMaterial({ map: eticheta("CONSUMATORI", "faruri · ventilator", 512, 120) }))); pl.position.set(-0.2, 0.155, 0.4305); pl.castShadow = false; }
  /* ---------- panoul de comandă: cheia de contact, butonul START, cutia de siguranțe cu siguranța pompei */
  const PAN = new THREE.Group(); PAN.position.set(0.62, 0.78, -0.22); PAN.rotation.y = -0.5; sc.add(PAN);
  box(0.02, 0.36, 0.3, albastru, 0.62, 0.6, -0.22, 0.003).rotation.y = -0.5; box(0.03, 0.42, 0.03, albastru, 0.62, 0.21, -0.22, 0.003);
  { const pl = add(new THREE.Mesh(RB(0.012, 0.2, 0.26, 0.004), M.plastic), PAN);
    const ch = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 24), M.crom), PAN); ch.rotation.z = Math.PI / 2; ch.position.set(0.012, 0.04, 0.07); k_(ch, "cheie", "Contactul cu cheie: 0 – oprit, I – contact (15), III – START (50)");
    const cheie = add(new THREE.Mesh(RB(0.006, 0.035, 0.012, 0.002), M.negru), PAN); cheie.position.set(0.02, 0.04, 0.07); PAN.userData.cheie = cheie;
    const ecuB = add(new THREE.Mesh(RB(0.02, 0.1, 0.12, 0.004), M.alu), PAN); ecuB.position.set(0.016, 0.03, -0.06); k_(ecuB, "ecu", "Calculatorul motorului (ECU) – comanda stop-start și releul de pornire");
    const cs = add(new THREE.Mesh(RB(0.02, 0.06, 0.1, 0.004), mat({ color: 0x3a3f46, roughness: 0.5 })), PAN); cs.position.set(0.016, -0.06, 0.05); k_(cs, "sigPompa", "Cutia de siguranțe: siguranța pompei de combustibil (se scoate pentru a împiedica pornirea)");
    const sg = add(new THREE.Mesh(RB(0.012, 0.018, 0.01, 0.002), mat({ color: 0xf2b705, roughness: 0.4 })), PAN); sg.position.set(0.028, -0.06, 0.07); PAN.userData.sig = sg; k_(sg, "sigPompa", "Siguranța pompei de combustibil (15 A)");
    const loc = add(new THREE.Mesh(RB(0.004, 0.02, 0.012, 0.001), mat({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 0 })), PAN); loc.position.set(0.027, -0.06, 0.07); PAN.userData.loc = loc;
    const pl2 = add(new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.04), new THREE.MeshBasicMaterial({ map: eticheta("STAND 1.4 MPI", "pornire · stop-start", 512, 110, "#1b2733", "#e6edf5") })), PAN); pl2.rotation.y = Math.PI / 2; pl2.position.set(0.0065, 0.08, -0.0); pl2.castShadow = false; }
  /* ---------- căruciorul cu aparatele: osciloscopul, multimetrul, testerul de baterie */
  const CA = V3(1.22, 0, 0.72), gri = mat({ color: 0x3b3f45, roughness: 0.55, metalness: 0.3 }), rosuC = mat({ color: 0xc62828, roughness: 0.45, metalness: 0.2 });
  box(0.55, 0.025, 0.38, rosuC, CA.x, 0.62, CA.z, 0.006); box(0.55, 0.025, 0.38, rosuC, CA.x, 0.25, CA.z, 0.006);
  [[-0.25, -0.17], [0.25, -0.17], [-0.25, 0.17], [0.25, 0.17]].forEach(([x, z]) => { box(0.02, 0.6, 0.02, gri, CA.x + x, 0.33, CA.z + z, 0.003); cyl(0.025, 0.025, 0.02, M.cauc, CA.x + x, 0.025, CA.z + z, "z"); });
  // osciloscopul auto (2 canale) cu ecran
  const OSC = new THREE.Group(); OSC.position.set(CA.x - 0.08, 0.72, CA.z - 0.08); OSC.rotation.set(-0.25, -0.55, 0); sc.add(OSC);
  { const c = add(new THREE.Mesh(RB(0.26, 0.17, 0.06, 0.012), mat({ color: 0x1d3557, roughness: 0.6 })), OSC); k_(c, "osc", "Osciloscopul auto cu 2 canale (CH1 – cleștele ampermetric, CH2 – tensiunea bateriei), export CSV");
    const r = add(new THREE.Mesh(RB(0.24, 0.15, 0.01, 0.006), M.negru), OSC); r.position.z = 0.027;
    for (let k = 0; k < 4; k++) { const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 12), M.plastic), OSC); b.rotation.x = Math.PI / 2; b.position.set(0.1, 0.05 - k * 0.025, 0.034); } }
  const eO = ecran(512, 300); { const o = add(new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.105), new THREE.MeshBasicMaterial({ map: eO.t })), OSC); o.position.set(-0.02, 0, 0.0325); o.castShadow = false; }
  // cleștele ampermetric DC (600 A) – pe cablul demarorului sau pe cablul principal al bateriei
  const CL = new THREE.Group(); sc.add(CL);
  { const corp = add(new THREE.Mesh(RB(0.035, 0.11, 0.03, 0.008), M.galben), CL); corp.position.y = -0.075; k_(corp, "cleste", "Cleștele ampermetric de curent continuu (efect Hall, 600 A) – se închide în jurul unui singur cablu");
    const fal = add(new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 10, 30, Math.PI * 1.8), M.negru), CL); fal.rotation.y = Math.PI / 2; fal.rotation.x = Math.PI * 0.6; k_(fal, "cleste", "Fălcile cleștelui (se citește curentul fără desfacerea circuitului)");
    const e = add(new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.012), new THREE.MeshBasicMaterial({ color: 0x9fd39f })), CL); e.position.set(0, -0.06, 0.0155); }
  const curbe = { dem: new THREE.CatmullRomCurve3(cDem.map(p => V3(...p))), inc: new THREE.CatmullRomCurve3(cMain.map(p => V3(...p))) };
  const cabluCL = tub([[0, 0, 0], [0, 0, 0.01]], 0.0025, M.negru); let clKey = "";
  // multimetrul cu sondele (U2: borna + → borna 30; U3: carcasa demarorului → borna −)
  const DMM = new THREE.Group(); DMM.position.set(CA.x + 0.15, 0.645, CA.z + 0.06); DMM.rotation.set(-1.2, -0.2, 0); sc.add(DMM);
  { const c = add(new THREE.Mesh(RB(0.085, 0.16, 0.035, 0.012), M.galben), DMM); k_(c, "dmm", "Multimetrul digital (V c.c., rezoluție 0,01 V) – căderile de tensiune pe circuitul de plus (U2) și de masă (U3)");
    add(new THREE.Mesh(RB(0.072, 0.14, 0.03, 0.008), M.negru), DMM).position.z = 0.004;
    const s = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 24), M.plastic), DMM); s.rotation.x = Math.PI / 2; s.position.set(0, -0.025, 0.021); }
  const eD = ecran(256, 110); { const o = add(new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.026), new THREE.MeshBasicMaterial({ map: eD.t })), DMM); o.position.set(0, 0.04, 0.0205); o.castShadow = false; }
  const sondaR = tub([[0, 0, 0], [0, 0, 0.01]], 0.0022, M.rosu), sondaN = tub([[0, 0, 0], [0, 0, 0.01]], 0.0022, M.negru); let dKey = "";
  // testerul de baterie (conductanță) cu clești
  const TB = new THREE.Group(); TB.position.set(CA.x - 0.12, 0.66, CA.z + 0.11); TB.rotation.set(-1.0, 0.3, 0); sc.add(TB);
  { const c = add(new THREE.Mesh(RB(0.1, 0.17, 0.04, 0.012), mat({ color: 0xd84315, roughness: 0.55 })), TB); k_(c, "tester", "Testerul de baterie (conductanță): tensiunea în gol, rezistența internă, CCA estimat, starea (SOH)");
    add(new THREE.Mesh(RB(0.086, 0.07, 0.01, 0.004), M.negru), TB).position.set(0, 0.04, 0.018); }
  const eT = ecran(256, 200); { const o = add(new THREE.Mesh(new THREE.PlaneGeometry(0.076, 0.06), new THREE.MeshBasicMaterial({ map: eT.t })), TB); o.position.set(0, 0.04, 0.0235); o.castShadow = false; }
  const tbR = tub([[0, 0, 0], [0, 0, 0.01]], 0.003, M.rosu), tbN = tub([[0, 0, 0], [0, 0, 0.01]], 0.003, M.negru); let tKey = "";
  const clestTB = [cyl(0.008, 0.008, 0.03, M.rosu, BP.x, BP.y + 0.03, BP.z + 0.02), cyl(0.008, 0.008, 0.03, M.negru, BM.x, BM.y + 0.03, BM.z + 0.02)];
  const sondaOsc = [tub([[0, 0, 0], [0, 0, 0.01]], 0.0022, M.rosu), tub([[0, 0, 0], [0, 0, 0.01]], 0.0022, M.negru)]; let oKey = "";
  /* ---------- masa cu panopliile: demarorul secționat, BSG 48 V, bateria 48 V, convertorul DC/DC, alternatorul */
  const MS = V3(-1.05, 0, 0.5);
  box(0.9, 0.03, 0.55, mat({ color: 0xd9dcd5, roughness: 0.55 }), MS.x, 0.78, MS.z, 0.006);
  [[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]].forEach(([x, z]) => box(0.03, 0.78, 0.03, gri, MS.x + x, 0.39, MS.z + z, 0.003));
  const DS = construiesteDemaror({ M: materiale(), sectiune: true, reductor: true }); DS.G.position.set(MS.x - 0.32, 0.9, MS.z + 0.1); DS.G.rotation.y = -0.3; DS.G.scale.setScalar(1.25); sc.add(DS.G);
  DS.clic.forEach(o => { clic.push(o); o.userData.et = "[secționat] " + o.userData.et; });
  box(0.05, 0.06, 0.05, gri, MS.x - 0.2, 0.825, MS.z + 0.05, 0.004);
  const B48 = bsg(M); B48.g.position.set(MS.x + 0.08, 0.88, MS.z - 0.12); B48.g.rotation.y = 0.5; sc.add(B48.g); k_(B48.g, "bsg", "Alternatorul-demaror BSG 48 V (12…15 kW, antrenat prin curea, invertor integrat): repornire silențioasă, recuperare la frânare, asistare");
  const P48 = baterie(M, "48 V Li-ion", "0,4…1 kWh · răcire cu aer", 0x3f4a56, [0.24, 0.1, 0.16]); P48.g.position.set(MS.x + 0.3, 0.845, MS.z + 0.12); sc.add(P48.g); k_(P48.c, "bat48", "Bateria 48 V Li-ion (sub pragul de 60 V c.c. – nu este „înaltă tensiune”): stochează energia recuperată");
  [[0.08, 0xc62828], [0.11, 0x1b1d20]].forEach(([dx, c]) => cyl(0.009, 0.009, 0.02, mat({ color: c, roughness: 0.4 }), MS.x + 0.3 + dx, 0.905, MS.z + 0.12));
  const DC = new THREE.Group(); DC.position.set(MS.x + 0.32, 0.83, MS.z - 0.13); sc.add(DC);
  { const c = add(new THREE.Mesh(RB(0.16, 0.05, 0.12, 0.006), M.alu), DC); k_(c, "dcdc", "Convertorul DC/DC 48 V / 12 V (≈ 2…3 kW): alimentează rețeaua de 12 V și încarcă bateria de 12 V din sistemul de 48 V");
    for (let k = 0; k < 9; k++) add(new THREE.Mesh(RB(0.14, 0.018, 0.004, 0.001), M.alu), DC).position.set(0, 0.034, -0.05 + k * 0.0125);
    const pl = add(new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.03), new THREE.MeshBasicMaterial({ map: eticheta("DC/DC 48/12 V", "", 512, 128, "#1b2733", "#e6edf5") })), DC); pl.position.set(0, 0, 0.0605); pl.castShadow = false; }
  const AL2 = alternator(materiale()); AL2.g.position.set(MS.x - 0.08, 0.875, MS.z + 0.17); AL2.g.rotation.y = 0.4; sc.add(AL2.g); k_(AL2.g, "alternator", "[panoplie] Alternatorul cu regulator de tensiune (14,0…14,8 V)");
  { const pl = add(new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.05), new THREE.MeshBasicMaterial({ map: eticheta("PANOPLII", "demaror secționat · BSG 48 V · baterie 48 V · DC/DC", 768, 120) }))); pl.position.set(MS.x, 0.797, MS.z + 0.27); pl.rotation.x = -Math.PI / 2 + 0.4; pl.castShadow = false; }
  /* ---------- particulele curentului (roșu – pornirea, verde – încărcarea) */
  const PG = new THREE.Group(); sc.add(PG);
  const P = particule(PG, [{ k: "dem", pts: cMain.map(p => V3(...p)).concat(cDem.map(p => V3(...p)).slice(1)), n: 40, col: 0xff4d2e }, { k: "masa", pts: cMasa.map(p => V3(...p)).reverse(), n: 30, col: 0x7fd3ff },
    { k: "inc", pts: [[BPL.x, BPL.y, BPL.z], [BPL.x + 0.05, BPL.y + 0.05, BPL.z + 0.03], [0.55, 0.7, 0.2], [PF.x + 0.01, PF.y + 0.02, PF.z - 0.02]].map(p => V3(...p)).concat(cMain.map(p => V3(...p)).reverse().slice(1)), n: 24, col: 0x3ddc84 }]);
  interactiune(S, clic, opt.laClic);
  /* ---------- starea */
  const V = { nMot: 0, cupl: 0, nDem: 0, bobina: 0, contact: 0, cleste: null, osc: false, dmm: null, tester: false, cons: false, sig: true, cheie: 0, transparent: false, iDem: 0, iInc: 0, oscVer: 0, dmmText: "", testerLinii: null, clText: "" };
  let rotM = 0, rotA = 0, ts = 0, ultTr = null, kO = -1, kD = "", kT = "";
  function lcdDmm(t) { const { x, c } = eD; x.fillStyle = "#a7b39b"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1d2618"; x.font = "bold 64px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(t || "", 236, 78); x.font = "bold 22px system-ui"; x.textAlign = "left"; x.fillText("V DC", 10, 100); eD.t.needsUpdate = true; }
  function lcdTester(L) { const { x, c } = eT; x.fillStyle = L ? "#0d1b12" : "#121418"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#6dff8e"; x.font = "bold 22px 'Courier New',monospace"; x.textAlign = "left";
    (L || ["BATTERY TESTER", "conectați clemele"]).forEach((l, i) => x.fillText(l, 12, 34 + i * 38)); eT.t.needsUpdate = true; }
  function ecranOsc() { const { x, c } = eO; if (opt.deseneazaOsc) opt.deseneazaOsc(x, c.width, c.height, V.osc); else { x.fillStyle = "#04080c"; x.fillRect(0, 0, c.width, c.height); } eO.t.needsUpdate = true; }
  lcdDmm(""); lcdTester(null); ecranOsc();
  S.porneste(dt => {
    if (V.transparent !== ultTr) { ultTr = V.transparent; aplicaTransparent(carcase, V.transparent); }
    rotM += V.nMot / 60 * 2 * Math.PI * dt * (V.nMot > 400 ? 0.12 : 1); rotA += V.nDem / 60 * 2 * Math.PI * dt * 0.03; ts += dt;
    VOL.rotation.x = -rotM; [fc, fcr].forEach(o => o.rotation.x = -rotM); ALT.rot.forEach(o => o.rotation.x = -rotM * 2.6); rt.rotation.x = -rotM * 5;
    DEM.seteaza({ cupl: V.cupl, rotA, rotP: rotM * 11, bobina: V.bobina, contact: V.contact });
    { const d = Math.max(0, Math.min(1, 0.5 + 0.8 * Math.sin(ts * 0.6))); DS.seteaza({ cupl: d, rotA: ts * 3, rotP: d > 0.95 ? ts * 3 / 4.5 : 0, bobina: d > 0.05 ? 0.6 : 0, contact: d > 0.95 ? 1 : 0 }); }
    PAN.userData.cheie.rotation.x = [0, 0.6, 1.2][V.cheie] || 0; PAN.userData.sig.visible = V.sig; PAN.userData.loc.material.emissiveIntensity = V.sig ? 0 : 0.8;
    matFar.emissiveIntensity = V.cons && V.nMot > 400 ? 2.2 : 0; lumina.intensity = V.cons && V.nMot > 400 ? 1.5 : 0; VENT.userData.p.rotation.z -= (V.cons && V.nMot > 400 ? 30 : 0) * dt;
    P.actualizeaza({ dem: V.iDem > 5 ? 0.25 + V.iDem / 600 : 0, masa: V.iDem > 5 ? 0.25 + V.iDem / 600 : 0, inc: V.iInc > 0.5 ? 0.06 + V.iInc / 200 : 0 }, dt);
    // cleștele ampermetric pe cablu (cu cablul spre osciloscop)
    CL.visible = !!V.cleste;
    if (V.cleste && clKey !== V.cleste) { clKey = V.cleste; const cv = curbe[V.cleste], u = V.cleste === "dem" ? 0.22 : 0.5, p = cv.getPointAt(u), tg = cv.getTangentAt(u);
      CL.position.copy(p); CL.quaternion.setFromUnitVectors(V3(1, 0, 0), tg.clone().normalize()); CL.updateMatrixWorld(true); const a = CL.localToWorld(V3(0, -0.13, 0)); OSC.updateMatrixWorld(true); const b = OSC.localToWorld(V3(-0.13, -0.05, 0));
      cabluCL.geometry.dispose(); cabluCL.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().add(V3(0, -0.12, 0.08)), V3((a.x + b.x) / 2, 0.45, (a.z + b.z) / 2 + 0.15), b]), 60, 0.0025, 6); }
    cabluCL.visible = !!V.cleste && V.osc;
    // sondele osciloscopului (CH2) pe bornele bateriei
    const ok = V.osc ? "1" : ""; if (ok !== oKey) { oKey = ok; OSC.updateMatrixWorld(true); const o0 = OSC.localToWorld(V3(-0.13, -0.07, 0)); [BP, BM].forEach((p, i) => { const g = sondaOsc[i]; g.geometry.dispose(); g.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([o0, V3((o0.x + p.x) / 2, 0.5, (o0.z + p.z) / 2 + 0.2), p.clone().add(V3(i ? 0.01 : -0.01, 0.02, 0.012))]), 50, 0.0018, 6); }); }
    sondaOsc.forEach(o => o.visible = V.osc);
    // sondele multimetrului
    if (V.dmm !== dKey) { dKey = V.dmm; if (V.dmm) { DMM.updateMatrixWorld(true); const a = DMM.localToWorld(V3(-0.02, -0.08, 0.01)), b = DMM.localToWorld(V3(0.02, -0.08, 0.01));
      const [pr, pn] = V.dmm === "U2" ? [BP.clone().add(V3(0, 0.02, 0.01)), T30.clone()] : [CARC.clone(), BM.clone().add(V3(0, 0.02, 0.01))];
      [[sondaR, a, pr], [sondaN, b, pn]].forEach(([s, A, B]) => { s.geometry.dispose(); s.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([A, A.clone().add(V3(0, -0.06, 0.05)), V3((A.x + B.x) / 2, Math.max(A.y, B.y) - 0.05, (A.z + B.z) / 2 + 0.18), B]), 60, 0.0022, 6); }); } }
    sondaR.visible = sondaN.visible = !!V.dmm;
    // testerul de baterie
    const tk = V.tester ? "1" : ""; if (tk !== tKey) { tKey = tk; TB.updateMatrixWorld(true); const a = TB.localToWorld(V3(-0.02, -0.09, 0)), b = TB.localToWorld(V3(0.02, -0.09, 0));
      [[tbR, a, clestTB[0].position], [tbN, b, clestTB[1].position]].forEach(([s, A, B]) => { s.geometry.dispose(); s.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([A, A.clone().add(V3(0, -0.08, 0.06)), V3((A.x + B.x) / 2, 0.52, (A.z + B.z) / 2 + 0.2), B.clone().add(V3(0, 0.015, 0))]), 60, 0.003, 6); }); }
    tbR.visible = tbN.visible = V.tester; clestTB.forEach(o => o.visible = V.tester);
    if (V.oscVer !== kO) { kO = V.oscVer; ecranOsc(); }
    if (V.dmmText !== kD) { kD = V.dmmText; lcdDmm(V.dmmText); }
    const k3 = JSON.stringify(V.testerLinii); if (k3 !== kT) { kT = k3; lcdTester(V.testerLinii); }
  });
  return { seteaza(o) { Object.assign(V, o); }, vedere(p, t) { S.camera.position.set(...p); S.ctl.target.set(...t); } };
}

/* ===================================================================== ANIMAȚIA: demarorul și arhitectura mild-hybrid 48 V */
export const VARIANTE_PORNIRE = {
  clasic: { n: "Demaror clasic (fără reductor)", d: "Indusul antrenează direct pinionul. Releul atrage plonjorul: furca împinge pinionul spre coroană, apoi puntea de contact închide circuitul de putere (borna 30 → indus). Curentul are un vârf mare la rotorul blocat, apoi scade când indusul se rotește (t.e.m. contraelectromotoare) și pulsează la fiecare compresie." },
  reductor: { n: "Demaror cu reductor planetar (întărit, stop-start)", d: "Un reductor planetar (i ≈ 4…5) permite un indus mic și rapid cu magneți permanenți: masă și curent mai mici la același cuplu. La stop-start demarorul are pinion și lagăre întărite, releu cu durabilitate de 300 000…500 000 porniri (față de ≈ 50 000) și roată liberă consolidată." },
  bsg: { n: "Mild-hybrid 48 V cu alternator-demaror BSG", d: "BSG-ul, antrenat prin curea, înlocuiește alternatorul: repornește motorul silențios în ≈ 0,3 s (fără zgomotul pinionului), recuperează energie la frânare în bateria de 48 V, asistă motorul la accelerare și permite navigarea cu motorul oprit. Convertorul DC/DC alimentează rețeaua de 12 V; demarorul clasic rămâne de regulă pentru pornirea la rece." }
};
export function creeazaAnimatiePornire(gazda, opt = {}) {
  gazda.innerHTML = `<div class="anim-pornire"><div class="ap-bara"><label class="camp">Varianta <select class="ap-var">${Object.entries(VARIANTE_PORNIRE).map(([k, v]) => `<option value="${k}">${v.n}</option>`).join("")}</select></label>
    <span class="ap-butoane"></span><label class="bifa"><input type="checkbox" class="ap-tr"> Transparent</label></div>
    <div class="ap-scena"></div><div class="ap-jos"><p class="ap-desc"></p><div class="ap-faza"><b class="ap-ft">Repaus</b><canvas class="ap-cv" width="420" height="150"></canvas></div></div></div>`;
  const $q = s => gazda.querySelector(s), host = $q(".ap-scena");
  const S = scena(host, [0.42, 0.26, 0.46], [0.05, 0.02, 0], { min: 0.12, max: 2.5, umbra: 0.5, sun: [0.6, 1.2, 0.9] }), sc = S.scene, M = materiale(), clic = [];
  const add = (o, par = sc) => { o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  const fund = add(new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat({ color: 0xc8cdd2, roughness: 0.7 }))); fund.rotation.x = -Math.PI / 2; fund.position.y = -0.2; fund.castShadow = false;
  /* ---------- grupul demarorului: volantul (sector), demaroarele secționate */
  const GD = new THREE.Group(); sc.add(GD);
  const VOL = new THREE.Group(); VOL.position.set(-0.012, 0.192 * Math.sin(0.62), -0.192 * Math.cos(0.62)); GD.add(VOL);
  const cor = roataDintata(110, 0.172, 0.022, M.crom, 0.07); VOL.add(cor); const vd = add(new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.02, 64), M.otel), VOL); vd.rotation.z = Math.PI / 2; vd.position.x = -0.012;
  const DEM = { clasic: construiesteDemaror({ M, sectiune: true, reductor: false }), reductor: construiesteDemaror({ M: materiale(), sectiune: true, reductor: true }) };
  Object.values(DEM).forEach(d => { GD.add(d.G); d.clic.forEach(o => clic.push(o)); });
  // circuitul simplificat: bateria, cheia, cablurile (curentul de comandă – galben, de putere – roșu)
  const BT = baterie(M, "12 V", "", 0x24272b, [0.1, 0.07, 0.06]); BT.g.position.set(0.32, -0.12, 0.15); GD.add(BT.g);
  const cP = [V3(0.29, -0.08, 0.15), V3(0.29, 0.0, 0.12), V3(0.25, 0.07, 0.04), DEM.clasic.ancore.t30.clone()], cC = [V3(0.33, -0.08, 0.15), V3(0.34, 0.02, 0.1), V3(0.24, 0.03, -0.0), DEM.clasic.ancore.t50.clone()];
  add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cP), 40, 0.004, 8), M.rosu), GD); add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cC), 40, 0.0018, 6), M.galben), GD);
  const PD = particule(GD, [{ k: "p", pts: cP, n: 26, col: 0xff4d2e }, { k: "c", pts: cC, n: 14, col: 0xffd400 }], 0.0028);
  /* ---------- grupul mild-hybrid: fața motorului cu cureaua, BSG, bateriile 48 V și 12 V, DC/DC, consumatorii */
  const GH = new THREE.Group(); GH.visible = false; sc.add(GH);
  const blo = add(new THREE.Mesh(RB(0.06, 0.3, 0.3, 0.01), mat({ color: 0x55595e, roughness: 0.7, metalness: 0.5 })), GH); blo.position.set(-0.05, 0.0, 0);
  const FC = V3(0, -0.08, 0), FB = V3(0, 0.1, 0.12), ful1 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 40), M.otel), GH); ful1.rotation.z = Math.PI / 2; ful1.position.copy(FC);
  const B = bsg(M); B.g.position.set(0.05, FB.y, FB.z); B.g.scale.setScalar(0.9); GH.add(B.g); B.g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const cur = new THREE.CatmullRomCurve3([V3(0.004, FC.y - 0.062, FC.z), V3(0.004, FC.y, FC.z - 0.062), V3(0.004, FB.y + 0.0, FB.z - 0.03), V3(0.004, FB.y + 0.028, FB.z), V3(0.004, FB.y, FB.z + 0.028), V3(0.004, FC.y + 0.02, FC.z + 0.06)], true);
  add(new THREE.Mesh(new THREE.TubeGeometry(cur, 100, 0.005, 6, true), M.cauc), GH);
  const B48 = baterie(M, "48 V Li-ion", "", 0x3f4a56, [0.16, 0.07, 0.1]); B48.g.position.set(0.3, -0.12, 0.1); GH.add(B48.g);
  const DCm = add(new THREE.Mesh(RB(0.1, 0.035, 0.08, 0.005), M.alu), GH); DCm.position.set(0.32, -0.13, -0.1);
  const B12 = baterie(M, "12 V", "", 0x24272b, [0.1, 0.07, 0.06]); B12.g.position.set(0.5, -0.12, -0.1); GH.add(B12.g);
  const lamp = add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 20, 12), mat({ color: 0xf6f3e6, emissive: 0xfff2c0, emissiveIntensity: 0.6 })), GH); lamp.position.set(0.52, 0.0, -0.1);
  [["48 V", 0.3, -0.04, 0.1], ["DC/DC", 0.32, -0.08, -0.1], ["12 V + consumatori", 0.52, -0.04, -0.1], ["BSG", 0.05, 0.2, 0.12], ["arbore cotit", 0.0, -0.17, 0]].forEach(([t, x, y, z]) => { const pl = add(new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.025), new THREE.MeshBasicMaterial({ map: eticheta(t, "", 512, 110, "#1b2733", "#e6edf5"), transparent: true })), GH); pl.position.set(x, y + 0.02, z + 0.06); pl.castShadow = false; });
  const p1 = [V3(0.12, 0.1, 0.12), V3(0.22, 0.03, 0.12), V3(0.3, -0.08, 0.1)], p2 = [V3(0.3, -0.12, 0.05), V3(0.31, -0.13, -0.06)], p3 = [V3(0.36, -0.13, -0.1), V3(0.47, -0.12, -0.1)], p4 = [V3(0.5, -0.08, -0.1), V3(0.52, -0.02, -0.1)];
  [p1, p2, p3, p4].forEach(p => add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 20, 0.003, 6), M.rosu), GH));
  const PH = particule(GH, [{ k: "a", pts: p1, n: 16, col: 0x3ddc84 }, { k: "b", pts: p2, n: 6, col: 0x3ddc84 }, { k: "c", pts: p3, n: 8, col: 0xffd400 }, { k: "d", pts: p4, n: 5, col: 0xffd400 }], 0.0032);
  interactiune(S, clic, opt.laClic);
  /* ---------- secvențele și curentul (grafic 2D) */
  const cv = $q(".ap-cv"), g2 = cv.getContext("2d");
  let varianta = "clasic", mod = null, t = 0, rotA = 0, rotM = 0, rotB = 0, hist = [], ultTr = null, trans = false;
  const FAZE = {
    pornire: [[0, 0.25, "1. Cheia pe START: bobinele releului (atragere + menținere) sunt alimentate prin borna 50; plonjorul trage furca, pinionul avansează spre coroană"],
      [0.25, 0.4, "2. Pinionul a intrat în angrenare; puntea de contact închide circuitul de putere 30 → indus: vârf de curent (rotorul blocat)"],
      [0.4, 2.2, "3. Antrenarea: indusul se rotește, t.e.m. reduce curentul; pulsații la fiecare compresie (≈ 200 rot/min la arborele cotit)"],
      [2.2, 2.6, "4. Motorul a pornit: turația crește, roata liberă decuplează pinionul de indus (protecția indusului)"],
      [2.6, 3.2, "5. Cheia eliberată: releul se dezexcită, arcul retrage plonjorul și pinionul; indusul se oprește"], [3.2, 4.2, "Motorul funcționează; alternatorul reîncarcă bateria"]],
    repornire: [[0, 0.35, "Repornire stop-start cu BSG: invertorul alimentează BSG-ul din bateria 48 V; cureaua antrenează arborele cotit la ≈ 800 rot/min în ≈ 0,3 s, fără zgomot"], [0.35, 3, "Motorul funcționează; BSG trece în regim de generator, DC/DC încarcă bateria de 12 V"]],
    recuperare: [[0, 3, "Frânare / decelerare: BSG funcționează ca generator (până la 12…15 kW) și încarcă bateria 48 V; frâna de serviciu preia restul"]],
    asistare: [[0, 3, "Asistare (boost): BSG furnizează cuplu suplimentar prin curea la accelerare – motorul termic lucrează la sarcină mai mică"]],
    oprire: [[0, 3, "Oprire (stop) la semafor: motorul termic oprit; consumatorii de 12 V sunt alimentați prin DC/DC din bateria 48 V"]]
  };
  const butoane = () => { const b = $q(".ap-butoane"); b.innerHTML = varianta === "bsg" ? [["repornire", "Repornire"], ["recuperare", "Recuperare la frânare"], ["asistare", "Asistare"], ["oprire", "Oprire (stop)"]].map(([k, n]) => `<button type="button" data-m="${k}">${n}</button>`).join("") : `<button type="button" class="primar" data-m="pornire">▶ Pornire</button>`;
    b.querySelectorAll("button").forEach(x => x.addEventListener("click", () => { mod = x.dataset.m; t = 0; hist = []; })); };
  const alegeVar = v => { varianta = v; mod = null; t = 0; hist = []; GD.visible = v !== "bsg"; GH.visible = v === "bsg"; DEM.clasic.G.visible = v === "clasic"; DEM.reductor.G.visible = v === "reductor";
    $q(".ap-desc").textContent = VARIANTE_PORNIRE[v].d; butoane();
    if (v === "bsg") { S.camera.position.set(0.62, 0.38, 0.78); S.ctl.target.set(0.2, -0.04, 0); } else { S.camera.position.set(0.42, 0.26, 0.46); S.ctl.target.set(0.05, 0.02, 0); } };
  $q(".ap-var").addEventListener("change", e => alegeVar(e.target.value)); $q(".ap-tr").addEventListener("change", e => { trans = e.target.checked; });
  alegeVar("clasic");
  const curent = (s) => { const R = varianta === "reductor" ? 0.75 : 1; if (s < 0.25) return 30 * R; if (s < 0.4) return (520 - (s - 0.25) * 800) * R; if (s < 2.2) return (190 + 45 * Math.sin((s - 0.4) * 2 * Math.PI * 7)) * R; if (s < 2.6) return 190 * R * Math.exp(-(s - 2.2) / 0.06); return 0; };
  function grafic() { const W = cv.width, H = cv.height, inchis = document.documentElement.getAttribute("data-theme") === "dark" || (document.documentElement.getAttribute("data-theme") !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    g2.fillStyle = inchis ? "#141a20" : "#ffffff"; g2.fillRect(0, 0, W, H); g2.strokeStyle = inchis ? "#2b3540" : "#e3e7ec"; g2.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { g2.beginPath(); g2.moveTo(36, 10 + k * (H - 30) / 4); g2.lineTo(W - 6, 10 + k * (H - 30) / 4); g2.stroke(); }
    g2.fillStyle = inchis ? "#9fb3c6" : "#5b6575"; g2.font = "11px system-ui"; g2.fillText(varianta === "bsg" ? "P BSG [kW]" : "I [A]", 4, 12); g2.fillText("t [s]", W - 30, H - 4);
    const ym = varianta === "bsg" ? 15 : 600, X = s => 36 + s / 4 * (W - 42), Y = v => 10 + (H - 30) * (1 - (v + (varianta === "bsg" ? ym : 0)) / (varianta === "bsg" ? 2 * ym : ym));
    if (varianta === "bsg") { g2.strokeStyle = inchis ? "#56616d" : "#9aa3ad"; g2.beginPath(); g2.moveTo(36, Y(0)); g2.lineTo(W - 6, Y(0)); g2.stroke(); }
    g2.strokeStyle = "#c0492b"; g2.lineWidth = 2; g2.beginPath(); hist.forEach(([s, v], i) => i ? g2.lineTo(X(s), Y(v)) : g2.moveTo(X(s), Y(v))); g2.stroke(); }
  S.porneste(dt => {
    if (trans !== ultTr) { ultTr = trans; Object.values(DEM).forEach(d => aplicaTransparent(d.carcase, trans)); }
    let faza = "Repaus – alegeți o acțiune", cupl = 0, bob = 0, cont = 0, nA = 0, nM = 0, I = 0, pB = 0, fl = { p: 0, c: 0 }, fh = { a: 0, b: 0, c: 0.05, d: 0.05 };
    if (mod) { t += dt; const F = FAZE[mod], f = F.find(z => t >= z[0] && t < z[1]); if (f) faza = f[2]; else if (mod !== "pornire" && t > 3) t = 0.36;
      if (mod === "pornire") { if (t > 4.2) { mod = null; } const s = t;
        cupl = s < 0.25 ? s / 0.25 : s < 2.6 ? 1 : Math.max(0, 1 - (s - 2.6) / 0.15); bob = s < 2.6 ? 1 : 0; cont = s >= 0.25 && s < 2.6 ? 1 : 0;
        nM = s < 0.25 ? 0 : s < 0.4 ? 60 : s < 2.2 ? 200 + 15 * Math.sin(s * 44) : s < 2.6 ? 200 + (s - 2.2) * 1500 : 800;
        nA = s >= 0.25 && s < 2.2 ? nM * 11 * (varianta === "reductor" ? 4.5 : 1) : s < 2.6 && s >= 2.2 ? 2200 * (1 - (s - 2.2) / 0.4) : 0; I = curent(s); fl = { p: I > 5 ? 0.06 + I / 2500 : 0, c: bob ? 0.05 : 0 };
        if (s < 4.0) hist.push([s, I]); }
      else { nM = mod === "oprire" ? 0 : mod === "repornire" ? Math.min(800, t / 0.35 * 800) : 1800; pB = mod === "repornire" ? (t < 0.35 ? 10 : -2.5) : mod === "recuperare" ? -12 : mod === "asistare" ? 8 : 0;
        const sgn = pB > 0 ? 1 : -1; fh = { a: pB ? -sgn * (0.04 + Math.abs(pB) / 150) : 0, b: mod === "recuperare" || (mod === "repornire" && t > 0.35) ? -0.04 : 0.05, c: 0.05, d: 0.05 };
        if (mod === "oprire") fh = { a: 0, b: 0.05, c: 0.05, d: 0.05 }; if (t < 3.95) hist.push([t, pB]); else { hist = []; } } }
    rotM += nM / 60 * 2 * Math.PI * dt * 0.15; rotA += nA / 60 * 2 * Math.PI * dt * 0.06; rotB += nM * 2.7 / 60 * 2 * Math.PI * dt * 0.15;
    VOL.rotation.x = -rotM; Object.values(DEM).forEach(d => d.seteaza({ cupl, rotA, rotP: cupl > 0.9 ? rotM * 11 : rotA * 0.02, bobina: bob, contact: cont }));
    ful1.rotation.x = -rotM; B.ful.rotation.x = -rotB;
    PD.actualizeaza(fl, dt); PH.actualizeaza(fh, dt);
    $q(".ap-ft").textContent = faza; grafic();
  });
  return { alege: alegeVar };
}
