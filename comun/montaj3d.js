/* Montajele reale 3D ale lucrărilor de Mecatronică (materiale PBR, dimensiuni reale, în metri): biblioteca de componente și scena.
   Componentele: masa de laborator cu covor antistatic, Arduino Mega 2560 (cu serigrafie, barete mamă, ATmega2560, 16U2, USB-B,
   mufa de alimentare, cuarț, LED-urile L/TX/RX/ON), STM32 „Blue Pill” pe placă de test și programatorul ST-Link V2, plăci de test
   (830 / 400 de puncte) cu găurile reale la 2,54 mm, rezistoare cu benzi de culoare, LED-uri de 5 mm (care se aprind), potențiometre
   cu buton, butoane tactile, condensatoare, comutatoare glisante, motor de c.c., fire Dupont, cabluri cu banane și crocodili,
   generator de funcții, osciloscop cu sonde, multimetre, sursă dublă, afișaj OLED, lampa EPC, laptopul cu programul.
   Ecranele aparatelor sunt oglindite din planșa în stil Tinkercad (#tk-svg), deci arată exact ce arată simulatorul.
   Fiecare lucrare își descrie montajul prin opt.construieste(L), unde L este biblioteca de mai jos. */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { ataseazaViz } from "./viz3d.js?v=1";

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mm = v => v / 1000;
const mat = o => { const m = new THREE.MeshStandardMaterial(o); m.envMapIntensity = 0.75; return m; };
const RB = (a, b, c, r = 0.0006, s = 2) => new RoundedBoxGeometry(a, b, c, s, Math.min(r, a / 2.01, b / 2.01, c / 2.01));
function ecran(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, x: c.getContext("2d"), t }; }
function texCanvas(w, h, f, rep) { const e = ecran(w, h); f(e.x, w, h); if (rep) { e.t.wrapS = e.t.wrapT = THREE.RepeatWrapping; e.t.repeat.set(...rep); } e.t.needsUpdate = true; return e.t; }
const BENZI = ["#111111", "#7a4a1b", "#d32f2f", "#ef6c00", "#f9d71c", "#2e7d32", "#1565c0", "#7b1fa2", "#8a8a8a", "#f5f5f5"];

function materiale() {
  return {
    pcbT: mat({ color: 0x00878f, roughness: 0.45 }), pcbA: mat({ color: 0x1f4fbf, roughness: 0.45 }), pcbOled: mat({ color: 0x16337a, roughness: 0.45 }),
    negru: mat({ color: 0x18191b, roughness: 0.5 }), negruMat: mat({ color: 0x202226, roughness: 0.8 }), plastic: mat({ color: 0x2a2d31, roughness: 0.55 }),
    crom: mat({ color: 0xeef1f4, roughness: 0.14, metalness: 1 }), otel: mat({ color: 0xa9b0b7, roughness: 0.32, metalness: 0.9 }), alu: mat({ color: 0xc4c9ce, roughness: 0.35, metalness: 0.85 }),
    aur: mat({ color: 0xd8b25a, roughness: 0.28, metalness: 1 }), cositor: mat({ color: 0xc9ccd0, roughness: 0.3, metalness: 0.9 }), cupru: mat({ color: 0xc87533, roughness: 0.35, metalness: 0.95 }),
    alb: mat({ color: 0xf4f4f0, roughness: 0.6 }), bej: mat({ color: 0xe6cfa0, roughness: 0.55 }), gri: mat({ color: 0x3b3f45, roughness: 0.6 }), griDes: mat({ color: 0xc9cdd2, roughness: 0.55 }),
    rosu: mat({ color: 0xc62828, roughness: 0.45 }), albastru: mat({ color: 0x1e63d6, roughness: 0.5 }), galben: mat({ color: 0xf2b705, roughness: 0.55 }), verde: mat({ color: 0x2e8b3e, roughness: 0.5 }),
    pla: mat({ color: 0xf07c1e, roughness: 0.62 }), cauciuc: mat({ color: 0x141516, roughness: 0.88 }),
    sticla: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transmission: 0.92, thickness: 0.002, transparent: true, opacity: 0.35, depthWrite: false })
  };
}

