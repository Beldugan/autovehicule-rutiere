/* Stilurile de vizualizare ale scenelor 3D (în maniera post-procesoarelor CFD de tip AVL FIRE M / IMPRESS M):
   0 · Realist     – materialele PBR ale modelului;
   1 · Prezentare  – secțiune „mixtă”: zona din stânga ecranului în albastru CAD, zona centrală realistă (motorul secționat),
                     zona din dreapta desen tehnic (muchii albe pe fundal galben-verde); poziția secțiunii se trage cu glisorul;
   2 · Termic CFD  – harta temperaturii pe suprafețe (scara „turbo”, izoterme), cu legendă și sondă de temperatură sub cursor.
   Se aplică oricărei scene: materialele Mesh* primesc un fragment de shader comun (uniformele sunt comune și se încarcă înaintea
   fiecărei randări a scenei), iar sursele de căldură vin de la scenă (funcția `surse`) sau din obiectele marcate cu userData.vzT. */
import * as THREE from "./vendor/three.module.min.js";

const NS = 32;
const U = {
  uVzMod: { value: 0 }, uVzRes: { value: new THREE.Vector2(1, 1) }, uVzB1: { value: 0.32 }, uVzB2: { value: 0.66 },
  uVzS: { value: Array.from({ length: NS }, () => new THREE.Vector4()) }, uVzA: { value: new Float32Array(NS) }, uVzN: { value: 0 },
  uVzT0: { value: 20 }, uVzTmin: { value: 20 }, uVzTmax: { value: 120 },
  uVzBgA: { value: new THREE.Color(0xc4d82e) }, uVzBgB: { value: new THREE.Color(0x2fa64a) }, uVzCad: { value: new THREE.Color(0x1d63d8) }
};
const GLSL_COMUN = `
uniform int uVzMod; uniform vec2 uVzRes; uniform float uVzB1; uniform float uVzB2;
uniform vec4 uVzS[${NS}]; uniform float uVzA[${NS}]; uniform int uVzN; uniform float uVzT0; uniform float uVzTmin; uniform float uVzTmax;
uniform vec3 uVzBgA; uniform vec3 uVzBgB; uniform vec3 uVzCad;
varying vec3 vVzW;
float vzZona() { vec2 p = gl_FragCoord.xy / uVzRes; return p.x + (p.y - 0.5) * 0.16; }
vec3 vzFundal() { vec2 p = gl_FragCoord.xy / uVzRes; return mix(uVzBgA, uVzBgB, clamp(p.x * 0.85 + p.y * 0.15, 0.0, 1.0)); }
`;
const GLSL_FRAG = GLSL_COMUN + `
vec3 vzTurbo(float x) {
  const vec4 kR = vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234); const vec4 kG = vec4(0.09140261, 2.19418839, 4.84296658, -14.18503333);
  const vec4 kB = vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771); const vec2 kR2 = vec2(-152.94239396, 59.28637943);
  const vec2 kG2 = vec2(4.27729857, 2.82956604); const vec2 kB2 = vec2(-89.90310912, 27.34824973);
  x = 0.07 + 0.93 * clamp(x, 0.0, 1.0); vec4 v4 = vec4(1.0, x, x * x, x * x * x); vec2 v2 = v4.zw * v4.z;
  return clamp(vec3(dot(v4, kR) + dot(v2, kR2), dot(v4, kG) + dot(v2, kG2), dot(v4, kB) + dot(v2, kB2)), 0.0, 1.0);
}
float vzTemp() {
  float tc = 0.0, tr = 0.0;
  for (int i = 0; i < ${NS}; i++) { if (i >= uVzN) break; vec3 d = vVzW - uVzS[i].xyz; float g = exp(-dot(d, d) / (uVzS[i].w * uVzS[i].w)), a = uVzA[i] * g;
    tc = max(tc, a); tr = min(tr, a); }
  return uVzT0 + tc + tr;
}
void vzAplica(inout vec4 fc) {
  if (uVzMod == 0) return;
  float L = clamp(dot(fc.rgb, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
  if (uVzMod == 1) {
    float s = vzZona();
    if (s < uVzB1) { fc.rgb = uVzCad * (0.28 + 1.15 * L) + vec3(0.9) * pow(L, 6.0) * 0.6; fc.rgb += vec3(0.55, 0.75, 1.0) * smoothstep(uVzB1 - 0.006, uVzB1, s) * 0.5; fc.a = max(fc.a, 0.92); }
    else if (s > uVzB2) { fc.rgb = mix(vzFundal(), vec3(1.0), 0.07 + 0.10 * L); fc.rgb += vec3(1.0) * (1.0 - smoothstep(uVzB2, uVzB2 + 0.008, s)) * 0.55; }
  } else {
    float T = vzTemp(), x = (T - uVzTmin) / max(1e-3, uVzTmax - uVzTmin), f = abs(fract(clamp(x, 0.0, 1.0) * 14.0) - 0.5);
    fc.rgb = vzTurbo(x) * (0.42 + 0.78 * min(1.0, L * 1.9)) * (0.86 + 0.14 * smoothstep(0.0, 0.07, f));
    fc.a = max(fc.a, 0.55);
  }
}
`;
const VERT_DECL = "varying vec3 vVzW;\n";
const VERT_CORP = `
{ vec4 vzP = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  vzP = instanceMatrix * vzP;
#endif
  vVzW = (modelMatrix * vzP).xyz; }
`;
const patch = new WeakSet();
function patchMaterial(m) {
  if (!m || patch.has(m) || !(m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial || m.isMeshToonMaterial)) return;
  patch.add(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev(sh, r);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + VERT_DECL).replace("#include <project_vertex>", "#include <project_vertex>\n" + VERT_CORP);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GLSL_FRAG).replace("#include <colorspace_fragment>", "#include <colorspace_fragment>\nvzAplica(gl_FragColor);");
  };
  const k0 = m.customProgramCacheKey;
  m.customProgramCacheKey = function () { return "vz1|" + (k0 ? k0.call(this) : ""); };
  m.needsUpdate = true;
}
const matLinii = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
matLinii.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, U);
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + GLSL_COMUN).replace("#include <colorspace_fragment>", "#include <colorspace_fragment>\nif (uVzMod != 1 || vzZona() < uVzB2) discard;");
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + VERT_DECL).replace("#include <project_vertex>", "#include <project_vertex>\n" + VERT_CORP);
};
matLinii.customProgramCacheKey = () => "vzLinii";

