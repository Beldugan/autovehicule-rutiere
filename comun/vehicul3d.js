/* Vehicul 3D: autoturism transparent („raze X”) cu sistemul studiat montat pe el, animat după fizica reală.
   Modul ES, încărcat la cerere de cadru (tabul „Vehicul 3D”). Rotire cu mouse-ul / degetul, zoom cu rotița.
   Sisteme disponibile: "frana" (pedală – servofrână – pompă centrală – ABS – conducte – etriere – discuri).
   Coordonate: x înainte, y în sus, z spre dreapta; unități: metri. */
import * as THREE from "./vendor/three.module.min.js";
import { OrbitControls } from "./vendor/OrbitControls.js";

/* ------------------------------------------------------------------ utilitare */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** interpolare netedă (cosinus) printre puncte de control [[x, v], …] */
function prof(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const t = (x - x0) / (x1 - x0);
    return lerp(y0, y1, (1 - Math.cos(Math.PI * t)) / 2);
  }
  return pts[pts.length - 1][1];
}
function eTemaIntunecata() {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "dark" || (t !== "light" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
}

/* ------------------------------------------------------------------ geometria caroseriei (berlină, 4,84 m) */
const CAR = { L: 4.84, ampatament: 2.90, ecartament: 1.60, Rroata: 0.335, yRoata: 0.335 };
const XF = CAR.ampatament / 2, XS = -CAR.ampatament / 2, ZR = CAR.ecartament / 2;
const P_TOP = [[-2.42, 0.50], [-2.38, 0.78], [-2.28, 0.93], [-2.05, 0.995], [-1.6, 1.01], [-1.36, 1.02], [-1.05, 1.22], [-0.72, 1.37], [-0.3, 1.43], [0.2, 1.43], [0.5, 1.385], [0.9, 1.18], [1.27, 0.985], [1.6, 0.93], [2.0, 0.86], [2.25, 0.78], [2.36, 0.70], [2.42, 0.52]];
const P_BELT = [[-2.42, 0.86], [-1.4, 0.985], [1.25, 0.955], [2.42, 0.83]];
const P_BOT = [[-2.42, 0.42], [-2.3, 0.29], [-2.0, 0.19], [2.0, 0.19], [2.3, 0.27], [2.42, 0.40]];
const P_W = [[-2.42, 0.58], [-2.37, 0.74], [-2.22, 0.86], [-1.9, 0.905], [0, 0.93], [1.7, 0.912], [2.05, 0.878], [2.28, 0.80], [2.38, 0.71], [2.42, 0.56]];
const NSEC = 25; // puncte pe jumătatea de secțiune

function sectiune(x) {
  const zt = prof(P_TOP, x), zb = prof(P_BOT, x), w = prof(P_W, x);
  const zs = Math.min(prof(P_BELT, x), zt - 0.01), gh = Math.max(0, zt - zs);
  const r1 = Math.min(0.11, (zs - zb) * 0.4), r2 = Math.min(0.07, (zs - zb) * 0.3);
  const wr = w - 0.06 - Math.min(gh, 0.45) * 0.32; // „tumblehome”
  const rr = Math.min(0.09, gh * 0.5);
  const pts = [];
  const add = (z, y, sticla) => pts.push([z, y, sticla ? 1 : 0]);
  for (let i = 0; i < 3; i++) add((w - r1) * i / 2, zb);                                            // podea
  for (let i = 1; i <= 3; i++) { const a = -Math.PI / 2 + i / 3 * Math.PI / 2; add(w - r1 + r1 * Math.cos(a), zb + r1 + r1 * Math.sin(a)); } // colț jos
  for (let i = 1; i <= 4; i++) { const t = i / 5; add(w + 0.012 * Math.sin(Math.PI * t), lerp(zb + r1, zs - r2, t)); } // flanc
  for (let i = 0; i <= 3; i++) { const a = i / 3 * Math.PI / 2; add(w - r2 + r2 * Math.cos(a) - 0.04 * (i / 3), zs - r2 + r2 * Math.sin(a)); } // umăr
  for (let i = 1; i <= 4; i++) { const t = i / 4; add(lerp(w - r2 - 0.04, wr, t), lerp(zs, zt - rr, t), gh > 0.05); }   // geam lateral
  for (let i = 1; i <= 3; i++) { const a = i / 3 * Math.PI / 2; add(wr - rr + rr * Math.cos(a), zt - rr + rr * Math.sin(a), gh > 0.05 && i < 2); } // colț pavilion
  for (let i = 1; i <= 3; i++) { const t = i / 3; add(lerp(wr - rr, 0, t), zt + 0.015 * Math.sin(Math.PI / 2 * t)); }  // pavilion
  // pasajele roților
  for (const p of pts) {
    for (const xw of [XF, XS]) {
      const dx = x - xw, R = 0.43;
      if (Math.abs(dx) < R) {
        const ya = CAR.yRoata + Math.sqrt(R * R - dx * dx) * 0.93, f = sstep(0.60, 0.70, p[0]);
        if (p[1] < ya) p[1] = lerp(p[1], ya, f);
      }
    }
  }
  return { pts, zs, zt };
}
function geometrieCaroserie() {
  const xs = []; const NX = 72;
  for (let i = 0; i <= NX; i++) xs.push(-CAR.L / 2 * Math.cos(Math.PI * i / NX) * 0.9999);
  const inele = xs.map(x => {
    const s = sectiune(x), dr = s.pts, st = dr.slice(0, -1).reverse().map(p => [-p[0], p[1], p[2]]);
    return { x, pts: dr.concat(st), zs: s.zs };
  });
  const M = inele[0].pts.length, pos = [], col = [], idx = [];
  const cAlb = new THREE.Color("#f3f4f6"), cGeam = new THREE.Color("#18212b"), cNegru = new THREE.Color("#2a2e33");
  inele.forEach(r => r.pts.forEach(p => {
    pos.push(r.x, p[1], p[0]);
    const geam = p[2] && r.x > -1.32 && r.x < 1.24;
    const faruri = (r.x > 2.18 && p[1] > 0.62 && p[1] < 0.76 && Math.abs(p[0]) > 0.45) || (r.x < -2.26 && p[1] > 0.80 && p[1] < 0.90 && Math.abs(p[0]) > 0.3);
    const prag = p[1] < 0.24;
    const c = geam ? cGeam : faruri ? new THREE.Color(r.x > 0 ? "#dfe8f2" : "#8c1d1d") : prag ? cNegru : cAlb;
    col.push(c.r, c.g, c.b);
  }));
  for (let i = 0; i < inele.length - 1; i++) for (let j = 0; j < M - 1; j++) {
    const a = i * M + j, b = (i + 1) * M + j; idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // capace la capete
  [0, inele.length - 1].forEach((i, k) => {
    const c = pos.length / 3; const r = inele[i]; let yc = 0; r.pts.forEach(p => yc += p[1]); yc /= M;
    pos.push(r.x, yc, 0); col.push(cAlb.r, cAlb.g, cAlb.b);
    for (let j = 0; j < M - 1; j++) k ? idx.push(c, i * M + j, i * M + j + 1) : idx.push(c, i * M + j + 1, i * M + j);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // liniile „wireframe” (inele + longitudinale) și liniile de stil
  const L = [];
  const pct = (i, j) => [inele[i].x, inele[i].pts[j][1], inele[i].pts[j][0]];
  for (let i = 0; i < inele.length; i += 3) for (let j = 0; j < M - 1; j++) L.push(...pct(i, j), ...pct(i, j + 1));
  for (let j = 0; j < M; j += 2) for (let i = 0; i < inele.length - 1; i++) L.push(...pct(i, j), ...pct(i + 1, j));
  const gl = new THREE.BufferGeometry(); gl.setAttribute("position", new THREE.Float32BufferAttribute(L, 3));
  // contururi accentuate: linia de centură, geamuri, uși
  const S = [];
  const jBelt = 14, jSus = 19;
  for (const sg of [1, -1]) {
    const J = j => sg > 0 ? j : M - 1 - j;
    for (let i = 0; i < inele.length - 1; i++) S.push(...pct(i, J(jBelt)), ...pct(i + 1, J(jBelt)));
    for (let i = 0; i < inele.length - 1; i++) if (inele[i].x > -1.32 && inele[i + 1].x < 1.24) S.push(...pct(i, J(jSus)), ...pct(i + 1, J(jSus)));
    for (const xp of [-1.30, -0.12, 1.22]) { const i = inele.reduce((b, r, k) => Math.abs(r.x - xp) < Math.abs(inele[b].x - xp) ? k : b, 0); for (let j = 5; j < jSus; j++) S.push(...pct(i, J(j)), ...pct(i, J(j + 1))); }
  }
  const gs = new THREE.BufferGeometry(); gs.setAttribute("position", new THREE.Float32BufferAttribute(S, 3));
  return { g, gl, gs };
}

/* ------------------------------------------------------------------ roata */
function geometrieAnvelopa() {
  const R = CAR.Rroata, ri = 0.228, b = 0.225, rc = 0.045, p = [];
  p.push(new THREE.Vector2(ri, -b / 2 + 0.01));
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI / 2; p.push(new THREE.Vector2(R - rc + rc * Math.cos(a), -b / 2 + rc + rc * Math.sin(a))); }
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; p.push(new THREE.Vector2(R - rc + rc * Math.cos(a), b / 2 - rc + rc * Math.sin(a))); }
  p.push(new THREE.Vector2(ri, b / 2 - 0.01));
  const g = new THREE.LatheGeometry(p, 64);
  g.rotateX(Math.PI / 2); // axa roții pe z
  return g;
}

/* ------------------------------------------------------------------ crearea scenei */
export function creeaza(gazda, optiuni = {}) {
  const sistem = optiuni.sistem || "frana";
  gazda.classList.add("v3d");
  gazda.innerHTML = `
    <div class="v3d-scena"><canvas></canvas><div class="v3d-etichete"></div>
      <div class="v3d-hud"></div>
      <div class="v3d-ajutor">Trageți pentru rotire · rotița / ciupire pentru zoom · clic dreapta / 2 degete pentru deplasare</div>
    </div>
    <div class="v3d-comenzi"></div>`;
  const canvas = gazda.querySelector("canvas"), scena = gazda.querySelector(".v3d-scena");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 2, 0.05, 300);
  camera.position.set(6.2, 2.6, 5.4);
  const ctl = new OrbitControls(camera, canvas);
  ctl.target.set(0, 0.6, 0); ctl.enableDamping = true; ctl.minDistance = 1.2; ctl.maxDistance = 16; ctl.maxPolarAngle = Math.PI * 0.98;

  // lumini
  const hemi = new THREE.HemisphereLight(0xeef4ff, 0x4b4f55, 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(5, 9, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.bias = -0.0004;
  scene.add(sun);
  const env = new THREE.PMREMGenerator(renderer);
  { // mediu simplu pentru reflexii (cer + sol)
    const s = new THREE.Scene(); const geo = new THREE.SphereGeometry(10, 16, 8);
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: "varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}", fragmentShader: "varying vec3 p; void main(){float h=normalize(p).y; vec3 c=mix(vec3(.35,.36,.38),vec3(.95,.97,1.),smoothstep(-.1,.4,h)); gl_FragColor=vec4(c,1.);}" });
    s.add(new THREE.Mesh(geo, m)); scene.environment = env.fromScene(s, 0.04).texture;
  }

  /* --- drumul: asfalt, grilă, marcaje, borduri (se deplasează sub mașină) */
  const drum = new THREE.Group(); scene.add(drum);
  const asfalt = new THREE.Mesh(new THREE.PlaneGeometry(400, 24), new THREE.MeshStandardMaterial({ color: 0x5b6067, roughness: 0.95 }));
  asfalt.rotation.x = -Math.PI / 2; asfalt.receiveShadow = true; scene.add(asfalt);
  const mobil = new THREE.Group(); drum.add(mobil); const PAS = 1.0;
  { const L = []; for (let x = -60; x <= 60; x += PAS) L.push(x, 0.002, -12, x, 0.002, 12); for (let z = -12; z <= 12; z += PAS) L.push(-60, 0.002, z, 60, 0.002, z);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(L, 3));
    mobil.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xdfe9f5, transparent: true, opacity: 0.28 }))); }
  const marcaj = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 });
  for (let x = -60; x <= 60; x += 6) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.14), marcaj); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, -1.9); mobil.add(m); }
  for (const z of [-5.6, 3.4]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(120, 0.14), marcaj); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.004, z); mobil.add(m); }
  const bordura = new THREE.MeshStandardMaterial({ color: 0xc9cdd2, roughness: 0.9 });
  for (const z of [-6.2, 4.0]) { const b = new THREE.Mesh(new THREE.BoxGeometry(120, 0.14, 0.25), bordura); b.position.set(0, 0.07, z); b.receiveShadow = true; mobil.add(b);
    const t = new THREE.Mesh(new THREE.BoxGeometry(120, 0.12, 3), new THREE.MeshStandardMaterial({ color: 0xb4b9bf, roughness: 1 })); t.position.set(0, 0.06, z + Math.sign(z) * 1.6); t.receiveShadow = true; mobil.add(t); }
  const urme = new THREE.Group(); drum.add(urme);
  const matUrma = new THREE.MeshBasicMaterial({ color: 0x15171a, transparent: true, opacity: 0.55, depthWrite: false });

  /* --- autoturismul */
  const masina = new THREE.Group(); scene.add(masina);
  const sasiu = new THREE.Group(); masina.add(sasiu);       // nesuspendat (roți, etriere)
  const caroserie = new THREE.Group(); masina.add(caroserie); // suspendat (tangaj la frânare)
  const { g: gCar, gl: gLin, gs: gStil } = geometrieCaroserie();
  const planTaiere = new THREE.Plane(new THREE.Vector3(1, 0, 0), -0.25);   // păstrează x > 0,25 (vopsit)
  const planTaiere2 = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.25);  // păstrează x < 0,25 (raze X)
  const matVopsit = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  const matXray = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
  const matLin = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, depthWrite: false });
  const matStil = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
  const mCar = new THREE.Mesh(gCar, matVopsit); mCar.castShadow = true;
  const mX = new THREE.Mesh(gCar, matXray); mX.renderOrder = 2;
  const lCar = new THREE.LineSegments(gLin, matLin); lCar.renderOrder = 3;
  const lStil = new THREE.LineSegments(gStil, matStil); lStil.renderOrder = 3;
  caroserie.add(mCar, mX, lCar, lStil);
  // umbra (pentru modul raze X – un „disc” de umbră moale sub mașină)
  const umbra = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.3), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false,
    map: (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"); const gr = x.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })() }));
  umbra.rotation.x = -Math.PI / 2; umbra.position.y = 0.006; masina.add(umbra);

  // interior de context (scaune, volan, motor, cutie) – doar contururi
  const ctx = new THREE.Group(); caroserie.add(ctx);
  const matCtx = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const contur = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), matCtx); l.position.set(x, y, z); l.rotation.set(rx, ry, rz); ctx.add(l); return l; };
  for (const [x, z] of [[0.15, -0.4], [0.15, 0.4], [-0.85, -0.4], [-0.85, 0.4]]) { contur(new THREE.BoxGeometry(0.5, 0.12, 0.48), x, 0.45, z); contur(new THREE.BoxGeometry(0.12, 0.62, 0.46), x - 0.27, 0.78, z, 0, 0, 0.18); contur(new THREE.BoxGeometry(0.1, 0.16, 0.26), x - 0.34, 1.16, z, 0, 0, 0.18); }
  const volan = contur(new THREE.TorusGeometry(0.19, 0.016, 8, 32), 0.66, 0.98, -0.4, 0, Math.PI / 2, 0); volan.rotation.z = -0.45;
  contur(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), 0.86, 0.88, -0.4, 0, 0, 1.12);
  contur(new THREE.BoxGeometry(0.62, 0.48, 0.55), 1.82, 0.62, 0.05);     // motor
  contur(new THREE.BoxGeometry(0.42, 0.32, 0.35), 1.62, 0.5, 0.48);      // cutie de viteze
  contur(new THREE.BoxGeometry(0.06, 0.55, 1.55), 2.25, 0.55, 0);        // radiator
  contur(new THREE.BoxGeometry(0.06, 0.55, 1.6), 1.24, 0.6, 0);          // perete parafoc

  // roțile
  const roti = [];
  const gAnv = geometrieAnvelopa();
  const matAnv = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.85, transparent: true });
  const matJanta = new THREE.MeshStandardMaterial({ color: 0xc4c8cd, metalness: 0.9, roughness: 0.25, transparent: true });
  const matJantaInchis = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.8, roughness: 0.35, transparent: true });
  for (const [x, z] of [[XF, ZR], [XF, -ZR], [XS, ZR], [XS, -ZR]]) {
    const r = { x, z, fata: x > 0, sg: Math.sign(z) };
    r.grup = new THREE.Group(); r.grup.position.set(x, CAR.yRoata, z); sasiu.add(r.grup);
    r.rot = new THREE.Group(); r.grup.add(r.rot);
    const anv = new THREE.Mesh(gAnv, matAnv); anv.castShadow = true; r.rot.add(anv);
    const lAnv = new THREE.LineSegments(new THREE.EdgesGeometry(gAnv, 30), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false })); r.rot.add(lAnv); r.lAnv = lAnv;
    const butuc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 20), matJantaInchis); butuc.rotation.x = Math.PI / 2; butuc.position.z = r.sg * 0.07; r.rot.add(butuc);
    const inel = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.018, 8, 48), matJanta); inel.position.z = r.sg * 0.06; r.rot.add(inel);
    const inel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.228, 0.228, 0.2, 48, 1, true), matJantaInchis); inel2.rotation.x = Math.PI / 2; r.rot.add(inel2);
    for (let k = 0; k < 10; k++) { // 5 spițe duble
      const a = k / 10 * Math.PI * 2 + (k % 2 ? 0.16 : 0);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.026, 0.022), matJanta);
      s.position.set(Math.cos(a) * 0.135, Math.sin(a) * 0.135, r.sg * 0.07); s.rotation.z = a; r.rot.add(s);
    }
    r.anv = anv; roti.push(r);
  }

  /* --- sistemul de frânare */
  const S = sistem === "ungere" ? construiesteUngere({ THREE, caroserie, optiuni, ctxMotor: ctx }) : construiesteFrana({ THREE, sasiu, caroserie, roti, scene });

  /* --- etichete HTML */
  const elEt = gazda.querySelector(".v3d-etichete");
  const etichete = S.etichete.map(e => { const d = document.createElement("div"); d.className = "v3d-eticheta"; d.textContent = e.text; elEt.appendChild(d); return { ...e, el: d }; });

  /* --- comenzi */
  const cmd = gazda.querySelector(".v3d-comenzi");
  cmd.innerHTML = (sistem !== "frana" ? S.html : `
    <div class="v3d-grup">
      <button type="button" class="primar v3d-frana" title="Țineți apăsat (sau tasta Spațiu)">Apasă frâna</button>
      <button type="button" data-v="50">Pornește la 50 km/h</button><button type="button" data-v="90">90 km/h</button><button type="button" data-v="130">130 km/h</button>
    </div>
    <div class="v3d-grup">
      <label>Forța pe pedală <input type="range" min="40" max="500" step="10" value="250" data-k="F"> <output>250 N</output></label>
      <label>Aer în circuit <input type="range" min="0" max="8" step="0.1" value="0" data-k="aer"> <output>0 cm³</output></label>
      ${optiuni.aerDin ? `<button type="button" class="v3d-preia">${optiuni.aerDin.eticheta}</button>` : ""}
    </div>
    <div class="v3d-grup">
      <label><input type="checkbox" data-k="servo" checked> Servofrână</label>
      <label><input type="checkbox" data-k="abs" checked> ABS</label>
      <label>Aderență <select data-k="mu"><option value="0.9">asfalt uscat</option><option value="0.6">asfalt ud</option><option value="0.25">zăpadă</option></select></label>
    </div>`) + `
    <div class="v3d-grup">
      <span class="v3d-et">Vedere</span>
      <select data-k="viz"><option value="mixt">mixt (față vopsită)</option><option value="xray" selected>raze X</option><option value="vopsit">vopsit</option><option value="sistem">doar sistemul</option></select>
      <button type="button" data-cam="34">3/4 față</button><button type="button" data-cam="lat">lateral</button><button type="button" data-cam="sus">de sus</button><button type="button" data-cam="jos">de dedesubt</button>${(S.camereButoane || [["roata", "roata față"], ["pedala", "pedalier"]]).map(([k, t]) => `<button type="button" data-cam="${k}">${t}</button>`).join("")}
      <label><input type="checkbox" data-k="et" checked> Etichete</label>
    </div>`;
  const st = { F: 250, aer: 0, servo: true, abs: true, mu: 0.9, viz: "xray", et: true, apasat: false, Fact: 0, v: 0, x: 0, p: 0, pRoti: [0, 0, 0, 0], cursaP: 0, sMC: 0, a: 0, dist: 0, xStart: null, vStart: 0, blocat: false, absAct: false, unghi: [0, 0, 0, 0], caldura: [0, 0, 0, 0], tangaj: 0, tAbs: 0, vTinta: 0 };
  if (S.stare) Object.assign(st, S.stare);
  if (optiuni.stareInitiala) Object.assign(st, optiuni.stareInitiala);
  const out = el => el.parentElement.querySelector("output");
  cmd.querySelectorAll(".v3d-grup input[type=range]:not([data-s])").forEach(i => {
    const fmtV = () => out(i).textContent = i.dataset.k === "F" ? `${i.value} N` : `${(+i.value).toFixed(1).replace(".", ",")} cm³`;
    i.value = st[i.dataset.k]; fmtV();
    i.addEventListener("input", () => { st[i.dataset.k] = +i.value; fmtV(); });
  });
  cmd.querySelectorAll("input[type=checkbox]:not([data-s])").forEach(i => i.addEventListener("change", () => { st[i.dataset.k] = i.checked; aplicaViz(); }));
  cmd.querySelectorAll("select:not([data-s])").forEach(s => { s.value = String(st[s.dataset.k]); s.addEventListener("change", () => { st[s.dataset.k] = s.dataset.k === "mu" ? +s.value : s.value; aplicaViz(); }); });
  cmd.querySelectorAll("[data-v]").forEach(b => b.addEventListener("click", () => { st.vTinta = +b.dataset.v / 3.6; st.dist = 0; st.xStart = null; S.stergeUrme?.(); while (urme.children.length) urme.remove(urme.children[0]); }));
  const preia = cmd.querySelector(".v3d-preia");
  if (preia) preia.addEventListener("click", () => { const v = optiuni.aerDin.valoare(); if (isFinite(v)) { st.aer = clamp(v, 0, 8); const i = cmd.querySelector('[data-k="aer"]'); i.value = st.aer; i.dispatchEvent(new Event("input")); } });
  let tasta = () => { };
  if (sistem === "frana") {
  const bF = cmd.querySelector(".v3d-frana");
  const apasa = on => { st.apasat = on; bF.classList.toggle("activ", on); };
  bF.addEventListener("pointerdown", e => { e.preventDefault(); bF.setPointerCapture?.(e.pointerId); apasa(true); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => bF.addEventListener(ev, () => apasa(false)));
  tasta = e => { if (e.code === "Space" && gazda.offsetParent && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) { e.preventDefault(); apasa(e.type === "keydown"); } };
  window.addEventListener("keydown", tasta); window.addEventListener("keyup", tasta);
  } else S.leaga(cmd, st);

  /* --- vederi de cameră */
  const CAM = { "34": [[6.2, 2.6, 5.4], [0, 0.6, 0]], lat: [[0.2, 1.1, 8.6], [0, 0.65, 0]], sus: [[0.01, 9.5, 0.01], [0, 0.4, 0]], jos: [[1.5, -2.6, 2.2], [0, 0.25, 0]],
    roata: [[XF + 0.9, 0.6, ZR + 1.5], [XF, 0.33, ZR - 0.05]], pedala: [[0.2, 1.25, -1.6], [1.25, 0.72, -0.38]] };
  Object.assign(CAM, S.camere || {});
  let zbor = null;
  cmd.querySelectorAll("[data-cam]").forEach(b => b.addEventListener("click", () => { const [p, t] = CAM[b.dataset.cam]; zbor = { p0: camera.position.clone(), t0: ctl.target.clone(), p1: new THREE.Vector3(...p), t1: new THREE.Vector3(...t), k: 0 }; }));

  /* --- moduri de vizualizare */
  function aplicaViz() {
    const v = st.viz, inchis = eTemaIntunecata();
    const xray = v === "xray", mixt = v === "mixt", sist = v === "sistem";
    mCar.visible = !xray && !sist; mX.visible = xray || mixt; lCar.visible = xray || mixt; lStil.visible = xray || mixt;
    matVopsit.clippingPlanes = mixt ? [planTaiere] : [];
    matXray.clippingPlanes = matLin.clippingPlanes = matStil.clippingPlanes = mixt ? [planTaiere2] : [];
    matVopsit.needsUpdate = matXray.needsUpdate = matLin.needsUpdate = matStil.needsUpdate = true;
    ctx.visible = xray || mixt || sist;
    const opRoata = xray || sist ? 0.28 : 1;
    matAnv.opacity = opRoata; matJanta.opacity = matJantaInchis.opacity = xray || sist ? 0.35 : 1;
    matAnv.depthWrite = matJanta.depthWrite = matJantaInchis.depthWrite = !(xray || sist);
    roti.forEach(r => r.lAnv.material.opacity = xray || sist ? 0.35 : 0);
    umbra.visible = true;
    scene.background = new THREE.Color(inchis ? 0x10151b : 0xd9dfe5);
    scene.fog = new THREE.Fog(scene.background, 18, 60);
    asfalt.material.color.set(inchis ? 0x272b30 : 0x5b6067);
    const cl = inchis ? 0x9fd3ff : 0xffffff;
    matLin.color.set(cl); matStil.color.set(cl); matCtx.color.set(cl); matXray.color.set(inchis ? 0x8fc8ff : 0xffffff);
    matXray.opacity = inchis ? 0.06 : 0.09;
    elEt.style.display = st.et ? "" : "none";
  }
  aplicaViz();
  if (S.cameraInitiala) { camera.position.set(...S.cameraInitiala[0]); ctl.target.set(...S.cameraInitiala[1]); }
  const laTema = () => aplicaViz();
  window.addEventListener("schimbare-tema", laTema);

  /* --- fizica (masa, frânare, ABS) */
  const MASA = 1520, G = 9.81, AMC = Math.PI * 0.0222 ** 2 / 4, RAP_PED = 4.0, CURSA_MC = 0.036;
  const APF = Math.PI * 0.054 ** 2 / 4, APS = Math.PI * 0.038 ** 2 / 4, MU_P = 0.40, RF = 0.125, RS = 0.115;
  /** volumul [cm³] absorbit de circuit la presiunea p [bar] */
  const volum = p => 1.05 * (1 - Math.exp(-p / 1.5)) + 0.032 * p + st.aer * (p / (1 + p));
  function hidraulica(F) {
    const Fmc = F * RAP_PED * (st.servo ? 4.2 : 1) - 90;            // 90 N: arcul de revenire
    let pDem = Math.max(0, Fmc / AMC / 1e5);
    const Vmax = AMC * CURSA_MC * 1e6;
    if (volum(pDem) > Vmax) { let a = 0, b = pDem; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; volum(m) > Vmax ? b = m : a = m; } pDem = a; }
    return pDem;
  }
  let tPrec = performance.now(), activ = true, raf = 0;
  function pas(dt) {
    if (sistem !== "frana") { S.pas(dt, st); return; }
    // forța pe pedală (rampă realistă)
    st.Fact += clamp((st.apasat ? st.F : 0) - st.Fact, -2500 * dt, 1800 * dt);
    const pDem = hidraulica(st.Fact);
    st.p = Math.max(0, st.p + (pDem - st.p) * (1 - Math.exp(-dt / 0.07)));
    st.sMC = volum(st.p) / (AMC * 1e4) / 100; // m (cm³ / cm² = cm)
    st.cursaP = (st.Fact > 1 ? 0.008 : 0) + st.sMC * RAP_PED;
    // presiunea în etriere: ABS (modulare) sau directă
    const aCer = (2 * (2 * MU_P * st.p * 1e5 * APF * RF) + 2 * (2 * MU_P * st.p * 1e5 * APS * RS)) / CAR.Rroata / MASA;
    const aMax = st.mu * G;
    st.absAct = false;
    if (st.v > 0.5 && aCer > aMax * 0.97) {
      if (st.abs) {
        st.absAct = true; st.tAbs += dt;
        const f = (aMax * 0.93) / aCer * (0.88 + 0.12 * Math.sin(st.tAbs * 2 * Math.PI * 9));
        st.pRoti = st.pRoti.map(() => st.p * f); st.blocat = false;
      } else { st.blocat = true; st.pRoti = st.pRoti.map(() => st.p); }
    } else { st.blocat = st.blocat && st.v > 0.3 && aCer > 0; if (aCer <= aMax * 0.97) st.blocat = false; st.pRoti = st.pRoti.map(() => st.p); st.tAbs = 0; }
    // decelerația
    let a = 0;
    if (st.v > 0.01) {
      const aF = Math.min(aCer * (st.absAct ? (aMax * 0.93) / aCer : 1), st.blocat ? aMax * 0.78 : aMax);
      a = aF + 0.012 * G + 0.00042 * st.v * st.v;
      if (st.vTinta > st.v + 0.05 && st.p < 0.5) a = -Math.min(3.2, (st.vTinta - st.v) * 2);
    } else if (st.vTinta > 0.05 && st.p < 0.5) a = -3.2;
    if (st.p > 1) st.vTinta = 0;
    if (st.p > 1 && st.xStart === null && st.v > 0.5) { st.xStart = st.x; st.vStart = st.v; }
    st.v = Math.max(0, st.v - a * dt); st.a = st.v > 0 ? a : 0;
    st.x += st.v * dt; if (st.xStart !== null) st.dist = st.x - st.xStart;
    // roți
    roti.forEach((r, i) => {
      if (!st.blocat) st.unghi[i] -= st.v / CAR.Rroata * dt;
      r.rot.rotation.z = st.unghi[i];
      st.caldura[i] = Math.max(0, st.caldura[i] + (st.pRoti[i] * st.v * (r.fata ? 0.0009 : 0.0005) - st.caldura[i] * 0.12) * dt);
    });
    // urme de derapaj (fixe pe drum)
    if (st.blocat && st.v > 0.5) roti.forEach(r => {
      const u = new THREE.Mesh(new THREE.PlaneGeometry(st.v * dt + 0.03, 0.2), matUrma); u.rotation.x = -Math.PI / 2;
      u.position.set(r.x + st.x, 0.005, r.z); urme.add(u); if (urme.children.length > 1600) urme.remove(urme.children[0]);
    });
    urme.position.x = -st.x;
    mobil.position.x = -(st.x % (PAS * 6));
    // tangaj (caroseria „se lasă” pe față)
    const tTinta = clamp(st.a, -4, 10) * 0.0042;
    st.tangaj += (tTinta - st.tangaj) * (1 - Math.exp(-dt / 0.18));
    caroserie.rotation.z = -st.tangaj; caroserie.position.y = -Math.abs(st.tangaj) * 0.6;
    S.actualizeaza(st, dt);
  }
  function hud() {
    const el = gazda.querySelector(".v3d-hud");
    if (sistem !== "frana") { el.innerHTML = S.hud(st); return; }
    const f = (v, n = 1) => (Math.abs(v) < 0.5 * 10 ** -n ? 0 : v).toFixed(n).replace(".", ",");
    el.innerHTML = `<div><b>${f(st.v * 3.6, 0)}</b> km/h</div>
      <div>p<sub>pompă</sub> <b>${f(st.p, 1)}</b> bar</div>
      <div>a <b>${f(st.a, 2)}</b> m/s²</div>
      <div>cursă pedală <b>${f(st.cursaP * 1000, 0)}</b> mm</div>
      <div>dist. frânare <b>${st.xStart !== null ? f(st.dist, 1) + " m" : "–"}</b></div>
      ${optiuni.arataForte ? `<div>F pedală <b>${f(st.Fact, 0)}</b> N</div><div>F etrier față <b>${f(st.pRoti[0] * 1e5 * APF / 1000, 2)}</b> kN</div><div>F etrier spate <b>${f(st.pRoti[2] * 1e5 * APS / 1000, 2)}</b> kN</div>` : ""}
      ${st.absAct ? '<div class="v3d-abs">ABS activ</div>' : ""}${st.blocat ? '<div class="v3d-blocare">roți blocate</div>' : ""}
      ${st.cursaP > 0.105 ? '<div class="v3d-blocare">pedală moale!</div>' : ""}`;
  }
  const v3 = new THREE.Vector3();
  function etichetePoz(w, h) {
    if (!st.et) return;
    const vizibile = [];
    etichete.forEach(e => {
      e.obj.getWorldPosition(v3); v3.project(camera);
      const vis = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      e.el.style.display = vis ? "" : "none";
      if (vis) { e.sx = (v3.x * 0.5 + 0.5) * w; e.sy = (-v3.y * 0.5 + 0.5) * h; e.ly = e.sy; e.lw = e.el.offsetWidth || e.text.length * 6.5; vizibile.push(e); }
    });
    // evitarea suprapunerilor: etichetele care s-ar acoperi se decalează pe verticală, cu linie de legătură
    vizibile.sort((a, b) => a.sy - b.sy);
    const puse = [];
    vizibile.forEach(e => {
      let y = e.sy;
      for (let k = 0; k < 12; k++) {
        const c = puse.find(o => Math.abs(o.ly - y) < 21 && e.sx < o.sx + o.lw + 8 && o.sx < e.sx + e.lw + 8);
        if (!c) break; y = c.ly + 22;
      }
      e.ly = y; puse.push(e);
      e.el.style.transform = `translate(${e.sx}px, ${y}px)`;
      e.el.style.setProperty("--dy", `${e.sy - y}px`);
    });
  }
  function redim() {
    const w = scena.clientWidth, h = scena.clientHeight;
    if (!w || !h) return [w, h];
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    return [w, h];
  }
  let tHud = 0;
  function bucla(t) {
    raf = requestAnimationFrame(bucla);
    const dt = clamp((t - tPrec) / 1000, 0, 0.05); tPrec = t;
    if (!gazda.offsetParent) return; // tab ascuns: nu consumăm procesor
    for (let k = 0; k < 4; k++) pas(dt / 4);
    if (zbor) { zbor.k = Math.min(1, zbor.k + dt / 0.9); const e = sstep(0, 1, zbor.k); camera.position.lerpVectors(zbor.p0, zbor.p1, e); ctl.target.lerpVectors(zbor.t0, zbor.t1, e); if (zbor.k >= 1) zbor = null; }
    ctl.update();
    asfalt.visible = camera.position.y > 0.02; mobil.visible = asfalt.visible;
    const [w, h] = redim();
    renderer.render(scene, camera);
    etichetePoz(w, h);
    if (t - tHud > 100) { tHud = t; hud(); }
  }
  raf = requestAnimationFrame(bucla);
  return {
    stare: st,
    distruge() { cancelAnimationFrame(raf); window.removeEventListener("keydown", tasta); window.removeEventListener("keyup", tasta); window.removeEventListener("schimbare-tema", laTema); renderer.dispose(); }
  };
}

