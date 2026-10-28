/* Scena 3D comună a modulelor M / S / F: randare PBR, orbitare, etichete HTML ancorate pe obiecte, săgeți de forță/putere,
   scara de culori (turbo) și bucla de animație care rulează numai cât modulul este vizibil. Unități: metri. */
import * as THREE from "../../../comun/vendor/three.module.min.js";
import { OrbitControls } from "../../../comun/vendor/OrbitControls.js";
import { RoomEnvironment } from "../../../comun/vendor/RoomEnvironment.js";
import { RoundedBoxGeometry } from "../../../comun/vendor/RoundedBoxGeometry.js";
export { THREE, RoundedBoxGeometry };

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const mat = (o) => { const m = new THREE.MeshStandardMaterial(o); m.envMapIntensity = 0.8; return m; };
export const MAT = () => ({
  otel: mat({ color: 0x9aa3ad, roughness: 0.32, metalness: 0.9 }), otelI: mat({ color: 0x6b737c, roughness: 0.45, metalness: 0.85 }),
  crom: mat({ color: 0xe8ecf0, roughness: 0.1, metalness: 1 }), alu: mat({ color: 0xc9ced3, roughness: 0.38, metalness: 0.75 }),
  fonta: mat({ color: 0x5d6168, roughness: 0.7, metalness: 0.5 }), cupru: mat({ color: 0xc87533, roughness: 0.3, metalness: 0.95 }),
  negru: mat({ color: 0x1d2024, roughness: 0.55 }), cauc: mat({ color: 0x151618, roughness: 0.9 }), alb: mat({ color: 0xe9edf1, roughness: 0.5 }),
  albastru: mat({ color: 0x1d4f91, roughness: 0.45, metalness: 0.2 }), portocaliu: mat({ color: 0xe8590c, roughness: 0.45 }), verde: mat({ color: 0x2e8b57, roughness: 0.5 }),
  galben: mat({ color: 0xf2b705, roughness: 0.5 }), rosu: mat({ color: 0xc62828, roughness: 0.45 }),
  sticla: mat({ color: 0xbfd8f0, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
  vopsea: mat({ color: 0x2b5ea8, roughness: 0.35, metalness: 0.55 }), gri: mat({ color: 0x8b939c, roughness: 0.6, metalness: 0.3 })
});

/** scara „turbo” (aceeași ca post-procesoarele CFD), x ∈ [0, 1] → [r, g, b] 0…255 */
export function turbo(x) {
  x = 0.07 + 0.93 * Math.max(0, Math.min(1, x)); const v = [1, x, x * x, x * x * x], v2 = [v[2] * v[2], v[3] * v[2]];
  const d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const r = d(v, [0.13572138, 4.6153926, -42.66032258, 132.13108234]) + v2[0] * -152.94239396 + v2[1] * 59.28637943;
  const g = d(v, [0.09140261, 2.19418839, 4.84296658, -14.18503333]) + v2[0] * 4.27729857 + v2[1] * 2.82956604;
  const b = d(v, [0.1066733, 12.64194608, -60.58204836, 110.36276771]) + v2[0] * -89.90310912 + v2[1] * 27.34824973;
  return [r, g, b].map((c) => Math.round(255 * Math.max(0, Math.min(1, c))));
}
export const turboColor = (x, c = new THREE.Color()) => { const [r, g, b] = turbo(x); return c.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace); };
export const turboCSS = (x) => `rgb(${turbo(x).join(",")})`;
export const gradientTurbo = () => `linear-gradient(90deg, ${Array.from({ length: 11 }, (_, k) => turboCSS(k / 10)).join(",")})`;

/** săgeată 3D (forță, putere) cu lungimea și culoarea modificabile */
export function sageata(culoare, raza = 0.004) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: culoare, emissive: culoare, emissiveIntensity: 0.35, roughness: 0.4 });
  const tija = new THREE.Mesh(new THREE.CylinderGeometry(raza, raza, 1, 12), m), varf = new THREE.Mesh(new THREE.ConeGeometry(raza * 2.6, 1, 16), m);
  g.add(tija, varf); g.userData = { tija, varf, m }; g.visible = false;
  const up = V3(0, 1, 0), q = new THREE.Quaternion();
  g.seteaza = (origine, dir, L) => {
    const l = Math.abs(L); g.visible = l > 1e-5; if (!g.visible) return;
    const d = dir.clone().normalize().multiplyScalar(Math.sign(L) || 1), cap = Math.min(l * 0.35, raza * 7);
    q.setFromUnitVectors(up, d); g.quaternion.copy(q); g.position.copy(origine);
    tija.scale.set(1, Math.max(1e-4, l - cap), 1); tija.position.set(0, (l - cap) / 2, 0); varf.scale.set(1, cap, 1); varf.position.set(0, l - cap / 2, 0);
  };
  return g;
}