/** culoarea scării turbo în JS (legenda) */
export function turbo(x) {
  x = 0.07 + 0.93 * Math.max(0, Math.min(1, x)); const v = [1, x, x * x, x * x * x], v2 = [v[2] * v[2], v[3] * v[2]];
  const d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const r = d(v, [0.13572138, 4.6153926, -42.66032258, 132.13108234]) + v2[0] * -152.94239396 + v2[1] * 59.28637943;
  const g = d(v, [0.09140261, 2.19418839, 4.84296658, -14.18503333]) + v2[0] * 4.27729857 + v2[1] * 2.82956604;
  const b = d(v, [0.1066733, 12.64194608, -60.58204836, 110.36276771]) + v2[0] * -89.90310912 + v2[1] * 27.34824973;
  return [r, g, b].map(c => Math.round(255 * Math.max(0, Math.min(1, c))));
}
let texFundal = null;
function fundalPrezentare() {
  if (texFundal) return texFundal;
  const W = 512, H = 256, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), img = x.createImageData(W, H);
  const A = U.uVzBgA.value, B = U.uVzBgB.value, s = v => Math.round(255 * v);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const u = (i + 0.5) / W, v = 1 - (j + 0.5) / H, t = Math.max(0, Math.min(1, u * 0.85 + v * 0.15)), k = (j * W + i) * 4;
    img.data[k] = s(A.r + (B.r - A.r) * t); img.data[k + 1] = s(A.g + (B.g - A.g) * t); img.data[k + 2] = s(A.b + (B.b - A.b) * t); img.data[k + 3] = 255; }
  x.putImageData(img, 0, 0);
  // liniile ondulate fine din fundal (motivul grafic al prezentărilor de simulare)
  x.strokeStyle = "rgba(255,255,255,.16)"; x.lineWidth = 1;
  for (let r = 0; r < 26; r++) { const y0 = 10 + r * 9.5; x.beginPath(); for (let i = 0; i <= 90; i++) { const xx = i, y = y0 + Math.sin(i * 0.9 + r) * 2.2; i ? x.lineTo(xx, y) : x.moveTo(xx, y); } x.stroke(); }
  for (let r = 0; r < 14; r++) { const y0 = 20 + r * 16; x.beginPath(); for (let i = 0; i <= 120; i++) { const xx = W - 120 + i, y = y0 + Math.sin(i * 0.5 + r * 2) * 3; i ? x.lineTo(xx, y) : x.moveTo(xx, y); } x.stroke(); }
  texFundal = new THREE.CanvasTexture(c); texFundal.colorSpace = THREE.SRGBColorSpace; return texFundal;
}