/* ================================================================== sistemul de frânare */
function construiesteFrana({ THREE, sasiu, caroserie, roti }) {
  const et = [];
  const mAl = new THREE.MeshStandardMaterial({ color: 0xb9c0c8, metalness: 0.85, roughness: 0.3 });
  const mNegru = new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: 0.5, roughness: 0.45 });
  const mRosu = new THREE.MeshStandardMaterial({ color: 0xc8202a, metalness: 0.3, roughness: 0.35 });
  const mDisc = () => new THREE.MeshStandardMaterial({ color: 0x8d9298, metalness: 0.9, roughness: 0.38, emissive: 0xff4a00, emissiveIntensity: 0 });
  const mLichid = new THREE.MeshStandardMaterial({ color: 0xd9a63a, emissive: 0xff2200, emissiveIntensity: 0, roughness: 0.3, transparent: true, opacity: 0.9 });
  const mSticla = new THREE.MeshPhysicalMaterial({ color: 0xe8eef3, transparent: true, opacity: 0.35, roughness: 0.15, metalness: 0, depthWrite: false });

  // pedalierul (șofer pe stânga: z < 0)
  const pedala = new THREE.Group(); pedala.position.set(1.1, 0.86, -0.36); caroserie.add(pedala);
  { const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.0, -0.22, 0), new THREE.Vector3(-0.1, -0.33, 0));
    const brat = new THREE.Mesh(new THREE.TubeGeometry(c, 20, 0.011, 8), mNegru); pedala.add(brat);
    const art = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 16), mAl); art.rotation.x = Math.PI / 2; pedala.add(art); }
  const talpa = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.07, 0.085), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })); talpa.position.set(-0.105, -0.34, 0); talpa.rotation.z = 0.9; pedala.add(talpa);
  const tija = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 8), mAl); tija.rotation.z = Math.PI / 2; caroserie.add(tija);
  et.push({ obj: talpa, text: "Pedala de frână" });
  // servofrâna (vacuum) + pompa centrală tandem + rezervor
  const servo = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.17, 40), mNegru); servo.rotation.z = Math.PI / 2; servo.position.set(1.36, 0.8, -0.38); caroserie.add(servo);
  const servoInel = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.008, 8, 40), mAl); servoInel.rotation.y = Math.PI / 2; servoInel.position.set(1.36, 0.8, -0.38); caroserie.add(servoInel);
  et.push({ obj: servo, text: "Servofrâna (vacuum)" });
  const pcCorp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 24, 1, true), mSticla); pcCorp.rotation.z = Math.PI / 2; pcCorp.position.set(1.56, 0.8, -0.38); caroserie.add(pcCorp);
  const pcFlansa = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.09), mAl); pcFlansa.position.set(1.455, 0.8, -0.38); caroserie.add(pcFlansa);
  const pcLichid = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.2, 20), mLichid); pcLichid.rotation.z = Math.PI / 2; pcLichid.position.set(1.565, 0.8, -0.38); caroserie.add(pcLichid);
  const pistoane = [0, 1].map(k => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.0265, 0.0265, 0.028, 20), mAl); p.rotation.z = Math.PI / 2; caroserie.add(p); return p; });
  const rez = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.07, 0.09), mSticla); rez.position.set(1.57, 0.87, -0.38); caroserie.add(rez);
  const rezL = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.045, 0.085), mLichid); rezL.position.set(1.57, 0.86, -0.38); caroserie.add(rezL);
  const capac = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0xe8c23a, roughness: 0.6 })); capac.position.set(1.57, 0.915, -0.38); caroserie.add(capac);
  et.push({ obj: pcCorp, text: "Pompa centrală tandem" });
  // modulatorul ABS (bloc hidraulic + motor + calculator)
  const abs = new THREE.Group(); abs.position.set(1.62, 0.66, 0.5); caroserie.add(abs);
  const absBloc = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.11), mAl); abs.add(absBloc);
  const absMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 20), mNegru); absMotor.position.set(0, -0.07, 0); abs.add(absMotor);
  const absECU = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.11), new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.6, emissive: 0x33aaff, emissiveIntensity: 0 })); absECU.position.set(-0.07, 0, 0); abs.add(absECU);
  et.push({ obj: absBloc, text: "Modulatorul ABS / ESP" });

  // discuri și etriere
  const discuri = [], etriere = [];
  roti.forEach((r, i) => {
    const disc = new THREE.Group(); disc.position.z = -r.sg * 0.07; r.rot.add(disc);
    const md = mDisc();
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r.fata ? 0.15 : 0.135, r.fata ? 0.15 : 0.135, r.fata ? 0.028 : 0.012, 48), md); d.rotation.x = Math.PI / 2; d.castShadow = true; disc.add(d);
    const clopot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 32), mNegru); clopot.rotation.x = Math.PI / 2; clopot.position.z = r.sg * 0.03; disc.add(clopot);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const g = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.05, r.fata ? 0.016 : 0.006), mNegru); g.position.set(Math.cos(a) * 0.115, Math.sin(a) * 0.115, 0); g.rotation.z = a + 0.6; disc.add(g); }
    discuri.push(md);
    // etrierul (fix, flotant): în spatele roții din față / în fața roții din spate, la ~10 h
    const e = new THREE.Group(); const a0 = r.fata ? Math.PI * 0.82 : Math.PI * 0.18; const raz = r.fata ? 0.125 : 0.112;
    e.position.set(Math.cos(a0) * raz, Math.sin(a0) * raz, -r.sg * 0.07); e.rotation.z = a0; r.grup.add(e);
    const gros = r.fata ? 0.028 : 0.012;
    const corp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, gros + 0.07), mRosu); corp.castShadow = true;
    const cut = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, gros + 0.012), mNegru); cut.position.x = -0.014;
    e.add(corp);
    const placute = [1, -1].map(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.011), new THREE.MeshStandardMaterial({ color: 0x4d4a46, roughness: 0.95 })); p.position.set(-0.012, 0, s * (gros / 2 + 0.012)); e.add(p); return { p, s }; });
    corp.position.x = 0.012;
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(r.fata ? 0.027 : 0.019, r.fata ? 0.027 : 0.019, 0.02, 20), mAl); piston.rotation.x = Math.PI / 2; e.add(piston);
    etriere.push({ e, placute, piston, gros, r });
    if (i === 0) et.push({ obj: corp, text: "Etrier + plăcuțe" }), et.push({ obj: d, text: "Disc ventilat" });
    if (i === 2) et.push({ obj: corp, text: "Etrier spate" });
  });

  // conductele (circuit în diagonală: FS–SD și FD–SS)
  const conducte = [];
  const tub = (pts, culoare) => {
    const curba = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, "catmullrom", 0.2);
    const m = new THREE.MeshStandardMaterial({ color: culoare, metalness: 0.6, roughness: 0.35, emissive: 0xff2000, emissiveIntensity: 0 });
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curba, Math.max(24, pts.length * 14), 0.0055, 6, false), m);
    caroserie.add(mesh);
    const bile = []; for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0 })); caroserie.add(b); bile.push({ b, u: k / 7 }); }
    const c = { curba, m, bile }; conducte.push(c); return c;
  };
  const yS = 0.24;
  const pctEtrier = r => [r.x + (r.fata ? -0.12 : 0.11), CAR.yRoata + 0.08, r.z - r.sg * 0.08];
  // pompă → ABS
  tub([[1.6, 0.81, -0.35], [1.62, 0.76, -0.1], [1.62, 0.70, 0.3], [1.6, 0.67, 0.44]], 0x9aa3ad);
  tub([[1.52, 0.81, -0.35], [1.55, 0.74, -0.05], [1.58, 0.68, 0.32], [1.6, 0.65, 0.44]], 0x9aa3ad);
  const [FD, FS, SD, SS] = roti; // ordinea din listă: (XF, +Z)=față dreapta, (XF,-Z)=față stânga, (XS,+Z), (XS,-Z)
  // ABS → roți față (prin pasaj, furtun flexibil)
  tub([[1.66, 0.62, 0.52], [1.75, 0.55, 0.62], [1.62, 0.55, 0.66], ...[pctEtrier(FD)].map(p => [p[0] + 0.03, p[1] + 0.12, p[2] - 0.06]), pctEtrier(FD)], 0x9aa3ad);
  tub([[1.58, 0.62, 0.45], [1.5, 0.5, 0.1], [1.5, 0.48, -0.5], [1.4, 0.55, -0.62], pctEtrier(FS)], 0x9aa3ad);
  // ABS → roți spate (pe sub podea, de-a lungul tunelului / pragului)
  tub([[1.6, 0.6, 0.48], [1.3, 0.32, 0.36], [0.8, yS, 0.30], [-0.8, yS, 0.30], [-1.2, yS + 0.02, 0.4], [-1.3, 0.38, 0.6], pctEtrier(SD)], 0x9aa3ad);
  tub([[1.62, 0.6, 0.46], [1.3, 0.3, 0.26], [0.8, yS, 0.24], [-0.8, yS, 0.24], [-1.2, yS + 0.02, -0.2], [-1.3, 0.38, -0.6], pctEtrier(SS)], 0x9aa3ad);
  et.push({ obj: conducte[4].bile[3].b, text: "Conducte rigide (circuit diagonal)" });

  let pPrec = 0;
  function actualizeaza(st, dt) {
    // pedala se rotește în jurul articulației, tija împinge servofrâna
    pedala.rotation.z = st.cursaP / 0.36;
    tija.position.set(1.075 + st.sMC + 0.11, 0.78, -0.37);
    // pistoanele pompei centrale (primar + secundar)
    pistoane[0].position.set(1.48 + st.sMC, 0.8, -0.38); pistoane[1].position.set(1.57 + st.sMC * 0.9, 0.8, -0.38);
    pcLichid.scale.x = 1; rezL.scale.y = 1 - Math.min(0.25, st.sMC * 1.5);
    // lichidul sub presiune: culoare + „pulsuri” care curg spre roți când presiunea crește
    const k = clamp(st.p / 120, 0, 1);
    mLichid.emissiveIntensity = k * 0.8;
    const dp = (st.p - pPrec) / Math.max(dt, 1e-4); pPrec = st.p;
    conducte.forEach((c, i) => {
      const pc = i < 2 ? st.p : st.pRoti[[0, 1, 2, 3][i - 2] ?? 0];
      c.m.emissiveIntensity = clamp(pc / 120, 0, 1) * 1.4 + (st.absAct ? 0.3 * Math.sin(st.tAbs * 57) : 0);
      c.m.color.setHSL(0.09 - 0.09 * clamp(pc / 120, 0, 1), 0.25 + 0.6 * clamp(pc / 100, 0, 1), 0.55);
      const vit = clamp(dp / 200, -1.5, 1.5);
      c.bile.forEach(o => {
        o.u = (o.u + vit * dt + 1) % 1; c.curba.getPointAt(o.u, o.b.position);
        o.b.material.opacity = clamp(Math.abs(vit) * 2, 0, 0.95);
      });
    });
    absECU.material.emissiveIntensity = st.absAct ? 1.2 : 0;
    absBloc.material === mAl && (abs.position.y = 0.66 + (st.absAct ? Math.sin(st.tAbs * 60) * 0.0015 : 0));
    // etriere: plăcuțele strâng discul (joc exagerat vizual: 6 mm → 0)
    etriere.forEach((o, i) => {
      const p = st.pRoti[i], strans = clamp(p / 3, 0, 1);
      const joc = 0.006 * (1 - strans);
      o.placute.forEach(({ p: m, s }) => m.position.z = s * (o.gros / 2 + 0.0055 + joc));
      o.piston.position.z = (o.gros / 2 + 0.02 + joc);
      // discul se încălzește
      discuri[i].emissiveIntensity = clamp(st.caldura[i] / 60, 0, 1.6);
    });
  }
  return { etichete: et, actualizeaza };
}

