/* Vehicul 3D: autoturism transparent („raze X”) cu sistemul studiat montat pe el, animat după fizica reală.
   Modul ES, încărcat la cerere de cadru (tabul „Vehicul 3D”). Rotire cu mouse-ul / degetul, zoom cu rotița.
   Sisteme disponibile: "frana" (pedală – servofrână – pompă centrală – ABS – conducte – etriere – discuri).
   Coordonate: x înainte, y în sus, z spre dreapta; unități: metri. */
import * as THREE from "./vendor/three.module.min.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { construiesteMotor, transmisieAccesorii, sistemRacire, MAT } from "./motor3d.js?v=7";

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
      <button type="button" class="btn-ecran">⛶ Ecran complet</button>
      <div class="v3d-ajutor">Trageți pentru rotire · rotița / ciupire pentru zoom · clic dreapta / 2 degete pentru deplasare</div>
    </div>
    <div class="v3d-comenzi"></div>`;
  const canvas = gazda.querySelector("canvas"), scena = gazda.querySelector(".v3d-scena");
  if (typeof ecranComplet === "function") ecranComplet(gazda, scena.querySelector(".btn-ecran")); else scena.querySelector(".btn-ecran").remove();
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
  let motCtx = null;
  if (sistem === "retea" || sistem === "frana" || !sistem) { ascundeContur(ctx, ["motor", "cutie", "radiator"]); motCtx = motorAutoturism(caroserie, 0.5); }
  const S = sistem === "ungere" ? construiesteUngere({ THREE, caroserie, optiuni, ctxMotor: ctx }) : sistem === "senzori" ? construiesteSenzori({ caroserie, sasiu, roti, optiuni, ctxMotor: ctx }) : sistem === "retea" ? construiesteRetea({ caroserie, optiuni }) : construiesteFrana({ THREE, sasiu, caroserie, roti, scene });

  // celelalte sisteme ale autoturismului (transmisie, direcție, baterie, combustibil, evacuare)
  { const mSist = motCtx || (S.motor || null); const gs = sistemeAutoturism(caroserie, mSist); if (motCtx) estompeaza(gs, 0.5); }

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
  tasta = e => { if (e.code === "Space" && gazda.getClientRects().length && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) { e.preventDefault(); apasa(e.type === "keydown"); } };
  window.addEventListener("keydown", tasta); window.addEventListener("keyup", tasta);
  } else S.leaga(cmd, st);

  /* --- vederi de cameră */
  const CAM = { "34": [[6.2, 2.6, 5.4], [0, 0.6, 0]], lat: [[0.2, 1.1, 8.6], [0, 0.65, 0]], sus: [[0.01, 9.5, 0.01], [0, 0.4, 0]], jos: [[1.5, -2.6, 2.2], [0, 0.25, 0]],
    roata: [[XF + 0.9, 0.6, ZR + 1.5], [XF, 0.33, ZR - 0.05]], pedala: [[0.2, 1.25, -1.6], [1.25, 0.72, -0.38]] };
  Object.assign(CAM, S.camere || {});
  let zbor = null;
  if (S.api) S.api({ camera, ctl, canvas, scena, zboara: (p, t) => { zbor = { p0: camera.position.clone(), t0: ctl.target.clone(), p1: new THREE.Vector3(...p), t1: new THREE.Vector3(...t), k: 0 }; } });
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
    if (sistem === "senzori") { S.pas(dt, st); miscare(dt); return; }
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
  function miscare(dt) {
    st.x += st.v * dt;
    roti.forEach((r, i) => { st.unghi[i] -= st.v / CAR.Rroata * dt; r.rot.rotation.z = st.unghi[i]; });
    mobil.position.x = -(st.x % (PAS * 6)); urme.position.x = -st.x;
    const tTinta = clamp(st.a, -4, 10) * 0.0042;
    st.tangaj += (tTinta - st.tangaj) * (1 - Math.exp(-dt / 0.18));
    caroserie.rotation.z = -st.tangaj; caroserie.position.y = -Math.abs(st.tangaj) * 0.6;
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
      const vis = (!e.filtru || e.filtru()) && v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
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
    if (!gazda.getClientRects().length) return; // tab ascuns: nu consumăm procesor
    for (let k = 0; k < 4; k++) pas(dt / 4);
    if (zbor) { zbor.k = Math.min(1, zbor.k + dt / 0.9); const e = sstep(0, 1, zbor.k); camera.position.lerpVectors(zbor.p0, zbor.p1, e); ctl.target.lerpVectors(zbor.t0, zbor.t1, e); if (zbor.k >= 1) zbor = null; }
    ctl.update();
    asfalt.visible = camera.position.y > 0.02; mobil.visible = asfalt.visible;
    const [w, h] = redim();
    renderer.render(scene, camera);
    etichetePoz(w, h);
    if (S.dupaRandare) S.dupaRandare(st);
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

/* ------------------------------------------------------------------ alte sisteme ale autoturismului modern (comune tuturor lucrărilor)
   planetarele (transmisia la roțile față), caseta de direcție cu asistare electrică (EPS), bateria cu senzorul IBS,
   rezervorul cu modulul pompei și conducta de alimentare, canistra EVAP, linia de evacuare cu tobele. Coordonatele caroseriei. */
function sistemeAutoturism(caroserie, mot) {
  const M = MAT(), G = new THREE.Group(); G.name = "sisteme"; caroserie.add(G);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const add = (o, p = G) => { o.castShadow = true; p.add(o); return o; };
  const bara = (a, b, r, m, seg = 16) => { const d = b.clone().sub(a), L = d.length(); const o = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), m)); o.position.copy(a).add(b).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return o; };
  const tub = (pts, r, m, seg = 80) => add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, "catmullrom", 0.3), seg, r, 10, false), m));
  const burduf = (a, b, r0, r1, n = 6) => {      // burduf de cauciuc (ondulat), de la a (rază r0) la b (rază r1)
    const prof = []; for (let i = 0; i <= n * 2; i++) { const u = i / (n * 2), r = r0 + (r1 - r0) * u; prof.push(new THREE.Vector2(r * (i % 2 ? 0.86 : 1), u)); }
    const geo = new THREE.LatheGeometry(prof, 24); const o = add(new THREE.Mesh(geo, M.cauciuc)); const d = b.clone().sub(a); o.position.copy(a); o.scale.set(1, d.length(), 1); o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return o; };
  const cutie = (w, h, d, m, x, y, z) => { const o = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)); o.position.set(x, y, z); return o; };
  const inMasina = v => { mot.grup.updateMatrix(); return v.clone().applyMatrix4(mot.grup.matrix); };
  const YR = CAR.yRoata;

  // 1. planetarele: cuplaj tripod (interior) – arbore – cuplaj homocinetic Rzeppa (exterior), cu burdufuri
  if (mot && mot.ancore.flansaSt) {
    [[mot.ancore.flansaSt, -1], [mot.ancore.flansaDr, 1]].forEach(([fl, s]) => {
      const A = inMasina(fl), B = V(XF, YR, s * (ZR - 0.12)), d = B.clone().sub(A).normalize();
      const a1 = A.clone().addScaledVector(d, 0.05), a2 = A.clone().addScaledVector(d, 0.13), b2 = B.clone().addScaledVector(d, -0.14), b1 = B.clone().addScaledVector(d, -0.05);
      bara(A, a1, 0.042, M.otel, 24); burduf(a1, a2, 0.04, 0.016); bara(a2, b2, 0.014, M.otel); burduf(b2, b1, 0.016, 0.045); bara(b1, B, 0.046, M.otel, 24);
    });
  }
  // 2. caseta de direcție cu cremalieră și asistare electrică pe cremalieră (EPS), bieletele, axul volanului cu cardane
  { const xR = 1.33, yR = 0.37;
    bara(V(xR, yR, -0.4), V(xR, yR, 0.4), 0.024, M.alu, 20);
    [-1, 1].forEach(s => { burduf(V(xR, yR, s * 0.4), V(xR, yR, s * 0.5), 0.028, 0.012, 7); bara(V(xR, yR, s * 0.5), V(XF - 0.1, yR + 0.01, s * (ZR - 0.14)), 0.009, M.otel); add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), M.otel)).position.set(XF - 0.1, yR + 0.01, s * (ZR - 0.14)); });
    bara(V(xR, yR - 0.01, 0.06), V(xR, yR - 0.01, 0.24), 0.048, M.otel, 28); cutie(0.07, 0.06, 0.1, M.alu, xR - 0.07, yR, 0.15);          // motorul EPS și calculatorul
    add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.04), M.plasticGri)).position.set(xR - 0.07, yR + 0.04, 0.15);
    bara(V(xR, yR - 0.02, -0.33), V(xR - 0.02, yR + 0.08, -0.36), 0.03, M.alu, 20);                                                      // carcasa pinionului
    const c1 = V(xR - 0.03, yR + 0.1, -0.37), c2 = V(1.12, 0.62, -0.4), c3 = V(0.86, 0.86, -0.4);
    bara(c1, c2, 0.011, M.otel); bara(c2, c3, 0.016, M.otel); [c1, c2].forEach(p => add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), M.otel)).position.copy(p));   // axul intermediar cu cardane
  }
  // 3. bateria de 12 V (AGM) cu suportul, bornele, cablurile și senzorul IBS pe borna negativă
  { const B = new THREE.Group(); B.position.set(1.95, 0.72, -0.63); G.add(B);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.19, 0.175), M.baterie), B);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.012, 0.175), new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.6 })), B).position.y = 0.1;
    [[0.09, 0xc62828], [-0.09, 0x222222]].forEach(([x, c]) => { const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.025, 16), M.plumb || M.otel), B); b.position.set(x, 0.115, 0.05); const cap = add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.035), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })), B); cap.position.set(x, 0.135, 0.05); });
    add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.2), M.otel), B).position.set(0, 0.1, 0);                                     // bride de fixare
    add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.2), M.plastic), B).position.y = -0.105;
    tub([[2.04, 0.865, -0.58], [1.98, 0.92, -0.62], [1.82, 0.78, -0.58], [1.7, 0.5, -0.45], [1.62, 0.42, -0.3]], 0.009, new THREE.MeshStandardMaterial({ color: 0xb02020, roughness: 0.5 }));   // cablul + spre demaror/alternator
    tub([[1.86, 0.865, -0.58], [1.8, 0.88, -0.66], [1.75, 0.78, -0.72]], 0.009, M.cauciuc);                                              // cablul − spre caroserie
  }
  // 4. rezervorul de combustibil (în șa, sub bancheta spate), modulul pompei, canistra EVAP, conducta de alimentare și cea de purjare
  { const mR = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.7 });
    const RG = new THREE.Group(); RG.position.set(-0.75, 0.0, 0.0); G.add(RG);
    [[-0.32, 0.36], [0.27, 0.38]].forEach(([z, w]) => { const o = add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, w), mR), RG); o.position.set(0, 0.27, z); });
    add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.3), mR), RG).position.set(0, 0.33, -0.02);                                    // puntea peste tunel
    [-0.2, 0.2].forEach(x => add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 1.02), M.otel), RG).position.set(x, 0.165, 0));   // chingile de fixare
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 32), M.plastic), RG).position.set(0.13, 0.385, 0.3);               // flanșa modulului pompei
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 32), M.plasticGri), RG).position.set(0.13, 0.405, 0.3);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), M.plasticGri), RG).position.set(0.17, 0.42, 0.3);
    tub([[-1.0, 0.33, -0.42], [-1.2, 0.5, -0.6], [-1.45, 0.75, -0.8]], 0.022, M.cauciuc);                                              // gâtul de umplere
    const can = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 24), new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.6 }))); can.rotation.z = Math.PI / 2; can.position.set(-1.25, 0.3, 0.5);   // canistra cu cărbune activ
    const mCond = new THREE.MeshStandardMaterial({ color: 0xa8aeb5, roughness: 0.35, metalness: 0.8 });
    const rampa = mot ? inMasina(V(-0.19, 0.29, 0.165)) : V(1.62, 0.7, -0.17), purj = mot ? inMasina(V(0.18, 0.43, 0.36)) : V(1.43, 0.8, 0.2);
    tub([[-0.62, 0.42, 0.3], [-0.5, 0.3, 0.28], [-0.35, 0.16, 0.24], [0.6, 0.15, 0.24], [1.15, 0.17, 0.24], [1.32, 0.48, 0.18], [1.48, 0.62, 0.0], [rampa.x - 0.03, rampa.y, rampa.z - 0.05], [rampa.x, rampa.y, rampa.z]], 0.005, mCond, 160);   // tur combustibil (fără retur)
    tub([[-1.13, 0.3, 0.5], [-0.9, 0.18, 0.4], [-0.35, 0.16, 0.27], [0.6, 0.15, 0.27], [1.15, 0.17, 0.27], [1.3, 0.5, 0.25], [purj.x, purj.y + 0.02, purj.z]], 0.004, M.cauciuc, 160);   // purjarea canistrei spre supapa EVAP
    tub([[-1.37, 0.3, 0.5], [-1.5, 0.3, 0.55], [-1.6, 0.35, 0.6]], 0.004, M.cauciuc);                                                  // aerisirea canistrei (filtrul de aer)
  }
  // 5. linia de evacuare: țeava flexibilă, toba intermediară, toba finală transversală, ornamentul
  if (mot && mot.ancore.evacIesire) {
    const E = inMasina(mot.ancore.evacIesire), mE = new THREE.MeshStandardMaterial({ color: 0x9ca2a8, roughness: 0.45, metalness: 0.85 }), mR = M.ruginaCald || mE;
    tub([[E.x, E.y, E.z], [E.x - 0.04, E.y - 0.01, E.z + 0.12], [1.72, 0.115, -0.32], [1.5, 0.115, -0.1], [1.15, 0.13, -0.05], [0.4, 0.14, -0.05]], 0.024, mE, 120);
    burduf(V(1.62, 0.115, -0.22), V(1.52, 0.115, -0.12), 0.03, 0.03, 10);                                                               // decuplorul flexibil
    { const t = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.5, 32), mE)); t.rotation.z = Math.PI / 2; t.scale.set(1, 1, 0.65); t.position.set(0.15, 0.14, -0.05); }   // toba intermediară
    tub([[-0.1, 0.14, -0.05], [-0.4, 0.14, -0.05], [-1.1, 0.14, -0.05], [-1.4, 0.15, -0.1], [-1.65, 0.2, -0.2], [-1.8, 0.22, -0.25]], 0.022, mE, 120);
    { const t = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.62, 32), mE)); t.rotation.x = Math.PI / 2; t.scale.set(1.25, 1, 0.7); t.position.set(-1.92, 0.24, -0.15); }   // toba finală (transversală)
    tub([[-1.92, 0.22, -0.46], [-2.05, 0.2, -0.5], [-2.3, 0.2, -0.5]], 0.025, mE); bara(V(-2.3, 0.2, -0.5), V(-2.38, 0.2, -0.5), 0.034, M.crom, 24);   // țeava finală cu ornament
    [[0.45, -0.05], [-0.9, -0.05], [-1.92, 0.12]].forEach(([x, z]) => bara(V(x, 0.15, z), V(x, 0.26, z), 0.008, M.cauciuc));            // suporturile elastice
  }
  return G;
}

/* ------------------------------------------------------------------ motorul real în compartimentul motor */
const CONTUR = { motor: [1.82, 0.62], cutie: [1.62, 0.5], radiator: [2.25, 0.55] };
function ascundeContur(ctx, ce) { ctx.children.forEach(l => { const p = l.position; if (ce.some(k => Math.abs(p.x - CONTUR[k][0]) < 0.01 && Math.abs(p.y - CONTUR[k][1]) < 0.01)) l.visible = false; }); }
/** motorul K7J complet (transmisia accesoriilor, evacuarea cu GPF, sistemul de răcire), montat transversal în autoturism */
function motorAutoturism(caroserie, opacitate) {
  const mot = construiesteMotor({ stand: false, filtruAer: false });
  mot.grup.rotation.y = -Math.PI / 2; mot.grup.position.set(1.78, 0.42, 0.02); mot.grup.scale.setScalar(0.98);
  if (opacitate) estompeaza(mot.grup, opacitate);
  caroserie.add(mot.grup); return mot;
}
function estompeaza(grup, opacitate) { const map = new Map(); grup.traverse(o => { if (!o.isMesh) return; const f = m => { if (!map.has(m)) { const c = m.clone(); c.transparent = true; c.opacity = Math.min(c.opacity ?? 1, opacitate); c.depthWrite = false; map.set(m, c); } return map.get(m); }; o.material = Array.isArray(o.material) ? o.material.map(f) : f(o.material); o.castShadow = false; }); }

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
  ascundeContur(ctxMotor, ["motor", "radiator"]);
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
  // transmisia accesoriilor (aceeași construcție ca la motorul de pe stand): fulia arborelui cotit, rola întinzătoare, alternatorul, pompa de apă, cureaua Poly-V
  const acc = transmisieAccesorii(); acc.grup.rotation.y = -Math.PI / 2; acc.grup.position.set(X0, YC, 0.42 - acc.XP); M.add(acc.grup);
  // sistemul de răcire (aceeași construcție ca la celelalte lucrări): radiator, electroventilator, vas de expansiune, furtunuri
  const rac = new THREE.Group(); rac.rotation.y = -Math.PI / 2; rac.position.set(X0, YC, 0); M.add(rac);
  { const g = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.09), new THREE.MeshStandardMaterial({ color: 0xb7bcc2, metalness: 0.85, roughness: 0.4 })); g.position.set(-0.37, 0.45, 0.05); rac.add(g); }   // carcasa termostatului
  const sr = sistemRacire(MAT(), { xc: 0.0, yR: 0.08, zR: -0.47, T: [-0.42, 0.45, 0.05], P: [0.36, 0.2, -0.15], retur: [-0.25, 0.2, 0.185], vas: [-0.5, 0.52, -0.27], suportVas: true, incalzire: [-0.3, 0.42, 0.62] });
  rac.add(sr.grup);
  et.push({ obj: sr.rot.vent, text: "Radiatorul și electroventilatorul" });
  et.push({ obj: acc.rot.altern, text: "Alternatorul" }, { obj: acc.rot.pompa, text: "Pompa de apă (antrenată de curea)" });

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
    st.unghi += st.n / 60 * 2 * Math.PI * dt / 40; acc.roteste(st.n / 60 * 2 * Math.PI * dt / 40); if (st.motor && st.T > 95) sr.rot.vent.rotation.z -= dt * 22;
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

/* ================================================================== senzorii motorului și ai autovehiculului în mers (DA – L2) */
function construiesteSenzori({ caroserie, sasiu, roti, optiuni, ctxMotor }) {
  ascundeContur(ctxMotor, ["motor", "cutie", "radiator"]);
  const mot = motorAutoturism(caroserie);
  const et = [], ancoraObj = {}, grupuri = {};
  const mS = new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.5 }), mI = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, metalness: 0.9, roughness: 0.3 });
  /* ---- sistemele autovehiculului și senzorii lor (autoturism 2025, motor pe benzină cu injecție, ESC, ADAS) */
  const SISTEME = {
    motor: "Gestiunea motorului (admisie, injecție, aprindere)",
    evac: "Evacuare și controlul emisiilor",
    racire: "Răcire, ungere și climatizare",
    frana: "Frânare, ABS / ESC și direcție",
    susp: "Suspensie și pneuri (TPMS)",
    adas: "Sisteme de asistență ADAS",
    car: "Caroserie, siguranță pasivă și alimentare"
  };
  // tip: ind = inductiv, hall = Hall activ (curent 7/14 mA pe 115 Ω), dig = ieșire în frecvență, dc = analogic 0…5 V, sw = contact 12 V,
  //      can = magistrală CAN, lin = magistrală LIN, eth = Ethernet auto, rf = radio (TPMS), us = ultrasunete, psi5 = interfață airbag
  const D = [
    { k: "ckp", s: "motor", n: "Senzorul de turație CKP (inductiv, roata 60−2)", e: "CKP turație" },
    { k: "cmp", s: "motor", n: "Senzorul de fază CMP (Hall)", e: "CMP fază" },
    { k: "maf", s: "motor", n: "Debitmetrul de aer cu film cald HFM (ieșire în frecvență)", e: "MAF debitmetru", mot: [-0.47, 0.44, 0.28], forma: ["cyl", 0.05, 0.05, 0x2b2f35], tip: "dig", f: st => 1800 + st.maf * 160, info: st => `f = ${fx(1800 + st.maf * 160, 0)} Hz → ṁ = ${fx(st.maf, 1)} g/s` },
    { k: "map", s: "motor", n: "Senzorul de presiune absolută MAP", e: "MAP" },
    { k: "iat", s: "motor", n: "Senzorul de temperatură a aerului IAT (NTC)", e: "IAT" },
    { k: "tps", s: "motor", n: "Clapeta electronică – senzorul de poziție TPS (2 piste)", e: "TPS" },
    { k: "app", s: "motor", n: "Pedala de accelerație APP (2 piste)", e: "APP pedală" },
    { k: "knock", s: "motor", n: "Senzorul de detonație (piezoelectric)", e: "detonație" },
    { k: "inj1", s: "motor", n: "Injectorul cilindrului 1 (comanda ECU)", e: "injector 1" },
    { k: "l1", s: "evac", n: "Sonda λ amonte (bandă largă LSU)", e: "λ amonte" },
    { k: "l2", s: "evac", n: "Sonda λ aval (cu salt, după catalizator)", e: "λ aval" },
    { k: "egt", s: "evac", n: "Senzorul de temperatură a gazelor de evacuare (PT200)", e: "temp. gaze evac.", mot: [0.0, -0.05, -0.336], forma: ["cyl", 0.008, 0.05, 0xd0d4d8], tip: "dc", u: st => 0.6 + st.tEvac / 400, info: st => `T = ${fx(st.tEvac, 0)} °C` },
    { k: "gpf", s: "evac", n: "Senzorul de presiune diferențială al filtrului de particule GPF", e: "Δp filtru GPF", tip: "dc", u: st => 0.5 + st.dpGpf / 10, info: st => `Δp = ${fx(st.dpGpf, 1)} kPa (încărcarea filtrului)` },
    { k: "evap", s: "evac", n: "Senzorul de presiune din rezervor (sistemul EVAP)", e: "presiune rezervor", car: [-0.62, 0.43, 0.3], forma: ["box", 0.04, 0.03, 0.04, 0x2b2f35], tip: "dc", u: st => 2.5 + 0.05 * Math.sin(st.t * 0.2), info: () => "p = −0,2 kPa (rel.)" },
    { k: "ect", s: "racire", n: "Senzorul de temperatură a lichidului de răcire CTS (NTC)", e: "CTS" },
    { k: "nivRacire", s: "racire", n: "Senzorul de nivel al lichidului de răcire (vas de expansiune)", e: "nivel lichid răcire", car: [2.03, 0.64, -0.44], forma: ["box", 0.1, 0.12, 0.08, 0x9be36b], tip: "sw", u: () => 0, info: () => "nivel corect (contact deschis)" },
    { k: "uleiP", s: "racire", n: "Senzorul de presiune a uleiului", e: "presiune ulei", mot: [0.12, 0.0, 0.16], forma: ["cyl", 0.013, 0.04, 0x2b2f35], tip: "dc", u: st => 0.5 + st.pUlei, info: st => `p = ${fx(st.pUlei, 1)} bar` },
    { k: "uleiN", s: "racire", n: "Senzorul de nivel și temperatură a uleiului (ultrasonic)", e: "nivel ulei", mot: [0.05, -0.27, 0.0], forma: ["cyl", 0.025, 0.02, 0x2b2f35], tip: "pwm", f: () => 25, info: st => `T ulei ${fx(st.ect - 4, 0)} °C · nivel 74 %` },
    { k: "ac", s: "racire", n: "Senzorul de presiune din circuitul de climatizare (A/C)", e: "presiune A/C", tip: "dc", u: st => 0.5 + (st.motor ? 1.7 : 0.6), info: st => `p = ${st.motor ? "14" : "6"} bar` },
    { k: "tExt", s: "racire", n: "Senzorul de temperatură exterioară (în bara față)", e: "temp. exterioară", car: [2.3, 0.3, 0.55], forma: ["cyl", 0.01, 0.03, 0x111111], tip: "dc", u: () => 2.6, info: () => "T = 18 °C" },
    { k: "tHab", s: "racire", n: "Senzorul de temperatură din habitaclu (climatronic)", e: "temp. habitaclu", car: [0.82, 0.96, 0.05], forma: ["box", 0.03, 0.02, 0.04, 0x333333], tip: "dc", u: () => 2.4, info: () => "T = 22 °C" },
    { k: "vssFD", s: "frana", n: "Senzorul de turație al roții față dreapta (Hall activ)", e: "ABS față dr." },
    { k: "vssFS", s: "frana", n: "Senzorul de turație al roții față stânga (Hall activ)", e: "ABS față st." },
    { k: "vssSD", s: "frana", n: "Senzorul de turație al roții spate dreapta (Hall activ)", e: "ABS spate dr." },
    { k: "vssSS", s: "frana", n: "Senzorul de turație al roții spate stânga (Hall activ)", e: "ABS spate st." },
    { k: "stop", s: "frana", n: "Contactul pedalei de frână (lămpile stop)", e: "contact stopuri" },
    { k: "pFrana", s: "frana", n: "Senzorul de presiune a frânei din modulatorul ESC", e: "presiune frână ESC", car: [1.62, 0.66, 0.5], forma: ["box", 0.11, 0.09, 0.11, 0xb9c0c8], tip: "dc", u: st => 0.5 + st.brk * 4, info: st => `p = ${fx(st.brk * 120, 0)} bar` },
    { k: "nivFrana", s: "frana", n: "Senzorul de nivel al lichidului de frână (rezervorul pompei centrale)", e: "nivel lichid frână", car: [1.57, 0.88, -0.38], forma: ["box", 0.12, 0.06, 0.08, 0xf1ead2], tip: "sw", u: () => 0, info: () => "nivel corect" },
    { k: "uzura", s: "frana", n: "Senzorul de uzură a plăcuțelor (roata față stânga)", e: "uzură plăcuțe", roata: 1, local: [-0.12, 0.08, -0.04], forma: ["box", 0.012, 0.02, 0.012, 0x3366cc], tip: "sw", u: () => 0, info: () => "plăcuțe în regulă (circuit închis)" },
    { k: "volan", s: "frana", n: "Senzorul unghiului de virare (pe coloana volanului, CAN)", e: "unghi volan", car: [0.74, 0.9, -0.4], forma: ["cyl", 0.045, 0.03, 0x2b2f35], tip: "can", info: () => "unghi = 0,0° · viteză de virare 0 °/s" },
    { k: "esc", s: "frana", n: "Senzorul de girație și accelerații ESC (în consola centrală)", e: "girație / accelerații", car: [0.1, 0.32, 0.0], forma: ["box", 0.07, 0.03, 0.06, 0x2b2f35], tip: "can", info: st => `ψ̇ = 0,0 °/s · a_x = ${fx(-st.a, 2)} m/s² · a_y = 0,00` },
    { k: "tpmsFS", s: "susp", n: "Senzorul de presiune în pneu TPMS – față stânga (în ventil)", e: "TPMS față st.", roata: 1, rotire: true, local: [0, 0.2, 0.05], forma: ["box", 0.02, 0.025, 0.012, 0x7a7f86], tip: "rf", info: () => "p = 2,4 bar · T = 21 °C (433 MHz)" },
    { k: "tpmsFD", s: "susp", n: "Senzorul de presiune în pneu TPMS – față dreapta", e: "TPMS față dr.", roata: 0, rotire: true, local: [0, 0.2, 0.05], forma: ["box", 0.02, 0.025, 0.012, 0x7a7f86], tip: "rf", info: () => "p = 2,4 bar · T = 21 °C" },
    { k: "tpmsSS", s: "susp", n: "Senzorul de presiune în pneu TPMS – spate stânga", e: "TPMS spate st.", roata: 3, rotire: true, local: [0, 0.2, 0.05], forma: ["box", 0.02, 0.025, 0.012, 0x7a7f86], tip: "rf", info: () => "p = 2,2 bar · T = 21 °C" },
    { k: "tpmsSD", s: "susp", n: "Senzorul de presiune în pneu TPMS – spate dreapta", e: "TPMS spate dr.", roata: 2, rotire: true, local: [0, 0.2, 0.05], forma: ["box", 0.02, 0.025, 0.012, 0x7a7f86], tip: "rf", info: () => "p = 2,2 bar · T = 21 °C" },
    { k: "nivel", s: "susp", n: "Senzorul de nivel al caroseriei (corectorul farurilor, puntea spate)", e: "nivel caroserie", car: [-1.3, 0.3, 0.5], forma: ["box", 0.05, 0.04, 0.03, 0x2b2f35], tip: "dc", u: st => 2.5 + (st.tangaj || 0) * 40, info: st => `înclinare ${fx((st.tangaj || 0) * 57.3, 2)}°` },
    { k: "radar", s: "adas", n: "Radarul frontal 77 GHz (ACC, frânare automată AEB)", e: "radar 77 GHz", car: [2.4, 0.48, 0], forma: ["box", 0.03, 0.09, 0.12, 0x222222], tip: "can", info: st => `vehicul în față la ${fx(32 + 8 * Math.sin(st.t * 0.15), 1)} m · v_rel = ${fx(-3.6 * 1.2 * Math.cos(st.t * 0.15), 1)} km/h` },
    { k: "camF", s: "adas", n: "Camera frontală (parbriz: menținerea benzii, indicatoare)", e: "cameră frontală", car: [0.6, 1.3, 0], forma: ["box", 0.06, 0.05, 0.1, 0x222222], tip: "eth", info: () => "Ethernet 100BASE-T1 · 30 cadre/s" },
    { k: "pdcF1", s: "adas", n: "Senzorul de parcare față (ultrasunete 48 kHz)", e: "parcare față", car: [2.38, 0.42, 0.25], forma: ["cyl", 0.012, 0.012, 0x777777], tip: "us", dist: 1.2, info: () => "distanța măsurată 1,20 m" },
    { k: "pdcS1", s: "adas", n: "Senzorul de parcare spate (ultrasunete 48 kHz)", e: "parcare spate", car: [-2.38, 0.5, -0.25], forma: ["cyl", 0.012, 0.012, 0x777777], tip: "us", dist: 0.6, info: () => "distanța măsurată 0,60 m" },
    { k: "camS", s: "adas", n: "Camera de mers înapoi", e: "cameră spate", car: [-2.32, 0.86, 0], forma: ["box", 0.03, 0.03, 0.04, 0x222222], tip: "eth", info: () => "LVDS / Ethernet · imagine activă în marșarier" },
    { k: "ploaie", s: "car", n: "Senzorul de ploaie și lumină (pe parbriz, LIN)", e: "ploaie / lumină", car: [0.62, 1.31, 0.09], forma: ["box", 0.04, 0.015, 0.05, 0x333333], tip: "lin", info: () => "fără ploaie · lumină 12 000 lx" },
    { k: "ibs", s: "car", n: "Senzorul inteligent al bateriei IBS (borna negativă, LIN)", e: "senzor baterie IBS", car: [1.86, 0.875, -0.58], forma: ["box", 0.2, 0.17, 0.15, 0x24272b], tip: "lin", info: st => `U = ${st.motor ? "14,1" : "12,5"} V · I = ${st.motor ? "+12" : "−3"} A · SOC 82 %` },
    { k: "comb", s: "car", n: "Traductorul de nivel al combustibilului (în rezervor)", e: "nivel combustibil", car: [-0.72, 0.27, 0.3], forma: ["box", 0.5, 0.18, 0.6, 0x3a3d42], tip: "dc", u: () => 1.7, info: () => "nivel 58 % (≈ 29 L)" },
    { k: "ocupare", s: "car", n: "Senzorul de ocupare a scaunului pasagerului (airbag)", e: "ocupare scaun", car: [0.15, 0.53, 0.4], forma: ["box", 0.35, 0.01, 0.35, 0x444444], tip: "dc", u: () => 1.1, info: () => "scaun liber – airbag pasager dezactivat" },
    { k: "crashF", s: "car", n: "Senzorul de impact frontal (airbag, PSI5)", e: "impact frontal", car: [2.22, 0.55, 0.0], forma: ["box", 0.04, 0.03, 0.03, 0x333333], tip: "psi5", info: st => `a = ${fx(-st.a / 9.81, 2)} g` },
    { k: "crashL", s: "car", n: "Senzorul de impact lateral (stâlpul B, PSI5)", e: "impact lateral", car: [-0.1, 0.65, -0.9], forma: ["box", 0.03, 0.04, 0.02, 0x333333], tip: "psi5", info: () => "a = 0,00 g" }
  ];
  const DK = {}; D.forEach(d => DK[d.k] = d);
  const fx = (v, n = 1) => Number(v).toFixed(n).replace(".", ",");
  // obiectele senzorilor (corpul vizibil + ancora etichetei)
  const corp = d => { const [tip, a, b, c, col] = d.forma; const m = new THREE.MeshStandardMaterial({ color: tip === "cyl" ? c : col, roughness: 0.5, metalness: 0.2 });
    return tip === "cyl" ? new THREE.Mesh(new THREE.CylinderGeometry(a, a, b, 16), m) : new THREE.Mesh(new THREE.BoxGeometry(a, b, c), m); };
  D.forEach(d => {
    let gg = null, anc = null;
    if (mot.comp[d.k]) { gg = mot.comp[d.k]; anc = new THREE.Object3D(); anc.position.copy(mot.ancore[d.k]); mot.grup.add(anc); }
    else if (d.mot || d.car || d.roata != null) {
      gg = new THREE.Group(); gg.userData.c = d.k;
      const parinte = d.mot ? mot.grup : d.car ? caroserie : (d.rotire ? roti[d.roata].rot : roti[d.roata].grup);
      if (d.local) gg.position.set(d.local[0], d.local[1], d.local[2] * roti[d.roata].sg); else gg.position.set(...(d.mot || d.car)); parinte.add(gg);
      const m = corp(d); m.castShadow = true; gg.add(m);
      anc = new THREE.Object3D(); anc.position.y = 0.04; gg.add(anc);
    }
    if (gg) grupuri[d.k] = gg;
    if (anc) { ancoraObj[d.k] = anc; et.push({ obj: anc, text: d.e, k: d.k }); }
  });
  // senzorii de turație a roților (ABS): roata de impulsuri cu 48 de dinți pe butuc + senzorul fix pe fuzetă
  roti.forEach((r, i) => {
    const inel = new THREE.Group(); inel.position.z = -r.sg * 0.115; r.rot.add(inel);
    for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; const d = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.012), mI); d.position.set(Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0); d.rotation.z = a; inel.add(d); }
    const k = ["vssFD", "vssFS", "vssSD", "vssSS"][i];
    const gg = new THREE.Group(); gg.userData.c = k; gg.position.set(0, 0.105, -r.sg * 0.115); r.grup.add(gg); grupuri[k] = gg;
    gg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 12), mS.clone()));
    const o = new THREE.Object3D(); o.position.y = 0.03; gg.add(o); ancoraObj[k] = o; et.push({ obj: o, text: DK[k].e, k });
  });
  // pedalele: senzorul pedalei de accelerație (APP) și contactul stopurilor
  const ped = new THREE.Group(); ped.position.set(1.08, 0.5, -0.24); caroserie.add(ped);
  const brat = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.015), mS); brat.position.y = -0.12; ped.add(brat);
  const talpa = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.09, 0.06), mS); talpa.position.set(-0.04, -0.28, 0); talpa.rotation.z = 0.5; ped.add(talpa);
  { const gg = new THREE.Group(); gg.userData.c = "app"; gg.position.set(0.02, 0.02, 0); ped.add(gg); gg.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x2b2f35 }))); grupuri.app = gg;
    const o = new THREE.Object3D(); o.position.y = 0.03; gg.add(o); ancoraObj.app = o; et.push({ obj: o, text: DK.app.e, k: "app" }); }
  { const gg = new THREE.Group(); gg.userData.c = "stop"; gg.position.set(1.1, 0.86, -0.38); caroserie.add(gg); gg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0xd8d8d8 }))); grupuri.stop = gg;
    const o = new THREE.Object3D(); o.position.y = 0.03; gg.add(o); ancoraObj.stop = o; et.push({ obj: o, text: DK.stop.e, k: "stop" }); }
  const LISTA = {}; D.forEach(d => LISTA[d.k] = d.n);
  const CUL = ["#ffe14d", "#4fd6ff", "#ff6bd6", "#6dff8e"];
  const fmtT = T => T >= 1 ? `${fx(T, T < 10 ? 1 : 0)} s` : T >= 1e-3 ? `${fx(T * 1000, T < 0.01 ? 1 : 0)} ms` : T >= 1e-6 ? `${fx(T * 1e6, 0)} µs` : `${fx(T * 1e9, 0)} ns`;
  const canaleActive = st => st.ch.map((c, i) => ({ on: c.on, i, k: i === 0 ? st.sel : c.k })).filter(c => c.i === 0 || c.on);
  const durata = st => st.tdiv === "auto" ? fereastra(st.sel, st)[0] : +st.tdiv * 10;
  // doar etichetele sistemului ales
  et.forEach(e => { const d = DK[e.k]; e.filtru = () => (S0 || stare).sist === d.s; });
  // sfere invizibile de „prindere”, ca senzorii mici să poată fi selectați ușor cu mouse-ul
  const mPrins = new THREE.MeshBasicMaterial({ visible: false }), prinderi = [];
  Object.entries(ancoraObj).forEach(([k, o]) => { const sf = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mPrins); sf.userData.c = k; sf.position.y = -0.03; o.add(sf); prinderi.push(sf); });
  // componentele motorului care sunt doar senzori se ascund când e ales alt sistem (injectorul și clapeta rămân, fac parte din motor)
  const ASCUNDE = ["ckp", "cmp", "map", "iat", "knock", "ect", "l1", "l2"];
  let elSel = null, elSist = null, elFisa = null, fisaK = null;
  function fisa(k) {   // fișa din catalogul senzorilor (comun/catalog-senzori.js, dacă pagina îl încarcă)
    const C = globalThis.CATALOG_SENZORI; if (!elFisa || !C || fisaK === k) return; fisaK = k; const x = C.dupaK[k];
    elFisa.hidden = !x; if (!x) return; const T = C.TIPURI[x.tip];
    elFisa.innerHTML = `<b>Fișa senzorului</b><span><i>Principiu:</i> ${x.princ}</span><span><i>Semnal:</i> <span style="color:var(--accent)">${C.svgTip(x.tip, 56)}</span> ${T.n} – ${x.val}</span><span><i>Verificare:</i> ${x.verif}</span>`;
  }
  function aplicaSistem(st) {
    D.forEach(d => {
      const vis = d.s === st.sist;
      if (mot.comp[d.k]) { if (ASCUNDE.includes(d.k)) mot.comp[d.k].visible = vis; }
      else if (grupuri[d.k]) grupuri[d.k].visible = vis;
    });
  }
  // evidențierea senzorului selectat (pulsație)
  const mats = {};
  Object.entries(grupuri).forEach(([k, g]) => { if (mot.comp[k]) return; mats[k] = []; g.traverse(o => { if (o.isMesh && o.material && o.material.emissive) mats[k].push(o.material); }); });
  function evidentiaza(st) {
    const p = 0.5 + 0.5 * Math.sin(st.t * 6);
    Object.entries(mats).forEach(([k, l]) => l.forEach(m => m.emissive.setRGB(k === st.sel ? 0.1 + 0.5 * p : 0, k === st.sel ? 0.45 + 0.4 * p : 0, k === st.sel ? 0.9 * p + 0.1 : 0)));
  }
  const optiuniSist = s0 => D.filter(d => d.s === s0).map(d => `<option value="${d.k}">${d.n}</option>`).join("");
  const html = `
    <div class="v3d-grup">
      <button type="button" data-s-act="motor">Pornește motorul</button>
      <button type="button" class="primar v3d-acc" title="Țineți apăsat (sau ↑ / W)">Accelerează</button>
      <button type="button" class="v3d-fr" title="Țineți apăsat (sau ↓ / S)">Frânează</button>
      <label>Pedala de accelerație max. <input type="range" data-s="pmax" min="10" max="100" step="5" value="60"> <output>60 %</output></label>
    </div>
    <div class="v3d-grup v3d-senzori">
      <label>Sistemul <select data-s="sist">${Object.entries(SISTEME).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></label>
      <label>Senzorul afișat <select data-s="sel">${optiuniSist("motor")}</select></label>
      <button type="button" data-s-act="vezi">Arată senzorul</button>
      <span class="v3d-et">sau clic stânga pe senzor, în machetă</span>
    </div>
    <div class="v3d-grup v3d-fisa" data-s-fisa hidden></div>
    <div class="v3d-grup v3d-osc-cmd">
      <b>Osciloscop</b>
      <label>Timp/div <select data-s="tdiv"><option value="auto">automat (după CH1)</option>${[2e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 0.1, 0.2, 0.6, 1].map(v => `<option value="${v}">${fmtT(v)}</option>`).join("")}</select></label>
      <span class="osc-canal" style="--cc:${CUL[0]}"><b>CH1</b> senzorul afișat (declanșare)</span>
      ${[1, 2, 3].map(i => `<span class="osc-canal" style="--cc:${CUL[i]}"><label><input type="checkbox" data-v-ch-on="${i}"> <b>CH${i + 1}</b></label>
        <select data-v-ch-k="${i}" aria-label="Senzorul pe canalul ${i + 1}">${Object.entries(SISTEME).map(([sk, sn]) => `<optgroup label="${sn}">${D.filter(d => d.s === sk).map(d => `<option value="${d.k}">${d.e}</option>`).join("")}</optgroup>`).join("")}</select></span>`).join("")}
    </div>`;
  const stare = { motor: false, rpm: 0, v: 0, a: 0, thr: 0, brk: 0, gear: 1, sel: "ckp", sist: "motor", tdiv: "auto", ch: [{ on: true }, { k: "map", on: false }, { k: "l1", on: false }, { k: "vssFS", on: false }], maf: 0, pUlei: 0, tEvac: 20, dpGpf: 0, tangajV: 0, pmax: 0.6, ect: 88, tEv: 300, t: 0, phi: 0, ltft: 4, stft: 0, accApasat: false, frApasat: false, buf: [] };
  let API = null, S0 = null;
  const ig = [0, 3.73, 2.05, 1.32, 0.97, 0.76], i0 = 4.21, R = 0.3, MASA = 1150;
  function leaga(cmd, st) {
    S0 = st;
    const tine = (sel, cheie) => { const b = cmd.querySelector(sel); const on = e => { e.preventDefault(); st[cheie] = true; b.classList.add("activ"); }, off = () => { st[cheie] = false; b.classList.remove("activ"); };
      b.addEventListener("pointerdown", on); ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, off)); };
    tine(".v3d-acc", "accApasat"); tine(".v3d-fr", "frApasat");
    const bm = cmd.querySelector('[data-s-act="motor"]');
    bm.addEventListener("click", () => { st.motor = !st.motor; bm.textContent = st.motor ? "Oprește motorul" : "Pornește motorul"; if (!st.motor) st.v = st.v; });
    const pm = cmd.querySelector('[data-s="pmax"]'); pm.addEventListener("input", () => { st.pmax = pm.value / 100; pm.nextElementSibling.textContent = pm.value + " %"; });
    const sel = cmd.querySelector('[data-s="sel"]'); sel.addEventListener("change", () => { st.sel = sel.value; st.buf = []; });
    const ss = cmd.querySelector('[data-s="sist"]');
    ss.addEventListener("change", () => { st.sist = ss.value; sel.innerHTML = optiuniSist(st.sist); st.sel = sel.value; st.buf = []; aplicaSistem(st); });
    elSel = sel; elSist = ss; elFisa = cmd.querySelector("[data-s-fisa]"); aplicaSistem(st);
    if (optiuni.selInitial && DK[optiuni.selInitial]) { st.sel = optiuni.selInitial; st.sist = DK[st.sel].s; ss.value = st.sist; sel.innerHTML = optiuni.sistSel || optiuniSist(st.sist); sel.value = st.sel; aplicaSistem(st); }
    (optiuni.canale || []).forEach((k, j) => { if (DK[k] && st.ch[j + 1]) { st.ch[j + 1].k = k; st.ch[j + 1].on = true; } });
    cmd.querySelector('[data-s-act="vezi"]').addEventListener("click", () => arata(st.sel));
    const td = cmd.querySelector('[data-s="tdiv"]'); td.addEventListener("change", () => { st.tdiv = td.value; st.buf = []; });
    [1, 2, 3].forEach(i => {
      const on = cmd.querySelector(`[data-v-ch-on="${i}"]`), sk = cmd.querySelector(`[data-v-ch-k="${i}"]`), el = on.closest(".osc-canal");
      const stil = () => el.classList.toggle("oprit", !st.ch[i].on);
      sk.value = st.ch[i].k; on.checked = st.ch[i].on; stil();
      on.addEventListener("change", () => { st.ch[i].on = on.checked; st.buf[i] = []; stil(); });
      sk.addEventListener("change", () => { st.ch[i].k = sk.value; st.buf[i] = []; if (!st.ch[i].on) { st.ch[i].on = on.checked = true; stil(); } });
    });
    window.addEventListener("keydown", e => { if (!API || !API.scena.getClientRects().length || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (["ArrowUp", "KeyW"].includes(e.code)) { st.accApasat = true; e.preventDefault(); } if (["ArrowDown", "KeyS", "Space"].includes(e.code)) { st.frApasat = true; e.preventDefault(); } });
    window.addEventListener("keyup", e => { if (["ArrowUp", "KeyW"].includes(e.code)) st.accApasat = false; if (["ArrowDown", "KeyS", "Space"].includes(e.code)) st.frApasat = false; });
  }
  const v3 = new THREE.Vector3();
  function arata(k) {
    const o = ancoraObj[k]; if (!o || !API) return;
    o.getWorldPosition(v3);
    const dx = v3.x > 2 ? 1.0 : v3.x < -1.8 ? -1.0 : 0.6, dz = v3.z > 0.5 ? 1.2 : v3.z < -0.5 ? -1.2 : 0.9;
    const mare = k.startsWith("vss") || k.startsWith("tpms") || k === "uzura";
    const dir = new THREE.Vector3(dx, 0.55, dz).normalize().multiplyScalar(mare ? 1.4 : 1.15);
    API.zboara([v3.x + dir.x, v3.y + dir.y, v3.z + dir.z], [v3.x, v3.y, v3.z]);
  }
  // semnalele (modele simplificate ale senzorilor reali)
  function lambda(st, t) {
    if (!st.motor || st.rpm < 100) return 0.45;
    if (st.fuelCut) return 0.06;
    if (st.thr > 0.85) return 0.86;
    const f = st.rpm < 1000 ? 0.6 : 1.1; return 0.47 + 0.38 * Math.tanh(5 * Math.sin(st.phi + 2 * Math.PI * f * (t - st.t)));
  }
  function semnal(k, st, t) {
    const rpm = st.rpm;
    switch (k) {
      case "ckp": { if (rpm < 50) return 0; const A = 3.5 * rpm / 1000, kk = ((rpm * t) % 60 + 60) % 60; return kk >= 58 ? A * 0.15 * Math.sin(Math.PI * (kk - 58)) : A * (kk < 1 || kk > 57 ? 1.6 : 1) * Math.sin(2 * Math.PI * kk); }
      case "cmp": return rpm < 50 ? 4.8 : (((rpm / 120) * t) % 1 < 0.5 ? 0.25 : 4.85);
      case "map": return (st.map - 10) / 21.5;
      case "tps": return 0.52 + 4.0 * st.thr;
      case "app": return 0.75 + 3.5 * st.ped;
      case "l1": return lambda(st, t);
      case "l2": return st.motor ? 0.66 + 0.02 * Math.sin(t * 0.6) : 0.45;
      case "ect": return 5 * 2500 * Math.exp(3450 * (1 / (st.ect + 273.15) - 1 / 298.15)) / (2500 * Math.exp(3450 * (1 / (st.ect + 273.15) - 1 / 298.15)) + 2200);
      case "iat": return 2.7;
      case "inj1": { const ub = 13.9; if (rpm < 50 || st.fuelCut) return ub; const T = 120 / rpm, ti = st.ti / 1000, ph = ((t % T) + T) % T; if (ph < ti) return 0.15; const d = ph - ti; return ub + 52 * Math.exp(-d / 0.00012); }
      case "knock": { if (rpm < 50) return 0; const T = 30 / rpm, ph = ((t % T) + T) % T; return Math.exp(-ph / 0.0012) * (0.1 + 1.4 * st.thr * rpm / 6000) * Math.sin(2 * Math.PI * 7000 * ph); }
      case "stop": return st.brk > 0.02 ? 12.6 : 0;
      case "esc": case "volan": case "radar": case "crashF": case "crashL": break;
      default: if (k.startsWith("vss")) { const f = 48 * st.v / (2 * Math.PI * R); const A = Math.min(4, 0.4 + st.v * 0.12); return st.v < 0.05 ? 0 : A * Math.sin(2 * Math.PI * f * t); }
    }
    return semnalTip(DK[k], st, t);
  }
  const bit = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) > 0.5; };
  function semnalTip(d, st, t) {
    if (!d || !d.tip) return 0;
    switch (d.tip) {
      case "dc": case "sw": return d.u ? d.u(st) : 0;
      case "dig": { const f = d.f(st); return (t * f) % 1 < 0.5 ? 4.8 : 0.2; }
      case "pwm": return (t * 25) % 1 < 0.42 ? 12 : 0.3;
      case "can": { const b = Math.floor(t * 500000), cadru = b % 130; return cadru > 110 || !bit(b) ? 2.5 : 3.5; }        // CAN-H; CAN-L = 5 − CAN-H
      case "lin": { const b = Math.floor(t * 19200), c = b % 70; if (c < 13) return 0.2; if (c > 60) return 12; return bit(b) ? 12 : 0.2; }
      case "eth": { const n = Math.floor(t * 66.6e6); const x = Math.sin(n * 7.31 + 1.7) * 9301.13; const r = x - Math.floor(x); return r < 0.33 ? -1 : r < 0.66 ? 0 : 1; }
      case "rf": return st.v > 0.5 && ((t % 3) + 3) % 3 < 0.06 ? 3 : 0;
      case "us": { const T = 0.012, ph = ((t % T) + T) % T, te = 2 * d.dist / 343; if (ph < 0.0003) return 4.5; const e = ph - te; return e > 0 && e < 0.0004 ? 1.4 * Math.sin(Math.PI * e / 0.0004) : 0.05; }
      case "psi5": { const T = 0.0005, ph = ((t % T) + T) % T, b = Math.floor(ph / 8e-6); if (b >= 12) return 10; const n = Math.floor(t / T) * 12 + b, h = (ph % 8e-6) < 4e-6; return (bit(n) ? h : !h) ? 36 : 10; }
    }
    return 0;
  }
  function fereastra(k, st) {           // durata afișată [s] și domeniul de tensiune
    if (k === "ckp") return [0.012, [-8, 8]]; if (k === "cmp") return [st.rpm > 50 ? 240 / st.rpm : 0.2, [-0.5, 5.5]];
    if (k === "inj1") return [st.rpm > 50 ? 240 / st.rpm : 0.1, [-5, 70]]; if (k === "knock") return [st.rpm > 50 ? 60 / st.rpm : 0.02, [-2, 2]];
    if (k.startsWith("vss")) return [0.04, [-4.5, 4.5]];
    const d = DK[k];
    if (d && d.tip) switch (d.tip) {
      case "dig": return [3 / d.f(st), [-0.5, 5.5]];
      case "pwm": return [0.12, [-1, 14]];
      case "can": return [0.0002, [0, 5]];
      case "lin": return [0.004, [-1, 14]];
      case "eth": return [1.5e-7, [-1.5, 1.5]];
      case "rf": return [6, [-0.5, 4]];
      case "us": return [0.012, [0, 5]];
      case "psi5": return [0.001, [0, 45]];
      case "sw": return [6, [-1, 14]];
    }
    return [6, k === "stop" ? [-1, 14] : [0, 5]];
  }
  function pas(dt, st) {
    st.t += dt;
    // pedalele
    const tPed = st.accApasat ? st.pmax : 0; st.ped = (st.ped || 0) + clamp(tPed - (st.ped || 0), -2 * dt, 1.5 * dt);
    st.brk = clamp(st.brk + ((st.frApasat ? 1 : 0) - st.brk) * (1 - Math.exp(-dt / 0.15)), 0, 1);
    st.thr = st.motor ? st.ped : 0;
    // transmisia și turația
    const nRoti = st.v / R * 60 / (2 * Math.PI);
    let rpm = nRoti * ig[st.gear] * i0;
    if (st.motor) {
      if (st.gear === 1 && rpm < 1100) rpm = Math.max(rpm, 800 + 2400 * st.thr);       // ambreiaj care patinează la pornirea de pe loc
      rpm = Math.max(rpm, 800);
      if (rpm > 3200 + 2000 * st.thr && st.gear < 5) st.gear++;
      if (rpm < 1300 && st.gear > 1 && st.v > 0.5) { const r2 = nRoti * ig[st.gear - 1] * i0; if (r2 < 4500) st.gear--; }
      if (st.v < 0.3) st.gear = 1;
    } else rpm = 0;
    st.rpm += (rpm - st.rpm) * (1 - Math.exp(-dt / 0.12));
    // forțele
    const Tm = st.motor ? (st.thr * (110 + 25 * Math.sin(Math.PI * clamp(st.rpm / 6000, 0, 1)))) - (st.thr < 0.02 && st.rpm > 1200 ? 18 : 0) : 0;
    const Fm = st.gear ? Tm * ig[st.gear] * i0 * 0.9 / R : 0;
    const Fr = st.v > 0.01 ? 0.012 * MASA * 9.81 + 0.37 * st.v * st.v : 0;
    const Fb = st.brk * 0.85 * MASA * 9.81 * (st.v > 0.01 ? 1 : 0);
    st.a = (Fm - Fr - Fb) / MASA;
    st.v = Math.max(0, st.v + st.a * dt); if (st.v === 0) st.a = 0;
    // mărimile motorului
    st.fuelCut = st.motor && st.thr < 0.02 && st.rpm > 1500 && st.v > 2;
    const mapT = !st.motor ? 101 : st.fuelCut ? 22 : 30 + 68 * Math.pow(st.thr, 0.7);
    st.map = (st.map || 101) + (mapT - (st.map || 101)) * (1 - Math.exp(-dt / 0.08));
    st.ti = st.fuelCut || !st.motor ? 0 : 2.4 * st.map / 34 * (st.thr > 0.85 ? 1.12 : 1);
    if (st.motor) st.phi = (st.phi + 2 * Math.PI * (st.rpm < 1000 ? 0.6 : 1.1) * dt) % (2 * Math.PI);
    st.maf = st.motor ? st.rpm / 120 * 1.39 * 1.2 * st.map / 101 * 0.85 : 0;
    st.pUlei += ((st.motor ? Math.min(4.6, 1.1 + st.rpm / 1500) : 0) - st.pUlei) * (1 - Math.exp(-dt / 0.3));
    st.tEvac += ((st.motor ? 380 + st.rpm * 0.09 + 150 * st.thr : 20) - st.tEvac) * (1 - Math.exp(-dt / 8));
    st.dpGpf = st.motor ? 0.2 + st.maf * 0.07 : 0;
    evidentiaza(st);
    // tampon pentru semnalele lente (6 s)
    const Tf = durata(st);
    if (Tf >= 1) canaleActive(st).forEach(c => { const b = st.buf[c.i] || (st.buf[c.i] = []); b.push([st.t, semnal(c.k, st, st.t)]); while (b.length && b[0][0] < st.t - Tf) b.shift(); });
    mot.actualizeaza({ rpm: st.rpm, tps: st.thr * 100, selectat: st.sel, timp: st.t, tEv: st.motor ? 300 + st.rpm * 0.08 : 60, decuplat: {}, vent: st.motor && st.v < 8 }, dt);
    ped.rotation.z = st.ped * 0.25;
  }
  // osciloscopul din colțul scenei
  let cv = null;
  function api(a) {
    API = a;
    cv = document.createElement("canvas"); cv.className = "v3d-osc"; a.scena.appendChild(cv);
    // selectarea senzorului prin clic în scenă
    const ray = new THREE.Raycaster(), m = new THREE.Vector2(); let jos = null;
    a.canvas.addEventListener("pointerdown", e => { jos = [e.clientX, e.clientY]; });
    a.canvas.addEventListener("pointerup", e => {
      if (!jos || Math.hypot(e.clientX - jos[0], e.clientY - jos[1]) > 5) return;
      const r = a.canvas.getBoundingClientRect(); m.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(m, a.camera);
      const sist = (S0 || stare).sist, ale = k => DK[k] && DK[k].s === sist;
      const tinte = prinderi.filter(o => ale(o.userData.c)).concat(Object.entries(grupuri).filter(([k]) => ale(k)).map(([, g]) => g));
      const hit = ray.intersectObjects(tinte, true)[0];
      if (hit) { let o = hit.object; while (o && !o.userData.c) o = o.parent; if (o && LISTA[o.userData.c] && S0) { S0.sel = o.userData.c; S0.buf = []; if (elSel) elSel.value = S0.sel; } }
    });
  }
  // osciloscopul cu 4 canale: bază de timp comună, fiecare canal activ pe banda lui, cu domeniul propriu de tensiune
  function infoK(k, st) {
    const f = fx;
    if (k === "ckp") return `f = ${f(st.rpm, 0)} Hz → n = ${f(st.rpm, 0)} rot/min`;
    if (k === "cmp") return `f = ${f(st.rpm / 120, 1)} Hz (1 impuls / 2 rotații)`;
    if (k.startsWith("vss")) return `f = ${f(48 * st.v / (2 * Math.PI * R), 0)} Hz → v = ${f(st.v * 3.6, 0)} km/h`;
    if (k === "inj1") return st.fuelCut ? "injecție întreruptă (decelerare)" : `t_i = ${f(st.ti, 2)} ms`;
    if (DK[k] && DK[k].info) return DK[k].info(st);
    return `U = ${f(semnal(k, st, st.t), 2)} V`;
  }
  function dupaRandare(st) {
    fisa(st.sel);
    if (!cv) return;
    const act = canaleActive(st), n = act.length;
    const W = 330, H = n > 1 ? 120 + 62 * n : 170, dpr = window.devicePixelRatio || 1, sc = (cv.clientWidth || W) / W;   // desenat în 330×H, scalat la mărimea afișată
    const hcss = Math.round(H * sc) + "px"; if (cv.style.height !== hcss) cv.style.height = hcss;
    if (cv.width !== Math.round(W * sc * dpr) || cv.height !== Math.round(H * sc * dpr)) { cv.width = Math.round(W * sc * dpr); cv.height = Math.round(H * sc * dpr); }
    const g = cv.getContext("2d"); g.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    g.fillStyle = "rgba(8,18,14,.92)"; g.fillRect(0, 0, W, H);
    const top = 22, jos = n > 1 ? 8 + 13 * n : 18, hz = H - top - jos;
    g.strokeStyle = "rgba(120,200,160,.18)"; g.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(10 + i * 31, top); g.lineTo(10 + i * 31, top + hz); g.stroke(); }
    for (let j = 0; j <= 4 * n; j++) { const y = top + j * hz / (4 * n); g.beginPath(); g.moveTo(10, y); g.lineTo(320, y); g.stroke(); }
    g.strokeStyle = "rgba(120,200,160,.5)"; for (let j = 1; j < n; j++) { const y = top + j * hz / n; g.beginPath(); g.moveTo(10, y); g.lineTo(320, y); g.stroke(); }
    const Tf = durata(st);
    let t0 = st.t - Tf;
    if (Tf < 1 && st.rpm > 50) { if (st.sel === "ckp") { const p = 1 / st.rpm; t0 = Math.floor(t0 / p) * p; } else if (st.sel === "inj1" || st.sel === "cmp") { const p = 120 / st.rpm; t0 = Math.floor(t0 / p) * p - p * 0.1; } }
    act.forEach((c, b) => {
      const [, [u0, u1]] = fereastra(c.k, st), y0 = top + b * hz / n, hb = hz / n, du = u1 - u0;
      const Y = u => y0 + 3 + (1 - (clamp(u, u0 - 0.05 * du, u1 + 0.05 * du) - u0) / du) * (hb - 6);
      const urma = (fn, col) => { g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); let prim = true;
        if (Tf >= 1) (st.buf[c.i] || []).forEach(([t, u]) => { const x = 10 + (t - (st.t - Tf)) / Tf * 310; if (x < 10) return; const y = Y(fn ? fn(u) : u); prim ? g.moveTo(x, y) : g.lineTo(x, y); prim = false; });
        else for (let i = 0; i <= 400; i++) { const t = t0 + Tf * i / 400, u = semnal(c.k, st, t), y = Y(fn ? fn(u) : u); i ? g.lineTo(10 + i / 400 * 310, y) : g.moveTo(10, y); }
        g.stroke(); };
      if (DK[c.k] && DK[c.k].tip === "can") urma(u => 5 - u, "rgba(95,208,255,.8)");          // CAN-L
      urma(null, CUL[c.i]);
      if (n > 1) { g.fillStyle = CUL[c.i]; g.font = "700 9.5px system-ui"; g.fillText(`CH${c.i + 1}`, 13, y0 + 11); }
    });
    g.font = "600 11px system-ui"; g.fillStyle = n > 1 ? "#9fe6c0" : CUL[0];
    g.fillText(n > 1 ? `Osciloscop – ${n} canale` : LISTA[st.sel], 10, 15);
    if (n > 1) { g.font = "10px system-ui"; act.forEach((c, b) => { g.fillStyle = CUL[c.i]; const tx = `CH${c.i + 1} ${DK[c.k] ? DK[c.k].e : c.k}: ${infoK(c.k, st)}`; g.fillText(tx.length > 64 ? tx.slice(0, 63) + "…" : tx, 10, H - jos + 10 + b * 13); }); }
    else { g.fillStyle = "#9fe6c0"; g.fillText(infoK(st.sel, st), 10, H - 5); }
    g.fillStyle = "#9fe6c0"; g.textAlign = "right"; g.font = "600 11px system-ui"; g.fillText(`${fmtT(Tf / 10)}/div`, 320, n > 1 ? 15 : H - 5); g.textAlign = "left";
  }
  const f = (v, n = 1) => (Math.abs(v) < 0.5 * 10 ** -n ? 0 : v).toFixed(n).replace(".", ",");
  function hud(st) {
    return `<div><b>${f(st.v * 3.6, 0)}</b> km/h · treapta <b>${st.motor ? st.gear : "–"}</b></div>
      <div><b>${f(st.rpm, 0)}</b> rot/min</div>
      <div>MAP <b>${f(st.map || 101, 0)}</b> kPa · TPS <b>${f(st.thr * 100, 0)}</b> %</div>
      <div>λ <b>${f(lambda(st, st.t), 2)}</b> V · t<sub>i</sub> <b>${f(st.ti || 0, 2)}</b> ms</div>
      ${st.fuelCut ? '<div class="v3d-abs">injecție întreruptă (frână de motor)</div>' : ""}${st.brk > 0.05 ? '<div class="v3d-blocare">frânare</div>' : ""}`;
  }
  return { motor: mot, etichete: et, html, leaga, pas, hud, stare, api, dupaRandare,
    camere: { motor: [[3.3, 1.7, 1.4], [1.75, 0.6, 0]], roataABS: [[XF + 0.4, 0.55, -ZR - 1.1], [XF, 0.38, -ZR + 0.1]], pedale: [[0.25, 1.2, -1.4], [1.05, 0.55, -0.3]], dedesubt: [[1.6, -1.8, 1.6], [1.4, 0.2, 0]] },
    camereButoane: [["motor", "motorul"], ["roataABS", "roata (ABS)"], ["pedale", "pedalier"], ["dedesubt", "de dedesubt"]],
    cameraInitiala: [[4.3, 2.1, 3.2], [1.4, 0.55, 0]] };
}

/* ------------------------------------------------------------------ sistemul „retea”: rețeaua CAN a unui autoturism 2025 (DA L1)
   Gateway central cu 5 magistrale (diagnoză, motor, șasiu CAN FD, confort, infotainment) + Ethernet auto.
   optiuni.control (din simulator): { stare() → {contact, defBus, defTip, arataDefect, punct}, onSelect(k) } */
function construiesteRetea({ caroserie, optiuni }) {
  const M = globalThis.MODELE && globalThis.MODELE["da-l1"];
  const CTL = optiuni.control || null;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const G = new THREE.Group(); caroserie.add(G);
  const et = [], ancore = {}, corpuri = {}, matMod = {};
  // poziția, mărimea și culoarea carcasei fiecărui modul
  const POZ = {
    gw: [0.92, 0.62, 0.36, 0.16, 0.05, 0.12, 0x3b4048], obd: [0.86, 0.5, -0.3, 0.05, 0.03, 0.08, 0x111111],
    ecm: [1.95, 0.76, -0.45, 0.24, 0.05, 0.18, 0xb9c0c8], tcu: [1.55, 0.36, 0.42, 0.16, 0.05, 0.12, 0x2b2f35], bsg: [2.02, 0.48, 0.22, 0.14, 0.14, 0.14, 0x8d949b],
    dcdc: [1.86, 0.32, -0.2, 0.16, 0.05, 0.13, 0x9aa2ab], fpm: [-0.95, 0.27, 0.36, 0.1, 0.03, 0.08, 0x2b2f35],
    esp: [1.62, 0.7, -0.6, 0.13, 0.1, 0.12, 0x9aa2ab], eps: [1.45, 0.3, -0.33, 0.12, 0.08, 0.1, 0x2b2f35], epb: [-1.2, 0.3, 0.05, 0.12, 0.04, 0.1, 0x2b2f35],
    srs: [0.3, 0.42, 0.0, 0.16, 0.05, 0.12, 0x2b2f35], scm: [0.76, 0.92, -0.4, 0.07, 0.07, 0.09, 0x2b2f35], rad: [2.39, 0.45, 0.0, 0.03, 0.09, 0.12, 0x222222], cam: [0.56, 1.31, 0.0, 0.07, 0.05, 0.1, 0x222222],
    bcm: [0.95, 0.6, -0.58, 0.16, 0.12, 0.05, 0x2b2f35], dfs: [0.38, 0.7, -0.79, 0.12, 0.1, 0.03, 0x2b2f35], dfd: [0.38, 0.7, 0.79, 0.12, 0.1, 0.03, 0x2b2f35],
    dss: [-0.62, 0.7, -0.79, 0.12, 0.1, 0.03, 0x2b2f35], dsd: [-0.62, 0.7, 0.79, 0.12, 0.1, 0.03, 0x2b2f35], hvac: [1.02, 0.76, 0.08, 0.12, 0.08, 0.1, 0x2b2f35],
    kes: [-0.3, 0.4, 0.0, 0.12, 0.04, 0.1, 0x2b2f35], sea: [0.12, 0.38, -0.42, 0.12, 0.03, 0.1, 0x2b2f35], led: [2.22, 0.72, -0.6, 0.08, 0.05, 0.08, 0x2b2f35],
    pdc: [-2.08, 0.55, 0.42, 0.1, 0.03, 0.08, 0x2b2f35], tlg: [-2.25, 0.95, 0.0, 0.05, 0.08, 0.14, 0x2b2f35],
    hu: [0.86, 0.88, 0.02, 0.1, 0.12, 0.2, 0x1f2328], ki: [0.86, 0.98, -0.38, 0.08, 0.12, 0.3, 0x1f2328], ocu: [0.2, 1.37, 0.0, 0.1, 0.03, 0.12, 0x2b2f35],
    amp: [-2.0, 0.55, -0.55, 0.14, 0.05, 0.12, 0x2b2f35], hud: [1.05, 0.98, -0.38, 0.12, 0.05, 0.16, 0x2b2f35]
  };
  const BUS_MOD = { diag: ["obd"], gw: [] }; M.MODULE.forEach(m => { if (m.b !== "gw") (BUS_MOD[m.b] = BUS_MOD[m.b] || []).push(m.k); });
  const NUME = { obd: "Priza OBD (J1962)" }; M.MODULE.forEach(m => NUME[m.k] = m.sc);
  const BUSOF = { obd: "diag" }; M.MODULE.forEach(m => BUSOF[m.k] = m.b);
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.45, emissive: 0x000000, transparent: true });
  Object.entries(POZ).forEach(([k, q]) => {
    const g = new THREE.Group(); g.position.set(q[0], q[1], q[2]); g.userData.c = k; G.add(g); corpuri[k] = g;
    const mm = mat(q[6]); matMod[k] = mm;
    const b = new THREE.Mesh(new THREE.BoxGeometry(q[3], q[4], q[5]), mm); b.castShadow = true; g.add(b);
    const con = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.05, q[3] * 0.4), Math.min(0.025, q[4] * 0.6), Math.min(0.06, q[5] * 0.5)), mat(0x111111)); con.position.set(-q[3] / 2 - 0.008, 0, 0); g.add(con);
    if (k === "ecm") for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.018, 0.008), mat(0x8d949b)); r.position.set(0, 0.033, -0.07 + i * 0.028); g.add(r); }
    if (k === "gw") for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.018), mat([0xffc04d, 0xf39a2b, 0xe8503a, 0x5cbf5a, 0x9b6ad6][i])); c.position.set(-0.09, 0, -0.045 + i * 0.022); g.add(c); }
    const a = new THREE.Object3D(); a.position.y = q[4] / 2 + 0.02; g.add(a); ancore[k] = a;
    et.push({ obj: a, text: k === "obd" ? "Priza OBD" : NUME[k], k, filtru: () => vizibilEt(k) });
  });
  // traseele magistralelor (trunchiul fiecărei magistrale pleacă din gateway și se termină în modulul de capăt)
  const GWp = V(0.85, 0.6, 0.36);
  const TR = {
    diag: [GWp, V(0.86, 0.5, 0.0), V(0.86, 0.48, -0.25)],
    motor: [GWp, V(1.22, 0.58, 0.3), V(1.55, 0.44, 0.3), V(1.86, 0.4, 0.05), V(1.95, 0.72, -0.4)],
    sasiu: [GWp, V(0.7, 0.48, 0.12), V(0.4, 0.42, 0.06), V(0.8, 0.58, -0.32), V(1.3, 0.6, -0.48), V(1.56, 0.68, -0.6)],
    confort: [GWp, V(0.45, 0.33, 0.64), V(-0.7, 0.33, 0.64), V(-2.05, 0.45, 0.22), V(-0.7, 0.33, -0.64), V(0.4, 0.33, -0.64), V(0.9, 0.58, -0.58)],
    info: [GWp, V(0.82, 0.8, 0.2), V(0.84, 0.88, 0.09)]
  };
  const CUL_H = { diag: 0xffc04d, motor: 0xf39a2b, sasiu: 0xe8503a, confort: 0x5cbf5a, info: 0x9b6ad6 }, CUL_L = 0x8a5a2b;
  const curbe = {}, tub = {}, matB = {};
  const torsadat = (curba, b, r = 0.004) => {
    const L = curba.getLength(), n = Math.max(30, Math.round(L / 0.005)), fr = curba.computeFrenetFrames(n, false), a = [], c = [];
    for (let i = 0; i <= n; i++) { const u = i / n, p = curba.getPointAt(u), th = u * L / 0.03 * 2 * Math.PI, N = fr.normals[i], B = fr.binormals[i];
      a.push(p.clone().addScaledVector(N, Math.cos(th) * 0.0055).addScaledVector(B, Math.sin(th) * 0.0055));
      c.push(p.clone().addScaledVector(N, -Math.cos(th) * 0.0055).addScaledVector(B, -Math.sin(th) * 0.0055)); }
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(a), n, r, 5), matB[b].H));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(c), n, r, 5), matB[b].L));
    G.add(g); return g;
  };
  Object.keys(TR).forEach(b => {
    matB[b] = { H: new THREE.MeshStandardMaterial({ color: CUL_H[b], roughness: 0.6, transparent: true }), L: new THREE.MeshStandardMaterial({ color: CUL_L, roughness: 0.6, transparent: true }) };
    curbe[b] = new THREE.CatmullRomCurve3(TR[b], false, "catmullrom", 0.3);
    tub[b] = [torsadat(curbe[b], b)];
    // derivațiile spre module (din cel mai apropiat punct al trunchiului)
    (BUS_MOD[b] || []).forEach(k => {
      if (k === M.MAG[b]?.capat || k === "obd") return;
      const q = POZ[k], p = V(q[0], q[1], q[2]); let best = 0, dmin = 1e9;
      for (let i = 0; i <= 60; i++) { const d = curbe[b].getPointAt(i / 60).distanceTo(p); if (d < dmin) { dmin = d; best = i / 60; } }
      const a = curbe[b].getPointAt(best), mid = a.clone().lerp(p, 0.5); mid.y = Math.min(a.y, p.y) - 0.02;
      tub[b].push(torsadat(new THREE.CatmullRomCurve3([a, mid, p.clone().add(V(-q[3] / 2 - 0.01, 0, 0))]), b, 0.0035));
    });
  });
  // Ethernet auto (100BASE-T1, pereche verde) spre cameră, infotainment, bord, telematică și DoIP la priza OBD
  const mEth = new THREE.MeshStandardMaterial({ color: 0x2fae5a, roughness: 0.6, transparent: true }), eth = new THREE.Group(); G.add(eth);
  [["cam", [V(0.8, 0.95, 0.25), V(0.6, 1.25, 0.05)]], ["hu", [V(0.9, 0.75, 0.2)]], ["ki", [V(0.9, 0.8, -0.1)]], ["ocu", [V(0.55, 1.05, 0.5), V(0.3, 1.33, 0.2)]], ["obd", [V(0.86, 0.45, 0.0)]]].forEach(([k, via]) => {
    const q = POZ[k]; eth.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([GWp.clone().add(V(0, -0.02, 0)), ...via, V(q[0], q[1], q[2])]), 60, 0.003, 5), mEth));
  });
  // rezistențele de terminare (în gateway – una pe fiecare magistrală – și în modulele de capăt / conectorul de diagnoză)
  const rezist = [];
  const rez = (p, b, k) => { const g = new THREE.Group(); g.position.copy(p); G.add(g);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.04, 14), new THREE.MeshStandardMaterial({ color: 0xd8c08a, roughness: 0.6 })); c.rotation.z = Math.PI / 2; g.add(c);
    [-0.01, 0, 0.01].forEach((x, i) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.004, 14), new THREE.MeshStandardMaterial({ color: [0x7a3b10, 0x111111, 0xc62828][i] })); r.rotation.z = Math.PI / 2; r.position.x = x; g.add(r); });
    rezist.push({ g, b, k }); return g; };
  Object.keys(TR).forEach(b => { const pts = TR[b]; rez(pts[pts.length - 1].clone().add(V(0, 0.035, 0)), b, "capat"); });
  const rSupl = rez(V(0, 0, 0), "", "supl"); rSupl.visible = false;
  // marcajul defectului
  const mDef = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.75, depthTest: false })); mDef.visible = false; mDef.renderOrder = 5; G.add(mDef);
  // mesajele: puncte luminoase pe fiecare magistrală
  const pach = []; Object.keys(TR).forEach(b => { const n = b === "diag" ? 2 : b === "confort" ? 8 : 5; for (let i = 0; i < n; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff3a0 })); G.add(s); pach.push({ s, b, u: Math.random(), dir: i % 2 ? 1 : -1, v: 0.3 + Math.random() * 0.3 }); } });
  // sondele aparatelor (în simulator): la priza OBD sau la conectorul gateway-ului al magistralei măsurate
  const sonde = new THREE.Group(); G.add(sonde);
  const mS1 = new THREE.MeshStandardMaterial({ color: 0xffd400 }), mS2 = new THREE.MeshStandardMaterial({ color: 0x4fd6ff });
  [mS1, mS2].forEach((m, i) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 10), m); t.position.set(0, 0.06, i ? 0.015 : -0.015); sonde.add(t); });
  sonde.visible = false;

  const DEF = Object.assign({ "": "fără defect" }, M.TIPURI_DEF);
  const optMag = Object.entries(M.MAG).map(([k, m]) => `<option value="${k}">${m.n}</option>`).join("");
  const optMod = ["gw", "obd"].concat(M.MODULE.filter(m => m.k !== "gw").map(m => m.k)).map(k => `<option value="${k}">${k === "obd" ? "Priza de diagnoză OBD (J1962)" : M.MK[k].nume}</option>`).join("");
  const html = `
    <div class="v3d-grup">
      ${CTL ? "" : `<button type="button" data-s-act="contact">Decuplează contactul</button>`}
      <label>Magistrala afișată <select data-s="fil"><option value="">toate magistralele</option>${optMag}</select></label>
      <label>Modulul <select data-s="mod">${optMod}</select></label>
      <button type="button" data-s-act="vezi">Arată modulul</button>
      <span class="v3d-et">sau clic pe modul, în machetă</span>
    </div>
    ${CTL ? "" : `<div class="v3d-grup">
      <label>Defect (demonstrație) pe <select data-s="dbus">${M.CHEI_MAG.map(k => `<option value="${k}">${M.MAG[k].n}</option>`).join("")}</select></label>
      <select data-s="def">${Object.entries(DEF).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select>
    </div>`}
    <div class="v3d-grup v3d-legenda">${Object.entries(CUL_H).map(([b, c]) => `<span><i style="background:#${c.toString(16).padStart(6, "0")}"></i>${M.MAG[b].n.split(" (")[0]}</span>`).join("")}<span><i style="background:#8a5a2b"></i>CAN-L (toate)</span><span><i style="background:#2fae5a"></i>Ethernet 100BASE-T1</span></div>`;
  const stare = { contact: true, sel: "gw", fil: "", defBus: "motor", def: "", t: 0, tc: 0, punct: "diag" };
  let API = null, S0 = null, cv = null;
  const v3 = new THREE.Vector3();
  function st0() { return S0 || stare; }
  function citesteCtl(st) { if (!CTL) return; const c = CTL.stare(); st.contact = c.contact; st.defBus = c.defBus; st.def = c.defTip || ""; st.arata = !!c.arataDefect; st.punct = c.punct || "diag"; st.sonde = !!c.sonde; }
  function prFals(st) { return { T: { diag: [120, 120], motor: [120, 120], sasiu: [120, 120], confort: [120, 120], info: [120, 120] }, S: { diag: 3, motor: 40, sasiu: 35, confort: 30, info: 30 }, rec: 2.5, dH: 3.5, dL: 1.5, n10: 8, n20: 10, n100: 12, defBus: st.defBus, defect: st.def }; }
  function raspunde(st, k) { if (k === "obd") return true; if (!st.contact) return false; return M.raspunde(prFals(st), !!st.def, k); }
  function vizibilEt(k) { const st = st0(); return !st.fil || BUSOF[k] === st.fil || k === "gw" || (st.fil === "diag" && k === "obd"); }
  function arata(k) { const o = ancore[k]; if (!o || !API) return; o.getWorldPosition(v3); const d = V(0.7, 0.75, v3.z >= 0 ? 0.9 : -0.9).normalize().multiplyScalar(1.05); API.zboara([v3.x + d.x, v3.y + d.y, v3.z + d.z], [v3.x, v3.y, v3.z]); }
  function aplica(st) {
    const vis = !CTL || st.arata, e = st.def, b = st.defBus, cap = M.MAG[b].capat;
    rezist.forEach(r => { if (r.k === "capat") r.g.visible = !(vis && e === "term_lipsa" && r.b === b); });
    rSupl.visible = vis && e === "term_supl"; if (rSupl.visible) rSupl.position.copy(curbe[b].getPointAt(0.55)).add(V(0, 0.03, 0));
    let P = null;
    if (vis && e) { const q = POZ[cap]; P = { term_lipsa: TR[b][TR[b].length - 1].clone().add(V(0, 0.035, 0)), term_supl: curbe[b].getPointAt(0.55), scurt_hl: curbe[b].getPointAt(0.3), canl_masa: curbe[b].getPointAt(0.45), intrerupt: curbe[b].getPointAt(0.88), alim: V(q[0], q[1] + 0.06, q[2]) }[e]; }
    mDef.visible = !!P; if (P) mDef.position.copy(P);
  }
  function leaga(cmd, st) {
    S0 = st; citesteCtl(st);
    const bc = cmd.querySelector('[data-s-act="contact"]');
    if (bc) { const txt = () => bc.textContent = st.contact ? "Decuplează contactul" : "Pune contactul"; txt(); bc.addEventListener("click", () => { st.contact = !st.contact; txt(); }); }
    const sm = cmd.querySelector('[data-s="mod"]'); sm.addEventListener("change", () => { st.sel = sm.value; if (CTL && CTL.onSelect) CTL.onSelect(st.sel); });
    const sf = cmd.querySelector('[data-s="fil"]'); sf.addEventListener("change", () => { st.fil = sf.value; });
    cmd.querySelector('[data-s-act="vezi"]').addEventListener("click", () => arata(st.sel));
    const sd = cmd.querySelector('[data-s="def"]'), sb = cmd.querySelector('[data-s="dbus"]');
    if (sd) { sd.addEventListener("change", () => { st.def = sd.value; aplica(st); }); sb.addEventListener("change", () => { st.defBus = sb.value; st.punct = sb.value; aplica(st); }); }
    aplica(st);
  }
  const tintaPunct = b => b === "diag" ? V(0.86, 0.5, -0.3) : GWp.clone().add(V(-0.02, 0.0, 0));
  let ultimCtl = "";
  function pas(dt, st) {
    st.t += dt; st.tc += dt * 2e-5;
    if (CTL) { citesteCtl(st); const ch = [st.def, st.defBus, st.arata].join("|"); if (ch !== ultimCtl) { ultimCtl = ch; aplica(st); } }
    const busMort = b => !st.contact || (st.def === "scurt_hl" && b === st.defBus);
    pach.forEach(p => {
      const ok = !busMort(p.b); p.s.visible = ok && (!st.fil || st.fil === p.b);
      if (!ok) return;
      p.u += p.dir * p.v * dt / Math.max(0.5, curbe[p.b].getLength() / 1.5);
      let lim = 1; if (st.def === "intrerupt" && p.b === st.defBus) lim = 0.85;
      if (p.u > lim) { p.u = lim; p.dir = -1; } if (p.u < 0) { p.u = 0; p.dir = 1; }
      p.s.position.copy(curbe[p.b].getPointAt(clamp(p.u, 0, 1)));
      p.s.material.color.set(st.def === "canl_masa" && p.b === st.defBus && Math.random() < 0.25 ? 0xff5050 : 0xfff3a0);
    });
    const pul = 0.5 + 0.5 * Math.sin(st.t * 6);
    Object.entries(corpuri).forEach(([k, g]) => {
      const m = matMod[k], sel = k === st.sel, filtrat = st.fil && !vizibilEt(k);
      m.opacity = filtrat ? 0.15 : 1; m.depthWrite = !filtrat;
      const mut = st.contact && !raspunde(st, k) && (st.arata || !CTL);
      m.emissive.setRGB(sel ? 0.1 + 0.4 * pul : mut ? 0.35 * pul : 0, sel ? 0.4 + 0.4 * pul : 0, sel ? 0.9 * pul : 0);
    });
    Object.entries(matB).forEach(([b, mm]) => { const o = st.fil && st.fil !== b ? 0.12 : 1; mm.H.opacity = mm.L.opacity = o; mm.H.depthWrite = mm.L.depthWrite = o === 1; });
    mEth.opacity = st.fil ? 0.15 : 1;
    rezist.forEach(r => { if (r.k === "capat") r.g.children.forEach(c => { c.material.transparent = true; c.material.opacity = st.fil && st.fil !== r.b ? 0.15 : 1; }); });
    mDef.material.opacity = 0.45 + 0.4 * pul;
    sonde.visible = !!st.sonde; if (st.sonde) sonde.position.copy(tintaPunct(st.punct));
  }
  // semnalele CAN la punctul de măsură (500 kbit/s; pe CAN FD faza de date la 2 Mbit/s)
  const h = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const bitD = b => { const Tf = 312, k = Math.floor(b / Tf), p = b - k * Tf; if (p >= 125) return 0; if (p === 0 || p === 115) return 1; if (p > 115) return 0; return h(k * 131 + p) < 0.5 ? 1 : 0; };
  function niv(st, b) {
    if (!st.contact) return { rH: 0, rL: 0, dH: 0, dL: 0, com: false };
    const n = M.niveluri(prFals(st), !!st.def, b); return n;
  }
  function sCan(t, st, b) {
    const n = niv(st, b); if (!n.com) return 0;
    const bb = Math.floor(t * 5e5), dtb = t * 5e5 - bb; let v = bitD(bb), vp = bitD(bb - 1);
    if (b === "sasiu") { const Tf = 312, p = bb - Math.floor(bb / Tf) * Tf; if (p > 30 && p < 50) { const sb = Math.floor(t * 2e6); v = h(sb * 7.1) < 0.5 ? 1 : 0; vp = h((sb - 1) * 7.1) < 0.5 ? 1 : 0; } }
    let s = v; if (v !== vp) s = vp + (v - vp) * (1 - Math.exp(-dtb / 0.015));
    if ((st.def === "term_lipsa" || st.def === "intrerupt") && b === st.defBus && v !== vp) s += (v - vp) * 0.28 * Math.exp(-dtb / 0.06) * Math.sin(2 * Math.PI * dtb / 0.05);
    return s;
  }
  function api(a) {
    API = a;
    if (!CTL) { cv = document.createElement("canvas"); cv.className = "v3d-osc"; a.scena.appendChild(cv); }
    const ray = new THREE.Raycaster(), m = new THREE.Vector2(); let jos = null;
    a.canvas.addEventListener("pointerdown", e => { jos = [e.clientX, e.clientY]; });
    a.canvas.addEventListener("pointerup", e => {
      if (!jos || Math.hypot(e.clientX - jos[0], e.clientY - jos[1]) > 5) return;
      const r = a.canvas.getBoundingClientRect(); m.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(m, a.camera); const tinte = Object.entries(corpuri).filter(([k]) => vizibilEt(k)).map(([, g]) => g);
      const hit = ray.intersectObjects(tinte, true)[0];
      if (hit) { let o = hit.object; while (o && !o.userData.c) o = o.parent; if (o && S0) { S0.sel = o.userData.c; const s = a.scena.parentElement.querySelector('[data-s="mod"]'); if (s) s.value = S0.sel; if (CTL && CTL.onSelect) CTL.onSelect(S0.sel); } }
    });
  }
  function dupaRandare(st) {
    if (!cv) return;
    const W = 330, H = 210, dpr = window.devicePixelRatio || 1, sc = (cv.clientWidth || W) / W, b = st.punct || "diag";
    const hcss = Math.round(H * sc) + "px"; if (cv.style.height !== hcss) cv.style.height = hcss;
    if (cv.width !== Math.round(W * sc * dpr) || cv.height !== Math.round(H * sc * dpr)) { cv.width = Math.round(W * sc * dpr); cv.height = Math.round(H * sc * dpr); }
    const g = cv.getContext("2d"); g.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    g.fillStyle = "rgba(8,18,14,.92)"; g.fillRect(0, 0, W, H);
    const top = 22, hz = H - 40;
    g.strokeStyle = "rgba(120,200,160,.18)"; g.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(10 + i * 31, top); g.lineTo(10 + i * 31, top + hz); g.stroke(); }
    for (let j = 0; j <= 8; j++) { const y = top + j * hz / 8; g.beginPath(); g.moveTo(10, y); g.lineTo(320, y); g.stroke(); }
    g.strokeStyle = "rgba(160,230,190,.6)"; g.beginPath(); g.moveTo(10, top + hz * 5 / 8); g.lineTo(320, top + hz * 5 / 8); g.stroke();
    const n = niv(st, b), Tf = b === "sasiu" ? 60e-6 : 40e-6, Tfr = 312 / 5e5, t0 = Math.floor(st.tc / Tfr) * Tfr - 2e-6;
    const Ysus = u => top + (1 - u / 4) * hz * 5 / 8, Yjos = u => top + hz * 5 / 8 + (1 - (u + 0.5) / 3) * hz * 3 / 8;
    const urma = (f, Y, col) => { g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); for (let i = 0; i <= 600; i++) { const t = t0 + Tf * i / 600, y = Y(f(t)); i ? g.lineTo(10 + i / 600 * 310, y) : g.moveTo(10, y); } g.stroke(); };
    const H_ = t => n.rH + (n.dH - n.rH) * sCan(t, st, b), L_ = t => n.rL + (n.dL - n.rL) * sCan(t, st, b);
    urma(H_, Ysus, "#ffe14d"); urma(L_, Ysus, "#4fd6ff"); urma(t => H_(t) - L_(t), Yjos, "#ff6bd6");
    g.font = "600 11px system-ui"; g.fillStyle = "#9fe6c0"; g.fillText(b === "diag" ? "Priza OBD – CAN diagnoză" : "Gateway – " + M.MAG[b].n.split(" (")[0], 10, 15);
    g.textAlign = "right"; g.fillText(`${Tf * 1e5} µs/div · 1 V/div`, 320, 15); g.textAlign = "left";
    g.font = "10px system-ui"; g.fillStyle = "#ffe14d"; g.fillText("CAN-H", 14, top + 12); g.fillStyle = "#4fd6ff"; g.fillText("CAN-L", 54, top + 12); g.fillStyle = "#ff6bd6"; g.fillText("U_diff = H − L", 14, top + hz * 5 / 8 + 12);
    g.fillStyle = "#9fe6c0"; g.fillText(!st.contact ? "rețea în repaus (contact decuplat)" : n.com ? (b === "sasiu" ? "CAN FD: arbitrare 500 kbit/s, date 2 Mbit/s" : "trafic: 500 kbit/s") : "fără comunicare: ambele linii ≈ 2,5 V", 10, H - 5);
  }
  const fR = (st, b) => { const e = st.def && st.defBus === b ? st.def : ""; return { term_lipsa: "≈ 120 Ω", intrerupt: "≈ 120 Ω", term_supl: "≈ 40 Ω", scurt_hl: "≈ 0 Ω" }[e] || "≈ 60 Ω"; };
  function hud(st) {
    const k = st.sel, b = BUSOF[k], m = M.MK[k];
    const r = raspunde(st, k), ascuns = CTL && !st.arata;
    return `<div><b>${k === "obd" ? "Priza de diagnoză OBD (J1962)" : m.nume}</b></div>
      <div>magistrala: <b>${b === "gw" ? "toate (gateway)" : M.MAG[b].n.split(" (")[0]}</b>${m ? ` · adresă ${m.adr}` : ""}</div>
      ${k === "obd" ? `<div style="max-width:17rem;white-space:normal">pin 6/14 CAN diagnoză · 3/11 și 12/13 Ethernet DoIP · 8 activare DoIP · 4/5 masă · 16 +12 V</div>` : ""}
      ${b !== "gw" && M.MAG[b] && M.MAG[b].capat === k ? `<div>conține terminarea de 120 Ω a magistralei</div>` : ""}
      ${k !== "obd" ? `<div>comunicație: <b>${!st.contact ? "repaus" : ascuns ? "—" : r ? "răspunde" : "nu răspunde"}</b></div>` : ""}
      ${!ascuns && st.def ? `<div class="v3d-blocare">${M.MAG[st.defBus].n.split(" (")[0]}: ${M.TIPURI_DEF[st.def]}</div>` : ""}`;
  }
  return { etichete: et, html, leaga, pas, hud, stare, api, dupaRandare,
    camere: { retea: [[3.2, 3.4, 3.0], [0.2, 0.55, 0.0]], motor: [[3.0, 1.6, 0.9], [1.75, 0.55, 0.0]], bord: [[0.1, 1.35, -1.2], [0.86, 0.72, -0.15]], spate: [[-4.0, 2.2, 2.0], [-1.6, 0.6, 0]] },
    camereButoane: [["retea", "toată rețeaua"], ["motor", "compartimentul motor"], ["bord", "bord / gateway / OBD"], ["spate", "spate / portbagaj"]],
    cameraInitiala: [[3.9, 3.0, 3.4], [0.3, 0.55, 0.0]] };
}