const MODURI = [["Realist", "Materialele reale (oțel, fontă, aluminiu, cupru, plastic)"], ["Prezentare", "Secțiune mixtă: model CAD albastru · ansamblul real secționat · desen tehnic"], ["Termic (CFD)", "Câmpul de temperatură pe suprafețe (post-procesare de tip CFD) – treceți cursorul peste piese pentru sondă"]];

/** atașează bara stilurilor de vizualizare unei scene 3D
    o = { renderer, scene, camera, cont (elementul poziționat care conține canvasul), profil: {titlu, T0, Tmin, Tmax, unit},
          surse(): [{p: Vector3 (lume), r, T}], decor: [obiecte ascunse în Prezentare / Termic], laMod(m), pozitie: "sus" | "jos-dreapta" } */
export function ataseazaViz(o) {
  const { renderer, scene, camera, cont } = o, prof = Object.assign({ titlu: "Temperatura", T0: 20, Tmin: 20, Tmax: 120, unit: "°C" }, o.profil || {});
  let mod = 0, cadre = 0, sect = 0.5, bgAnt = null, fogAnt = null;
  const bara = document.createElement("div"); bara.className = "vz-bara" + (o.pozitie ? " vz-" + o.pozitie : "");
  bara.innerHTML = MODURI.map(([t, d], i) => (o.faraPrezentare && i === 1) ? "" : `<button type="button" data-vz="${i}" title="${d}" aria-pressed="${i ? "false" : "true"}">${t}</button>`).join("") +
    `<label class="vz-sect" hidden title="Poziția planului de secțiune"><span>Secțiune</span><input type="range" min="0" max="1" step="0.005" value="0.5"></label>`;
  const leg = document.createElement("div"); leg.className = "vz-legenda"; leg.hidden = true;
  const sonda = document.createElement("div"); sonda.className = "vz-sonda"; sonda.hidden = true;
  cont.appendChild(bara); cont.appendChild(leg); cont.appendChild(sonda);
  const desLegenda = () => {
    const pasi = 5, val = k => prof.Tmax - (prof.Tmax - prof.Tmin) * k / pasi;
    const grad = Array.from({ length: 11 }, (_, k) => `rgb(${turbo(1 - k / 10).join(",")}) ${k * 10}%`).join(",");
    leg.innerHTML = `<b>${prof.titlu} [${prof.unit}]</b><div class="vz-scala"><i style="background:linear-gradient(${grad})"></i><span>${Array.from({ length: pasi + 1 }, (_, k) => `<em>${Math.round(val(k))}</em>`).join("")}</span></div>`;
  };
  desLegenda();
  const decor = new Set(o.decor || []), vizDecor = new Map();
  // muchiile (desenul tehnic din zona dreaptă)
  const muchii = new Map(), cacheGeo = new Map();
  function refaMuchii() {
    scene.traverse(ob => {
      if (!ob.isMesh || ob.isInstancedMesh || !ob.geometry || !ob.geometry.attributes.position || ob.userData.vzFara || decor.has(ob)) return;
      const m = Array.isArray(ob.material) ? ob.material[0] : ob.material; if (!m || m.isMeshBasicMaterial || m.isPointsMaterial || m.isShaderMaterial) return;
      let L = muchii.get(ob);
      if (L && L.userData.geo === ob.geometry) return;
      if (ob.geometry.attributes.position.count > 120000) return;
      let eg = cacheGeo.get(ob.geometry.uuid); if (!eg) { eg = new THREE.EdgesGeometry(ob.geometry, 32); cacheGeo.set(ob.geometry.uuid, eg); }
      if (!L) { L = new THREE.LineSegments(eg, matLinii); L.raycast = () => { }; L.userData.vzLinii = true; L.renderOrder = 2; ob.add(L); muchii.set(ob, L); }
      L.geometry = eg; L.userData.geo = ob.geometry;
    });
  }
  function arataMuchii(v) { muchii.forEach(L => { L.visible = v; }); }
  function patchToate() {
    scene.traverse(ob => { if (ob.material && !ob.userData.vzLinii) (Array.isArray(ob.material) ? ob.material : [ob.material]).forEach(m => { patchMaterial(m); if (m.polygonOffset !== (mod === 1) && (m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial)) { m.polygonOffset = mod === 1; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; } }); });
  }
  patchToate();
  const tagged = [];
  function colecteazaTag() { tagged.length = 0; scene.traverse(ob => { if (ob.userData.vzT !== undefined) tagged.push(ob); }); }
  colecteazaTag();
  const sfera = new THREE.Sphere(), lista = [];
  function surseCurente() {
    lista.length = 0;
    if (o.surse) (o.surse() || []).forEach(s => { if (s && s.p) lista.push(s); });
    tagged.forEach(ob => {
      if (!ob.userData.vzMereu) { for (let q = ob; q; q = q.parent) if (!q.visible) return; }
      const T = typeof ob.userData.vzT === "function" ? ob.userData.vzT() : ob.userData.vzT; if (!Number.isFinite(T)) return;
      if (!ob.userData.vzSf) { const b = new THREE.Box3().setFromObject(ob); b.getBoundingSphere(sfera); ob.updateMatrixWorld(); ob.userData.vzSf = { c: ob.worldToLocal(sfera.center.clone()), r: sfera.radius }; }
      lista.push({ p: ob.localToWorld(ob.userData.vzSf.c.clone()), r: ob.userData.vzSf.r * (ob.userData.vzR || 0.9), T });
    });
    return lista;
  }
  function temperatura(p) {
    let tc = 0, tr = 0; lista.slice(0, NS).forEach(s => { const d2 = p.distanceToSquared(s.p), a = (s.T - prof.T0) * Math.exp(-d2 / (s.r * s.r)); tc = Math.max(tc, a); tr = Math.min(tr, a); });
    return prof.T0 + tc + tr;
  }
  const vRes = new THREE.Vector2();
  const prevOBR = scene.onBeforeRender;
  scene.onBeforeRender = function (r, s, c, rt) {
    if (prevOBR) prevOBR.call(this, r, s, c, rt);
    if (++cadre % 45 === 0) { patchToate(); if (mod === 1) { refaMuchii(); arataMuchii(true); } if (cadre % 225 === 0) colecteazaTag(); }
    r.getDrawingBufferSize(vRes); U.uVzRes.value.copy(vRes); U.uVzMod.value = mod;
    U.uVzB1.value = mod === 1 ? sect - 0.2 : -1; U.uVzB2.value = mod === 1 ? sect + 0.16 : 2;
    if (mod === 1) { if (scene.background !== fundalPrezentare()) { bgAnt = scene.background; scene.background = fundalPrezentare(); } if (scene.fog) { fogAnt = scene.fog; scene.fog = null; } }
    if (mod === 2) {
      const L = surseCurente(); U.uVzN.value = Math.min(NS, L.length); U.uVzT0.value = prof.T0; U.uVzTmin.value = prof.Tmin; U.uVzTmax.value = prof.Tmax;
      for (let i = 0; i < U.uVzN.value; i++) { const q = L[i]; U.uVzS.value[i].set(q.p.x, q.p.y, q.p.z, Math.max(1e-3, q.r)); U.uVzA.value[i] = q.T - prof.T0; }
      if (scene.fog) { fogAnt = scene.fog; scene.fog = null; }
    }
  };
  function seteazaMod(m) {
    if (m === mod) return;
    const ant = mod; mod = m;
    bara.querySelectorAll("[data-vz]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.vz === m)));
    bara.querySelector(".vz-sect").hidden = m !== 1; leg.hidden = m !== 2; sonda.hidden = true;
    cont.classList.toggle("vz-prez", m === 1); cont.classList.toggle("vz-termic", m === 2);
    if (ant === 1 && bgAnt !== null && scene.background === texFundal) scene.background = bgAnt;
    if (m === 0 && fogAnt) { scene.fog = fogAnt; fogAnt = null; }
    if (m === 1) { refaMuchii(); } arataMuchii(m === 1);
    decor.forEach(d => { if (m) { if (!vizDecor.has(d)) vizDecor.set(d, d.visible); d.visible = false; } else if (vizDecor.has(d)) { d.visible = vizDecor.get(d); vizDecor.delete(d); } });
    patchToate(); colecteazaTag();
    if (o.laMod) o.laMod(m, ant);
  }
  bara.addEventListener("click", e => { const b = e.target.closest("[data-vz]"); if (b) seteazaMod(+b.dataset.vz); });
  bara.querySelector("input").addEventListener("input", e => { sect = +e.target.value; });
  ["pointerdown", "wheel", "touchstart"].forEach(ev => bara.addEventListener(ev, e => e.stopPropagation()));
  // sonda de temperatură (raycast sub cursor, ~10 Hz)
  const rc = new THREE.Raycaster(), ndc = new THREE.Vector2(); let tS = 0;
  renderer.domElement.addEventListener("pointermove", e => {
    if (mod !== 2) return; const t = performance.now(); if (t - tS < 90) return; tS = t;
    const R = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - R.left) / R.width * 2 - 1, -(e.clientY - R.top) / R.height * 2 + 1);
    rc.setFromCamera(ndc, camera); const h = rc.intersectObjects(scene.children, true).find(i => i.object.isMesh && i.object.visible && !decor.has(i.object));
    if (!h) { sonda.hidden = true; return; }
    const T = temperatura(h.point), CR = cont.getBoundingClientRect();
    sonda.hidden = false; sonda.style.left = (e.clientX - CR.left + 14) + "px"; sonda.style.top = (e.clientY - CR.top + 10) + "px";
    sonda.innerHTML = `<i style="background:rgb(${turbo((T - prof.Tmin) / (prof.Tmax - prof.Tmin)).join(",")})"></i>${(h.object.name || h.object.parent?.name || "").slice(0, 38)}${h.object.name || h.object.parent?.name ? "<br>" : ""}<b>${T.toFixed(prof.Tmax - prof.Tmin < 60 ? 1 : 0)} ${prof.unit}</b>`;
  });
  renderer.domElement.addEventListener("pointerleave", () => { sonda.hidden = true; });
  return {
    mod: () => mod, seteazaMod,
    profil(p) { Object.assign(prof, p); desLegenda(); },
    adaugaDecor(d) { decor.add(d); },
    actualizeazaTag: colecteazaTag
  };
}
