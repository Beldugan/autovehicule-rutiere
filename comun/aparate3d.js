/* Aparate de laborator 3D (realiste, materiale PBR): standul de încercare a termostatului – plita electrică cu placa ceramică,
   paharul Berzelius de 2 l cu apă, stativul cu clema și sârma de suspendare, termostatul cu element de ceară (flanșa cu garnitură și
   supapa de aerisire, puntea, știftul, talerul, capsula cu ceară, arcul, juga), termometrul digital cu sondă și comparatorul cu cadran
   care măsoară cursa talerului. Unități: metri. */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const mat = (o) => { const m = new THREE.MeshStandardMaterial(o); m.envMapIntensity = 0.7; return m; };
function scena(gazda, cam0, tinta) {
  gazda.innerHTML = `<div class="m3d a3d"><canvas></canvas><div class="m3d-ajutor">trageți = rotire · rotița = zoom</div></div>`;
  const cont = gazda.querySelector(".m3d"), canvas = cont.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(); const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 2, 0.01, 20); camera.position.set(...cam0);
  const ctl = new OrbitControls(camera, canvas); ctl.target.set(...tinta); ctl.enableDamping = true; ctl.minDistance = 0.15; ctl.maxDistance = 2.5; ctl.maxPolarAngle = Math.PI * 0.55;
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(0.8, 1.6, 1.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -0.6, right: 0.6, top: 0.6, bottom: -0.6, near: 0.2, far: 4 }); sun.shadow.bias = -0.0004; scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50555a, 0.45));
  // masa de laborator (blat compact HPL) și peretele cu faianță
  const blat = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.03, 0.7, 2, 0.006), mat({ color: 0xd9dcd5, roughness: 0.55, metalness: 0.02 })); blat.position.y = -0.015; blat.receiveShadow = true; scene.add(blat);
  const perete = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), mat({ color: 0xeef1f3, roughness: 0.9 })); perete.position.set(0, 0.6, -0.36); scene.add(perete);
  const tema = () => { const t = document.documentElement.getAttribute("data-theme"), inchis = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); scene.background = new THREE.Color(inchis ? 0x1a1f25 : 0xdfe4e8); perete.material.color.set(inchis ? 0x2a3038 : 0xeef1f3); };
  tema(); window.addEventListener("schimbare-tema", tema);
  return { cont, canvas, renderer, scene, camera, ctl,
    porneste(fn) { let tP = performance.now(); const bucla = t => { requestAnimationFrame(bucla); const dt = Math.min(0.1, (t - tP) / 1000); tP = t; if (!cont.getClientRects().length) return; fn(dt);
      ctl.update(); const w = cont.clientWidth, h = cont.clientHeight; if (canvas.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } renderer.render(scene, camera); }; requestAnimationFrame(bucla); } };
}
const add = (p, o) => { o.castShadow = o.receiveShadow = true; p.add(o); return o; };
const cyl = (p, r1, r2, h, m, x, y, z, seg = 40, deschis = false) => { const o = add(p, new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg, 1, deschis), m)); o.position.set(x, y, z); return o; };
const ecran = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, x: c.getContext("2d"), t }; };
function lcd(e, txt, unit, o = {}) {
  const { x, c } = e; x.fillStyle = o.fundal || "#aab79c"; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "rgba(0,0,0,.06)"; x.font = `bold ${c.height * 0.62}px 'Courier New',monospace`; x.textAlign = "right"; x.textBaseline = "middle"; x.fillText("88.88".slice(0, txt.length), c.width * 0.86, c.height * 0.56);
  x.fillStyle = o.cul || "#1b2416"; x.fillText(txt, c.width * 0.86, c.height * 0.56);
  x.font = `bold ${c.height * 0.2}px system-ui`; x.textAlign = "left"; x.fillText(unit, c.width * 0.04, c.height * 0.2); e.t.needsUpdate = true;
}