/* ------------------------------------------------------------------ scena (masa cu covor antistatic, peretele) */
function scena(gazda, cam0, tinta, o = {}) {
  gazda.innerHTML = `<div class="m3d a3d montaj3d"><canvas></canvas><div class="m3d-ajutor">trageți = rotire · dreapta-trageți = deplasare · rotița = apropiere / depărtare</div></div>`;
  const cont = gazda.querySelector(".m3d"), canvas = cont.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 2, 0.004, 20); camera.position.set(...cam0);
  const ctl = new OrbitControls(camera, canvas); ctl.target.set(...tinta); ctl.enableDamping = true; ctl.minDistance = 0.04; ctl.maxDistance = 2.6; ctl.maxPolarAngle = Math.PI * 0.62; ctl.screenSpacePanning = true;
  const sun = new THREE.DirectionalLight(0xffffff, 1.45); sun.position.set(0.7, 1.6, 0.9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -0.75, right: 0.75, top: 0.6, bottom: -0.6, near: 0.2, far: 4 }); sun.shadow.bias = -0.0003; scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50555a, 0.5));
  const blat = new THREE.Mesh(RB(1.6, 0.03, 0.9, 0.006), mat({ color: 0xd9dcd5, roughness: 0.55 })); blat.position.set(0, -0.0165, -0.05); blat.receiveShadow = true; scene.add(blat);
  const covor = new THREE.Mesh(RB(1.2, 0.0018, 0.62, 0.003), mat({ map: texCanvas(256, 256, (x, w, h) => { x.fillStyle = "#4f6b7d"; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(255,255,255,.07)"; for (let i = 0; i < w; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } }, [8, 4]), roughness: 0.9 }));
  covor.position.set(0, -0.0009, 0.0); covor.receiveShadow = true; scene.add(covor);
  const perete = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), mat({ color: 0xeef1f3, roughness: 0.9 })); perete.position.set(0, 0.8, -0.5); scene.add(perete);
  const tema = () => { const t = document.documentElement.getAttribute("data-theme"), inchis = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); scene.background = new THREE.Color(inchis ? 0x1a1f25 : 0xdfe4e8); perete.material.color.set(inchis ? 0x2a3038 : 0xeef1f3); };
  tema(); window.addEventListener("schimbare-tema", tema);
  const viz = ataseazaViz({ renderer, scene, camera, cont, decor: [perete, blat, covor], profil: { titlu: "Temperatura suprafețelor", T0: 22, Tmin: 20, Tmax: 60 } });
  return { cont, canvas, renderer, scene, camera, ctl, viz,
    porneste(fn) { let tP = performance.now(); const bucla = t => { requestAnimationFrame(bucla); const dt = Math.min(0.1, (t - tP) / 1000); tP = t; if (!cont.getClientRects().length) return; fn(dt, t);
      ctl.update(); const w = cont.clientWidth, h = cont.clientHeight; if (canvas.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } renderer.render(scene, camera); }; requestAnimationFrame(bucla); } };
}
function interactiune(S, clic, laClic) {
  const tip = document.createElement("div"); tip.className = "a3d-tip"; tip.hidden = true; S.cont.appendChild(tip);
  const rc = new THREE.Raycaster(), mp = new THREE.Vector2(); let jos = null;
  const vizibil = o => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
  const tinta = e => { const r = S.canvas.getBoundingClientRect(); mp.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rc.setFromCamera(mp, S.camera); const h = rc.intersectObjects(clic.filter(vizibil), false)[0]; return h ? h.object : null; };
  S.canvas.addEventListener("pointerdown", e => { jos = [e.clientX, e.clientY]; });
  S.canvas.addEventListener("pointerup", e => { if (!jos || Math.hypot(e.clientX - jos[0], e.clientY - jos[1]) > 5) return; const o = tinta(e); if (o && laClic) laClic(o.userData.k, o.userData.et); });
  S.canvas.addEventListener("pointermove", e => { if (e.buttons) { tip.hidden = true; return; } const o = tinta(e); S.canvas.style.cursor = o ? "pointer" : "";
    if (o) { const r = S.cont.getBoundingClientRect(); tip.textContent = o.userData.et; tip.style.left = (e.clientX - r.left + 14) + "px"; tip.style.top = (e.clientY - r.top + 10) + "px"; tip.hidden = false; } else tip.hidden = true; });
  S.canvas.addEventListener("pointerleave", () => { tip.hidden = true; });
}

/* ------------------------------------------------------------------ ecranele oglindite din planșa Tinkercad: o singură rasterizare a planșei, decupaje pe regiuni */
function oglinzi(vb) {
  const lista = [], mare = document.createElement("canvas"), K = 2; mare.width = vb[2] * K; mare.height = vb[3] * K; const gm = mare.getContext("2d");
  let ult = 0, ocupat = false;
  return {
    adauga(r, W = 512, H = 256) { const e = ecran(W, H); e.x.fillStyle = "#000"; e.x.fillRect(0, 0, W, H); lista.push({ r, e }); return e.t; },
    actualizeaza(acum) {
      if (!lista.length || ocupat || acum - ult < 400) return; const svg = document.getElementById("tk-svg"); if (!svg) return; ult = acum; ocupat = true;
      let s = new XMLSerializer().serializeToString(svg); const i = s.indexOf(">");
      let cap = s.slice(0, i).replace(/\s(width|height|style|viewBox|preserveAspectRatio|class)="[^"]*"/g, "");
      if (!/xmlns=/.test(cap)) cap += ' xmlns="http://www.w3.org/2000/svg"';
      s = cap + ` width="${mare.width}" height="${mare.height}" viewBox="${vb.join(" ")}" preserveAspectRatio="none"` + s.slice(i);
      const img = new Image(), url = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
      img.onload = () => { gm.clearRect(0, 0, mare.width, mare.height); gm.drawImage(img, 0, 0, mare.width, mare.height); URL.revokeObjectURL(url); ocupat = false;
        lista.forEach(({ r, e }) => { e.x.drawImage(mare, (r[0] - vb[0]) * K, (r[1] - vb[1]) * K, r[2] * K, r[3] * K, 0, 0, e.c.width, e.c.height); e.t.needsUpdate = true; }); };
      img.onerror = () => { URL.revokeObjectURL(url); ocupat = false; };
      img.src = url;
    }
  };
}

/* ------------------------------------------------------------------ biblioteca de componente */
function biblioteca(S, opt) {
  const sc = S.scene, M = materiale(), clic = [];
  const k_ = (o, k, et) => { (o.isMesh ? [o] : (() => { const a = []; o.traverse(c => { if (c.isMesh) a.push(c); }); return a; })()).forEach(c => { c.userData.k = k; c.userData.et = et; clic.push(c); }); return o; };
  const add = (o, par = sc) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } par.add(o); return o; };
  const mesh = (g, m, par, x = 0, y = 0, z = 0) => { const o = add(new THREE.Mesh(g, m), par); o.position.set(x, y, z); return o; };
  const box = (w, h, d, m, par, x, y, z, r) => mesh(RB(w, h, d, r ?? Math.min(w, h, d) * 0.12), m, par, x, y, z);
  const cyl = (r1, r2, h, m, par, x, y, z, ax = "y", seg = 28) => { const o = mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m, par, x, y, z); if (ax === "x") o.rotation.z = Math.PI / 2; else if (ax === "z") o.rotation.x = Math.PI / 2; return o; };
  const tub = (pts, r, m, par = sc, seg = 64, rs = 10) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => Array.isArray(p) ? V3(...p) : p.clone())), seg, r, rs), m, par);
  const grup = (pos, roty = 0, par = sc) => { const g = new THREE.Group(); g.position.copy(Array.isArray(pos) ? V3(...pos) : pos); g.rotation.y = roty; par.add(g); return g; };
  const lume = (g, p) => { g.updateMatrixWorld(true); return g.localToWorld(p.clone()); };
  const plan = (tex, w, h, par, x, y, z, rx = -Math.PI / 2, transp = false) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, transparent: transp })); o.position.set(x, y, z); o.rotation.x = rx; o.receiveShadow = true; par.add(o); return o; };
  const planB = (tex, w, h, par, x, y, z, rx = 0) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); o.position.set(x, y, z); o.rotation.x = rx; par.add(o); return o; };
  const OG = oglinzi(opt.svgVB || [0, 0, 1300, 790]);
  const actualizari = [];
  /* strălucirea LED-urilor: sprite aditiv (fără lumini suplimentare) */
  const texStr = texCanvas(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
  const stralucire = (par, pos, cul, d = 0.02) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texStr, color: cul, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); s.position.copy(pos); s.scale.setScalar(d); s.renderOrder = 6; par.add(s); return s; };

  /* ================= plăcile de test ================= */
  function placaTest(pos, o = {}) {
    const N = o.coloane || 63, P = 2.54, L = mm(N * P + 5.1), D = mm(54.6), G = grup(pos, o.roty || 0), K = 20, cw = Math.round(L * 1000 * K), ch = Math.round(D * 1000 * K);
    const nr = Math.floor((N - 3) / 6) * 5, x0 = mm(-(N - 1) / 2 * P);
    const xs = c => x0 + mm((c - 1) * P), ROW = { a: 3.81, b: 6.35, c: 8.89, d: 11.43, e: 13.97, f: -3.81, g: -6.35, h: -8.89, i: -11.43, j: -13.97 };
    const RAIL = { "+s": -24.13, "-s": -21.59, "+j": 21.59, "-j": 24.13 }, xr = k => x0 + mm(2 * P + (k + Math.floor(k / 5)) * P);
    const c = document.createElement("canvas"); c.width = cw; c.height = ch; const x = c.getContext("2d");
    const U = (xm, zm) => [(xm + L / 2) * 1000 * K, (zm + D / 2) * 1000 * K];
    x.fillStyle = "#f4f3ee"; x.fillRect(0, 0, cw, ch);
    x.fillStyle = "#e5e3db"; const [, cy0] = U(0, mm(-1.4)); x.fillRect(0, cy0, cw, 2.8 * K);
    const gaura = (xm, zm) => { const [u, v] = U(xm, zm); x.fillStyle = "#c9c6bd"; x.fillRect(u - 0.75 * K, v - 0.75 * K, 1.5 * K, 1.5 * K); x.fillStyle = "#3a3936"; x.fillRect(u - 0.5 * K, v - 0.5 * K, 1.0 * K, 1.0 * K); };
    for (let cc = 1; cc <= N; cc++) Object.values(ROW).forEach(z => gaura(xs(cc), mm(z)));
    for (let k = 0; k < nr; k++) Object.values(RAIL).forEach(z => gaura(xr(k), mm(z)));
    [["+s", "#d32f2f", -1], ["-s", "#1e63d6", 1], ["+j", "#d32f2f", -1], ["-j", "#1e63d6", 1]].forEach(([k, cul, s]) => { const [, v] = U(0, mm(RAIL[k] + s * 1.6)); x.fillStyle = cul; x.fillRect(U(xr(0) - mm(2), 0)[0], v - 0.18 * K, (xr(nr - 1) - xr(0) + mm(4)) * 1000 * K, 0.36 * K); });
    x.fillStyle = "#8d8a82"; x.font = `${1.2 * K}px sans-serif`; x.textAlign = "center";
    for (let cc = 1; cc <= N; cc += (cc === 1 ? 4 : 5)) { const [u] = U(xs(cc), 0); x.fillText(String(cc), u, U(0, mm(-16.4))[1]); x.fillText(String(cc), u, U(0, mm(17.4))[1]); }
    Object.entries(ROW).forEach(([r, z]) => { x.fillText(r, U(xs(1) - mm(2.6), 0)[0], U(0, mm(z + 0.45))[1]); x.fillText(r, U(xs(N) + mm(2.6), 0)[0], U(0, mm(z + 0.45))[1]); });
    x.font = `bold ${1.6 * K}px sans-serif`; x.fillStyle = "#d32f2f"; [["+s", "+"], ["+j", "+"]].forEach(([k, t]) => { x.fillText(t, U(xr(0) - mm(3.4), 0)[0], U(0, mm(RAIL[k] + 0.6))[1]); });
    x.fillStyle = "#1e63d6"; [["-s", "−"], ["-j", "−"]].forEach(([k, t]) => { x.fillText(t, U(xr(0) - mm(3.4), 0)[0], U(0, mm(RAIL[k] + 0.6))[1]); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const H = mm(8.5), corp = box(L, H, D, M.alb, G, 0, H / 2, 0, mm(1)); k_(corp, o.k || "bb", o.et || `Placa de test (${N === 63 ? 830 : 400} de puncte)`);
    plan(t, L - mm(0.4), D - mm(0.4), G, 0, H + mm(0.02), 0);
    const Y = H + mm(0.05);
    return { G, H: Y,
      gaura(col, r) { const z = typeof r === "string" && RAIL[r] !== undefined ? RAIL[r] : ROW[r]; const xx = RAIL[r] !== undefined ? xr(col) : xs(col); return lume(G, V3(xx, Y, mm(z))); },
      local(col, r) { const z = RAIL[r] !== undefined ? RAIL[r] : ROW[r]; return V3(RAIL[r] !== undefined ? xr(col) : xs(col), Y, mm(z)); } };
  }

  /* ================= Arduino Mega 2560 ================= */
  function arduinoMega(pos, o = {}) {
    const G = grup(pos, o.roty || 0), Wb = 101.6, Db = 53.3, yP = mm(3), tP = mm(1.6), yT = yP + tP;
    const UV = (u, v) => V3(mm(u - Wb / 2), 0, mm(v - Db / 2));
    const HDR = []; let ng = 0;
    const hdr = (u0, v, nume) => { ng++; nume.forEach((n, i) => HDR.push({ n, u: u0 + i * 2.54, v, g: ng })); };
    hdr(17.8, 2.54, ["SCL", "SDA", "AREF", "GND_T", "D13", "D12", "D11", "D10", "D9", "D8"]); hdr(44.45, 2.54, ["D7", "D6", "D5", "D4", "D3", "D2", "D1", "D0"]);
    hdr(66.04, 2.54, ["D14", "D15", "D16", "D17", "D18", "D19", "D20", "D21"]);
    hdr(27.94, 50.76, ["NC", "IOREF", "RESET", "3V3", "5V", "GND", "GND2", "VIN"]); hdr(50.8, 50.76, ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"]); hdr(73.66, 50.76, ["A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15"]);
    for (let r = 0; r < 16; r++) { HDR.push({ n: "D" + (22 + 2 * r), u: 93.98, v: 7.62 + r * 2.54, g: 99 }); HDR.push({ n: "D" + (23 + 2 * r), u: 96.52, v: 7.62 + r * 2.54, g: 99 }); }
    // serigrafia
    const K = 16, c = document.createElement("canvas"); c.width = Wb * K; c.height = Db * K; const x = c.getContext("2d");
    x.fillStyle = "#00878f"; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = "rgba(0,70,75,.55)"; x.lineWidth = 0.35 * K; for (let i = 0; i < 26; i++) { x.beginPath(); const yy = (6 + i * 1.7) * K; x.moveTo(30 * K, yy); x.lineTo((48 + (i % 5) * 4) * K, yy); x.lineTo((52 + (i % 5) * 4) * K, yy + 3 * K); x.lineTo(88 * K, yy + 3 * K); x.stroke(); }
    x.fillStyle = "#ffffff"; x.textAlign = "center"; x.font = `${1.25 * K}px sans-serif`;
    HDR.forEach(h => { if (h.u > 90) return; const t = h.n.replace("GND_T", "GND").replace("GND2", "GND").replace(/^D(\d+)$/, "$1"); x.save(); x.translate(h.u * K, (h.v + (h.v < 10 ? 4.2 : -4.2)) * K); x.rotate(-Math.PI / 2); x.textAlign = h.v < 10 ? "right" : "left"; x.fillText(t, 0, 0.45 * K); x.restore(); });
    x.font = `bold ${4.4 * K}px sans-serif`; x.textAlign = "left"; x.fillText("ARDUINO", 60 * K, 35 * K); x.font = `bold ${2.6 * K}px sans-serif`; x.fillText("MEGA 2560", 60 * K, 39.5 * K);
    x.font = `bold ${1.5 * K}px sans-serif`; x.fillText("DIGITAL (PWM~)", 30 * K, 10.8 * K); x.fillText("COMMUNICATION", 66 * K, 10.8 * K); x.fillText("POWER", 31 * K, 43.4 * K); x.fillText("ANALOG IN", 58 * K, 43.4 * K);
    x.beginPath(); x.lineWidth = 0.5 * K; x.strokeStyle = "#fff"; x.arc(64 * K, 22 * K, 3.2 * K, 0, 7); x.stroke(); x.beginPath(); x.arc(70.5 * K, 22 * K, 3.2 * K, 0, 7); x.stroke(); x.fillText("−", 62.8 * K, 22.6 * K); x.fillText("+", 69.3 * K, 22.7 * K);
    [[14, 2.5], [15.2, 50.8], [66, 7.6], [90, 50.8], [96.5, 2.5]].forEach(([u, v]) => { x.fillStyle = "#e9e9e9"; x.beginPath(); x.arc(u * K, v * K, 1.9 * K, 0, 7); x.fill(); x.fillStyle = "#0b4c50"; x.beginPath(); x.arc(u * K, v * K, 1.6 * K, 0, 7); x.fill(); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const pcb = box(mm(Wb), tP, mm(Db), M.pcbT, G, 0, yP + tP / 2, 0, mm(0.6)); k_(pcb, "mega", "Arduino Mega 2560 (ATmega2560, 16 MHz, 54 I/O, 16 intrări analogice)");
    plan(t, mm(Wb - 0.3), mm(Db - 0.3), G, 0, yT + mm(0.02), 0);
    [[3, 3], [3, 50], [98, 3], [98, 50]].forEach(([u, v]) => cyl(mm(2), mm(2.2), yP, M.cauciuc, G, ...UV(u, v).setY(yP / 2).toArray(), "y", 12));
    // baretele mamă (negre) cu găurile pe față
    const tH = texCanvas(64, 64, (x) => { x.fillStyle = "#151515"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#050505"; x.fillRect(18, 18, 28, 28); x.fillStyle = "#3a3a3a"; x.fillRect(26, 26, 12, 12); });
    const gruparuri = {}; HDR.forEach(h => { (gruparuri[h.g] = gruparuri[h.g] || []).push(h); });
    const yH = yT + mm(8.5);
    Object.values(gruparuri).forEach(gr => { const u0 = Math.min(...gr.map(h => h.u)), u1 = Math.max(...gr.map(h => h.u)), v0 = Math.min(...gr.map(h => h.v)), v1 = Math.max(...gr.map(h => h.v));
      const w = u1 - u0 + 2.54, d = v1 - v0 + 2.54, c0 = UV((u0 + u1) / 2, (v0 + v1) / 2);
      box(mm(w), mm(8.5), mm(d), M.negru, G, c0.x, yT + mm(4.25), c0.z, mm(0.3)); const tt = tH.clone(); tt.repeat.set(Math.round(w / 2.54), Math.round(d / 2.54)); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.needsUpdate = true;
      plan(tt, mm(w - 0.1), mm(d - 0.1), G, c0.x, yH + mm(0.02), c0.z); });
    // componentele plăcii
    const usb = box(mm(16), mm(11), mm(12), M.crom, G, ...UV(1.6, 15.5).setY(yT + mm(5.5)).toArray(), mm(0.6)); k_(usb, "mega", "Mufa USB-B (programare și port serial, alimentare 5 V)");
    box(mm(2), mm(7), mm(8.6), M.negru, G, ...UV(-6.4, 15.5).setY(yT + mm(5.5)).toArray(), mm(0.3));
    const jack = box(mm(14), mm(11), mm(9), M.negru, G, ...UV(4.4, 45.6).setY(yT + mm(5.5)).toArray(), mm(0.8)); k_(jack, "mega", "Mufa de alimentare 7…12 V");
    const ic = box(mm(14), mm(1.2), mm(14), M.negru, G, ...UV(55, 27).setY(yT + mm(0.9)).toArray(), mm(0.2)); ic.rotation.y = Math.PI / 4; k_(ic, "mega", "Microcontrolerul ATmega2560 (TQFP-100, 256 kB flash, 8 kB SRAM)");
    box(mm(15.6), mm(0.25), mm(15.6), M.cositor, G, ...UV(55, 27).setY(yT + mm(0.15)).toArray(), mm(0.05)).rotation.y = Math.PI / 4;
    { const e = ecran(256, 256); e.x.fillStyle = "#151515"; e.x.fillRect(0, 0, 256, 256); e.x.fillStyle = "#9aa"; e.x.font = "bold 26px monospace"; e.x.textAlign = "center"; e.x.fillText("ATMEGA2560", 128, 118); e.x.font = "20px monospace"; e.x.fillText("16AU 2238", 128, 148); e.t.needsUpdate = true;
      const p = plan(e.t, mm(13), mm(13), G, ...UV(55, 27).setY(yT + mm(1.52)).toArray()); p.rotation.z = Math.PI / 4; }
    box(mm(5), mm(0.9), mm(5), M.negru, G, ...UV(23, 14).setY(yT + mm(0.45)).toArray(), mm(0.1));
    const xt = box(mm(11), mm(3.6), mm(4.4), M.crom, G, ...UV(41, 37).setY(yT + mm(1.8)).toArray(), mm(1.6)); k_(xt, "mega", "Cuarțul de 16 MHz");
    [[15.5, 37.5], [20.5, 37.5]].forEach(([u, v]) => { cyl(mm(3.2), mm(3.2), mm(5.4), M.alu, G, ...UV(u, v).setY(yT + mm(2.7)).toArray(), "y", 20); cyl(mm(2.6), mm(2.6), mm(0.1), M.negru, G, ...UV(u, v).setY(yT + mm(5.45)).toArray(), "y", 20); });
    box(mm(6.5), mm(1.8), mm(7), M.negru, G, ...UV(14.5, 46).setY(yT + mm(0.9)).toArray(), mm(0.2));
    const rst = box(mm(6), mm(3.4), mm(6), M.negru, G, ...UV(8.5, 4.5).setY(yT + mm(1.7)).toArray(), mm(0.4)); k_(rst, "rst", "Butonul RESET");
    cyl(mm(1.7), mm(1.7), mm(1.4), M.rosu, G, ...UV(8.5, 4.5).setY(yT + mm(3.9)).toArray(), "y", 16);
    for (let i = 0; i < 6; i++) { const p = UV(88.2 + (i % 2) * 2.54, 24 + Math.floor(i / 2) * 2.54); box(mm(2.4), mm(2.5), mm(2.4), M.negru, G, p.x, yT + mm(1.25), p.z, mm(0.2)); cyl(mm(0.32), mm(0.32), mm(6), M.aur, G, p.x, yT + mm(3.2), p.z, "y", 6); }
    const leduri = {};
    [["L", 24.5, 7.5, 0xffb020], ["TX", 24.5, 10, 0xffb020], ["RX", 24.5, 12.5, 0xffb020], ["ON", 86, 41, 0x30ff40]].forEach(([n, u, v, cul]) => {
      const p = UV(u, v).setY(yT + mm(0.4)), m = new THREE.MeshStandardMaterial({ color: 0xf2efe0, emissive: cul, emissiveIntensity: 0, roughness: 0.3 }); mesh(RB(mm(1.6), mm(0.6), mm(0.8), mm(0.1)), m, G, p.x, p.y, p.z);
      leduri[n] = { m, s: stralucire(G, p.clone().setY(yT + mm(1.2)), cul, mm(9)) }; x.fillStyle = "#fff"; });
    const pinLoc = n => { const h = HDR.find(q => q.n === n || (n === "GND" && q.n === "GND")); return h ? UV(h.u, h.v).setY(yH) : null; };
    return { G, yH,
      pin(n) { const p = pinLoc(n); return p ? lume(G, p) : null; },
      led(n, v) { const l = leduri[n]; if (!l) return; l.m.emissiveIntensity = v * 3; l.s.material.opacity = Math.min(1, v); } };
  }

  /* ================= STM32 „Blue Pill” (pe placa de test) și ST-Link V2 ================= */
  function bluePill(bb, col0, o = {}) {
    // pinii de sus în rândul „h” (indice 0 … 19 de la stânga), cei de jos în rândul „c”; PCB-ul la 9 mm deasupra plăcii
    const SUS = ["PB12", "PB13", "PB14", "PB15", "PA8", "PA9", "PA10", "PA11", "PA12", "PA15", "PB3", "PB4", "PB5", "PB6", "PB7", "PB8", "PB9", "5V", "GND_S", "3V3_S"];
    const JOS = ["VB", "PC13", "PC14", "PC15", "PA0", "PA1", "PA2", "PA3", "PA4", "PA5", "PA6", "PA7", "PB0", "PB1", "PB10", "PB11", "NRST", "3V3", "GND", "GND2"];
    const a = bb.local(col0, "h"), b = bb.local(col0 + 19, "c"), cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, y0 = bb.H + mm(9.5);
    const G = grup(V3(cx, 0, cz), 0, bb.G), Wb = 53, Db = 22.8;
    const pcb = box(mm(Wb), mm(1.6), mm(Db), M.pcbA, G, 0, y0, 0, mm(0.5)); k_(pcb, "bp", "STM32F103C8T6 „Blue Pill” (Cortex-M3, 72 MHz, ADC 12 biți)");
    const K = 16, c = document.createElement("canvas"); c.width = Wb * K; c.height = Db * K; const x = c.getContext("2d");
    x.fillStyle = "#1f4fbf"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#fff"; x.font = `${1.05 * K}px sans-serif`; x.textAlign = "center";
    const U = i => (Wb / 2 - 19 * 2.54 / 2 + i * 2.54) * K;
    SUS.forEach((n, i) => { x.save(); x.translate(U(i), 6.2 * K); x.rotate(-Math.PI / 2); x.fillText(n.replace("_S", "").replace("GND2", "G").replace("3V3", "3.3"), 0, 0.4 * K); x.restore(); });
    JOS.forEach((n, i) => { x.save(); x.translate(U(i), 17.2 * K); x.rotate(-Math.PI / 2); x.fillText(n.replace("GND2", "G").replace("3V3", "3.3").replace("NRST", "R"), 0, 0.4 * K); x.restore(); });
    x.fillStyle = "#151515"; [[3.8, 1.8], [3.8, 21]].forEach(() => 0);
    x.fillStyle = "#e9e9e9"; x.font = `bold ${1.3 * K}px sans-serif`; x.fillText("STM32 BLUE PILL", 33 * K, 11.6 * K);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; plan(t, mm(Wb - 0.2), mm(Db - 0.2), G, 0, y0 + mm(0.82), 0);
    const ic = box(mm(7), mm(1.4), mm(7), M.negru, G, mm(5), y0 + mm(1.5), 0, mm(0.15)); ic.rotation.y = Math.PI / 4; k_(ic, "bp", "Microcontrolerul STM32F103C8T6 (LQFP-48, 64 kB flash, 20 kB SRAM)");
    box(mm(8.6), mm(0.3), mm(8.6), M.cositor, G, mm(5), y0 + mm(0.9), 0, mm(0.05)).rotation.y = Math.PI / 4;
    box(mm(7.5), mm(2.6), mm(5.6), M.crom, G, mm(-Wb / 2 + 2.6), y0 + mm(2.1), 0, mm(0.6));
    [-1.6, 1.6].forEach(dz => { const j = box(mm(2.4), mm(2.5), mm(5), M.negru, G, mm(-11), y0 + mm(2), mm(dz * 1.6), mm(0.2)); box(mm(2.6), mm(1.8), mm(2.6), M.galben, G, mm(-11), y0 + mm(3.8), mm(dz * 1.6 - 1.2), mm(0.3)); });
    box(mm(3.4), mm(1.6), mm(6), M.crom, G, mm(-17), y0 + mm(1.6), mm(-4), mm(0.5));
    const rb = box(mm(4), mm(2), mm(3), M.negru, G, mm(-17), y0 + mm(1.8), mm(5), mm(0.3)); k_(rb, "bp", "Butonul RESET al plăcii");
    const ledM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x40ff60, emissiveIntensity: 0.3, roughness: 0.3 }); mesh(RB(mm(1.6), mm(0.6), mm(0.8), mm(0.1)), ledM, G, mm(18), y0 + mm(1.1), mm(6));
    const ledC = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x40ff60, emissiveIntensity: 0, roughness: 0.3 }); mesh(RB(mm(1.6), mm(0.6), mm(0.8), mm(0.1)), ledC, G, mm(18), y0 + mm(1.1), mm(3.5));
    const sC = stralucire(G, V3(mm(18), y0 + mm(2), mm(3.5)), 0x40ff60, mm(8));
    // pinii: baretă tată (plastic negru pe placa de test, pini aurii)
    [["h", SUS], ["c", JOS]].forEach(([r]) => { const p0 = bb.local(col0, r), p1 = bb.local(col0 + 19, r);
      box(p1.x - p0.x + mm(2.54), mm(2.5), mm(2.54), M.negru, bb.G, (p0.x + p1.x) / 2, bb.H + mm(1.25), p0.z, mm(0.3));
      for (let i = 0; i < 20; i++) cyl(mm(0.32), mm(0.32), mm(9), M.aur, bb.G, p0.x + mm(i * 2.54), bb.H + mm(4.5), p0.z, "y", 6); });
    // conectorul SWD (4 pini) la capătul plăcii
    const swd = ["3V3", "SWDIO", "SWCLK", "GND"], swdP = {};
    swd.forEach((n, i) => { const p = V3(mm(Wb / 2 - 1.5), y0 + mm(3.5), mm(-3.81 + i * 2.54)); cyl(mm(0.32), mm(0.32), mm(7), M.aur, G, p.x, p.y + mm(1), p.z, "y", 6); swdP[n] = p.clone().setY(y0 + mm(8.5)); });
    box(mm(2.5), mm(2.5), mm(10.2), M.negru, G, mm(Wb / 2 - 1.5), y0 + mm(2.1), 0, mm(0.3));
    const idx = n => { let i = SUS.indexOf(n); if (i >= 0) return [i, "h"]; i = JOS.indexOf(n); return i >= 0 ? [i, "c"] : null; };
    return { G,
      /** gaura liberă de lângă pin (rândul „j” sus, „a” jos), unde intră firul */
      pin(n, rand) { const q = idx(n); if (!q) return null; return bb.gaura(col0 + q[0], rand || (q[1] === "h" ? "j" : "a")); },
      swd(n) { return lume(G, swdP[n]); },
      led(v) { ledC.emissiveIntensity = v * 3; sC.material.opacity = Math.min(1, v); } };
  }
  function stLink(pos, o = {}) {
    const G = grup(pos, o.roty || 0);
    const c = box(mm(53), mm(9), mm(19), M.alu, G, 0, mm(4.5), 0, mm(2)); k_(c, "stlink", "Programatorul / depanatorul ST-Link V2 (SWD)");
    { const e = ecran(512, 180); e.x.fillStyle = "#c4c9ce"; e.x.fillRect(0, 0, 512, 180); e.x.fillStyle = "#1b2733"; e.x.font = "bold 44px sans-serif"; e.x.textAlign = "center"; e.x.fillText("ST-LINK V2", 256, 80); e.x.font = "24px sans-serif"; e.x.fillText("STM8 / STM32", 256, 125); e.t.needsUpdate = true; plan(e.t, mm(40), mm(14), G, mm(-2), mm(9.05), 0); }
    box(mm(12), mm(4.6), mm(12), M.crom, G, mm(-32), mm(4.5), 0, mm(0.4));
    box(mm(6), mm(8), mm(13.5), M.negru, G, mm(29), mm(4.5), 0, mm(0.6));
    const pin = i => lume(G, V3(mm(32), mm(4.5), mm(-5.08 + i * 2.54)));
    return { G, pin };
  }

  /* ================= componente discrete ================= */
  function piciorus(a, b, par = sc) { return tub([a, b], mm(0.3), M.cositor, par, 2, 6); }
  /** rezistor axial între două găuri (picioarele îndoite în jos); ohmi → benzile de culoare */
  function rezistor(pa, pb, ohmi, o = {}) {
    const v = ohmi, e = Math.floor(Math.log10(v)) - 1, d = Math.round(v / 10 ** e), b = [Math.floor(d / 10), d % 10, e + 0];
    const h = mm(o.h ?? 3.2), A = pa.clone().setY(pa.y + h), B = pb.clone().setY(pb.y + h), dir = B.clone().sub(A), L = dir.length(), mid = A.clone().add(B).multiplyScalar(0.5);
    const G = new THREE.Group(); G.position.copy(mid); G.quaternion.setFromUnitVectors(V3(1, 0, 0), dir.clone().normalize()); sc.add(G);
    const lb = mm(6.3), r = mm(1.25);
    const corp = new THREE.Mesh(new THREE.CapsuleGeometry(r, lb - 2 * r, 6, 18), M.bej); corp.rotation.z = Math.PI / 2; corp.castShadow = true; G.add(corp); k_(corp, o.k || "rez", o.et || `Rezistor ${ohmi >= 1000 ? ohmi / 1000 + " kΩ" : ohmi + " Ω"} ±5 %`);
    [[...b.map(k => BENZI[Math.max(0, Math.min(9, k))]), "#c9a640"]][0].forEach((cul, i) => { const x = -lb / 2 + mm(1.4) + i * mm(1.05) + (i === 3 ? mm(0.9) : 0); const bnd = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, mm(0.55), 18), mat({ color: cul, roughness: 0.5 })); bnd.rotation.z = Math.PI / 2; bnd.position.x = x; G.add(bnd); });
    piciorus(V3(-L / 2, 0, 0), V3(-lb / 2, 0, 0), G); piciorus(V3(L / 2, 0, 0), V3(lb / 2, 0, 0), G);
    piciorus(pa, A); piciorus(pb, B); piciorus(pa.clone().setY(pa.y - mm(2)), pa); piciorus(pb.clone().setY(pb.y - mm(2)), pb);
    return { G };
  }
  /** LED de 5 mm: anodul (piciorul lung) în pa, catodul în pk */
  function led(pa, pk, cul = 0xff2a1a, o = {}) {
    const mid = pa.clone().add(pk).multiplyScalar(0.5), y = mid.y + mm(o.h ?? 7), G = grup(V3(mid.x, y, mid.z));
    const m = new THREE.MeshPhysicalMaterial({ color: cul, roughness: 0.15, transmission: 0.25, thickness: 0.003, transparent: true, opacity: 0.88, emissive: cul, emissiveIntensity: 0.05 });
    const c = mesh(new THREE.CylinderGeometry(mm(2.5), mm(2.5), mm(5.6), 28), m, G, 0, mm(2.8), 0); const dm = mesh(new THREE.SphereGeometry(mm(2.5), 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), m, G, 0, mm(5.6), 0);
    const fl = mesh(new THREE.CylinderGeometry(mm(2.9), mm(2.9), mm(1), 28), m, G, 0, mm(0.5), 0);
    k_(c, o.k || "led", o.et || "LED de 5 mm (anodul – piciorul lung)"); k_(dm, o.k || "led", o.et || "LED de 5 mm"); k_(fl, o.k || "led", o.et || "LED de 5 mm");
    piciorus(pa.clone().setY(pa.y - mm(2)), V3(pa.x, y, pa.z)); piciorus(pk.clone().setY(pk.y - mm(2)), V3(pk.x, y, pk.z));
    const s = stralucire(G, V3(0, mm(5), 0), cul, mm(o.d ?? 26));
    return { G, set(v) { m.emissiveIntensity = 0.05 + v * 2.6; s.material.opacity = Math.min(1, v * 0.95); } };
  }
  /** potențiometru rotativ de 10 kΩ pentru placa de test (pini în 3 găuri consecutive din 2 în 2) */
  function potentiometru(p1, p3, o = {}) {
    const mid = p1.clone().add(p3).multiplyScalar(0.5), dir = p3.clone().sub(p1).setY(0).normalize(), ang = Math.atan2(-dir.z, dir.x);
    const G = grup(V3(mid.x, mid.y, mid.z), ang); G.translateZ(mm(o.dz ?? -4.5));
    const corp = box(mm(10.5), mm(6.5), mm(10.5), M.albastru, G, 0, mm(3.6), 0, mm(0.8)); k_(corp, o.k || "pot", o.et || "Potențiometru 10 kΩ, liniar");
    cyl(mm(3.6), mm(3.6), mm(4), M.alu, G, 0, mm(8.8), 0, "y", 24);
    const B = new THREE.Group(); B.position.set(0, mm(10.5), 0); G.add(B);
    const but = mesh(new THREE.CylinderGeometry(mm(6.6), mm(7.2), mm(9), 32), M.negruMat, B, 0, mm(4.5), 0); k_(but, o.k || "pot", o.et || "Potențiometru 10 kΩ, liniar");
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; mesh(RB(mm(0.6), mm(8.6), mm(1), mm(0.2)), M.negruMat, B, Math.cos(a) * mm(6.9), mm(4.4), Math.sin(a) * mm(6.9)).rotation.y = -a; }
    mesh(RB(mm(1), mm(0.3), mm(5), mm(0.1)), M.alb, B, 0, mm(9.05), mm(-3));
    const zp = -(o.dz ?? -4.5); [-1, 0, 1].forEach(i => { piciorus(V3(i * mm(5.08), mm(-1.5), mm(zp)), V3(i * mm(5.08), mm(1.2), mm(zp)), G); piciorus(V3(i * mm(5.08), mm(1.2), mm(zp)), V3(i * mm(5.08), mm(1.2), mm(zp - 4)), G); });
    return { G, set(alfa) { B.rotation.y = -(-135 + 270 * alfa) * Math.PI / 180; } };
  }
  /** buton tactil 12×12 mm peste canalul central (pa, pb = două găuri ale aceleiași perechi de picioare) */
  function buton(centru, o = {}) {
    const G = grup(centru, o.roty || 0);
    const b = box(mm(12), mm(3.6), mm(12), M.negru, G, 0, mm(1.8), 0, mm(0.5)); k_(b, o.k || "btn", o.et || "Buton tactil 12 × 12 mm");
    box(mm(12.2), mm(0.4), mm(12.2), M.otel, G, 0, mm(3.7), 0, mm(0.2));
    const cap = cyl(mm(4.2), mm(4.4), mm(3.5), o.cul ? mat({ color: o.cul, roughness: 0.5 }) : M.gri, G, 0, mm(5.3), 0, "y", 28); k_(cap, o.k || "btn", o.et || "Buton tactil");
    return { G, set(ap) { cap.position.y = ap ? mm(4.7) : mm(5.3); } };
  }
  /** condensator ceramic (disc) între două găuri */
  function condCeramic(pa, pb, o = {}) {
    const mid = pa.clone().add(pb).multiplyScalar(0.5), dir = pb.clone().sub(pa).setY(0).normalize(), G = grup(V3(mid.x, mid.y + mm(6), mid.z), Math.atan2(-dir.z, dir.x));
    const d = mesh(new THREE.CylinderGeometry(mm(2.6), mm(2.6), mm(1.6), 28), mat({ color: 0xd88a2a, roughness: 0.55 }), G); d.rotation.x = Math.PI / 2; k_(d, o.k || "cap", o.et || "Condensator ceramic 100 nF (104)");
    { const e = ecran(128, 128); e.x.fillStyle = "#d88a2a"; e.x.fillRect(0, 0, 128, 128); e.x.fillStyle = "#3b2400"; e.x.font = "bold 44px sans-serif"; e.x.textAlign = "center"; e.x.fillText(o.text || "104", 64, 80); e.t.needsUpdate = true; plan(e.t, mm(4), mm(4), G, 0, 0, mm(0.82), 0); }
    piciorus(pa.clone().setY(pa.y - mm(2)), lume(G, V3(mm(-1.27), mm(-2), 0))); piciorus(pb.clone().setY(pb.y - mm(2)), lume(G, V3(mm(1.27), mm(-2), 0)));
    return { G };
  }
  /** comutator glisant cu 3 pini (din 2,54 în 2,54) */
  function comutator(p1, p3, o = {}) {
    const mid = p1.clone().add(p3).multiplyScalar(0.5), dir = p3.clone().sub(p1).setY(0).normalize(), G = grup(V3(mid.x, mid.y, mid.z), Math.atan2(-dir.z, dir.x));
    const b = box(mm(12), mm(5.5), mm(5), M.negru, G, 0, mm(3.3), 0, mm(0.4)); k_(b, o.k || "sw", o.et || "Comutator glisant cu 3 poziții de contact (SPDT)");
    box(mm(12.4), mm(0.4), mm(5.4), M.otel, G, 0, mm(6.1), 0, mm(0.1));
    const lev = box(mm(3), mm(4), mm(2.6), M.alb, G, 0, mm(8), 0, mm(0.4)); k_(lev, o.k || "sw", o.et || "Comutator glisant");
    [-1, 0, 1].forEach(i => piciorus(V3(i * mm(2.54), mm(-1.5), 0), V3(i * mm(2.54), mm(1), 0), G));
    return { G, set(stg) { lev.position.x = stg ? mm(-2.4) : mm(2.4); } };
  }
  /** motor de c.c. tip 130 pe suport, cu fulie / ventilator pe ax */
  function motorCC(pos, o = {}) {
    const G = grup(pos, o.roty || 0);
    box(mm(30), mm(4), mm(26), M.gri, G, 0, mm(2), 0, mm(1));
    const c = mesh(new THREE.CylinderGeometry(mm(10), mm(10), mm(25), 32), M.otel, G, 0, mm(14), 0); c.rotation.z = Math.PI / 2; k_(c, o.k || "motor", o.et || "Motor de curent continuu (sursa de zgomot electromagnetic)");
    const cp = mesh(new THREE.CylinderGeometry(mm(9.6), mm(9.6), mm(6), 32), M.alb, G, mm(-15), mm(14), 0); cp.rotation.z = Math.PI / 2;
    [-1, 1].forEach(s => box(mm(1.2), mm(3), mm(1.6), M.cupru, G, mm(-18.5), mm(14 + s * 4), 0, mm(0.2)));
    const ax = new THREE.Group(); ax.position.set(mm(12.5), mm(14), 0); G.add(ax);
    const s = mesh(new THREE.CylinderGeometry(mm(1), mm(1), mm(10), 12), M.crom, ax, mm(5), 0, 0); s.rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const p = mesh(RB(mm(1.2), mm(20), mm(5), mm(0.4)), mat({ color: 0xe53935, roughness: 0.5 }), ax, mm(9), 0, 0); p.rotation.x = i * Math.PI * 2 / 3; p.rotation.y = 0.35; }
    let w = 0;
    actualizari.push(dt => { ax.rotation.x += w * dt; });
    return { G, borne: [-1, 1].map(s => lume(G, V3(mm(-18.5), mm(14 + s * 4), 0))), set(on) { w = on ? 45 : 0; } };
  }

  /* ================= fire și cabluri ================= */
  const capatDupont = (p, cul) => { const g = grup(p.clone()); box(mm(2.5), mm(7), mm(2.5), M.negru, g, 0, mm(3.5), 0, mm(0.3)); cyl(mm(0.32), mm(0.32), mm(2), M.aur, g, 0, mm(-0.6), 0, "y", 6); return g; };
  /** fir Dupont între două găuri / pini (capetele verticale, arcul deasupra) */
  function fir(a, b, cul, o = {}) {
    if (!a || !b) return null;
    const ma = mat({ color: cul, roughness: 0.55 }), ha = mm(o.h ?? (6 + Math.min(24, a.distanceTo(b) * 1000 * 0.1))), A = a.clone().setY(a.y + mm(7)), B = b.clone().setY(b.y + mm(7));
    const m1 = A.clone().lerp(B, 0.25).setY(Math.max(A.y, B.y) + ha), m2 = A.clone().lerp(B, 0.75).setY(Math.max(A.y, B.y) + ha);
    const pts = [A, A.clone().setY(A.y + ha * 0.45), m1, m2, B.clone().setY(B.y + ha * 0.45), B];
    if (o.prin) pts.splice(3, 0, ...o.prin);
    const t = tub(pts, mm(0.8), ma, sc, 80, 8); if (o.k) k_(t, o.k, o.et || "Fir");
    if (o.capete !== false) { capatDupont(a, cul); capatDupont(b, cul); }
    return t;
  }
  /** cablu de aparat (siliconat) cu banană / crocodil la capete; pts intermediare opționale */
  function cablu(a, b, cul, o = {}) {
    const ma = mat({ color: cul, roughness: 0.6 }), mid = a.clone().lerp(b, 0.5); mid.y = Math.max(a.y, b.y) * 0.3 + mm(4); mid.z += o.burta ?? 0.06;
    const pts = [a, a.clone().add(o.da || V3(0, 0, mm(20))), ...(o.prin || [mid]), b.clone().add(o.db || V3(0, mm(25), 0)), b];
    const t = tub(pts, mm(o.r ?? 1.3), ma, sc, 100, 10);
    if (o.crocodil) { const g = grup(b.clone()); box(mm(5), mm(5), mm(18), ma, g, 0, mm(4), mm(-6), mm(1.5)); box(mm(3), mm(2), mm(8), M.crom, g, 0, mm(1.2), mm(2), mm(0.6)); }
    if (o.dupontB) capatDupont(b, cul);
    return t;
  }
  /** sondă mobilă (osciloscop / multimetru): vârful se mută pe punctul cerut sau se odihnește pe masă */
  function sonda(baza, cul, repaus, o = {}) {
    const ma = mat({ color: cul, roughness: 0.55 }), G = new THREE.Group(); sc.add(G);
    const corp = mesh(new THREE.CylinderGeometry(mm(4), mm(3.2), mm(o.osc ? 70 : 60), 18), o.osc ? M.gri : ma, G, 0, mm(o.osc ? 42 : 36), 0); k_(corp, o.k || "sonda", o.et || "Sonda");
    if (o.osc) { mesh(new THREE.CylinderGeometry(mm(4.6), mm(4.6), mm(6), 18), ma, G, 0, mm(10), 0); mesh(new THREE.CylinderGeometry(mm(0.5), mm(0.5), mm(8), 8), M.crom, G, 0, mm(3), 0); }
    else { mesh(new THREE.CylinderGeometry(mm(0.5), mm(0.7), mm(10), 8), M.crom, G, 0, mm(1), 0); mesh(new THREE.CylinderGeometry(mm(5.2), mm(5.2), mm(4), 18), ma, G, 0, mm(8), 0); }
    let f = null, cheie = "";
    return { G, muta(p) {
      const k = p ? p.toArray().map(v => v.toFixed(4)).join() : "r"; if (k === cheie) return; cheie = k;
      const tinta = p ? p.clone() : repaus.clone(); G.position.copy(tinta); G.rotation.set(p ? 0 : Math.PI / 2, 0, p ? 0.18 : 0.6);
      G.updateMatrixWorld(true); const sus = G.localToWorld(V3(0, mm(o.osc ? 77 : 66), 0));
      if (f) { sc.remove(f); f.geometry.dispose(); }
      const m = baza.clone().lerp(sus, 0.5); m.y = Math.min(baza.y, sus.y) * 0.4 + mm(5); m.z += 0.07;
      f = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([baza, baza.clone().add(V3(0, 0, mm(30))), m, sus.clone().add(V3(0, mm(40), mm(20))), sus]), 90, mm(o.osc ? 1.8 : 1.3), 10), ma, sc);
    } };
  }

  /* ================= aparatele ================= */
  /** carcasă de aparat de banc (panou frontal spre +z) cu picioare */
  const carcasa = (G, w, h, d, cul = 0xe1e3e5) => { const m = mat({ color: cul, roughness: 0.6 }); box(w, h, d, m, G, 0, h / 2 + mm(6), 0, mm(5)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(mm(6), mm(7), mm(6), M.cauciuc, G, a * (w / 2 - mm(15)), mm(3), b * (d / 2 - mm(20)), "y", 12)); return m; };
  const buton3 = (G, x, y, z, r = 9, cul = M.gri) => { const b = cyl(mm(r), mm(r), mm(10), cul, G, x, y, z, "z", 28); cyl(mm(r * 0.25), mm(r * 0.25), mm(1), M.alb, G, x, y + mm(r * 0.6), z + mm(5.1), "z", 8); return b; };
  const borna = (G, x, y, z, cul) => { cyl(mm(5.5), mm(5.5), mm(4), cul, G, x, y, z + mm(2), "z", 20); cyl(mm(3.5), mm(3.5), mm(10), cul, G, x, y, z + mm(8), "z", 20); return lume(G, V3(x, y, z + mm(13))); };
  const bnc = (G, x, y, z, cul) => { cyl(mm(5), mm(5), mm(10), M.crom, G, x, y, z + mm(5), "z", 20); cyl(mm(6), mm(6), mm(2), mat({ color: cul, roughness: 0.4 }), G, x, y, z + mm(1), "z", 20); return lume(G, V3(x, y, z + mm(10))); };
  function generator(pos, o = {}) {
    const G = grup(pos, o.roty || 0), W = 0.24, H = 0.1, D = 0.26; carcasa(G, W, H, D); const zF = D / 2 + mm(0.5), yc = mm(6) + H / 2;
    const fata = box(W - mm(8), H - mm(8), mm(2), M.gri, G, 0, yc, zF, mm(2)); k_(fata, o.k || "gen", o.et || "Generator de funcții (sinus, dreptunghi, triunghi; 0,1 Hz…10 MHz)");
    planB(OG.adauga(o.ecran, 512, 220), mm(120), mm(46), G, mm(-38), yc + mm(14), zF + mm(1.2));
    buton3(G, mm(60), yc + mm(14), zF + mm(1), 14); [-60, -30, 0].forEach(dx => box(mm(18), mm(9), mm(4), M.griDes, G, mm(dx - 20), yc - mm(24), zF + mm(2), mm(1.5)));
    const out = bnc(G, mm(88), yc - mm(24), zF + mm(1), 0x1e88e5), led = mat({ color: 0x113311, emissive: 0x30ff40, emissiveIntensity: 0 }); mesh(new THREE.SphereGeometry(mm(2), 12, 8), led, G, mm(88), yc - mm(8), zF + mm(1.5));
    { const e = ecran(512, 64); e.x.fillStyle = "#3b3f45"; e.x.fillRect(0, 0, 512, 64); e.x.fillStyle = "#e9edf1"; e.x.font = "bold 30px sans-serif"; e.x.fillText("FUNCTION GENERATOR", 12, 42); e.t.needsUpdate = true; planB(e.t, mm(80), mm(10), G, mm(-50), yc + mm(42), zF + mm(1.2)); }
    return { G, iesire: out, set(on) { led.emissiveIntensity = on ? 2.5 : 0; } };
  }
  function osciloscop(pos, o = {}) {
    const G = grup(pos, o.roty || 0), W = 0.32, H = 0.16, D = 0.13; carcasa(G, W, H, D, 0xd4d6d9); const zF = D / 2 + mm(0.5), yc = mm(6) + H / 2;
    const fata = box(W - mm(6), H - mm(6), mm(2), mat({ color: 0x2c3036, roughness: 0.6 }), G, 0, yc, zF, mm(3)); k_(fata, o.k || "osc", o.et || "Osciloscop digital cu 2 canale (100 MHz, 1 GSa/s)");
    box(mm(166), mm(104), mm(2), M.negru, G, mm(-58), yc + mm(6), zF + mm(1), mm(2));
    planB(OG.adauga(o.ecran, 760, 470), mm(156), mm(96), G, mm(-58), yc + mm(6), zF + mm(2.2));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) buton3(G, mm(52 + i * 30), yc + mm(42 - j * 26), zF + mm(1), 7);
    for (let i = 0; i < 5; i++) box(mm(14), mm(8), mm(4), M.griDes, G, mm(-120 + i * 24), yc - mm(62), zF + mm(1), mm(1.5));
    const ch = [bnc(G, mm(62), yc - mm(58), zF + mm(1), 0xf2d600), bnc(G, mm(98), yc - mm(58), zF + mm(1), 0x1fb6ff)];
    { const e = ecran(512, 64); e.x.fillStyle = "#2c3036"; e.x.fillRect(0, 0, 512, 64); e.x.fillStyle = "#e9edf1"; e.x.font = "bold 30px sans-serif"; e.x.fillText("DIGITAL OSCILLOSCOPE · 2 CH", 12, 42); e.t.needsUpdate = true; planB(e.t, mm(96), mm(12), G, mm(-90), yc + mm(66), zF + mm(1.2)); }
    return { G, ch };
  }
  /** multimetru de mână pe suportul lui, înclinat spre operator */
  function multimetru(pos, o = {}) {
    const G = grup(pos, o.roty || 0), cul = o.cul ?? 0xf2b705, T = new THREE.Group(); T.rotation.x = -0.55; T.position.y = mm(4); G.add(T);
    const corp = box(mm(90), mm(185), mm(38), mat({ color: cul, roughness: 0.6 }), T, 0, mm(92), 0, mm(10)); k_(corp, o.k || "dmm", o.et || "Multimetru digital (V⎓, Ω)");
    box(mm(78), mm(170), mm(6), M.gri, T, 0, mm(92), mm(18), mm(6));
    box(mm(64), mm(36), mm(2), M.negru, T, 0, mm(146), mm(21.2), mm(2)); planB(OG.adauga(o.ecran, 400, 200), mm(60), mm(30), T, 0, mm(146), mm(22.4));
    const kn = cyl(mm(20), mm(21), mm(8), M.negru, T, 0, mm(86), mm(23), "z", 32); box(mm(4), mm(3), mm(18), cul === 0xf2b705 ? M.galben : M.alb, kn, 0, mm(4.6), mm(-9), mm(1));
    const j = [[-20, 0x111111], [20, 0xd32f2f]].map(([dx, c]) => { cyl(mm(4.6), mm(4.6), mm(4), mat({ color: c, roughness: 0.4 }), T, mm(dx), mm(30), mm(21), "z", 18); return lume(T, V3(mm(dx), mm(30), mm(24))); });
    return { G, com: j[0], v: j[1], buton: kn, mod(m) { kn.rotation.y = { OFF: -1.0, V: 0, R: 1.0 }[m] || 0; } };
  }
  function sursaDubla(pos, o = {}) {
    const G = grup(pos, o.roty || 0), W = 0.25, H = 0.13, D = 0.28; carcasa(G, W, H, D); const zF = D / 2 + mm(0.5), yc = mm(6) + H / 2;
    const fata = box(W - mm(8), H - mm(8), mm(2), M.gri, G, 0, yc, zF, mm(2)); k_(fata, o.k || "psu", o.et || "Sursă de laborator dublă (0…30 V reglabil și 5 V fix, limitare de curent)");
    (o.ecrane || []).forEach((r, i) => planB(OG.adauga(r, 400, 150), mm(78), mm(28), G, mm(-50 + i * 100), yc + mm(30), zF + mm(1.2)));
    [-80, -20, 20, 80].forEach(dx => buton3(G, mm(dx), yc - mm(4), zF + mm(1), 9));
    const b = [[-60, 0xd32f2f], [10, 0xd32f2f], [80, 0x111111]].map(([dx, c]) => borna(G, mm(dx), yc - mm(38), zF + mm(1), mat({ color: c, roughness: 0.4 })));
    return { G, borne: b };
  }
  function oled(pos, o = {}) {
    const G = grup(pos, o.roty || 0), T = new THREE.Group(); T.rotation.x = o.incl ?? -0.9; T.position.y = mm(o.y ?? 12); G.add(T);
    const p = box(mm(27.3), mm(27.8), mm(1.6), M.pcbOled, T, 0, 0, 0, mm(0.5)); k_(p, o.k || "oled", o.et || "Afișaj OLED 0,96\" SSD1306 (128 × 64, I²C 0x3C)");
    box(mm(26), mm(15.5), mm(1.4), M.negru, T, 0, mm(-1.5), mm(1.4), mm(0.4)); planB(OG.adauga(o.ecran, 512, 300), mm(23.6), mm(13), T, 0, mm(-1.5), mm(2.15));
    [0, 1, 2, 3].forEach(i => cyl(mm(0.32), mm(0.32), mm(6), M.aur, T, mm(-3.81 + i * 2.54), mm(12), mm(-1.2), "y", 6));
    const st = box(mm(36), mm(3), mm(24), M.sticla, G, 0, mm(1.5), mm(2), mm(1)); k_(st, o.k || "oled", "Suport de acril al afișajului");
    return { G, pin: i => lume(T, V3(mm(-3.81 + i * 2.54), mm(15), mm(-1.2))) };
  }
  function laptop(pos, o = {}) {
    const G = grup(pos, o.roty || 0);
    const baza = box(0.33, mm(17), 0.23, M.alu, G, 0, mm(8.5), 0, mm(6)); k_(baza, "pc", "Laptopul cu mediul de dezvoltare (Arduino IDE / VS Code + PlatformIO)");
    plan(texCanvas(512, 340, (x, w, h) => { x.fillStyle = "#2a2d31"; x.fillRect(0, 0, w, h); x.fillStyle = "#3a3e44"; for (let i = 0; i < 6; i++) for (let j = 0; j < 14; j++) x.fillRect(16 + j * 34, 20 + i * 34, 30, 30); x.fillRect(150, 230, 210, 80); }), 0.3, 0.2, G, 0, mm(17.1), mm(5));
    const E = new THREE.Group(); E.position.set(0, mm(17), mm(-112)); E.rotation.x = -0.28; G.add(E);
    box(0.33, 0.22, mm(6), M.alu, E, 0, 0.11, 0, mm(5)); box(0.31, 0.2, mm(1), M.negru, E, 0, 0.11, mm(3.2), mm(2));
    const e = ecran(1024, 660); const s = planB(e.t, 0.3, 0.19, E, 0, 0.11, mm(3.8)); k_(s, "pc", "Editorul cu programul lucrării");
    let ult = "";
    actualizari.push(() => { const txt = o.cod ? o.cod() : ""; if (txt === ult) return; ult = txt; const x = e.x; x.fillStyle = "#1e1e1e"; x.fillRect(0, 0, 1024, 660);
      x.fillStyle = "#333842"; x.fillRect(0, 0, 1024, 34); x.fillStyle = "#cfd6e0"; x.font = "18px sans-serif"; x.fillText(o.titlu ? o.titlu() : "Arduino", 14, 23);
      x.fillStyle = "#252526"; x.fillRect(0, 34, 46, 626); x.font = "17px Consolas, monospace";
      (txt || "").split("\n").slice(0, 30).forEach((l, i) => { x.fillStyle = "#6e7681"; x.fillText(String(i + 1).padStart(2), 8, 60 + i * 20); x.fillStyle = /^\s*\/\//.test(l) ? "#6a9955" : /#include|void|int|float|const|for|if|return/.test(l) ? "#9cdcfe" : "#d4d4d4"; x.fillText(l.slice(0, 92), 54, 60 + i * 20); });
      e.t.needsUpdate = true; });
    return { G, usb: lume(G, V3(0.165, mm(8), mm(-40))) };
  }
  function cabluUSB(a, b) { return tub([a, a.clone().add(V3(mm(-15), 0, 0)), a.clone().add(V3(mm(-40), mm(-4), mm(-20))), b.clone().add(V3(mm(10), mm(-6), mm(30))), b], mm(2.2), M.gri, sc, 80, 10); }

  /** textul programului din editorul planșei (fără numerele de linie; câmpurile editabile cu valoarea lor) */
  function textCod(sel = "#tk-cod") { const el = document.querySelector(sel); if (!el) return ""; const c = el.cloneNode(true), orig = el.querySelectorAll("select,input");
    c.querySelectorAll(".cd-ln").forEach(x => x.remove()); c.querySelectorAll("select,input").forEach((x, i) => x.replaceWith(document.createTextNode(orig[i] ? orig[i].value : ""))); return c.textContent; }
  return { textCod, THREE, V3, mm, M, sc, S, k_, add, mesh, box, cyl, tub, grup, lume, plan, planB, ecran, stralucire, OG, actualizari,
    placaTest, arduinoMega, bluePill, stLink, rezistor, led, potentiometru, buton, condCeramic, comutator, motorCC, fir, cablu, sonda,
    generator, osciloscop, multimetru, sursaDubla, oled, laptop, cabluUSB, carcasa, borna, piciorus };
}

/* ------------------------------------------------------------------ intrarea: scena + montajul lucrării */
export function creeazaMontaj(gazda, opt = {}) {
  const S = scena(gazda, opt.cam || [0.0, 0.62, 0.78], opt.tinta || [0.0, 0.04, -0.02]);
  const L = biblioteca(S, opt), clic = [];
  const lab = opt.construieste ? opt.construieste(L) || {} : {};
  S.scene.traverse(o => { if (o.isMesh && o.userData.k) clic.push(o); });
  interactiune(S, clic, opt.laClic);
  if (opt.vederi) { const b = document.createElement("div"); b.className = "m3d-vederi montaj-vederi"; b.innerHTML = Object.keys(opt.vederi).map(k => `<button type="button" data-mv="${k}">${opt.vederi[k][2] || k}</button>`).join("");
    S.cont.appendChild(b); b.querySelectorAll("[data-mv]").forEach(x => x.addEventListener("click", () => { const v = opt.vederi[x.dataset.mv]; S.camera.position.set(...v[0]); S.ctl.target.set(...v[1]); })); }
  S.porneste((dt, t) => { L.OG.actualizeaza(t); L.actualizari.forEach(f => f(dt, t)); if (lab.actualizeaza) lab.actualizeaza(dt, t); });
  return { vedere(p, t) { S.camera.position.set(...p); S.ctl.target.set(...t); }, L };
}