/* ================================================================== ungerea motorului (L1 – vâscozitatea uleiului) */
const ULEIURI3D = {
  "0W-20": { n40: 44.5, n100: 8.6, r15: 0.846 }, "5W-30": { n40: 65.3, n100: 11.0, r15: 0.855 },
  "10W-40": { n40: 98.0, n100: 14.6, r15: 0.868 }, "15W-40": { n40: 108, n100: 14.8, r15: 0.880 }, "UZAT": { n40: 54.0, n100: 9.4, r15: 0.862 }
};
function waltherAB(n40, n100) { const lg = Math.log10, Y = n => lg(lg(n + 0.7)), x1 = lg(313.15), x2 = lg(373.15), B = (Y(n40) - Y(n100)) / (x2 - x1); return { A: Y(n40) + B * x1, B }; }
function nuW(w, t) { return Math.pow(10, Math.pow(10, w.A - w.B * Math.log10(t + 273.15))) - 0.7; }

function construiesteUngere({ THREE, caroserie, optiuni, ctxMotor }) {
  const et = [];
  // ascundem conturul simplu al motorului din interiorul de context
  ctxMotor.children.forEach(l => { const p = l.position; if (Math.abs(p.x - 1.82) < 0.01 && Math.abs(p.y - 0.62) < 0.01) l.visible = false; });
  const M = new THREE.Group(); caroserie.add(M);
  const X0 = 1.86, YC = 0.44;                // axa arborelui cotit (motor transversal: axa pe z)
  const ZC = [-0.21, -0.07, 0.07, 0.21];     // cilindrii
  const ZL = [-0.28, -0.14, 0, 0.14, 0.28];  // lagărele paliere
  const mBloc = new THREE.MeshPhysicalMaterial({ color: 0xc9ced4, metalness: 0.3, roughness: 0.4, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const mLinii = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  const mOtel = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, metalness: 0.9, roughness: 0.3 });
  const mPiston = new THREE.MeshStandardMaterial({ color: 0xd2d6db, metalness: 0.7, roughness: 0.35 });
  const mUlei = new THREE.MeshStandardMaterial({ color: 0xd9a03a, emissive: 0x6b3b00, emissiveIntensity: 0.4, roughness: 0.25, transparent: true, opacity: 0.92 });
  const mTeava = new THREE.MeshStandardMaterial({ color: 0x8b939c, metalness: 0.5, roughness: 0.5, transparent: true, opacity: 0.35, depthWrite: false });
  const mFiltru = new THREE.MeshStandardMaterial({ color: 0x1f5fb0, metalness: 0.3, roughness: 0.45 });
  const cutie = (w, h, d, x, y, z, m = mBloc) => { const g = new THREE.BoxGeometry(w, h, d); const o = new THREE.Mesh(g, m); o.position.set(x, y, z); M.add(o); const l = new THREE.LineSegments(new THREE.EdgesGeometry(g), mLinii); l.position.copy(o.position); M.add(l); return o; };
  const bloc = cutie(0.36, 0.42, 0.66, X0, 0.62, 0);
  cutie(0.36, 0.13, 0.66, X0, 0.895, 0);                     // chiulasa
  cutie(0.30, 0.05, 0.62, X0, 0.985, 0);                     // capacul culbutorilor
  const baie = cutie(0.38, 0.16, 0.62, X0, 0.29, 0);         // baia de ulei (carterul inferior)
  et.push({ obj: bloc, text: "Blocul motor (4 cilindri)" });
  // uleiul din baie
  const nivel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.6), mUlei); nivel.position.set(X0, 0.265, 0); M.add(nivel);
  et.push({ obj: nivel, text: "Baia de ulei" });
  // cilindri (cămăși) și pistoane cu biele
  const piese = [];
  ZC.forEach((z, i) => {
    const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.2, 24, 1, true), mTeava); cam.position.set(X0, 0.66, z); M.add(cam);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.05, 24), mPiston); M.add(p);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.14, 0.012), mOtel); M.add(b);
    piese.push({ p, b, z, faza: [0, Math.PI, Math.PI, 0][i] });
  });
  // arborele cotit (fusuri paliere + manetoane) – se rotește în jurul axei z
  const cotit = new THREE.Group(); cotit.position.set(X0, YC, 0); M.add(cotit);
  ZL.forEach(z => { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.05, 20), mOtel); f.rotation.x = Math.PI / 2; f.position.z = z; cotit.add(f); });
  piese.forEach(o => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 16), mOtel); m.rotation.x = Math.PI / 2; m.position.set(Math.sin(o.faza) * 0.043, Math.cos(o.faza) * 0.043, o.z); cotit.add(m);
    [-1, 1].forEach(s => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.014), mOtel); w.position.set(Math.sin(o.faza) * 0.02, Math.cos(o.faza) * 0.02, o.z + s * 0.03); w.rotation.z = -o.faza; cotit.add(w); }); });
  et.push({ obj: cotit, text: "Arborele cotit" });
  // cuzineții palieri: inele care se „umplu” cu ulei
  const cuz = ZL.map(z => { const m = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.6, roughness: 0.4, emissive: 0x000000 }); const r = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.007, 8, 24), m); r.position.set(X0, YC, z); M.add(r); return m; });
  et.push({ obj: M.children[M.children.length - 1], text: "Lagăre paliere (cuzineți)" });
  // arborele cu came în chiulasă
  const came = new THREE.Group(); came.position.set(X0, 0.905, 0); M.add(came);
  const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.64, 12), mOtel); ax.rotation.x = Math.PI / 2; came.add(ax);
  for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 3), mOtel); l.rotation.x = Math.PI / 2; l.position.z = -0.245 + k * 0.07; l.rotation.y = k * 0.8; came.add(l); }
  const cuzCame = ZL.map(z => { const m = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.6, roughness: 0.4 }); const r = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.005, 8, 20), m); r.position.set(X0, 0.905, z); M.add(r); return m; });
  et.push({ obj: came, text: "Arborele cu came" });
  // pompa de ulei (pe capătul arborelui cotit), sorbul, filtrul
  const pompa = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 28), new THREE.MeshStandardMaterial({ color: 0x8f969e, metalness: 0.8, roughness: 0.35 }));
  pompa.rotation.x = Math.PI / 2; pompa.position.set(X0, YC, -0.35); M.add(pompa);
  const angr = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 16), mOtel); angr.position.set(X0, YC, -0.375); M.add(angr);
  et.push({ obj: pompa, text: "Pompa de ulei" });
  const filtru = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.1, 24), mFiltru); filtru.rotation.z = Math.PI / 2; filtru.position.set(1.63, 0.54, -0.22); M.add(filtru);
  et.push({ obj: filtru, text: "Filtrul de ulei" });
  const sorb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 16), mOtel); sorb.position.set(X0, 0.225, -0.1); M.add(sorb);
  et.push({ obj: sorb, text: "Sorbul cu sită" });

  // traseele de ulei: țeava (transparentă) + uleiul care o umple progresiv
  const trasee = [];
  const traseu = (pts, V, nume) => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, "catmullrom", 0.15);
    const segs = Math.max(20, pts.length * 16);
    M.add(new THREE.Mesh(new THREE.TubeGeometry(c, segs, 0.011, 8, false), mTeava));
    const g = new THREE.TubeGeometry(c, segs, 0.0085, 8, false);
    const u = new THREE.Mesh(g, mUlei); M.add(u);
    g.setDrawRange(0, 0);
    const bile = []; for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe3a0 })); b.visible = false; M.add(b); bile.push({ b, u: k / 6 }); }
    const t = { c, g, V, plin: 0, bile, nume, nIdx: g.index.count }; trasee.push(t); return t;
  };
  const xG = 1.70, yG = 0.47;
  traseu([[X0, 0.23, -0.1], [X0, 0.24, -0.25], [X0, 0.33, -0.33], [X0, YC - 0.03, -0.35]], 0.05, "sorb");
  traseu([[X0, YC + 0.04, -0.37], [1.75, 0.52, -0.37], [1.66, 0.54, -0.30], [1.63, 0.54, -0.27]], 0.06, "refulare");
  traseu([[1.63, 0.54, -0.17], [1.66, 0.52, -0.20], [xG, yG, -0.30]], 0.22, "filtru");               // include volumul filtrului golit
  traseu([[xG, yG, -0.30], [xG, yG, 0], [xG, yG, 0.30]], 0.06, "galeria principală");
  const ramuri = ZL.map(z => traseu([[xG, yG, z], [X0 - 0.06, YC + 0.02, z], [X0 - 0.03, YC, z]], 0.006, "ramificație"));
  traseu([[xG, yG, 0.30], [xG, 0.70, 0.32], [X0 - 0.05, 0.88, 0.32], [X0, 0.89, 0.30]], 0.05, "coloana spre chiulasă");
  traseu([[X0, 0.89, 0.30], [X0, 0.89, 0], [X0, 0.89, -0.30]], 0.06, "galeria din chiulasă");
  et.push({ obj: trasee[3].bile[2].b, text: "Galeria principală de ulei" });
  const Vtot = trasee.reduce((a, t) => a + t.V, 0);

  // ---------------------------------------------------------- comenzi
  const html = `
    <div class="v3d-grup">
      <button type="button" class="primar" data-u="porneste">Pornire la rece (motor oprit de 12 h)</button>
      <button type="button" data-u="opreste">Oprește motorul</button>
    </div>
    <div class="v3d-grup">
      <label>Uleiul <select data-s="ulei">${Object.keys(ULEIURI3D).map(k => `<option value="${k}">${k === "UZAT" ? "5W-30 uzat" : k}</option>`).join("")}<option value="PROPRIU">uleiul A – dreapta voastră</option></select></label>
      <label>Temperatura uleiului <input type="range" data-s="T" min="-25" max="110" step="1" value="-5"> <output>−5 °C</output></label>
      <label>Turația <input type="range" data-s="n" min="800" max="6000" step="100" value="1200"> <output>1200 rot/min</output></label>
    </div>`;
  const stare = { motor: false, n: 0, nTinta: 1200, T: -5, ulei: "5W-30", tPorn: 0, p: 0, Q: 0, Qp: 0, tLag: null, tCam: null, unghi: 0, nu: 0, eta: 0, wPropriu: null };
  let S0 = null;
  function vasc(st) {
    let w;
    if (st.ulei === "PROPRIU" && st.wPropriu) w = st.wPropriu;
    else { const u = ULEIURI3D[st.ulei === "PROPRIU" ? "5W-30" : st.ulei]; w = waltherAB(u.n40, u.n100); }
    const u = ULEIURI3D[st.ulei] || ULEIURI3D["5W-30"];
    const nu = nuW(w, st.T), rho = u.r15 * (1 - 0.00065 * (st.T - 15));
    return { nu, eta: nu * rho };
  }
  function leaga(cmd, st) {
    S0 = st;
    const outT = cmd.querySelector('[data-s="T"]'), outN = cmd.querySelector('[data-s="n"]'), sel = cmd.querySelector('[data-s="ulei"]');
    outT.addEventListener("input", () => { st.T = +outT.value; outT.nextElementSibling.textContent = `${st.T < 0 ? "−" + (-st.T) : st.T} °C`; });
    outN.addEventListener("input", () => { st.nTinta = +outN.value; outN.nextElementSibling.textContent = `${st.nTinta} rot/min`; });
    sel.addEventListener("change", () => {
      st.ulei = sel.value;
      if (st.ulei === "PROPRIU") { const w = optiuni.walther && optiuni.walther(); if (w) st.wPropriu = w; else { st.wPropriu = null; alert_("Măsurați întâi uleiul A la 40 °C și 80 °C (Tabelul 1.2): dreapta voastră nu este încă disponibilă – se folosește 5W-30 din catalog."); } }
    });
    cmd.querySelector('[data-u="porneste"]').addEventListener("click", () => {
      // motor oprit de mult: galeriile și filtrul s-au golit în baie
      trasee.forEach((t, i) => { t.plin = i === 0 ? 0.5 : 0; }); st.motor = true; st.tPorn = 0; st.n = 0; st.tLag = null; st.tCam = null;
    });
    cmd.querySelector('[data-u="opreste"]').addEventListener("click", () => { st.motor = false; });
  }
  function alert_(t) { try { const d = document.createElement("div"); d.className = "v3d-toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 5000); } catch (e) { } }

  // ---------------------------------------------------------- fizica ungerii
  const VG = 12e-3;            // cilindreea pompei [L/rot]
  const RK = 0.0116;           // rezistența hidraulică a motorului [bar/(L/min·mPa·s)]
  const P_SUP = 5.5;           // supapa de siguranță [bar]
  function pas(dt, st) {
    const v = vasc(st); st.nu = v.nu; st.eta = v.eta;
    // turația: demaror 250 rot/min, apoi ralanti (mai mare la rece) sau turația cerută
    if (st.motor) {
      st.tPorn += dt;
      const ral = st.T < 20 ? 1200 : 800, tinta = st.tPorn < 0.9 ? 250 : Math.max(ral, st.nTinta);
      st.n += (tinta - st.n) * (1 - Math.exp(-dt / 0.35));
    } else st.n += (0 - st.n) * (1 - Math.exp(-dt / 0.5));
    // debitul pompei: teoretic, minus scăpări (mari la ulei subțire, cald), limitat la aspirație (ulei vâscos, rece)
    const Qt = VG * st.n;                                         // L/min
    const Qsuc = 3000 / st.eta;                                   // L/min, limita sorbului
    const pUmplut = trasee.every(t => t.plin >= 1);
    let Qp = Math.min(Qt, Qsuc);
    let p;
    if (!pUmplut) p = Math.min(P_SUP, 0.15 + Qp * RK * st.eta * 0.08);   // galerii parțial goale: presiune mică
    else p = Math.min(P_SUP, Qp * RK * st.eta);
    const scap = 0.04 * p * 9.4 / Math.max(st.eta, 1) * Qt / 10;  // scăpări interne ale pompei
    Qp = Math.max(0, Qp - scap);
    let Qm = Qp;                                                  // debit prin motor
    if (pUmplut && Qp * RK * st.eta > P_SUP) Qm = P_SUP / (RK * st.eta);   // restul se întoarce prin supapă
    st.Qp = Qp; st.Q = Qm;
    st.p += (p - st.p) * (1 - Math.exp(-dt / 0.15));
    // umplerea traseelor, în ordine (ramurile primesc în paralel după galeria principală)
    let Vdisp = Qm / 60 * dt;                                     // L în pasul de timp
    for (const t of trasee) {
      if (Vdisp <= 0) break;
      if (t.plin >= 1) continue;
      const nevoie = (1 - t.plin) * t.V, dat = Math.min(nevoie, Vdisp);
      t.plin += dat / t.V; Vdisp -= dat;
      if (ramuri.includes(t)) { /* ramurile se umplu împreună */ ramuri.forEach(r => { if (r !== t) r.plin = Math.max(r.plin, t.plin); }); }
      break;
    }
    if (st.motor && st.tLag === null && ramuri.every(r => r.plin >= 1)) st.tLag = st.tPorn;
    if (st.motor && st.tCam === null && trasee[trasee.length - 1].plin >= 1) st.tCam = st.tPorn;
    // rotirea pieselor (vizual încetinită de 40 de ori)
    st.unghi += st.n / 60 * 2 * Math.PI * dt / 40;
    cotit.rotation.z = -st.unghi; came.rotation.z = -st.unghi / 2;
    piese.forEach(o => {
      const a = st.unghi + o.faza, r = 0.043, L = 0.14;
      const yp = YC + r * Math.cos(a) + Math.sqrt(L * L - (r * Math.sin(a)) ** 2);
      o.p.position.set(X0, yp + 0.025, o.z);
      const xm = X0 + r * Math.sin(a), ym = YC + r * Math.cos(a);
      o.b.position.set((xm + X0) / 2, (ym + yp) / 2, o.z); o.b.rotation.z = Math.atan2(X0 - xm, yp - ym);
    });
    // afișarea uleiului din trasee și a particulelor
    trasee.forEach(t => {
      t.g.setDrawRange(0, Math.floor(t.nIdx * clamp(t.plin, 0, 1) / 6) * 6);
      const vit = clamp(st.Q / 25, 0, 1.5);
      t.bile.forEach(o => {
        o.u = (o.u + vit * dt * 0.8) % 1;
        o.b.visible = st.n > 50 && o.u < t.plin;
        if (o.b.visible) t.c.getPointAt(o.u, o.b.position);
      });
    });
    const okLag = ramuri.every(r => r.plin >= 1) && st.p > 0.5;
    cuz.forEach(m => { m.emissive.set(okLag ? 0x2a7a3a : (st.n > 50 ? 0x7a1a10 : 0x000000)); m.emissiveIntensity = 0.8; });
    cuzCame.forEach(m => { m.emissive.set(trasee[trasee.length - 1].plin >= 1 && st.p > 0.5 ? 0x2a7a3a : (st.n > 50 ? 0x7a1a10 : 0x000000)); m.emissiveIntensity = 0.8; });
    nivel.scale.y = 1 - 0.35 * trasee.reduce((a, t) => a + t.plin * t.V, 0) / Vtot;
    nivel.position.y = 0.215 + 0.05 * nivel.scale.y;
    mUlei.color.setHSL(0.1, 0.75, clamp(0.38 + st.T / 400, 0.3, 0.6));
    st.v = 0; st.a = 0;
  }
  const f = (v, n = 1) => (Math.abs(v) < 0.5 * 10 ** -n ? 0 : v).toFixed(n).replace(".", ",");
  function hud(st) {
    const lampa = st.n > 50 && st.p < 0.4;
    return `<div><b>${f(st.n, 0)}</b> rot/min</div>
      <div>ulei <b>${f(st.T, 0)}</b> °C · ν <b>${st.nu > 999 ? f(st.nu, 0) : f(st.nu, 1)}</b> mm²/s</div>
      <div>p ulei <b>${f(st.p, 2)}</b> bar</div>
      <div>debit motor <b>${f(st.Q, 1)}</b> L/min</div>
      <div>ungere lagăre: <b>${st.tLag !== null ? f(st.tLag, 1) + " s" : (st.motor ? "…" : "–")}</b></div>
      <div>ungere came: <b>${st.tCam !== null ? f(st.tCam, 1) + " s" : (st.motor ? "…" : "–")}</b></div>
      ${lampa ? '<div class="v3d-blocare">● lampa presiunii uleiului</div>' : ""}
      ${st.p >= P_SUP - 0.05 ? '<div class="v3d-abs">supapa de siguranță deschisă</div>' : ""}`;
  }
  return { etichete: et, html, leaga, pas, hud, stare, camere: { motor: [[3.5, 1.5, 1.9], [X0, 0.6, 0]], lateral: [[X0, 0.7, 2.2], [X0, 0.6, 0]] },
    camereButoane: [["motor", "motorul"], ["lateral", "motor – lateral"]], cameraInitiala: [[3.9, 1.7, 2.6], [X0 - 0.2, 0.6, 0]] };
}