/* ===================================================================== încercarea termostatului în vasul cu apă */
export function creeazaBaie(gazda) {
  const S = scena(gazda, [0.34, 0.36, 0.56], [0.03, 0.19, 0.0]), sc = S.scene;
  const M = { inox: mat({ color: 0xc9ced3, roughness: 0.25, metalness: 0.95 }), otel: mat({ color: 0x9ea5ac, roughness: 0.35, metalness: 0.95 }), crom: mat({ color: 0xeef1f4, roughness: 0.12, metalness: 1 }),
    alama: mat({ color: 0xc9a043, roughness: 0.3, metalness: 1 }), negru: mat({ color: 0x1b1d20, roughness: 0.5 }), alb: mat({ color: 0xf2f2ee, roughness: 0.45 }), cauciuc: mat({ color: 0x141516, roughness: 0.9 }),
    fonta: mat({ color: 0x2f3337, roughness: 0.6, metalness: 0.6 }), galben: mat({ color: 0xf2c200, roughness: 0.45 }) };
  // plita electrică: carcasa emailată, placa ceramică (se înroșește), butonul de reglaj, ledul
  const PL = new THREE.Group(); sc.add(PL);
  add(PL, new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.07, 0.26, 4, 0.012), M.alb)).position.set(0, 0.035, 0);
  const mPlaca = new THREE.MeshPhysicalMaterial({ color: 0x111214, roughness: 0.12, metalness: 0.1, clearcoat: 1, emissive: 0xff2a00, emissiveIntensity: 0 });
  cyl(PL, 0.09, 0.09, 0.006, mPlaca, 0, 0.072, -0.01, 64);
  const spir = add(PL, new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.0025, 8, 64), new THREE.MeshBasicMaterial({ color: 0x220800 }))); spir.rotation.x = -Math.PI / 2; spir.position.set(0, 0.0755, -0.01);
  const buton = cyl(PL, 0.016, 0.018, 0.018, M.negru, 0.07, 0.03, 0.135, 32); buton.rotation.x = Math.PI / 2; add(buton, new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.004, 0.012), M.alb)).position.set(0, -0.01, 0.007);
  const led = cyl(PL, 0.004, 0.004, 0.004, new THREE.MeshBasicMaterial({ color: 0x330000 }), -0.07, 0.03, 0.131, 16); led.rotation.x = Math.PI / 2;
  // paharul Berzelius 2 l (sticlă borosilicată) cu gradații, apa
  const H0 = 0.078, RB = 0.068, HB = 0.2;
  const sticla = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transmission: 1, thickness: 0.004, ior: 1.47, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const pahar = cyl(sc, RB, RB, HB, sticla, 0, H0 + HB / 2, 0, 64, true); pahar.castShadow = false;
  cyl(sc, RB, RB, 0.004, sticla, 0, H0 + 0.002, 0, 64).castShadow = false;
  const buza = add(sc, new THREE.Mesh(new THREE.TorusGeometry(RB, 0.0025, 8, 64), sticla)); buza.rotation.x = Math.PI / 2; buza.position.y = H0 + HB;
  for (let k = 1; k <= 8; k++) { const l = add(sc, new THREE.Mesh(new THREE.BoxGeometry(k % 2 ? 0.012 : 0.02, 0.0012, 0.001), new THREE.MeshBasicMaterial({ color: 0xffffff }))); l.position.set(-0.02, H0 + k * 0.021, RB + 0.0006); }
  const HA = 0.165, apa = new THREE.MeshPhysicalMaterial({ color: 0xcfe8f6, roughness: 0.04, transmission: 0.92, thickness: 0.12, ior: 1.33, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const coloana = cyl(sc, RB - 0.003, RB - 0.003, HA, apa, 0, H0 + 0.004 + HA / 2, 0, 64); coloana.castShadow = false;
  const YA = H0 + 0.004 + HA;
  // stativul de laborator: talpa din fontă, tija, mufa, brațul orizontal, cârligul și sârma
  cyl(sc, 0.006, 0.006, 0.62, M.crom, -0.2, 0.31, -0.12, 20);
  add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.014, 0.24, 2, 0.004), M.fonta)).position.set(-0.2, 0.007, -0.05);
  add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.03, 0.03, 2, 0.004), M.otel)).position.set(-0.2, 0.47, -0.12);
  const brat = cyl(sc, 0.005, 0.005, 0.24, M.crom, -0.09, 0.47, -0.12, 16); brat.rotation.z = Math.PI / 2;
  const brat2 = cyl(sc, 0.004, 0.004, 0.13, M.crom, 0.0, 0.47, -0.06, 16); brat2.rotation.x = Math.PI / 2;
  // termostatul (Ø 54 mm): flanșa, garnitura, supapa de aerisire, puntea, știftul, talerul + capsula (mobile), arcul, juga
  const YF = 0.17, T = new THREE.Group(); T.position.set(0, YF, 0); sc.add(T);
  cyl(T, 0.027, 0.027, 0.0016, M.inox, 0, 0, 0, 64);
  const gar = add(T, new THREE.Mesh(new THREE.TorusGeometry(0.0255, 0.0018, 10, 64), M.cauciuc)); gar.rotation.x = Math.PI / 2; gar.position.y = 0.0015;
  cyl(T, 0.0018, 0.0018, 0.006, M.alama, 0.016, 0.002, 0, 12);
  const punte = add(T, new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0022, 8, 32, Math.PI), M.inox)); punte.scale.set(1, 1.1, 1); punte.position.y = 0.001;
  cyl(T, 0.0016, 0.0016, 0.04, M.crom, 0, -0.005, 0, 12);
  const mob = new THREE.Group(); T.add(mob);
  cyl(mob, 0.0185, 0.0185, 0.0015, M.alama, 0, -0.003, 0, 48);
  cyl(mob, 0.0085, 0.0085, 0.028, M.alama, 0, -0.019, 0, 32); cyl(mob, 0.006, 0.0085, 0.004, M.alama, 0, -0.035, 0, 32);
  const arc = add(T, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 81 }, (_, k) => new THREE.Vector3(0.0145 * Math.cos(k * 0.55), -k / 80, 0.0145 * Math.sin(k * 0.55)))), 240, 0.0011, 6), M.otel));
  [-1, 1].forEach(s => { const b = add(T, new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.034, 0.0012), M.inox)); b.position.set(s * 0.021, -0.017, 0); b.rotation.z = s * -0.18; });
  add(T, new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.0016, 0.006), M.inox)).position.set(0, -0.035, 0);
  const sarma = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.47, -0.0), new THREE.Vector3(0, YF + 0.03, 0), new THREE.Vector3(0, YF + 0.019, 0)]), 20, 0.0007, 6), M.otel); sc.add(sarma);
  // termometrul digital cu sondă (tija inox în apă, cablul spiralat, carcasa galbenă cu LCD)
  const sonda = cyl(sc, 0.0018, 0.0018, 0.2, M.inox, 0.038, H0 + 0.11, 0.02, 12); sonda.rotation.z = -0.12;
  cyl(sc, 0.005, 0.005, 0.035, M.negru, 0.05, H0 + 0.225, 0.02, 16).rotation.z = -0.12;
  const cab = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.053, 0.32, 0.02], [0.1, 0.35, -0.01], [0.2, 0.3, -0.03], [0.24, 0.22, -0.02]].map(v => new THREE.Vector3(...v))), 60, 0.0018, 8), M.negru); sc.add(cab);
  const TM = new THREE.Group(); TM.position.set(0.24, 0.17, -0.02); TM.rotation.set(-0.15, -0.55, 0); sc.add(TM);
  add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.1, 0.05, 2, 0.006), mat({ color: 0x3a3f45, roughness: 0.6 }))).position.set(0.24, 0.05, -0.04);   // suportul termometrului
  add(TM, new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.13, 0.024, 4, 0.01), M.galben)); add(TM, new THREE.Mesh(new RoundedBoxGeometry(0.058, 0.115, 0.004, 3, 0.006), M.negru)).position.z = 0.011;
  const eT = ecran(256, 128); add(TM, new THREE.Mesh(new THREE.PlaneGeometry(0.048, 0.024), new THREE.MeshBasicMaterial({ map: eT.t }))).position.set(0, 0.03, 0.0135);
  [[-0.012, -0.012], [0.012, -0.012], [-0.012, -0.035], [0.012, -0.035]].forEach(([x, y]) => { const b = cyl(TM, 0.006, 0.006, 0.004, mat({ color: 0x3e444a, roughness: 0.5 }), x, y, 0.014, 20); b.rotation.x = Math.PI / 2; });
  // comparatorul cu cadran pe suport magnetic (palpatorul sprijinit pe talerul supapei) – măsoară cursa
  cyl(sc, 0.004, 0.004, 0.33, M.crom, 0.12, 0.165, -0.09, 16);
  add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.04, 0.06, 2, 0.004), M.negru)).position.set(0.12, 0.02, -0.09);
  const br = cyl(sc, 0.0035, 0.0035, 0.12, M.crom, 0.062, 0.31, -0.09, 12); br.rotation.z = Math.PI / 2;
  const CMP = new THREE.Group(); CMP.position.set(0.0, 0.31, -0.09); sc.add(CMP);
  cyl(CMP, 0.024, 0.024, 0.014, M.crom, 0, 0, 0, 48).rotation.x = Math.PI / 2;
  const eC = ecran(256, 256); add(CMP, new THREE.Mesh(new THREE.CircleGeometry(0.021, 48), new THREE.MeshBasicMaterial({ map: eC.t }))).position.z = 0.0075;
  cyl(CMP, 0.0035, 0.0035, 0.02, M.crom, 0, -0.033, 0, 12);
  const palp = cyl(sc, 0.0012, 0.0012, 0.1, M.crom, 0.0, 0.2, -0.09, 8);   // tija palpatorului (coboară cu talerul)
  const rot = add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.09), M.crom)); rot.position.set(0, 0.167, -0.045);     // braț de transmitere până la taler
  // bulele (fierbere) și aburul
  const bule = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0, transparent: true, opacity: 0.6, depthWrite: false }), 60); sc.add(bule);
  const BL = Array.from({ length: 60 }, (_, k) => ({ x: (Math.random() - 0.5) * 0.1, z: (Math.random() - 0.5) * 0.1, y: H0 + Math.random() * HA, r: 0.0015 + Math.random() * 0.002 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sv = new THREE.Vector3();
  const st = { Tw: 60, s: 0, plita: 0 }, ult = [];
  function cadran(mm) {
    const { x, c } = eC, R = c.width / 2; x.fillStyle = "#fbfbf7"; x.beginPath(); x.arc(R, R, R, 0, Math.PI * 2); x.fill();
    for (let k = 0; k < 100; k++) { const a = k / 100 * Math.PI * 2 - Math.PI / 2, l = k % 10 === 0 ? 26 : k % 5 === 0 ? 18 : 11; x.strokeStyle = "#111"; x.lineWidth = k % 10 === 0 ? 3 : 1.5; x.beginPath(); x.moveTo(R + Math.cos(a) * (R - 6), R + Math.sin(a) * (R - 6)); x.lineTo(R + Math.cos(a) * (R - 6 - l), R + Math.sin(a) * (R - 6 - l)); x.stroke();
      if (k % 10 === 0) { x.fillStyle = "#111"; x.font = "bold 20px system-ui"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(k), R + Math.cos(a) * (R - 46), R + Math.sin(a) * (R - 46)); } }
    // cadranul mic (milimetri întregi) și acul mare (0,01 mm/div, o tură = 1 mm)
    x.strokeStyle = "#444"; x.lineWidth = 2; x.beginPath(); x.arc(R, R * 1.42, 26, 0, Math.PI * 2); x.stroke();
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2; x.beginPath(); x.moveTo(R + Math.cos(a) * 26, R * 1.42 + Math.sin(a) * 26); x.lineTo(R + Math.cos(a) * 20, R * 1.42 + Math.sin(a) * 20); x.stroke(); }
    const am = Math.floor(mm) / 10 * Math.PI * 2 - Math.PI / 2; x.strokeStyle = "#c62828"; x.lineWidth = 3; x.beginPath(); x.moveTo(R, R * 1.42); x.lineTo(R + Math.cos(am) * 22, R * 1.42 + Math.sin(am) * 22); x.stroke();
    const a = (mm % 1) * Math.PI * 2 - Math.PI / 2; x.strokeStyle = "#111"; x.lineWidth = 4; x.beginPath(); x.moveTo(R - Math.cos(a) * 30, R - Math.sin(a) * 30); x.lineTo(R + Math.cos(a) * (R - 16), R + Math.sin(a) * (R - 16)); x.stroke();
    x.fillStyle = "#222"; x.beginPath(); x.arc(R, R, 9, 0, Math.PI * 2); x.fill(); x.font = "15px system-ui"; x.fillText("0,01 mm", R, R * 0.62); eC.t.needsUpdate = true;
  }
  S.porneste(dt => {
    const pl = st.plita, k = pl === 2 ? 1 : pl === 1 ? 0.45 : 0;
    mPlaca.emissiveIntensity += (k * 0.55 - mPlaca.emissiveIntensity) * Math.min(1, dt / 2); spir.material.color.setRGB(0.15 + 0.85 * mPlaca.emissiveIntensity / 0.55, 0.05 + 0.2 * mPlaca.emissiveIntensity, 0.0);
    led.material.color.set(pl ? 0xff2a1a : 0x330000); buton.rotation.z = [-0.9, 0.4, 1.8][pl];
    mob.position.y = -st.s / 1000; arc.scale.y = Math.max(0.005, 0.034 - st.s / 1000) / 1; arc.position.y = -st.s / 1000 - 0.004; palp.position.y = 0.217 - st.s / 1000; rot.position.y = 0.167 - st.s / 1000;
    apa.color.setHSL(0.56, 0.45, 0.85 - (st.Tw - 20) / 400);
    const fierbe = Math.max(0, (st.Tw - 88) / 12); let n = 0;
    BL.forEach(b => { if (n >= Math.round(60 * fierbe)) return; b.y += (0.02 + b.r * 15) * dt; if (b.y > YA) { b.y = H0 + 0.006; b.x = (Math.random() - 0.5) * 0.11; b.z = (Math.random() - 0.5) * 0.11; } m4.compose(v.set(b.x, b.y, b.z), q, sv.setScalar(b.r)); bule.setMatrixAt(n++, m4); });
    bule.count = n; bule.instanceMatrix.needsUpdate = true;
    const tTxt = st.Tw.toFixed(1); if (ult[0] !== tTxt) { lcd(eT, tTxt, "°C   T1 K"); ult[0] = tTxt; }
    const sTxt = st.s.toFixed(3); if (ult[1] !== sTxt) { cadran(st.s); ult[1] = sTxt; }
  });
  return { seteaza(o) { Object.assign(st, o); }, vedere(p, t) { S.camera.position.set(...p); S.ctl.target.set(...t); } };
}
