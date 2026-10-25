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

/* ===================================================================== MAM I L4: standul senzorilor de temperatură
   Masa de laborator cu stativul și mănunchiul de senzori (NTC auto cu carcasă de alamă, LM35 în tub termocontractabil, DS18B20 în sondă
   de inox, termocuplu K cu manta și minifișă, termometrul etalon cu LCD), paharul cu apă la temperatura camerei, vasul Dewar cu apă caldă
   (în secțiune), placa de test cu divizorul NTC, punctele de test și conectorul X2, modulul MAX6675, Arduino Mega cu OLED, multimetrul
   cu sonde, mănușile termoizolante și cronometrul. Clic pe obiecte → opt.laClic(cheie). */
export function creeazaStandTemp(gazda, opt = {}) {
  const S = scena(gazda, [0.0, 0.56, 1.05], [-0.05, 0.14, 0.0]), sc = S.scene;
  S.ctl.maxDistance = 1.6; S.ctl.minDistance = 0.08;
  const M = { inox: mat({ color: 0xc9ced3, roughness: 0.22, metalness: 0.95 }), crom: mat({ color: 0xeef1f4, roughness: 0.12, metalness: 1 }), alama: mat({ color: 0xc9a043, roughness: 0.28, metalness: 1 }),
    negru: mat({ color: 0x1b1d20, roughness: 0.5 }), cauciuc: mat({ color: 0x141516, roughness: 0.85 }), alb: mat({ color: 0xf2f2ee, roughness: 0.45 }), fonta: mat({ color: 0x2f3337, roughness: 0.6, metalness: 0.6 }),
    galben: mat({ color: 0xf2b705, roughness: 0.6 }), gri: mat({ color: 0x3b3f45, roughness: 0.6 }), verde: mat({ color: 0x2e8b3e, roughness: 0.5 }), pcbT: mat({ color: 0x00878f, roughness: 0.5 }),
    pcbR: mat({ color: 0xb71c1c, roughness: 0.5 }), pcbA: mat({ color: 0x16337a, roughness: 0.5 }), aur: mat({ color: 0xd8b25a, roughness: 0.3, metalness: 1 }), albastru: mat({ color: 0x3949ab, roughness: 0.8 }) };
  const clic = [];                      // obiectele care răspund la clic (userData.k)
  const k_ = (o, k, et) => { o.userData.k = k; o.userData.et = et; clic.push(o); return o; };
  const sticla = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transmission: 1, thickness: 0.003, ior: 1.47, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const tub = (pts, r, m, seg = 40) => { const o = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(v => new THREE.Vector3(...v))), seg, r, 8), m); o.castShadow = true; return o; };

  /* ---- paharul cu apă la temperatura camerei (600 ml) */
  const PX = -0.27, RP = 0.045, HP = 0.125, HAP = 0.09;
  const pah = cyl(sc, RP, RP, HP, sticla, PX, HP / 2, 0.02, 64, true); pah.castShadow = false; k_(pah, "pahar", "Pahar cu apă la temperatura camerei");
  cyl(sc, RP, RP, 0.003, sticla, PX, 0.0015, 0.02, 64).castShadow = false;
  const bz = add(sc, new THREE.Mesh(new THREE.TorusGeometry(RP, 0.0018, 8, 64), sticla)); bz.rotation.x = Math.PI / 2; bz.position.set(PX, HP, 0.02);
  for (let k = 1; k <= 5; k++) { const l = add(sc, new THREE.Mesh(new THREE.BoxGeometry(k % 2 ? 0.01 : 0.016, 0.0011, 0.001), new THREE.MeshBasicMaterial({ color: 0xffffff }))); l.position.set(PX - 0.015, k * 0.02, 0.02 + RP + 0.0006); }
  const apaR = new THREE.MeshPhysicalMaterial({ color: 0x8cc4ea, roughness: 0.04, transmission: 0.55, thickness: 0.08, ior: 1.33, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  cyl(sc, RP - 0.0025, RP - 0.0025, HAP, apaR, PX, 0.003 + HAP / 2, 0.02, 64).castShadow = false;

  /* ---- vasul Dewar din inox (secțiune spre privitor) cu apă caldă */
  const DX = -0.1, RO = 0.068, RI = 0.054, HD = 0.2, HAD = 0.165, T0 = Math.PI / 4, TL = Math.PI * 1.5;
  const mExt = mat({ color: 0xd2d7dc, roughness: 0.25, metalness: 0.9, side: THREE.DoubleSide }), mInt = mat({ color: 0xaab2b9, roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide });
  const g = new THREE.Group(); g.position.set(DX, 0, 0.02); sc.add(g);
  const pe = (r, m) => { const o = add(g, new THREE.Mesh(new THREE.CylinderGeometry(r, r, HD, 64, 1, true, T0, TL), m)); o.position.y = HD / 2; return o; };
  k_(pe(RO, mExt), "termos", "Vas Dewar cu apă caldă (secțiune)"); pe(RI, mInt);
  const fund = add(g, new THREE.Mesh(new THREE.CylinderGeometry(RO, RO, 0.012, 64, 1, false, T0, TL), mExt)); fund.position.y = 0.006;
  const inel = add(g, new THREE.Mesh(new THREE.RingGeometry(RI, RO, 64, 1, T0 - Math.PI / 2, TL), mat({ color: 0x2f3439, roughness: 0.7, side: THREE.DoubleSide }))); inel.rotation.x = -Math.PI / 2; inel.position.y = HD;
  // fețele secțiunii (peretele dublu cu vid)
  [T0, T0 + TL].forEach(a => { const f = add(g, new THREE.Mesh(new THREE.PlaneGeometry(RO - RI, HD), mat({ color: 0xe9ecef, roughness: 0.6, side: THREE.DoubleSide })));
    f.position.set(Math.sin(a) * (RO + RI) / 2, HD / 2, Math.cos(a) * (RO + RI) / 2); f.rotation.y = a + Math.PI / 2; });
  const apaC = new THREE.MeshPhysicalMaterial({ color: 0xe9a07a, roughness: 0.05, transmission: 0.6, thickness: 0.1, ior: 1.33, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const apaD = add(g, new THREE.Mesh(new THREE.CylinderGeometry(RI - 0.001, RI - 0.001, HAD, 64, 1, false, T0, TL), apaC)); apaD.position.y = 0.012 + HAD / 2; apaD.castShadow = false;
  [T0, T0 + TL].forEach(a => { const f = add(g, new THREE.Mesh(new THREE.PlaneGeometry(RI, HAD), apaC)); f.castShadow = false; f.position.set(Math.sin(a) * RI / 2, 0.012 + HAD / 2, Math.cos(a) * RI / 2); f.rotation.y = a + Math.PI / 2; });
  // capacul lângă vas
  const cap = cyl(sc, 0.06, 0.06, 0.02, mat({ color: 0x2f3439, roughness: 0.6 }), DX + 0.1, 0.01, -0.17, 48); k_(cap, "capac", "Capacul vasului (scos)");
  cyl(sc, 0.02, 0.02, 0.012, M.gri, DX + 0.1, 0.026, -0.17, 24);
  // aburul
  const abM = new THREE.SpriteMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })(), transparent: true, depthWrite: false });
  const abur = Array.from({ length: 18 }, () => { const s = new THREE.Sprite(abM.clone()); sc.add(s); return { s, t: Math.random() * 3, x: (Math.random() - 0.5) * 0.06, z: (Math.random() - 0.5) * 0.06 }; });

  /* ---- stativul: talpa din fontă, tija, mufa, brațul, clema; mănunchiul de senzori */
  const SX = -0.44, SZ = 0.02;
  add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.014, 0.2, 2, 0.004), M.fonta)).position.set(SX + 0.02, 0.007, 0.0);
  k_(cyl(sc, 0.006, 0.006, 0.6, M.crom, SX, 0.3, SZ, 20), "aer", "Stativ (clic = senzorii în aer)");
  const mufa = add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.028, 0.028, 0.028, 2, 0.004), M.fonta));
  const bratG = new THREE.Group(); sc.add(bratG); const brat = cyl(bratG, 0.005, 0.005, 1, M.crom, 0, 0, 0, 16); brat.rotation.z = Math.PI / 2;
  const B = new THREE.Group(); sc.add(B);           // mănunchiul (originea = vârfurile)
  const LXo = { ntc: -0.026, lm: -0.013, ds: 0.0, tc: 0.011, et: 0.024 }, TOPo = { ntc: 0.068, lm: 0.118, ds: 0.122, tc: 0.165 };
  { const G = new THREE.Group(); G.position.x = LXo.ntc; B.add(G);       // NTC auto
    cyl(G, 0.0042, 0.0042, 0.02, M.alama, 0, 0.012, 0, 20); add(G, new THREE.Mesh(new THREE.SphereGeometry(0.0042, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.alama)).position.y = 0.002;
    cyl(G, 0.006, 0.006, 0.01, M.alama, 0, 0.027, 0, 20); cyl(G, 0.0085, 0.0085, 0.011, M.alama, 0, 0.037, 0, 6);
    add(G, new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.024, 0.011, 2, 0.002), M.negru)).position.y = 0.055; }
  { const G = new THREE.Group(); G.position.x = LXo.lm; B.add(G);        // LM35 în tub termocontractabil
    cyl(G, 0.0034, 0.0034, 0.012, M.negru, 0, 0.007, 0, 16); add(G, new THREE.Mesh(new THREE.SphereGeometry(0.0034, 16, 8), M.negru)).position.y = 0.001; cyl(G, 0.0026, 0.0026, 0.105, M.negru, 0, 0.066, 0, 12); }
  { const G = new THREE.Group(); G.position.x = LXo.ds; B.add(G);        // DS18B20 în sondă de inox
    cyl(G, 0.003, 0.003, 0.05, M.inox, 0, 0.027, 0, 20); add(G, new THREE.Mesh(new THREE.SphereGeometry(0.003, 16, 8), M.inox)).position.y = 0.002; cyl(G, 0.0034, 0.0034, 0.006, M.negru, 0, 0.055, 0, 16); cyl(G, 0.0022, 0.0022, 0.065, M.negru, 0, 0.09, 0, 10); }
  { const G = new THREE.Group(); G.position.x = LXo.tc; B.add(G);        // termocuplu K cu manta și minifișă verde
    cyl(G, 0.00075, 0.00075, 0.12, M.inox, 0, 0.06, 0, 10); add(G, new THREE.Mesh(new RoundedBoxGeometry(0.008, 0.028, 0.008, 2, 0.002), M.gri)).position.y = 0.132;
    add(G, new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.016, 0.009, 2, 0.002), M.verde)).position.y = 0.155; }
  const eE = ecran(256, 96);
  { const G = new THREE.Group(); G.position.x = LXo.et; B.add(G);        // termometrul etalon
    cyl(G, 0.0015, 0.0015, 0.11, M.inox, 0, 0.055, 0, 10);
    add(G, new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.11, 0.012, 3, 0.004), M.alb)).position.y = 0.165;
    const s = add(G, new THREE.Mesh(new THREE.PlaneGeometry(0.016, 0.006 * 2.4), new THREE.MeshBasicMaterial({ map: eE.t }))); s.position.set(0, 0.19, 0.0062);
    cyl(G, 0.003, 0.003, 0.002, mat({ color: 0xd32f2f, roughness: 0.4 }), 0, 0.17, 0.006, 16).rotation.x = Math.PI / 2; }
  add(B, new THREE.Mesh(new RoundedBoxGeometry(0.068, 0.01, 0.014, 2, 0.002), M.inox)).position.set(0, 0.1, 0);      // clema
  B.traverse(o => { if (o.isMesh) k_(o, "senzori", "Mănunchiul de senzori"); });
  const POZ = { aer: [-0.19, 0.205], pahar: [PX, 0.018], apa: [DX, 0.03] };
  const st = { poz: "aer", bx: POZ.aer[0], by: POZ.aer[1], anim: null };

  /* ---- placa de test (breadboard) cu imprimeu, componentele și punctele de test */
  const BB = new THREE.Vector3(0.11, 0, 0.09), BW = 0.165, BD = 0.055;
  const cbb = document.createElement("canvas"); cbb.width = 1320; cbb.height = 440; const xb = cbb.getContext("2d"), K = 8000;
  const UV = (u, v) => [(u + BW / 2) * K, (v + BD / 2) * K];
  xb.fillStyle = "#f3f1ea"; xb.fillRect(0, 0, 1320, 440); xb.fillStyle = "#c62828"; xb.fillRect(20, 14, 1280, 4); xb.fillStyle = "#1565c0"; xb.fillRect(20, 422, 1280, 4);
  xb.fillStyle = "#bdb8ad"; for (let i = 0; i < 60; i++) { for (let j = 0; j < 2; j++) { xb.fillRect(30 + i * 21, 26 + j * 18, 8, 8); xb.fillRect(30 + i * 21, 384 + j * 18, 8, 8); } for (let j = 0; j < 10; j++) xb.fillRect(30 + i * 21, 90 + j * 26 + (j > 4 ? 20 : 0), 8, 8); }
  const TPu = { t5V: [-0.072, -0.016], tGND: [-0.038, 0.018], tUs: [-0.026, -0.012], tLM: [0.006, -0.004], n1: [-0.066, 0.004], n2: [-0.066, 0.016] };
  const TPet = { t5V: "TP 5V", tGND: "TP GND", tUs: "TP Us (A0)", tLM: "TP LM35 (A1)", n1: "NTC 1", n2: "NTC 2" };
  xb.font = "bold 26px system-ui"; xb.fillStyle = "#222"; xb.textAlign = "center";
  Object.entries(TPu).forEach(([k, [u, v]]) => { const [x, y] = UV(u, v); xb.fillText(TPet[k], x, y + (v > 0.01 ? 52 : -30)); });
  xb.font = "22px system-ui"; xb.fillText("Rp 10 kΩ", ...UV(-0.049, -0.002)); xb.fillText("LM35", ...UV(-0.008, -0.009)); xb.fillText("DS18B20  4,7 kΩ", ...UV(0.032, -0.006)); xb.fillText("X2", ...UV(-0.078, 0.011));
  const tbb = new THREE.CanvasTexture(cbb); tbb.colorSpace = THREE.SRGBColorSpace; tbb.anisotropy = 8;
  const pBB = add(sc, new THREE.Mesh(new RoundedBoxGeometry(BW, 0.009, BD, 2, 0.002), mat({ color: 0xf3f1ea, roughness: 0.7 }))); pBB.position.copy(BB).setY(0.0045); k_(pBB, "bb", "Placa de test");
  const sBB = add(sc, new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.002, BD - 0.002), mat({ map: tbb, roughness: 0.7 }))); sBB.rotation.x = -Math.PI / 2; sBB.position.copy(BB).setY(0.0092);
  const W = (u, v, y = 0) => new THREE.Vector3(BB.x + u, 0.0092 + y, BB.z + v);
  // rezistor (corp bej/albastru cu benzi)
  const rez = (u0, u1, v, benzi, cul, k, et) => { const c = document.createElement("canvas"); c.width = 128; c.height = 32; const x = c.getContext("2d"); x.fillStyle = cul; x.fillRect(0, 0, 128, 32); benzi.forEach((b, i) => { x.fillStyle = b; x.fillRect(22 + i * 22, 0, 10, 32); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const L = Math.abs(u1 - u0);
    const o = cyl(sc, 0.0016, 0.0016, L * 0.45, mat({ map: t, roughness: 0.5 }), 0, 0, 0, 16); o.rotation.z = Math.PI / 2; o.position.copy(W((u0 + u1) / 2, v, 0.004)); k_(o, k, et);
    sc.add(tub([[BB.x + u0, 0.0092, BB.z + v], [BB.x + u0, 0.0132, BB.z + v], [BB.x + (u0 + u1) / 2, 0.004 + 0.0092, BB.z + v], [BB.x + u1, 0.0132, BB.z + v], [BB.x + u1, 0.0092, BB.z + v]], 0.0003, M.crom, 20)); };
  rez(-0.058, -0.038, -0.012, ["#7b4a12", "#111", "#e67e22", "#7b4a12"], "#8fb8de", "rp", "Rp 10 kΩ, 1 %"); rez(0.03, 0.05, -0.012, ["#f1c40f", "#8e44ad", "#c0392b", "#d4ac0d"], "#d9c49a", "pu", "Pull-up 1-Wire 4,7 kΩ");
  // conectorii (mufe cu 3 pini) pentru LM35 și DS18B20
  [[-0.008, -0.019], [0.02, -0.019]].forEach(([u, v]) => { add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.009, 0.007, 0.004, 1, 0.001), M.negru)).position.copy(W(u, v, 0.0035)); });
  // punctele de test (bucle de sârmă colorate pe stâlpi)
  const TPcol = { t5V: 0xc62828, tGND: 0x111111, tUs: 0xf9d71c, tLM: 0xff9800, n1: 0x9e9e9e, n2: 0x9e9e9e }, TPW = {};
  Object.entries(TPu).forEach(([k, [u, v]]) => { const mc = mat({ color: TPcol[k], roughness: 0.4 }); cyl(sc, 0.0018, 0.0022, 0.006, mc, ...W(u, v, 0.003).toArray(), 16);
    const b = add(sc, new THREE.Mesh(new THREE.TorusGeometry(0.0022, 0.0006, 8, 20), M.crom)); b.position.copy(W(u, v, 0.0085)); b.rotation.y = 0.6;
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); h.position.copy(W(u, v, 0.007)); sc.add(h); k_(h, k, TPet[k]); TPW[k] = W(u, v, 0.009); });
  // traseele vizibile: nodul divizorului
  sc.add(tub([TPW.tUs.toArray(), [BB.x - 0.038, 0.0105, BB.z - 0.012], [BB.x - 0.038, 0.0105, BB.z + 0.004], [BB.x - 0.066, 0.0105, BB.z + 0.004]].map(a => a), 0.0006, mat({ color: 0x1f5f9e, roughness: 0.5 }), 30));
  // conectorul X2: partea plăcii (fixă) și partea senzorului (se trage la decuplare)
  const x2a = add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.01, 0.009, 0.012, 2, 0.0015), M.negru)); x2a.position.copy(W(-0.078, 0.01, 0.0045)); k_(x2a, "x2", "Conectorul X2 al NTC-ului");
  const x2b = add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.008, 0.011, 2, 0.0015), mat({ color: 0x4a5058, roughness: 0.5 }))); k_(x2b, "x2", "Conectorul X2 al NTC-ului");
  // modulul MAX6675 (PCB roșu) cu clema verde pentru termocuplu
  const MX = new THREE.Group(); MX.position.copy(W(0.06, 0.008, 0.006)); sc.add(MX);
  add(MX, new THREE.Mesh(new RoundedBoxGeometry(0.025, 0.0016, 0.032, 1, 0.0006), M.pcbR)).userData = {}; k_(MX.children[0], "max", "Modulul MAX6675 (termocuplu K)");
  add(MX, new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0018, 0.005), M.negru)).position.set(0, 0.0015, 0.002);
  add(MX, new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.008, 0.007, 1, 0.001), M.verde)).position.set(0, 0.0048, -0.011);
  [-0.0035, 0.0035].forEach(x => cyl(MX, 0.0018, 0.0018, 0.0012, M.crom, x, 0.0092, -0.011, 12));

  /* ---- Arduino Mega 2560 și OLED-ul */
  const MG = new THREE.Group(); MG.position.set(0.11, 0, -0.06); sc.add(MG);
  const pm = add(MG, new THREE.Mesh(new RoundedBoxGeometry(0.1016, 0.0016, 0.0533, 1, 0.0008), M.pcbT)); pm.position.y = 0.008; k_(pm, "mega", "Arduino Mega 2560");
  [[-0.045, -0.022], [0.045, -0.022], [-0.045, 0.022], [0.045, 0.022]].forEach(([x, z]) => cyl(MG, 0.0018, 0.0018, 0.008, mat({ color: 0xdddddd, roughness: 0.4 }), x, 0.004, z, 10));
  add(MG, new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.011, 0.012), M.crom)).position.set(-0.05, 0.0145, -0.008);           // USB
  add(MG, new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.011, 0.009), M.negru)).position.set(-0.049, 0.0145, 0.016);          // alimentare
  const chip = add(MG, new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.0014, 0.014), M.negru)); chip.position.set(0.012, 0.0095, 0.002); chip.rotation.y = Math.PI / 4;
  [[0.0, -0.0245, 0.072], [-0.004, 0.0245, 0.07]].forEach(([x, z, l]) => add(MG, new THREE.Mesh(new THREE.BoxGeometry(l, 0.0085, 0.0025), M.negru)).position.set(x, 0.0132, z));
  add(MG, new THREE.Mesh(new THREE.BoxGeometry(0.0052, 0.0085, 0.044), M.negru)).position.set(0.046, 0.0132, 0.0);
  const ledON = cyl(MG, 0.0009, 0.0009, 0.001, new THREE.MeshBasicMaterial({ color: 0x113311 }), -0.032, 0.0092, -0.012, 8), ledL = cyl(MG, 0.0009, 0.0009, 0.001, new THREE.MeshBasicMaterial({ color: 0x332a11 }), -0.032, 0.0092, -0.016, 8), ledTX = cyl(MG, 0.0009, 0.0009, 0.001, new THREE.MeshBasicMaterial({ color: 0x332a11 }), -0.032, 0.0092, -0.008, 8);
  const rst = cyl(MG, 0.002, 0.002, 0.003, mat({ color: 0xc62828, roughness: 0.4 }), -0.04, 0.0105, -0.02, 12); k_(rst, "rst", "Butonul RESET");
  const usb = tub([[0.11 - 0.058, 0.0145, -0.068], [-0.0, 0.02, -0.1], [-0.05, 0.004, -0.25], [-0.1, 0.003, -0.34]], 0.0022, M.negru, 30); sc.add(usb);
  // OLED pe suport de acril
  const OL = new THREE.Group(); OL.position.set(0.215, 0, -0.07); OL.rotation.y = -0.25; sc.add(OL);
  add(OL, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.03), sticla)).position.y = 0.002;
  const pol = add(OL, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.0025), sticla)); pol.position.set(0, 0.027, -0.004); pol.rotation.x = -0.25;
  const OM = new THREE.Group(); OM.position.set(0, 0.034, -0.0015); OM.rotation.x = -0.25; OL.add(OM); OM.scale.setScalar(1.3);
  add(OM, new THREE.Mesh(new THREE.BoxGeometry(0.027, 0.0276, 0.0016), M.pcbA)); k_(OM.children[0], "oled", "Afișaj OLED SSD1306");
  const eO = ecran(256, 128); const so = add(OM, new THREE.Mesh(new THREE.PlaneGeometry(0.0245, 0.0125), new THREE.MeshBasicMaterial({ map: eO.t }))); so.position.set(0, -0.001, 0.0009);
  [0, 1, 2, 3].forEach(i => add(OM, new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.004, 0.0012), M.aur)).position.set(-0.0038 + i * 0.00254, 0.0145, 0.0005));
  // firele (jumpere) placa de test → Mega și OLED → Mega
  const jump = (a, b, c) => { const m = mat({ color: c, roughness: 0.5 }); const mid = a.clone().lerp(b, 0.5); mid.y = Math.max(a.y, b.y) + 0.025; sc.add(tub([a.toArray(), mid.toArray(), b.toArray()], 0.0009, m, 24)); };
  const hdr = (x, z) => new THREE.Vector3(0.11 + x, 0.018, -0.06 + z);
  jump(W(-0.03, -0.012, 0.004), hdr(0.006, 0.0245), 0xf9d71c); jump(W(0.006, -0.004, 0.004), hdr(0.01, 0.0245), 0xff9800); jump(W(0.03, -0.012, 0.006), hdr(0.03, -0.0245), 0x8e24aa);
  jump(W(-0.08, -0.024, 0.002), hdr(-0.016, 0.0245), 0xe53935); jump(W(-0.08, 0.024, 0.002), hdr(-0.012, 0.0245), 0x222222);
  [0x43a047, 0x1e88e5, 0xfdd835].forEach((c, i) => jump(W(0.072, 0.012 + i * 0.004, 0.002), hdr(0.046, -0.01 + i * 0.006), c));
  [0x222222, 0xe53935, 0x1e88e5, 0x43a047].forEach((c, i) => { const a = new THREE.Vector3(0.215 - 0.004 + i * 0.003, 0.055, -0.072); jump(a, hdr(0.025 + i * 0.003, -0.0245), c); });

  /* ---- multimetrul (carcasă galbenă, LCD, comutator rotativ, borne) cu sondele */
  const DM = new THREE.Group(); DM.position.set(0.31, 0.03, 0.06); DM.rotation.set(-1.05, -0.3, 0); sc.add(DM);
  add(DM, new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.17, 0.035, 4, 0.01), M.galben)); add(DM, new THREE.Mesh(new RoundedBoxGeometry(0.072, 0.155, 0.006, 3, 0.006), M.gri)).position.z = 0.016;
  k_(DM.children[0], "dmm", "Multimetru"); k_(DM.children[1], "dmm", "Multimetru");
  const eD = ecran(320, 128); add(DM, new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.024), new THREE.MeshBasicMaterial({ map: eD.t }))).position.set(0, 0.052, 0.0195);
  const kn = cyl(DM, 0.019, 0.02, 0.008, M.negru, 0, -0.008, 0.022, 32); kn.rotation.x = Math.PI / 2; k_(kn, "dmmKnob", "Comutatorul rotativ (clic = OFF → V⎓ → Ω)");
  const ind = add(kn, new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.009, 0.018), M.galben)); ind.position.set(0, 0.0045, 0.006);
  const cD = document.createElement("canvas"); cD.width = 256; cD.height = 256; { const x = cD.getContext("2d"); x.fillStyle = "#3b3f45"; x.fillRect(0, 0, 256, 256); x.fillStyle = "#fff"; x.font = "bold 28px system-ui"; x.textAlign = "center"; [["OFF", -60], ["V⎓", 0], ["Ω", 60]].forEach(([t, a]) => x.fillText(t, 128 + 100 * Math.sin(a * Math.PI / 180), 140 - 100 * Math.cos(a * Math.PI / 180))); }
  const tD = new THREE.CanvasTexture(cD); tD.colorSpace = THREE.SRGBColorSpace; add(DM, new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.068), new THREE.MeshBasicMaterial({ map: tD, transparent: true }))).position.set(0, -0.008, 0.0192);
  const bornaR = cyl(DM, 0.0045, 0.0045, 0.004, mat({ color: 0xd32f2f, roughness: 0.4 }), 0.02, -0.06, 0.02, 16), bornaN = cyl(DM, 0.0045, 0.0045, 0.004, M.negru, -0.02, -0.06, 0.02, 16); bornaR.rotation.x = bornaN.rotation.x = Math.PI / 2;
  const sondaM = cul => { const G = new THREE.Group(); sc.add(G); cyl(G, 0.0006, 0.0006, 0.018, M.crom, 0, 0.009, 0, 8); cyl(G, 0.0032, 0.0032, 0.05, mat({ color: cul, roughness: 0.5 }), 0, 0.045, 0, 16); cyl(G, 0.0045, 0.0045, 0.004, mat({ color: cul, roughness: 0.5 }), 0, 0.022, 0, 16); return G; };
  const sR = sondaM(0xd32f2f), sN = sondaM(0x1b1d20); let firR = null, firN = null;
  const LOC = { dmmR: new THREE.Vector3(0.27, 0.003, 0.2), dmmB: new THREE.Vector3(0.25, 0.003, 0.21) };

  /* ---- mănușile și cronometrul */
  const MAN = new THREE.Group(); MAN.position.set(0.06, 0.006, 0.24); MAN.rotation.y = 0.4; sc.add(MAN);
  [-0.02, 0.025].forEach((dx, j) => { const G = new THREE.Group(); G.position.x = dx; G.rotation.y = j ? -0.3 : 0.2; MAN.add(G); const pal = add(G, new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.012, 0.05, 3, 0.006), M.albastru)); k_(pal, "manusi", "Mănuși termoizolante");
    [-0.014, -0.005, 0.004, 0.013].forEach((x, i) => { const f = add(G, new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.03 - Math.abs(i - 1.5) * 0.004, 4, 8), M.albastru)); f.rotation.x = Math.PI / 2; f.position.set(x, 0, -0.04); k_(f, "manusi", "Mănuși termoizolante"); });
    const d = add(G, new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.018, 4, 8), M.albastru)); d.rotation.set(Math.PI / 2, 0, 0.9); d.position.set(0.025, 0, -0.01); k_(d, "manusi", "Mănuși termoizolante");
    add(G, new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.05, 20), M.albastru)).rotation.x = Math.PI / 2; G.children[G.children.length - 1].position.z = 0.045; G.children[G.children.length - 1].scale.set(1, 1, 0.45); });
  const CS = new THREE.Group(); CS.position.set(0.36, 0, -0.16); CS.rotation.y = -0.4; sc.add(CS);
  add(CS, new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.06, 0.03, 3, 0.006), M.gri)).position.y = 0.03; k_(CS.children[0], "ceas", "Cronometru de laborator");
  const eC = ecran(320, 160); add(CS, new THREE.Mesh(new THREE.PlaneGeometry(0.078, 0.039), new THREE.MeshBasicMaterial({ map: eC.t }))).position.set(0, 0.032, 0.0155);

  /* ---- cablurile senzorilor (se refac când stativul se mișcă) */
  let cabluri = [];
  const capete = { ntc: () => x2b.position.clone().add(new THREE.Vector3(-0.006, 0, 0)), lm: () => W(-0.008, -0.019, 0.006), ds: () => W(0.02, -0.019, 0.006), tc: () => MX.position.clone().add(new THREE.Vector3(0, 0.009, -0.011)) };
  const culC = { ntc: [0x2b2f35, 0.0022], lm: [0x222222, 0.0016], ds: [0x1b1d20, 0.0019], tc: [0x2e7d32, 0.0009] };
  function refaCabluri() {
    cabluri.forEach(c => { sc.remove(c); c.geometry.dispose(); }); cabluri = [];
    Object.keys(capete).forEach(k => { const a = new THREE.Vector3(st.bx + LXo[k], st.by + TOPo[k], SZ), b = capete[k]();
      const pts = [a, a.clone().add(new THREE.Vector3(0, 0.06, 0)), new THREE.Vector3((a.x + b.x) / 2, Math.max(a.y + 0.02, 0.16), (a.z + b.z) / 2 - 0.06), b.clone().add(new THREE.Vector3(-0.03, 0.03, 0)), b];
      const c = tub(pts.map(p => p.toArray()), culC[k][1], mat({ color: culC[k][0], roughness: 0.6 }), 50); sc.add(c); cabluri.push(c); });
  }
  function puneStativ() {
    B.position.set(st.bx, st.by, SZ); const yb = st.by + 0.1;
    mufa.position.set(SX, yb, SZ); const L = st.bx - 0.034 - SX; bratG.position.set(SX + L / 2, yb, SZ); brat.scale.y = L;
    refaCabluri();
  }
  let dec = null;
  function puneX2(d) { if (d === dec) return; dec = d; x2b.position.copy(W(d ? -0.1 : -0.089, 0.01, 0.0045)); refaCabluri(); }
  puneX2(false); puneStativ();

  /* ---- interacțiunea: clic pe obiecte și eticheta la trecerea mouse-ului */
  const tip = document.createElement("div"); tip.className = "a3d-tip"; tip.hidden = true; S.cont.appendChild(tip);
  const rc = new THREE.Raycaster(), mp = new THREE.Vector2(); let jos = null;
  const tinta = e => { const r = S.canvas.getBoundingClientRect(); mp.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rc.setFromCamera(mp, S.camera); const h = rc.intersectObjects(clic, false)[0]; return h ? h.object : null; };
  S.canvas.addEventListener("pointerdown", e => { jos = [e.clientX, e.clientY]; });
  S.canvas.addEventListener("pointerup", e => { if (!jos || Math.hypot(e.clientX - jos[0], e.clientY - jos[1]) > 5) return; const o = tinta(e); if (o && opt.laClic) opt.laClic(o.userData.k, e); });
  S.canvas.addEventListener("pointermove", e => { if (e.buttons) { tip.hidden = true; return; } const o = tinta(e); S.canvas.style.cursor = o ? "pointer" : "";
    if (o) { const r = S.cont.getBoundingClientRect(); tip.textContent = o.userData.et; tip.style.left = (e.clientX - r.left + 14) + "px"; tip.style.top = (e.clientY - r.top + 10) + "px"; tip.hidden = false; } else tip.hidden = true; });
  S.canvas.addEventListener("pointerleave", () => { tip.hidden = true; });

  /* ---- starea primită din simulator */
  const V = { poz: "aer", et: "", oled: null, dmm: { mod: "OFF", txt: "", u: "", r: "nc", b: "nc" }, dec: false, manusi: false, run: false, rec: false, ceas: "00:00", ceasP: "", Tw: 60, tx: false };
  const ult = {};
  function oled() {
    const { x, c } = eO; x.fillStyle = "#050608"; x.fillRect(0, 0, c.width, c.height); if (!V.run) { eO.t.needsUpdate = true; return; }
    x.font = "bold 17px 'Courier New',monospace"; x.fillStyle = "#ffd400"; x.textAlign = "left"; x.fillText(V.oled ? V.oled.titlu : "", 6, 18);
    x.fillStyle = "#5fd3ff"; x.font = "bold 22px 'Courier New',monospace"; (V.oled ? V.oled.linii : ["pornire…"]).forEach((l, i) => x.fillText(l, 6, 46 + i * 23)); eO.t.needsUpdate = true;
  }
  function dmmLcd() {
    const { x, c } = eD; x.fillStyle = "#bfd0b0"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1d2414";
    if (V.dmm.mod !== "OFF") { x.font = "bold 74px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(V.dmm.txt, 290, 92); x.font = "bold 22px system-ui"; x.fillText(V.dmm.u, 300, 120); x.textAlign = "left"; x.fillText("AUTO", 10, 26); }
    eD.t.needsUpdate = true;
  }
  function ceas() { const { x, c } = eC; x.fillStyle = "#0f1a12"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#7dff8a"; x.font = "bold 76px 'Courier New',monospace"; x.textAlign = "center"; x.fillText(V.ceas, 160, 86); x.font = "20px system-ui"; x.fillStyle = "#ddd"; x.fillText(V.ceasP, 160, 130); eC.t.needsUpdate = true; }
  function sonde() {
    const pune = (G, k, loc, bor, fir) => { const p = TPW[k] ? TPW[k] : loc; G.position.copy(p); G.rotation.set(TPW[k] ? 0 : Math.PI / 2, 0, TPW[k] ? 0.15 : 0.4);
      if (fir) { sc.remove(fir); fir.geometry.dispose(); }
      const a = bor.getWorldPosition(new THREE.Vector3()), top = TPW[k] ? p.clone().add(new THREE.Vector3(-0.0105, 0.069, 0)) : p.clone().add(new THREE.Vector3(0.0, 0.004, -0.04));
      const m = new THREE.Vector3((a.x + top.x) / 2, 0.004, Math.max(a.z, top.z) + 0.05);
      const f = tub([a.toArray(), a.clone().add(new THREE.Vector3(0, -0.012, 0.02)).toArray(), m.toArray(), top.clone().add(new THREE.Vector3(0.01, 0.02, 0.02)).toArray(), top.toArray()], 0.0012, mat({ color: G === sR ? 0xd32f2f : 0x1b1d20, roughness: 0.6 }), 48); sc.add(f); return f; };
    firR = pune(sR, V.dmm.r, LOC.dmmR, bornaR, firR); firN = pune(sN, V.dmm.b, LOC.dmmB, bornaN, firN);
  }
  S.scene.updateMatrixWorld(true); sonde();
  let tA = 0;
  S.porneste(dt => {
    tA += dt;
    // deplasarea stativului: ridicare – translație – coborâre
    const a = st.anim;
    if (a) { a.t += dt; const f = Math.min(1, a.t / a.d), yu = POZ.aer[1], f1 = Math.min(1, f * 3), f2 = Math.max(0, Math.min(1, f * 3 - 1)), f3 = Math.max(0, f * 3 - 2);
      const y0 = a.y0 + (Math.max(a.y0, yu) - a.y0) * f1; st.bx = a.x0 + (a.x1 - a.x0) * f2; st.by = f3 > 0 ? Math.max(a.y0, yu) + (a.y1 - Math.max(a.y0, yu)) * f3 : y0; puneStativ(); if (f >= 1) st.anim = null; }
    // aburul deasupra vasului
    abur.forEach(p => { p.t += dt; if (p.t > 3) { p.t = 0; p.x = (Math.random() - 0.5) * 0.06; p.z = (Math.random() - 0.5) * 0.06; } const u = p.t / 3, k = Math.max(0, (V.Tw - 35) / 30);
      p.s.position.set(DX + p.x + Math.sin(p.t * 2) * 0.006, HD + 0.01 + u * 0.12, 0.02 + p.z); p.s.scale.setScalar(0.02 + u * 0.05); p.s.material.opacity = Math.sin(u * Math.PI) * 0.5 * Math.min(1, k); });
    apaC.color.setHSL(0.06, 0.55, 0.8 - Math.max(0, V.Tw - 20) / 250);
    MAN.visible = !V.manusi;
    ledON.material.color.set(V.run ? 0x3cff4a : 0x113311); ledL.material.color.set(V.rec ? 0xffd04a : 0x332a11); ledTX.material.color.set(V.tx ? 0xffd04a : 0x332a11);
    kn.rotation.y = { OFF: 1.05, V: 0, R: -1.05 }[V.dmm.mod];
    if (ult.et !== V.et) { ult.et = V.et; const { x, c } = eE; x.fillStyle = "#bfd0b0"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1d2414"; x.font = "bold 70px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(V.et, 236, 74); eE.t.needsUpdate = true; }
    const ko = JSON.stringify([V.run, V.oled]); if (ult.o !== ko && tA > 0.1) { ult.o = ko; oled(); tA = 0; }
    const kd = JSON.stringify(V.dmm); if (ult.d !== kd) { const sch = !ult.d || JSON.parse(ult.d).r !== V.dmm.r || JSON.parse(ult.d).b !== V.dmm.b; ult.d = kd; dmmLcd(); if (sch) sonde(); }
    const kc = V.ceas + V.ceasP; if (ult.c !== kc) { ult.c = kc; ceas(); }
  });
  return {
    seteaza(o) {
      if (o.poz && o.poz !== V.poz) { const [x1, y1] = POZ[o.poz]; st.anim = { t: 0, d: o.rapid ? 0.4 : 1.2, x0: st.bx, y0: st.by, x1, y1 }; }
      if ("dec" in o) puneX2(o.dec);
      Object.assign(V, o); if (o.dmm) V.dmm = { ...o.dmm };
    },
    vedere(p, t) { S.camera.position.set(...p); S.ctl.target.set(...t); }
  };
}