/** scena: gazda = elementul .mod-scena; o = { cam:[x,y,z], tinta:[x,y,z], min, max, fundal } */
export function creeazaScena(gazda, o = {}) {
  gazda.innerHTML = `<canvas></canvas><div class="mod-hud" hidden></div><div class="mod-leg" hidden></div><div class="mod-eticheta-prov">${o.prov || "vizualizare internă"}</div><button type="button" class="btn-ecran">⛶ Ecran complet</button>`;
  const canvas = gazda.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(34, 1.6, 0.002, 60); camera.position.set(...(o.cam || [0.5, 0.35, 0.6]));
  const ctl = new OrbitControls(camera, canvas); ctl.target.set(...(o.tinta || [0, 0, 0])); ctl.enableDamping = true;
  ctl.minDistance = o.min || 0.05; ctl.maxDistance = o.max || 8;
  const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(1.2, 2.2, 1.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const U = o.umbra || 1; Object.assign(sun.shadow.camera, { left: -U, right: U, top: U, bottom: -U, near: 0.1, far: 8 }); sun.shadow.bias = -0.0005; scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404850, 0.55));
  const tema = () => { const t = document.documentElement.getAttribute("data-theme"), inchis = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    scene.background = new THREE.Color(o.fundal ?? (inchis ? 0x161b22 : 0xdde3ea)); };
  tema(); window.addEventListener("schimbare-tema", tema);
  // etichetele HTML ancorate pe puncte 3D
  const etichete = [];
  function eticheta(html, pozitie) { const el = document.createElement("div"); el.className = "eticheta3d"; el.innerHTML = html; gazda.appendChild(el);
    const e = { el, p: pozitie ? pozitie.clone() : V3(0, 0, 0), vizibil: true, text(h) { if (el._h !== h) { el.innerHTML = h; el._h = h; } }, pune(v) { e.p.copy(v); }, arata(b) { e.vizibil = b; } };
    etichete.push(e); return e; }
  const v = new THREE.Vector3();
  function pozEtichete() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    etichete.forEach((e) => { v.copy(e.p).project(camera); const vis = e.vizibil && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; e.el.style.display = vis ? "" : "none";
      if (vis) e.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -120%)`; });
  }
  const hud = gazda.querySelector(".mod-hud"), leg = gazda.querySelector(".mod-leg");
  function legenda(titlu, min, max, unit, fmtv = (x) => fmt(x, Math.abs(max - min) < 10 ? 2 : 0)) {
    if (titlu == null) { leg.hidden = true; return; }
    leg.hidden = false; leg.innerHTML = `${titlu}<div class="bara-c" style="background:${gradientTurbo()}"></div><div class="lim"><span>${fmtv(min)}</span><span>${unit}</span><span>${fmtv(max)}</span></div>`;
  }
  // bucla de animație
  let activ = true, f = null, tP = performance.now(), cerere = 0;
  function bucla(t) {
    cerere = requestAnimationFrame(bucla);
    const dt = Math.min(0.1, (t - tP) / 1000); tP = t;
    if (!activ || !gazda.getClientRects().length) return;
    const w = gazda.clientWidth, h = gazda.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    if (f) f(dt, t / 1000);
    ctl.update(); renderer.render(scene, camera); pozEtichete();
  }
  cerere = requestAnimationFrame(bucla);
  if (typeof ecranComplet === "function") ecranComplet(gazda, gazda.querySelector(".btn-ecran"));
  return {
    THREE, scene, camera, renderer, ctl, canvas, gazda, eticheta, legenda,
    hud(html) { hud.hidden = !html; if (html && hud._h !== html) { hud.innerHTML = html; hud._h = html; } },
    animatie(fn) { f = fn; },
    activ(b) { activ = b; tP = performance.now(); },
    incadreaza(c, t) {
      // c, t dau direcția de privire; distanța se alege automat după dimensiunile machetei (încape în cadru)
      const box = new THREE.Box3(), bb = new THREE.Box3(), rad = this.grup || scene; rad.updateMatrixWorld(true);
      rad.traverseVisible((o) => { if (o.isMesh && !o.userData.faraCadru) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(bb); } });
      const sz = box.getSize(new THREE.Vector3()), cen = box.getCenter(new THREE.Vector3());
      if (!Number.isFinite(sz.x) || sz.length() === 0) { camera.position.set(...c); ctl.target.set(...t); ctl.update(); return; }
      const dir = new THREE.Vector3(c[0] - t[0], c[1] - t[1], c[2] - t[2]).normalize(), r = sz.length() / 2;
      const d = (r / Math.sin((camera.fov * Math.PI) / 360)) * (camera.aspect < 1.3 ? 1.25 : 1.0);
      ctl.target.copy(cen); camera.position.copy(cen).addScaledVector(dir, d); camera.near = d / 200; camera.far = d * 20; camera.updateProjectionMatrix(); ctl.update();
    },
    goleste(grup) { grup.traverse((x) => { if (x.geometry) x.geometry.dispose(); }); while (grup.children.length) grup.remove(grup.children[0]); etichete.splice(0).forEach((e) => e.el.remove()); },
    distruge() { cancelAnimationFrame(cerere); renderer.dispose(); }
  };
}

/* ------------------------------------------------------------------ grafice 2D (canvas, scara portalului) */
/** gazda: element; o: obiectul lui deseneazaGrafic + titlu; întoarce { deseneaza(o) } */
export function grafic(gazda, titlu, inaltime = 220) {
  const fig = document.createElement("div"); fig.className = "mod-graf"; fig.innerHTML = `<h4>${titlu}</h4><canvas height="${inaltime}"></canvas><div class="legenda"></div>`;
  gazda.appendChild(fig);
  const cv = fig.querySelector("canvas"), lg = fig.querySelector(".legenda");
  let ultim = null;
  const g = {
    fig, cv,
    deseneaza(o) { ultim = o; if (!fig.getClientRects().length) return; cv._gr = null; const gr = cv._cursor; deseneazaGrafic(cv, o); cv._cursor = gr;
      if (o.legenda) { const P = paleta(false); lg.innerHTML = legendaHTML(o.legenda.map(([t, c, tip]) => [t, typeof c === "number" ? P.s[c % P.s.length] : c, tip])); } else lg.innerHTML = ""; },
    redeseneaza() { if (ultim) g.deseneaza(ultim); }
  };
  window.addEventListener("schimbare-tema", () => g.redeseneaza());
  return g;
}
/** limite „frumoase” pentru axe */
export function lim(vals, cu0 = true, marja = 0.06) {
  let a = Infinity, b = -Infinity; vals.forEach((v) => { if (Number.isFinite(v)) { a = Math.min(a, v); b = Math.max(b, v); } });
  if (!Number.isFinite(a)) return [0, 1]; if (cu0) { a = Math.min(a, 0); b = Math.max(b, 0); }
  if (a === b) { a -= 1; b += 1; } const d = (b - a) * marja; a -= a < 0 || !cu0 ? d : 0; b += d;
  const pas = Math.pow(10, Math.floor(Math.log10((b - a) / 5))), r = (x, f) => f(x / pas) * pas; return [r(a, Math.floor), r(b, Math.ceil)];
}

/* ------------------------------------------------------------------ elemente de interfață comune */
export const fx = (x, d = 2) => (Number.isFinite(x) ? x.toLocaleString("ro-RO", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—");
/** tabelul de verificare față de reper: rânduri [mărime, simbol, calculat, reper, unitate, zecimale, toleranța relativă] */
export function tabelVerificare(randuri, titlu = "Verificarea față de reperul analitic") {
  return `<div class="tabel-container"><table class="tabel mod-ver"><thead><tr><th>${titlu}</th><th>Simbol</th><th class="num">Simulator intern</th><th class="num">Reper</th><th class="num">Abatere</th><th>Stare</th></tr></thead><tbody>
    ${randuri.map(([m, s, c, r, u, d, tol]) => { const ab = Number.isFinite(r) && Math.abs(r) > 1e-12 ? (c - r) / Math.abs(r) * 100 : c - r, ok = Math.abs(ab) <= (tol ?? 0.5);
      return `<tr><td>${m}</td><td class="sim">${s}</td><td class="num">${fx(c, d)} ${u}</td><td class="num">${fx(r, d)} ${u}</td><td class="num">${fx(ab, 3)} %</td><td class="${ok ? "ok" : "rau"}">${ok ? "conform" : "neconform"}</td></tr>`; }).join("")}
    </tbody></table></div>`;
}
/** concluzie verificabilă: { st: "ok" | "rau" | "av" | "nd", text } */
export const concluzie = (st, text) => `<div class="concluzie ${st}"><span class="st">${{ ok: "conform", rau: "neconform", av: "avertizare", nd: "nedeterminabil" }[st]}</span>${text}</div>`;
export function comutatorStudii(gazda, studii, laAlegere, activ) {
  gazda.innerHTML = studii.map((s) => `<button type="button" data-s="${s.id}" aria-pressed="${s.id === activ}">${s.nume}${s.st ? `<span class="st">· ${s.st}</span>` : ""}</button>`).join("");
  gazda.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { gazda.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); laAlegere(b.dataset.s); }));
}
