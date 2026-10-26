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

/* ===================================================================== piese comune ale standurilor MAM (placa de test, Mega + OLED, multimetru, cronometru) */
function materialeMAM() {
  return { inox: mat({ color: 0xc9ced3, roughness: 0.22, metalness: 0.95 }), crom: mat({ color: 0xeef1f4, roughness: 0.12, metalness: 1 }), alama: mat({ color: 0xc9a043, roughness: 0.28, metalness: 1 }),
    negru: mat({ color: 0x1b1d20, roughness: 0.5 }), cauciuc: mat({ color: 0x141516, roughness: 0.85 }), alb: mat({ color: 0xf2f2ee, roughness: 0.45 }), fonta: mat({ color: 0x2f3337, roughness: 0.6, metalness: 0.6 }),
    galben: mat({ color: 0xf2b705, roughness: 0.6 }), gri: mat({ color: 0x3b3f45, roughness: 0.6 }), verde: mat({ color: 0x2e8b3e, roughness: 0.5 }), pcbT: mat({ color: 0x00878f, roughness: 0.5 }),
    pcbR: mat({ color: 0xb71c1c, roughness: 0.5 }), pcbA: mat({ color: 0x16337a, roughness: 0.5 }), pcbV: mat({ color: 0x5b2c8f, roughness: 0.5 }), aur: mat({ color: 0xd8b25a, roughness: 0.3, metalness: 1 }),
    albastru: mat({ color: 0x3949ab, roughness: 0.8 }), alu: mat({ color: 0xbfc5cb, roughness: 0.35, metalness: 0.9 }) };
}
const tubM = (pts, r, m, seg = 40) => { const o = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(v => Array.isArray(v) ? new THREE.Vector3(...v) : v)), seg, r, 8), m); o.castShadow = true; return o; };
const sticlaM = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transmission: 1, thickness: 0.003, ior: 1.47, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
/** placa de test cu imprimeu și puncte de test. TP: {cheie: [u, v, eticheta, culoare]}; texte: [[text, u, v]] */
function placaTestG(sc, k_, BB, TP, texte) {
  const BW = 0.165, BD = 0.055, K = 8000, cbb = document.createElement("canvas"); cbb.width = 1320; cbb.height = 440; const xb = cbb.getContext("2d");
  const UV = (u, v) => [(u + BW / 2) * K, (v + BD / 2) * K];
  xb.fillStyle = "#f3f1ea"; xb.fillRect(0, 0, 1320, 440); xb.fillStyle = "#c62828"; xb.fillRect(20, 14, 1280, 4); xb.fillStyle = "#1565c0"; xb.fillRect(20, 422, 1280, 4);
  xb.fillStyle = "#bdb8ad"; for (let i = 0; i < 60; i++) { for (let j = 0; j < 2; j++) { xb.fillRect(30 + i * 21, 26 + j * 18, 8, 8); xb.fillRect(30 + i * 21, 384 + j * 18, 8, 8); } for (let j = 0; j < 10; j++) xb.fillRect(30 + i * 21, 90 + j * 26 + (j > 4 ? 20 : 0), 8, 8); }
  xb.font = "bold 26px system-ui"; xb.fillStyle = "#222"; xb.textAlign = "center";
  Object.values(TP).forEach(([u, v, et]) => { const [x, y] = UV(u, v); xb.fillText(et, x, y + (v > 0.01 ? 52 : -30)); });
  xb.font = "22px system-ui"; (texte || []).forEach(([t, u, v]) => xb.fillText(t, ...UV(u, v)));
  const tbb = new THREE.CanvasTexture(cbb); tbb.colorSpace = THREE.SRGBColorSpace; tbb.anisotropy = 8;
  const p = add(sc, new THREE.Mesh(new RoundedBoxGeometry(BW, 0.009, BD, 2, 0.002), mat({ color: 0xf3f1ea, roughness: 0.7 }))); p.position.copy(BB).setY(0.0045); k_(p, "bb", "Placa de test");
  const s = add(sc, new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.002, BD - 0.002), mat({ map: tbb, roughness: 0.7 }))); s.rotation.x = -Math.PI / 2; s.position.copy(BB).setY(0.0092);
  const W = (u, v, y = 0) => new THREE.Vector3(BB.x + u, 0.0092 + y, BB.z + v), TPW = {}, crom = mat({ color: 0xeef1f4, roughness: 0.12, metalness: 1 });
  Object.entries(TP).forEach(([k, [u, v, et, c]]) => { cyl(sc, 0.0018, 0.0022, 0.006, mat({ color: c, roughness: 0.4 }), ...W(u, v, 0.003).toArray(), 16);
    const b = add(sc, new THREE.Mesh(new THREE.TorusGeometry(0.0022, 0.0006, 8, 20), crom)); b.position.copy(W(u, v, 0.0085)); b.rotation.y = 0.6;
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); h.position.copy(W(u, v, 0.007)); sc.add(h); k_(h, k, et); TPW[k] = W(u, v, 0.009); });
  return { W, TPW };
}
/** Arduino Mega 2560 cu OLED pe suport de acril; întoarce actualizatorul */
function megaOledG(sc, k_, M, pos, posO) {
  const MG = new THREE.Group(); MG.position.copy(pos); sc.add(MG);
  const pm = add(MG, new THREE.Mesh(new RoundedBoxGeometry(0.1016, 0.0016, 0.0533, 1, 0.0008), M.pcbT)); pm.position.y = 0.008; k_(pm, "mega", "Arduino Mega 2560");
  [[-0.045, -0.022], [0.045, -0.022], [-0.045, 0.022], [0.045, 0.022]].forEach(([x, z]) => cyl(MG, 0.0018, 0.0018, 0.008, mat({ color: 0xdddddd, roughness: 0.4 }), x, 0.004, z, 10));
  add(MG, new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.011, 0.012), M.crom)).position.set(-0.05, 0.0145, -0.008);
  add(MG, new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.011, 0.009), M.negru)).position.set(-0.049, 0.0145, 0.016);
  const chip = add(MG, new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.0014, 0.014), M.negru)); chip.position.set(0.012, 0.0095, 0.002); chip.rotation.y = Math.PI / 4;
  [[0.0, -0.0245, 0.072], [-0.004, 0.0245, 0.07]].forEach(([x, z, l]) => add(MG, new THREE.Mesh(new THREE.BoxGeometry(l, 0.0085, 0.0025), M.negru)).position.set(x, 0.0132, z));
  add(MG, new THREE.Mesh(new THREE.BoxGeometry(0.0052, 0.0085, 0.044), M.negru)).position.set(0.046, 0.0132, 0.0);
  const led = (z, c) => cyl(MG, 0.0009, 0.0009, 0.001, new THREE.MeshBasicMaterial({ color: c }), -0.032, 0.0092, z, 8);
  const ledON = led(-0.012, 0x113311), ledL = led(-0.016, 0x332a11), ledTX = led(-0.008, 0x332a11);
  k_(cyl(MG, 0.002, 0.002, 0.003, mat({ color: 0xc62828, roughness: 0.4 }), -0.04, 0.0105, -0.02, 12), "rst", "Butonul RESET");
  sc.add(tubM([[pos.x - 0.058, 0.0145, pos.z - 0.008], [pos.x - 0.1, 0.02, pos.z - 0.04], [pos.x - 0.16, 0.004, pos.z - 0.19], [pos.x - 0.2, 0.003, -0.34]], 0.0022, M.negru, 30));
  const OL = new THREE.Group(); OL.position.copy(posO); OL.rotation.y = -0.25; sc.add(OL); const st = sticlaM();
  add(OL, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.03), st)).position.y = 0.002;
  const pol = add(OL, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.0025), st)); pol.position.set(0, 0.027, -0.004); pol.rotation.x = -0.25;
  const OM = new THREE.Group(); OM.position.set(0, 0.034, -0.0015); OM.rotation.x = -0.25; OL.add(OM); OM.scale.setScalar(1.3);
  k_(add(OM, new THREE.Mesh(new THREE.BoxGeometry(0.027, 0.0276, 0.0016), M.pcbA)), "oled", "Afișaj OLED SSD1306");
  const eO = ecran(256, 128); add(OM, new THREE.Mesh(new THREE.PlaneGeometry(0.0245, 0.0125), new THREE.MeshBasicMaterial({ map: eO.t }))).position.set(0, -0.001, 0.0009);
  [0, 1, 2, 3].forEach(i => add(OM, new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.004, 0.0012), M.aur)).position.set(-0.0038 + i * 0.00254, 0.0145, 0.0005));
  const hdr = (x, z) => new THREE.Vector3(pos.x + x, 0.018, pos.z + z);
  const jump = (a, b, c) => { const mid = a.clone().lerp(b, 0.5); mid.y = Math.max(a.y, b.y) + 0.025; sc.add(tubM([a, mid, b], 0.0009, mat({ color: c, roughness: 0.5 }), 24)); };
  [0x222222, 0xe53935, 0x1e88e5, 0x43a047].forEach((c, i) => jump(new THREE.Vector3(posO.x - 0.004 + i * 0.003, 0.055, posO.z - 0.002), hdr(0.025 + i * 0.003, -0.0245), c));
  let ult = "";
  return { hdr, jump,
    seteaza(V) {
      ledON.material.color.set(V.run ? 0x3cff4a : 0x113311); ledL.material.color.set(V.rec ? 0xffd04a : 0x332a11); ledTX.material.color.set(V.tx ? 0xffd04a : 0x332a11);
      const k = JSON.stringify([V.run, V.oled]); if (k === ult) return; ult = k;
      const { x, c } = eO; x.fillStyle = "#050608"; x.fillRect(0, 0, c.width, c.height);
      if (V.run) { x.font = "bold 17px 'Courier New',monospace"; x.fillStyle = "#ffd400"; x.textAlign = "left"; x.fillText(V.oled ? V.oled.titlu : "", 6, 18);
        x.fillStyle = "#5fd3ff"; x.font = "bold 22px 'Courier New',monospace"; (V.oled ? V.oled.linii : ["pornire…"]).forEach((l, i) => x.fillText(l, 6, 46 + i * 23)); }
      eO.t.needsUpdate = true;
    } };
}
/** multimetrul cu sondele care se așază pe punctele de test */
function multimetruG(sc, k_, M, TPW, pos, rot, loc) {
  const DM = new THREE.Group(); DM.position.copy(pos); DM.rotation.set(...rot); sc.add(DM);
  k_(add(DM, new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.17, 0.035, 4, 0.01), M.galben)), "dmm", "Multimetru"); k_(add(DM, new THREE.Mesh(new RoundedBoxGeometry(0.072, 0.155, 0.006, 3, 0.006), M.gri)), "dmm", "Multimetru").position.z = 0.016;
  const eD = ecran(320, 128); add(DM, new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.024), new THREE.MeshBasicMaterial({ map: eD.t }))).position.set(0, 0.052, 0.0195);
  const kn = cyl(DM, 0.019, 0.02, 0.008, M.negru, 0, -0.008, 0.022, 32); kn.rotation.x = Math.PI / 2; k_(kn, "dmmKnob", "Comutatorul rotativ (clic = OFF → V⎓ → Ω)");
  add(kn, new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.009, 0.018), M.galben)).position.set(0, 0.0045, 0.006);
  const cD = document.createElement("canvas"); cD.width = 256; cD.height = 256; { const x = cD.getContext("2d"); x.fillStyle = "#3b3f45"; x.fillRect(0, 0, 256, 256); x.fillStyle = "#fff"; x.font = "bold 28px system-ui"; x.textAlign = "center"; [["OFF", -60], ["V⎓", 0], ["Ω", 60]].forEach(([t, a]) => x.fillText(t, 128 + 100 * Math.sin(a * Math.PI / 180), 140 - 100 * Math.cos(a * Math.PI / 180))); }
  const tD = new THREE.CanvasTexture(cD); tD.colorSpace = THREE.SRGBColorSpace; add(DM, new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.068), new THREE.MeshBasicMaterial({ map: tD, transparent: true }))).position.set(0, -0.008, 0.0192);
  const bR = cyl(DM, 0.0045, 0.0045, 0.004, mat({ color: 0xd32f2f, roughness: 0.4 }), 0.02, -0.06, 0.02, 16), bN = cyl(DM, 0.0045, 0.0045, 0.004, M.negru, -0.02, -0.06, 0.02, 16); bR.rotation.x = bN.rotation.x = Math.PI / 2;
  const sonda = cul => { const G = new THREE.Group(); sc.add(G); cyl(G, 0.0006, 0.0006, 0.018, M.crom, 0, 0.009, 0, 8); cyl(G, 0.0032, 0.0032, 0.05, mat({ color: cul, roughness: 0.5 }), 0, 0.045, 0, 16); cyl(G, 0.0045, 0.0045, 0.004, mat({ color: cul, roughness: 0.5 }), 0, 0.022, 0, 16); return G; };
  const sR = sonda(0xd32f2f), sN = sonda(0x1b1d20); let fR = null, fN = null;
  function sonde(r, b) {
    sc.updateMatrixWorld(true);
    const pune = (G, k, l, bor, fir, cul) => { const p = TPW[k] || l; G.position.copy(p); G.rotation.set(TPW[k] ? 0 : Math.PI / 2, 0, TPW[k] ? 0.15 : 0.4);
      if (fir) { sc.remove(fir); fir.geometry.dispose(); }
      const a = bor.getWorldPosition(new THREE.Vector3()), top = TPW[k] ? p.clone().add(new THREE.Vector3(-0.0105, 0.069, 0)) : p.clone().add(new THREE.Vector3(0.0, 0.004, -0.04));
      const m = new THREE.Vector3((a.x + top.x) / 2, 0.004, Math.max(a.z, top.z) + 0.05);
      const f = tubM([a, a.clone().add(new THREE.Vector3(0, -0.012, 0.02)), m, top.clone().add(new THREE.Vector3(0.01, 0.02, 0.02)), top], 0.0012, mat({ color: cul, roughness: 0.6 }), 48); sc.add(f); return f; };
    fR = pune(sR, r, loc[0], bR, fR, 0xd32f2f); fN = pune(sN, b, loc[1], bN, fN, 0x1b1d20);
  }
  let ult = "", ultS = "";
  return { seteaza(d) {
    kn.rotation.y = { OFF: 1.05, V: 0, R: -1.05 }[d.mod];
    const k = d.mod + d.txt + d.u; if (k !== ult) { ult = k; const { x, c } = eD; x.fillStyle = "#bfd0b0"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1d2414";
      if (d.mod !== "OFF") { x.font = "bold 74px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(d.txt, 290, 92); x.font = "bold 22px system-ui"; x.fillText(d.u, 300, 120); x.textAlign = "left"; x.fillText("AUTO", 10, 26); }
      eD.t.needsUpdate = true; }
    const ks = d.r + "|" + d.b; if (ks !== ultS) { ultS = ks; sonde(d.r, d.b); }
  } };
}
function ceasG(sc, k_, M, pos, roty) {
  const CS = new THREE.Group(); CS.position.copy(pos); CS.rotation.y = roty; sc.add(CS);
  k_(add(CS, new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.06, 0.03, 3, 0.006), M.gri)), "ceas", "Cronometru de laborator").position.y = 0.03;
  const eC = ecran(320, 160); add(CS, new THREE.Mesh(new THREE.PlaneGeometry(0.078, 0.039), new THREE.MeshBasicMaterial({ map: eC.t }))).position.set(0, 0.032, 0.0155);
  let ult = "";
  return { seteaza(t, p) { if (ult === t + p) return; ult = t + p; const { x, c } = eC; x.fillStyle = "#0f1a12"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#7dff8a"; x.font = "bold 76px 'Courier New',monospace"; x.textAlign = "center"; x.fillText(t, 160, 86); x.font = "20px system-ui"; x.fillStyle = "#ddd"; x.fillText(p, 160, 130); eC.t.needsUpdate = true; } };
}
/** interacțiunea comună: clic pe obiectele marcate și eticheta la trecerea mouse-ului */
function interactiune(S, clic, laClic) {
  const tip = document.createElement("div"); tip.className = "a3d-tip"; tip.hidden = true; S.cont.appendChild(tip);
  const rc = new THREE.Raycaster(), mp = new THREE.Vector2(); let jos = null;
  const tinta = e => { const r = S.canvas.getBoundingClientRect(); mp.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rc.setFromCamera(mp, S.camera); const h = rc.intersectObjects(clic, false)[0]; return h ? h.object : null; };
  S.canvas.addEventListener("pointerdown", e => { jos = [e.clientX, e.clientY]; });
  S.canvas.addEventListener("pointerup", e => { if (!jos || Math.hypot(e.clientX - jos[0], e.clientY - jos[1]) > 5) return; const o = tinta(e); if (o && laClic) laClic(o.userData.k, e); });
  S.canvas.addEventListener("pointermove", e => { if (e.buttons) { tip.hidden = true; return; } const o = tinta(e); S.canvas.style.cursor = o ? "pointer" : "";
    if (o) { const r = S.cont.getBoundingClientRect(); tip.textContent = o.userData.et; tip.style.left = (e.clientX - r.left + 14) + "px"; tip.style.top = (e.clientY - r.top + 10) + "px"; tip.hidden = false; } else tip.hidden = true; });
  S.canvas.addEventListener("pointerleave", () => { tip.hidden = true; });
}

/* ===================================================================== MAM I L5: standul de calibrare a senzorului MAP
   Pompa manuală de vid/presiune cu manometru (selector, mâner, supapa de eliberare lentă și butonul de eliberare rapidă), furtunurile
   de 6 mm cu coliere, teul de alamă, manometrul etalon digital pe suport, senzorul MAP pe colțarul de aluminiu cu mufa, placa de test cu
   BMP280 și punctele de test, Arduino Mega cu OLED, multimetrul, ochelarii de protecție și cronometrul. */
export function creeazaStandMAP(gazda, opt = {}) {
  const S = scena(gazda, [0.02, 0.4, 0.82], [-0.02, 0.07, 0.0]), sc = S.scene; S.ctl.maxDistance = 1.5; S.ctl.minDistance = 0.08;
  const M = materialeMAM(), clic = [], k_ = (o, k, et) => { o.userData.k = k; o.userData.et = et; clic.push(o); return o; };
  const furt = new THREE.MeshPhysicalMaterial({ color: 0xd8eef7, roughness: 0.25, transmission: 0.55, thickness: 0.002, transparent: true, opacity: 0.85 });
  /* ---- pompa manuală (tip pistol), culcată pe masă, cu manometrul cu fața în sus */
  const PP = new THREE.Group(); PP.position.set(-0.37, 0, 0.07); PP.rotation.y = 0.35; sc.add(PP);
  const corp = add(PP, new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.1, 6, 20), mat({ color: 0xc62828, roughness: 0.45 }))); corp.rotation.z = Math.PI / 2; corp.position.set(0, 0.017, 0); k_(corp, "pompa", "Pompa manuală (clic = o cursă)");
  const maner = add(PP, new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.02, 0.1, 3, 0.008), mat({ color: 0x2b2f35, roughness: 0.7 }))); maner.geometry.translate(0, 0, 0.05); maner.position.set(-0.045, 0.011, 0.01); maner.rotation.y = 0.25; k_(maner, "pompa", "Pompa manuală (clic = o cursă)");
  const tragaci = add(PP, new THREE.Mesh(new RoundedBoxGeometry(0.018, 0.016, 0.095, 3, 0.006), mat({ color: 0x455a64, roughness: 0.6 }))); tragaci.geometry.translate(0, 0, 0.047); tragaci.position.set(0.0, 0.009, 0.012); k_(tragaci, "pompa", "Pompa manuală (clic = o cursă)");
  const sel = add(PP, new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.008, 0.012, 2, 0.002), mat({ color: 0xf2b705, roughness: 0.4 }))); sel.position.set(-0.03, 0.035, 0); k_(sel, "selector", "Selectorul vid / presiune");
  const sup = cyl(PP, 0.0045, 0.0045, 0.01, M.crom, 0.035, 0.034, 0.0, 16); k_(sup, "lent", "Supapa de eliberare lentă (clic = deschide / închide)");
  const rap = cyl(PP, 0.006, 0.006, 0.006, mat({ color: 0x1565c0, roughness: 0.4 }), 0.012, 0.035, 0.0, 16); k_(rap, "rapid", "Butonul de eliberare rapidă");
  const MP = new THREE.Group(); MP.position.set(0.09, 0.017, 0.0); PP.add(MP);
  k_(cyl(MP, 0.028, 0.028, 0.016, M.crom, 0, 0, 0, 40), "pompa", "Manometrul pompei (bar, relativ)");
  const eP = ecran(256, 256), fp = add(MP, new THREE.Mesh(new THREE.CircleGeometry(0.025, 40), new THREE.MeshBasicMaterial({ map: eP.t }))); fp.rotation.x = -Math.PI / 2; fp.position.y = 0.0082;
  cyl(MP, 0.0045, 0.0045, 0.014, M.alama, 0.034, -0.004, 0, 12).rotation.z = Math.PI / 2;
  /* ---- teul de alamă, manometrul etalon, senzorul MAP */
  const TE = new THREE.Vector3(-0.2, 0.012, 0.06);
  const tee = new THREE.Group(); tee.position.copy(TE); sc.add(tee);
  cyl(tee, 0.005, 0.005, 0.03, M.alama, 0, 0, 0, 16).rotation.z = Math.PI / 2; cyl(tee, 0.005, 0.005, 0.016, M.alama, 0, 0, -0.008, 16).rotation.x = Math.PI / 2;
  k_(tee.children[0], "tee", "Teu de alamă");
  // manometrul etalon digital pe suport
  const ME = new THREE.Group(); ME.position.set(-0.2, 0, -0.1); ME.rotation.y = 0.15; sc.add(ME);
  add(ME, new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.012, 0.05, 2, 0.003), M.fonta)).position.y = 0.006;
  cyl(ME, 0.004, 0.004, 0.08, M.crom, 0, 0.05, -0.01, 12);
  const MEc = new THREE.Group(); MEc.position.set(0, 0.11, 0.0); MEc.rotation.x = -0.25; ME.add(MEc);
  k_(cyl(MEc, 0.04, 0.04, 0.025, mat({ color: 0x37474f, roughness: 0.5 }), 0, 0, 0, 48), "etalon", "Manometrul etalon digital (presiune relativă)").rotation.x = Math.PI / 2;
  const eM = ecran(320, 160); add(MEc, new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.025), new THREE.MeshBasicMaterial({ map: eM.t }))).position.set(0, 0.006, 0.0128);
  [[-0.012, -0.022], [0.012, -0.022]].forEach(([x, y]) => cyl(MEc, 0.004, 0.004, 0.004, mat({ color: 0x90a4ae, roughness: 0.5 }), x, y, 0.013, 16).rotation.x = Math.PI / 2);
  cyl(MEc, 0.005, 0.005, 0.02, M.alama, 0, -0.045, 0, 12);
  // senzorul MAP pe colțar
  const MS = new THREE.Group(); MS.position.set(-0.07, 0, 0.04); sc.add(MS);
  add(MS, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.003, 0.04), M.alu)).position.y = 0.0015; add(MS, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.003), M.alu)).position.set(0, 0.025, -0.0185);
  const cs = add(MS, new THREE.Mesh(new RoundedBoxGeometry(0.036, 0.03, 0.022, 3, 0.004), M.negru)); cs.position.set(0, 0.03, -0.006); k_(cs, "map", "Senzorul MAP (2,5 bar abs.)");
  const ure = add(MS, new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.012, 0.004, 2, 0.002), M.negru)); ure.position.set(0, 0.03, -0.0165);
  [-0.02, 0.02].forEach(x => cyl(MS, 0.0025, 0.0025, 0.006, M.crom, x, 0.03, -0.016, 12).rotation.x = Math.PI / 2);
  const nip = cyl(MS, 0.003, 0.0035, 0.016, M.negru, -0.026, 0.025, -0.006, 16); nip.rotation.z = Math.PI / 2;
  const muf = add(MS, new THREE.Mesh(new RoundedBoxGeometry(0.016, 0.014, 0.012, 2, 0.002), mat({ color: 0x5d4037, roughness: 0.6 }))); muf.position.set(0.024, 0.033, -0.006);
  const NIP = new THREE.Vector3(MS.position.x - 0.034, 0.025, MS.position.z - 0.006);
  /* ---- furtunurile și colierele */
  const capPompa = () => { sc.updateMatrixWorld(true); return MP.localToWorld(new THREE.Vector3(0.041, -0.004, 0)); };
  const fur = [];
  function furtunuri(desprins) {
    fur.forEach(f => { sc.remove(f); f.geometry.dispose(); }); fur.length = 0;
    const a = capPompa(), tL = TE.clone().add(new THREE.Vector3(-0.015, 0, 0)), tR = TE.clone().add(new THREE.Vector3(0.015, 0, 0)), tB = TE.clone().add(new THREE.Vector3(0, 0, -0.016));
    const meIn = ME.localToWorld(new THREE.Vector3(0, 0.11 - 0.055, 0));
    const lin = (p, q, off, d) => { const end = d ? q.clone().add(new THREE.Vector3(0.012, 0.0, 0.014)) : q; const m = p.clone().lerp(end, 0.5).add(off); const f = tubM([p, m, end], 0.0032, furt, 40); sc.add(f); fur.push(f); };
    lin(a, tL, new THREE.Vector3(0, 0.01, 0.04), desprins === 0); lin(tR, NIP, new THREE.Vector3(0, 0.012, 0.0), desprins === 1); lin(tB, meIn, new THREE.Vector3(0, 0.03, 0.0), desprins === 2);
  }
  const coliere = [TE.clone().add(new THREE.Vector3(-0.022, 0, 0)), NIP.clone().add(new THREE.Vector3(-0.004, 0, 0)), TE.clone().add(new THREE.Vector3(0, 0, -0.024))].map((p, i) => {
    const c = add(sc, new THREE.Mesh(new THREE.TorusGeometry(0.0048, 0.0011, 8, 24), M.inox)); c.position.copy(p); c.rotation.y = i === 2 ? 0 : Math.PI / 2; k_(c, "colier" + i, "Colier (clic = strânge / slăbește)");
    const s = add(c, new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.004), M.inox)); s.position.set(0, 0.0055, 0); return c; });
  /* ---- placa de test, BMP280, Mega + OLED, multimetrul, cronometrul, ochelarii */
  const TP = { tU: [-0.03, -0.012, "TP U MAP (A0)", 0x43a047], t5V: [-0.072, -0.016, "TP 5V", 0xc62828], tGND: [-0.05, 0.018, "TP GND", 0x111111] };
  const { W, TPW } = placaTestG(sc, k_, new THREE.Vector3(0.1, 0, 0.09), TP, [["MAP: +5V GND U", -0.06, 0.004], ["BMP280 (I²C 0x76)", 0.045, -0.014]]);
  const bmp = add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.015, 0.0016, 0.012, 1, 0.0005), M.pcbV)); bmp.position.copy(W(0.045, 0.006, 0.006)); k_(bmp, "bmp", "Modul BMP280 (presiune atmosferică și temperatură)");
  add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.001, 0.002), mat({ color: 0xbfc5cb, metalness: 0.8, roughness: 0.3 }))).position.copy(W(0.047, 0.006, 0.0075));
  add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.009, 0.007, 0.004, 1, 0.001), M.negru)).position.copy(W(-0.06, -0.006, 0.0035));
  // cablul senzorului (3 fire) de la mufă la placă
  const mufW = MS.localToWorld(new THREE.Vector3(0.032, 0.033, -0.006)); [0xc62828, 0x222222, 0x43a047].forEach((c, i) => sc.add(tubM([mufW.clone().add(new THREE.Vector3(0, 0, (i - 1) * 0.003)), mufW.clone().add(new THREE.Vector3(0.03, 0.01, 0.02)), W(-0.06 + (i - 1) * 0.0025, -0.006, 0.006)], 0.0009, mat({ color: c, roughness: 0.5 }), 24)));
  const MGo = megaOledG(sc, k_, M, new THREE.Vector3(0.1, 0, -0.06), new THREE.Vector3(0.205, 0, -0.07));
  MGo.jump(W(-0.03, -0.012, 0.004), MGo.hdr(0.006, 0.0245), 0x43a047); MGo.jump(W(-0.08, -0.024, 0.002), MGo.hdr(-0.016, 0.0245), 0xe53935); MGo.jump(W(-0.08, 0.024, 0.002), MGo.hdr(-0.012, 0.0245), 0x222222);
  MGo.jump(W(0.045, 0.0, 0.004), MGo.hdr(0.03, -0.0245), 0x1e88e5); MGo.jump(W(0.048, 0.0, 0.004), MGo.hdr(0.033, -0.0245), 0xfdd835);
  const DMo = multimetruG(sc, k_, M, TPW, new THREE.Vector3(0.3, 0.03, 0.06), [-1.05, -0.3, 0], [new THREE.Vector3(0.26, 0.003, 0.2), new THREE.Vector3(0.24, 0.003, 0.21)]);
  const CSo = ceasG(sc, k_, M, new THREE.Vector3(0.34, 0, -0.16), -0.4);
  const OC = new THREE.Group(); OC.position.set(-0.05, 0.008, 0.22); OC.rotation.y = 0.3; sc.add(OC);
  const lentila = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, roughness: 0.05, transmission: 0.9, thickness: 0.002, transparent: true, opacity: 0.45 });
  k_(add(OC, new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.045, 0.004, 3, 0.012), lentila)), "ochelari", "Ochelari de protecție (clic = îi purtați)").rotation.x = -Math.PI / 2 + 0.25;
  add(OC, new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.004, 0.006), mat({ color: 0x263238, roughness: 0.6 }))).position.set(0, 0.012, -0.006);
  [-1, 1].forEach(s => { const b = add(OC, new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.13), mat({ color: 0x263238, roughness: 0.6 }))); b.position.set(s * 0.074, 0.006, -0.07); });
  interactiune(S, clic, opt.laClic);
  /* ---- starea */
  const V = { prel: 0, etalon: "0.0", mod: "vid", lent: false, coliere: [true, true, true], desprins: -1, ochelari: false, run: false, rec: false, tx: false, oled: null, dmm: { mod: "OFF", txt: "", u: "", r: "nc", b: "nc" }, ceas: "00:00", ceasP: "" };
  let ultF = null, anim = 0, ultM = "", ultP = "";
  function cadranPompa(prel) {
    const { x, c } = eP, R = c.width / 2; x.fillStyle = "#fbfbf7"; x.beginPath(); x.arc(R, R, R, 0, Math.PI * 2); x.fill();
    const A = v => (-225 + (v + 1) / 3 * 270) * Math.PI / 180;      // −1…+2 bar pe 270°
    x.lineWidth = 8; x.strokeStyle = "#c62828"; x.beginPath(); x.arc(R, R, R - 14, A(-1), A(0)); x.stroke(); x.strokeStyle = "#1565c0"; x.beginPath(); x.arc(R, R, R - 14, A(0), A(2)); x.stroke();
    for (let v = -1; v <= 2.0001; v += 0.1) { const a = A(v), l = Math.abs(v * 10 - Math.round(v)* 10) < 0.01 ? 22 : Math.abs(v * 10 % 5) < 0.01 ? 15 : 9; x.strokeStyle = "#111"; x.lineWidth = l > 20 ? 3 : 1.5; x.beginPath(); x.moveTo(R + Math.cos(a) * (R - 22), R + Math.sin(a) * (R - 22)); x.lineTo(R + Math.cos(a) * (R - 22 - l), R + Math.sin(a) * (R - 22 - l)); x.stroke(); }
    x.fillStyle = "#111"; x.font = "bold 24px system-ui"; x.textAlign = "center"; x.textBaseline = "middle"; [-1, 0, 1, 2].forEach(v => { const a = A(v); x.fillText(String(v), R + Math.cos(a) * (R - 66), R + Math.sin(a) * (R - 66)); });
    x.font = "16px system-ui"; x.fillText("bar", R, R + 46); x.fillText("vid  |  presiune", R, R + 70);
    const a = A(Math.max(-1, Math.min(2.05, prel / 100))); x.strokeStyle = "#111"; x.lineWidth = 5; x.beginPath(); x.moveTo(R - Math.cos(a) * 20, R - Math.sin(a) * 20); x.lineTo(R + Math.cos(a) * (R - 30), R + Math.sin(a) * (R - 30)); x.stroke();
    x.fillStyle = "#c62828"; x.beginPath(); x.arc(R, R, 10, 0, Math.PI * 2); x.fill(); eP.t.needsUpdate = true;
  }
  S.porneste(dt => {
    if (anim > 0) { anim = Math.max(0, anim - dt); const f = Math.sin(anim / 0.35 * Math.PI); tragaci.rotation.y = 0.22 * f; }
    const kf = V.desprins; if (kf !== ultF) { ultF = kf; furtunuri(kf); }
    V.coliere.forEach((s, i) => { coliere[i].material = s ? M.inox : mat({ color: 0xff7043, roughness: 0.4, emissive: 0x5a1a00 }); coliere[i].scale.setScalar(s ? 1 : 1.35); });
    sel.position.x = V.mod === "vid" ? -0.034 : -0.024; sel.material.color.set(V.mod === "vid" ? 0xf2b705 : 0x42a5f5);
    sup.position.y = V.lent ? 0.039 : 0.034;
    OC.visible = !V.ochelari;
    const pk = V.prel.toFixed(1); if (pk !== ultP) { ultP = pk; cadranPompa(V.prel); }
    if (ultM !== V.etalon) { ultM = V.etalon; const { x, c } = eM; x.fillStyle = "#c9d6c0"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1d2414"; x.font = "bold 92px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(V.etalon, 300, 112); x.font = "bold 22px system-ui"; x.textAlign = "left"; x.fillText("kPa  REL", 10, 28); eM.t.needsUpdate = true; }
    MGo.seteaza(V); DMo.seteaza(V.dmm); CSo.seteaza(V.ceas, V.ceasP);
  });
  return {
    seteaza(o) { Object.assign(V, o); if (o.dmm) V.dmm = { ...o.dmm }; if (o.coliere) V.coliere = o.coliere.slice(); },
    cursa() { anim = 0.35; },
    vedere(p, t) { S.camera.position.set(...p); S.ctl.target.set(...t); }
  };
}

/* ===================================================================== MF L5: aparatul Reynolds
   Rezervorul de nivel constant din acril (alimentarea cu robinet, preaplinul, grila de liniștire, termometrul), vasul de colorant cu
   robinetul și acul injector în axa intrării profilate, tubul de sticlă d = 10 mm (L ≈ 1 m) pe suporturi, robinetul de reglare cu
   roata de manevră, furtunul de ieșire (spre scurgere sau în vasul gradat de 1 L), cronometrul. Firul de colorant este format din
   particule transportate cu profilul de viteze și perturbate după regim (laminar / tranziție intermitentă / turbulent). */
export function creeazaReynolds(gazda, opt = {}) {
  const S = scena(gazda, [0.1, 0.85, 2.0], [0.0, 0.25, 0.0]), sc = S.scene; S.ctl.maxDistance = 3.2; S.ctl.minDistance = 0.06;
  const M = materialeMAM(), clic = [], k_ = (o, k, et) => { o.userData.k = k; o.userData.et = et; clic.push(o); return o; };
  const acril = new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, roughness: 0.04, transmission: 0.95, thickness: 0.006, ior: 1.49, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const apa = new THREE.MeshPhysicalMaterial({ color: 0xbfe2f5, roughness: 0.05, transmission: 0.85, thickness: 0.1, ior: 1.33, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  const sticla = sticlaM();
  /* ---- suportul (cadru din profile de aluminiu) */
  const YT = 0.3, X0 = -0.42, L = 0.95, R = 0.005;                 // axa tubului, începutul, lungimea, raza interioară
  [[-0.62, -0.08], [-0.62, 0.12], [0.62, -0.08], [0.62, 0.12]].forEach(([x, z]) => add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), M.alu)).position.set(x, 0.1, z));
  add(sc, new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.03, 0.03), M.alu)).position.set(0, 0.2, -0.08);
  [-0.2, 0.15, 0.48].forEach(x => { add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), M.alu)).position.set(x, 0.25, -0.08); const c = add(sc, new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0025, 8, 20), M.negru)); c.position.set(x, YT, 0); });
  /* ---- rezervorul de nivel constant */
  const RX = -0.6, RW = 0.26, RH = 0.36, RD = 0.24, RY0 = 0.2, NIV = 0.5;
  const rez = add(sc, new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), acril)); rez.position.set(RX, RY0 + RH / 2, 0.02); rez.castShadow = false; k_(rez, "rezervor", "Rezervorul de nivel constant");
  add(sc, new THREE.Mesh(new THREE.BoxGeometry(RW + 0.02, 0.012, RD + 0.02), M.gri)).position.set(RX, RY0 - 0.006, 0.02);
  const apaR = add(sc, new THREE.Mesh(new THREE.BoxGeometry(RW - 0.01, NIV - RY0 - 0.005, RD - 0.01), apa)); apaR.position.set(RX, (NIV + RY0) / 2, 0.02); apaR.castShadow = false;
  const grila = add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.004, RH * 0.6, RD - 0.012), mat({ color: 0xdfe5ea, roughness: 0.5, transparent: true, opacity: 0.6 }))); grila.position.set(RX - 0.06, RY0 + RH * 0.35, 0.02);
  cyl(sc, 0.012, 0.012, 0.3, acril, RX + 0.09, RY0 + 0.15, 0.09, 24).castShadow = false;                                             // preaplinul (țeavă verticală)
  sc.add(tubM([[RX + 0.09, RY0, 0.09], [RX + 0.09, 0.05, 0.12], [RX + 0.3, 0.01, 0.2]], 0.008, mat({ color: 0xe0e6ea, roughness: 0.4, transparent: true, opacity: 0.7 }), 24));
  // alimentarea de la bancul hidraulic, cu robinetul de alimentare
  sc.add(tubM([[RX - 0.12, RY0 + RH + 0.02, -0.06], [RX - 0.25, 0.7, -0.15], [RX - 0.3, 0.2, -0.3], [RX - 0.3, 0.0, -0.32]], 0.008, M.negru, 30));
  const rob = cyl(sc, 0.012, 0.012, 0.04, M.alama, RX - 0.12, RY0 + RH + 0.02, -0.06, 16); rob.rotation.z = Math.PI / 2;
  const rAlim = add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), mat({ color: 0x1565c0, roughness: 0.4 }))); rAlim.position.set(RX - 0.12, RY0 + RH + 0.045, -0.06); k_(rAlim, "alim", "Robinetul de alimentare (clic = deschis / închis)");
  const jetA = add(sc, new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 1, 8), apa)); jetA.position.set(RX - 0.1, 0, -0.04);
  // termometrul cu tijă de sticlă în rezervor
  const TM = new THREE.Group(); TM.position.set(RX + 0.05, RY0 + RH + 0.02, -0.07); sc.add(TM);
  cyl(TM, 0.004, 0.004, 0.32, sticla, 0, -0.08, 0, 12); const col = cyl(TM, 0.0013, 0.0013, 1, mat({ color: 0xc62828, roughness: 0.3 }), 0, 0, 0, 8); cyl(TM, 0.004, 0.004, 0.012, mat({ color: 0xc62828, roughness: 0.3 }), 0, -0.235, 0, 12);
  k_(TM.children[0], "termometru", "Termometrul (apa din rezervor)");
  const eTM = ecran(256, 64); add(TM, new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.015), new THREE.MeshBasicMaterial({ map: eTM.t, transparent: true }))).position.set(0.035, 0.03, 0.0);
  /* ---- vasul de colorant, robinetul și acul injector */
  const CX = RX - 0.02;
  const vas = cyl(sc, 0.03, 0.03, 0.09, sticla, CX, 0.78, 0.02, 24); vas.castShadow = false; k_(vas, "colorant", "Vasul de colorant (permanganat de potasiu diluat)");
  const colLiq = cyl(sc, 0.028, 0.028, 1, mat({ color: 0xa0103f, roughness: 0.2, transparent: true, opacity: 0.8 }), CX, 0.76, 0.02, 24);
  const rc = cyl(sc, 0.006, 0.006, 0.02, M.alama, CX, 0.72, 0.02, 12); const rcM = add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.008), mat({ color: 0x2e7d32, roughness: 0.4 }))); rcM.position.set(CX, 0.722, 0.035); k_(rcM, "robColorant", "Robinetul colorantului (clic = deschis / închis)");
  sc.add(tubM([[CX, 0.71, 0.02], [CX, 0.5, 0.02], [CX + 0.02, 0.36, 0.0], [X0 - 0.05, YT, 0], [X0 - 0.01, YT, 0]], 0.0012, M.inox, 50));
  /* ---- intrarea profilată (bell-mouth) și tubul de sticlă */
  const bm = add(sc, new THREE.Mesh(new THREE.LatheGeometry([[0.03, 0], [0.022, 0.006], [0.014, 0.015], [0.009, 0.026], [0.007, 0.04]].map(([r, y]) => new THREE.Vector2(r, y)), 40), sticla)); bm.rotation.z = -Math.PI / 2; bm.position.set(X0 - 0.04, YT, 0);
  const tub = cyl(sc, R + 0.002, R + 0.002, L, sticla, X0 + L / 2, YT, 0, 32, true); tub.rotation.z = Math.PI / 2; tub.castShadow = false; k_(tub, "tub", "Tubul de sticlă d = 10 mm");
  const apT = cyl(sc, R, R, L, apa, X0 + L / 2, YT, 0, 24); apT.rotation.z = Math.PI / 2; apT.castShadow = false;
  /* ---- robinetul de reglare la ieșire (roata de manevră) și furtunul */
  const VX = X0 + L + 0.03;
  cyl(sc, 0.014, 0.014, 0.05, M.alama, VX, YT, 0, 20).rotation.z = Math.PI / 2; cyl(sc, 0.006, 0.006, 0.05, M.alama, VX, YT + 0.03, 0, 12);
  const roata = new THREE.Group(); roata.position.set(VX, YT + 0.06, 0); sc.add(roata);
  const rr = add(roata, new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 10, 40), mat({ color: 0xc62828, roughness: 0.4 }))); rr.rotation.x = Math.PI / 2; k_(rr, "robinet", "Robinetul de reglare (roata de manevră)");
  [0, 1, 2].forEach(k => { const s = add(roata, new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.004, 0.005), mat({ color: 0xc62828, roughness: 0.4 }))); s.rotation.y = k * Math.PI / 3; k_(s, "robinet", "Robinetul de reglare (roata de manevră)"); });
  let furt = null; const pFurt = (inVas) => { if (furt) { sc.remove(furt); furt.geometry.dispose(); } const a = [VX + 0.03, YT, 0], end = inVas ? [0.62, 0.17, 0.2] : [0.72, 0.03, -0.05];
    furt = tubM([a, [VX + 0.08, YT - 0.02, 0.02], [VX + 0.12, 0.2, 0.1], end], 0.006, mat({ color: 0xd9eef8, roughness: 0.3, transparent: true, opacity: 0.75 }), 40); sc.add(furt); return new THREE.Vector3(...end); };
  /* ---- scurgerea (pâlnie), vasul gradat de 1 L, cronometrul */
  cyl(sc, 0.05, 0.015, 0.06, M.inox, 0.72, 0.03, -0.05, 24);
  const VG = new THREE.Group(); VG.position.set(0.62, 0, 0.2); sc.add(VG);
  const vgS = cyl(VG, 0.05, 0.05, 0.15, sticla, 0, 0.075, 0, 32, true); vgS.castShadow = false; cyl(VG, 0.05, 0.05, 0.004, sticla, 0, 0.002, 0, 32).castShadow = false; k_(vgS, "vas", "Vasul gradat de 1 L");
  for (let k = 1; k <= 10; k++) { const l = add(VG, new THREE.Mesh(new THREE.BoxGeometry(k % 5 ? 0.012 : 0.022, 0.0012, 0.001), new THREE.MeshBasicMaterial({ color: 0x1b2733 }))); l.position.set(-0.01, 0.004 + k * 0.0127, 0.0505); }
  const apV = cyl(VG, 0.048, 0.048, 1, apa, 0, 0, 0, 32); apV.castShadow = false;
  const jetV = add(sc, new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 1, 8), apa));
  const CR = new THREE.Group(); CR.position.set(0.42, 0.0, 0.25); CR.rotation.x = -0.6; sc.add(CR);
  k_(cyl(CR, 0.035, 0.035, 0.016, M.crom, 0, 0.012, 0, 40), "crono", "Cronometrul (clic = start / stop)").rotation.x = 0;
  const eCR = ecran(220, 100); const fCR = add(CR, new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.02), new THREE.MeshBasicMaterial({ map: eCR.t }))); fCR.rotation.x = -Math.PI / 2; fCR.position.y = 0.0205;
  cyl(CR, 0.005, 0.005, 0.01, M.otel, 0, 0.012, -0.04, 12).rotation.x = Math.PI / 2;
  interactiune(S, clic, opt.laClic);
  /* ---- firul de colorant: particule */
  const NP = 4000, part = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xa3104a }), NP); part.frustumCulled = false; part.renderOrder = -1; sc.add(part);
  const P_ = Array.from({ length: NP }, () => ({ x: -1, y: 0, z: 0, f: Math.random() * 6.28, a: false }));
  // colorantul dispersat (nor roz în toată secțiunea): zona turbulentă și pufurile din tranziție
  const mNor = new THREE.MeshBasicMaterial({ color: 0xc2185b, transparent: true, opacity: 0, depthWrite: false });
  const nori = Array.from({ length: 8 }, () => { const o = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.97, R * 0.97, 1, 20), mNor.clone()); o.rotation.z = Math.PI / 2; o.visible = false; sc.add(o); return o; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const V = { v: 0, st: "laminar", gamma: 0, colorant: false, alim: true, a: 0, colectare: false, Vvas: 0, crono: 0, T: 20, nivColorant: 1 };
  let emis = 0, tt = 0, ultC = "", ultT = "", ultF = null, puf = [];
  const gs = () => { let a = 0, b = 0; while (!a) a = Math.random(); while (!b) b = Math.random(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
  S.porneste(dt => {
    tt += dt;
    const u = V.v, g = V.gamma, lam = V.st === "laminar";
    // pufurile turbulente (tranziție): zone care se deplasează cu viteza medie
    if (V.st === "tranzitie") { if (Math.random() < dt * (0.6 + 2.5 * g)) puf.push({ x: X0 + 0.15 + Math.random() * 0.25, L: 0.05 + 0.25 * g }); }
    puf = V.st === "tranzitie" ? puf.filter(p => { p.x += u * dt; return p.x - p.L < X0 + L; }) : [];
    // emisia colorantului din vârful acului
    if (V.colorant && u > 0.003 && V.nivColorant > 0) emis += dt * 1300;
    for (let i = 0; i < NP && emis >= 1; i++) { const p = P_[i]; if (p.a) continue; p.a = true; p.x = X0 - 0.01 + 2 * u * dt * Math.random(); p.y = (Math.random() - 0.5) * 0.0004; p.z = (Math.random() - 0.5) * 0.0004; p.f = Math.random() * 6.28; emis -= 1; }
    emis = Math.min(emis, 400);
    let n = 0;
    P_.forEach(p => {
      if (!p.a) return;
      const r = Math.hypot(p.y, p.z) / R, turbLocal = V.st === "turbulent" ? Math.min(1, (p.x - X0) / 0.06) : V.st === "tranzitie" && puf.some(q2 => p.x < q2.x && p.x > q2.x - q2.L) ? 1 : 0;
      const ux = turbLocal ? u * 1.18 * Math.pow(Math.max(0.001, 1 - Math.min(r, 0.999)), 1 / 7) : 2 * u * (1 - Math.min(1, r * r));
      p.x += Math.max(ux, 0.002) * dt;
      if (turbLocal) { const sgm = R * 1.8 * Math.sqrt(dt) * (0.4 + u * 1.5); p.y += gs() * sgm; p.z += gs() * sgm; }
      else if (V.st === "tranzitie") { const A = R * 0.45 * g * Math.min(1, (p.x - X0) / 0.4); p.y += (A * Math.sin(p.x * 60 - tt * 8 + p.f * 0.05) - p.y) * Math.min(1, dt * 4); }
      else { p.y += gs() * 0.000006 * Math.sqrt(dt); p.z += gs() * 0.000006 * Math.sqrt(dt); }
      const rr2 = Math.hypot(p.y, p.z); if (rr2 > R * 0.95) { p.y *= R * 0.95 / rr2; p.z *= R * 0.95 / rr2; }
      if (p.x > X0 + L) { p.a = false; return; }
      const sz = turbLocal ? 0.0009 : 0.0006;
      m4.compose(v3.set(p.x, YT + p.y, p.z), q, s3.set(lam ? sz * 1.6 : sz, sz, sz)); part.setMatrixAt(n++, m4);
    });
    part.count = n; part.instanceMatrix.needsUpdate = true;
    const zone = !V.colorant || u <= 0.003 ? [] : V.st === "turbulent" ? [[X0 + 0.04, X0 + L, 0.32]] : V.st === "tranzitie" ? puf.map(q2 => [Math.max(X0 + 0.1, q2.x - q2.L), Math.min(X0 + L, q2.x), 0.22]) : [];
    nori.forEach((o, i) => { const z = zone[i]; o.visible = !!z && z[1] > z[0]; if (o.visible) { o.scale.y = z[1] - z[0]; o.position.set((z[0] + z[1]) / 2, YT, 0); o.material.opacity = z[2]; } });
    // robinetul, alimentarea, jeturile de apă, nivelul din vas
    roata.rotation.y = -V.a / 100 * Math.PI * 6;
    rAlim.rotation.y = V.alim ? 0 : Math.PI / 2; jetA.visible = V.alim; jetA.scale.y = (RY0 + RH + 0.02) - NIV; jetA.position.y = (RY0 + RH + 0.02 + NIV) / 2;
    const end = ultF === V.colectare ? null : pFurt(V.colectare); if (end) { ultF = V.colectare; jetV.userData.end = end; }
    const e = jetV.userData.end; jetV.visible = u > 0.003 && !!e; if (e) { const y1 = V.colectare ? 0.004 + V.Vvas / 1 * 0.127 : 0.03; jetV.scale.y = Math.max(0.001, e.y - y1); jetV.position.set(e.x, (e.y + y1) / 2, e.z); jetV.scale.x = jetV.scale.z = 0.4 + Math.min(1.5, u * 2); }
    const h = Math.max(0.0001, Math.min(1.2, V.Vvas) * 0.127); apV.scale.y = h; apV.position.y = 0.004 + h / 2;
    colLiq.scale.y = Math.max(0.0001, 0.08 * V.nivColorant); colLiq.position.y = 0.737 + colLiq.scale.y / 2;
    col.scale.y = 0.06 + (V.T - 0) / 50 * 0.18; col.position.y = -0.23 + col.scale.y / 2;
    const tc = V.T.toFixed(1); if (tc !== ultT) { ultT = tc; const { x, c } = eTM; x.clearRect(0, 0, c.width, c.height); x.fillStyle = "rgba(255,255,255,.85)"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#c62828"; x.font = "bold 40px system-ui"; x.textAlign = "center"; x.fillText(tc + " °C", 128, 46); eTM.t.needsUpdate = true; }
    const ct = V.crono.toFixed(2); if (ct !== ultC) { ultC = ct; const { x, c } = eCR; x.fillStyle = "#aab79c"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1b2416"; x.font = "bold 54px 'Courier New',monospace"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ct, c.width / 2, 54); eCR.t.needsUpdate = true; }
  });
  return { seteaza(o) { Object.assign(V, o); }, vedere(p, t) { S.camera.position.set(...p); S.ctl.target.set(...t); } };
}
/* ===================================================================== MF L6: standul pentru pierderi de sarcină
   Standul de podea (ca în Fig. 6.1 a îndrumarului, la scara reală): cadrul din țeavă rectangulară vopsită, rezervorul din acril cu
   termometrul digital, pompa centrifugă cu cutia de comandă, robinetul de reglare cu roată pe conducta de refulare, conducta orizontală
   d = 17 mm cu racorduri olandeze și prizele 1–2 la 1,5 m, lărgirea bruscă 17/26 mm din tub transparent (prizele 3, 4), îngustarea
   26/17, priza 5, cotul 90° cu rază mică, priza 6, robinetul cu bilă (pârghie), priza 7, rotametrul și debitmetrul cu turbină cu
   afișaj, returul pe lângă cadru; panoul cu 7 piezometre de sticlă (scală milimetrică, colector presurizat cu supapă și pompă de
   mână), furtunurile transparente de la prize cu robinetele de aerisire; opțional pompa electrică de 12 V, sursa de laborator și
   manometrul digital pentru punctul de funcționare. */
export function creeazaPierderi(gazda, opt = {}) {
  const S = scena(gazda, [0.2, 1.55, 4.7], [0.2, 1.0, -0.2]), sc = S.scene; S.ctl.maxDistance = 6; S.ctl.minDistance = 0.12; S.ctl.maxPolarAngle = Math.PI * 0.56;
  // încăperea: podeaua de laborator în locul mesei, peretele mai mare, umbrele pe tot standul
  const [blat, perete] = sc.children.filter(o => o.isMesh); blat.visible = false;
  perete.geometry = new THREE.PlaneGeometry(7, 3.2); perete.position.set(0.1, 1.6, -0.75);
  const pod = add(sc, new THREE.Mesh(new THREE.PlaneGeometry(7, 4), mat({ color: 0x9aa3a8, roughness: 0.8 }))); pod.rotation.x = -Math.PI / 2; pod.position.set(0.1, 0, 0.8); pod.castShadow = false;
  const plinta = add(sc, new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 0.02), mat({ color: 0x5d6770, roughness: 0.6 }))); plinta.position.set(0.1, 0.05, -0.74);
  const sun = sc.children.find(o => o.isDirectionalLight); sun.position.set(1.2, 3.2, 2.2); Object.assign(sun.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -1.2, near: 0.5, far: 8 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0006;
  const M = materialeMAM(), clic = [], k_ = (o, k, et) => { o.userData.k = k; o.userData.et = et; clic.push(o); return o; };
  const albastruC = mat({ color: 0x1f5aa6, roughness: 0.45, metalness: 0.3 }), griT = mat({ color: 0x9ea4aa, roughness: 0.35, metalness: 0.55 }), griInch = mat({ color: 0x4a5057, roughness: 0.5, metalness: 0.4 });
  const acril = new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, roughness: 0.04, transmission: 0.95, thickness: 0.006, ior: 1.49, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const apaM = new THREE.MeshPhysicalMaterial({ color: 0x9fd0ee, roughness: 0.05, transmission: 0.7, thickness: 0.1, ior: 1.33, transparent: true, opacity: 0.5, depthWrite: false });
  const furtun = new THREE.MeshPhysicalMaterial({ color: 0xcfe6f7, roughness: 0.2, transmission: 0.4, thickness: 0.002, transparent: true, opacity: 0.7, depthWrite: false });
  const sticla = sticlaM();
  const V3 = (...a) => new THREE.Vector3(...a), UP = V3(0, 1, 0);
  /** țeavă dreaptă între două puncte (opac sau transparent) */
  const teava = (A, B, r, m, seg = 24) => { A = V3(...A); B = V3(...B); const o = add(sc, new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg, 1, false), m)); o.position.copy(A).lerp(B, 0.5); o.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize()); return o; };
  const inel = (P, r, l, dir, m) => teava(P.map((v, i) => v - dir[i] * l / 2), P.map((v, i) => v + dir[i] * l / 2), r, m, 28);
  /* ---- cadrul de bază (țeavă rectangulară 50×50, vopsită albastru) cu tălpi de cauciuc */
  const XB0 = -1.4, XB1 = 1.8, ZB = 0.2, YB = 0.065;
  [-ZB, ZB].forEach(z => add(sc, new THREE.Mesh(new RoundedBoxGeometry(XB1 - XB0, 0.05, 0.05, 2, 0.005), albastruC)).position.set((XB0 + XB1) / 2, YB, z));
  [XB0 + 0.03, -0.85, 0.05, 1.0, XB1 - 0.03].forEach(x => add(sc, new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.05, 2 * ZB, 2, 0.005), albastruC)).position.set(x, YB, 0));
  [[XB0 + 0.03, -ZB], [XB0 + 0.03, ZB], [XB1 - 0.03, -ZB], [XB1 - 0.03, ZB], [0.05, -ZB], [0.05, ZB]].forEach(([x, z]) => cyl(sc, 0.03, 0.035, 0.04, M.cauciuc, x, 0.02, z, 20));
  add(sc, new THREE.Mesh(new BoxGeometryR(0.56, 0.012, 0.46), albastruC)).position.set(-1.1, 0.096, 0);
  function BoxGeometryR(a, b, c) { return new RoundedBoxGeometry(a, b, c, 2, 0.004); }
  /* ---- rezervorul din acril cu capac și termometrul digital */
  const RX = -1.1, RW = 0.46, RH = 0.42, RD = 0.4, RY0 = 0.102;
  const rez = add(sc, new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), acril)); rez.position.set(RX, RY0 + RH / 2, 0); rez.castShadow = false; k_(rez, "rezervor", "Rezervorul de apă (circuit închis)");
  const muchii = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(RW, RH, RD)), new THREE.LineBasicMaterial({ color: 0x8aa0b0 })); muchii.position.copy(rez.position); sc.add(muchii);
  const apaR = add(sc, new THREE.Mesh(new THREE.BoxGeometry(RW - 0.012, 0.3, RD - 0.012), mat({ color: 0x5fa8d8, roughness: 0.1, transparent: true, opacity: 0.42, depthWrite: false }))); apaR.position.set(RX, RY0 + 0.155, 0); apaR.castShadow = false;
  add(sc, new THREE.Mesh(BoxGeometryR(RW * 0.55, 0.01, RD + 0.01), griInch)).position.set(RX + RW * 0.22, RY0 + RH + 0.005, 0);
  const TM = new THREE.Group(); TM.position.set(RX - 0.12, RY0 + RH + 0.01, 0.08); sc.add(TM);
  cyl(TM, 0.003, 0.003, 0.34, M.inox, 0, -0.16, 0, 12); add(TM, new THREE.Mesh(BoxGeometryR(0.07, 0.11, 0.025), mat({ color: 0xf5f5f0, roughness: 0.5 }))).position.set(0, 0.07, 0);
  const eT = ecran(192, 96); const fT = add(TM, new THREE.Mesh(new THREE.PlaneGeometry(0.056, 0.03), new THREE.MeshBasicMaterial({ map: eT.t }))); fT.position.set(0, 0.085, 0.0131); k_(fT, "termometru", "Termometrul digital cu sondă (°C)");
  k_(TM.children[1], "termometru", "Termometrul digital cu sondă");
  /* ---- pompa centrifugă (motor albastru, carcasa spirală gri) cu cutia de comandă */
  const PX = -0.62, PY = 0.24;
  const motor = cyl(sc, 0.075, 0.075, 0.24, albastruC, PX + 0.12, PY, 0, 40); motor.rotation.z = Math.PI / 2; k_(motor, "pompa", "Pompa centrifugă a standului (0,37 kW)");
  for (let i = 0; i < 14; i++) { const n = add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.012), albastruC)); const a = i / 14 * Math.PI * 2; n.position.set(PX + 0.12, PY + Math.sin(a) * 0.077, Math.cos(a) * 0.077); n.rotation.x = -a; }
  cyl(sc, 0.06, 0.06, 0.04, albastruC, PX + 0.26, PY, 0, 30).rotation.z = Math.PI / 2;
  add(sc, new THREE.Mesh(BoxGeometryR(0.09, 0.05, 0.09), albastruC)).position.set(PX + 0.12, PY + 0.095, 0);
  const volut = cyl(sc, 0.095, 0.095, 0.07, griT, PX - 0.04, PY, 0, 40); volut.rotation.z = Math.PI / 2;
  cyl(sc, 0.028, 0.028, 0.175, griT, -0.7825, PY, 0, 24).rotation.z = Math.PI / 2;           // aspirația, axial, spre rezervor
  inel([RX + RW / 2 + 0.005, PY, 0], 0.035, 0.012, [1, 0, 0], griInch);
  add(sc, new THREE.Mesh(BoxGeometryR(0.3, 0.02, 0.16), griInch)).position.set(PX + 0.08, 0.12, 0);
  [PX - 0.04, PX + 0.2].forEach(x => add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.14), griInch)).position.set(x, 0.155, 0));
  // refularea verticală cu robinetul de reglare (roată) și manometrul digital (montat la pompa de 12 V)
  const XR = PX - 0.04, YT = 0.92, D1 = 0.0105, D2 = 0.0155;     // raza exterioară a țevii de 17 mm interior, a tronsonului de 26 mm
  const pvcG = mat({ color: 0x9aa1a8, roughness: 0.35, metalness: 0.2 });
  teava([XR, PY + 0.09, 0], [XR, YT - 0.03, 0], D1, pvcG);
  const cotS = add(sc, new THREE.Mesh(new THREE.TorusGeometry(0.03, D1, 16, 24, Math.PI / 2), pvcG)); cotS.position.set(XR + 0.03, YT - 0.03, 0); cotS.rotation.z = Math.PI / 2;
  const RV = new THREE.Group(); RV.position.set(XR, 0.5, 0); sc.add(RV);
  add(RV, new THREE.Mesh(BoxGeometryR(0.05, 0.08, 0.05), M.alama)); cyl(RV, 0.016, 0.016, 0.035, M.alama, 0, 0, 0.04, 20).rotation.x = Math.PI / 2; cyl(RV, 0.004, 0.004, 0.05, M.otel || M.inox, 0, 0, 0.07, 10).rotation.x = Math.PI / 2;
  [-0.045, 0.045].forEach(y => inel([0, y, 0].map((v, i) => v + [XR, 0.5, 0][i]), 0.017, 0.012, [0, 1, 0], M.alama));
  const roata = new THREE.Group(); roata.position.set(0, 0, 0.095); RV.add(roata);
  const mRoata = mat({ color: 0xc62828, roughness: 0.45, metalness: 0.2 });
  k_(add(roata, new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.0055, 10, 40), mRoata)), "reglare", "Robinetul de reglare (clic = −5 %, Shift+clic = +5 %)");
  [0, 1, 2].forEach(k => { const s = add(roata, new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.006, 0.006), mRoata)); s.rotation.z = k * Math.PI / 3; k_(s, "reglare", "Robinetul de reglare"); });
  cyl(roata, 0.009, 0.009, 0.012, mRoata, 0, 0, 0, 16).rotation.x = Math.PI / 2;
  // cutia de comandă a pompei, pe un stâlp al cadrului
  const CB = new THREE.Group(); CB.position.set(-0.3, 0.42, 0.2); sc.add(CB);
  add(CB, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), albastruC)).position.set(0, -0.17, -0.03);
  add(CB, new THREE.Mesh(BoxGeometryR(0.12, 0.17, 0.08), mat({ color: 0xe3e3dc, roughness: 0.5 }))).position.set(0, 0.05, 0.025);
  const bV = cyl(CB, 0.017, 0.017, 0.02, mat({ color: 0x2e7d32, roughness: 0.4 }), 0, 0.085, 0.07, 20); bV.rotation.x = Math.PI / 2; k_(bV, "start", "Pornire pompă (I)");
  const bR = cyl(CB, 0.022, 0.022, 0.025, mat({ color: 0xc62828, roughness: 0.4 }), 0, 0.025, 0.07, 20); bR.rotation.x = Math.PI / 2; k_(bR, "stop", "Oprire pompă (0)");
  const ledP = cyl(CB, 0.007, 0.007, 0.01, new THREE.MeshBasicMaterial({ color: 0x223322 }), 0.035, 0.11, 0.066, 12); ledP.rotation.x = Math.PI / 2;
  sc.add(tubM([[-0.3, 0.36, 0.23], [-0.33, 0.2, 0.25], [-0.45, 0.24, 0.07], [PX + 0.12, PY + 0.12, 0.02]], 0.005, M.negru, 30));
  sc.add(tubM([[-0.3, 0.36, 0.24], [-0.3, 0.12, 0.24], [-0.3, 0.04, 0.12], [-0.3, 0.01, -0.3], [-0.3, 0.02, -0.72], [-0.3, 0.3, -0.735]], 0.004, M.negru, 40));
  add(sc, new THREE.Mesh(BoxGeometryR(0.08, 0.08, 0.03), mat({ color: 0xf0f0ea, roughness: 0.5 }))).position.set(-0.3, 0.32, -0.735);
  /* ---- conducta orizontală de măsură, cu racorduri olandeze, lărgirea și îngustarea */
  const XP1 = -0.45, XP2 = XP1 + 1.5, XL0 = XP2 + 0.07, XL1 = XL0 + 0.27, XC = XL1 + 0.3, YC = YT;
  teava([XR + 0.03, YT, 0], [XL0, YT, 0], D1, pvcG);
  [-0.12, 0.35, 0.8].forEach(x => inel([x, YT, 0], D1 + 0.008, 0.03, [1, 0, 0], griInch));
  const lar = teava([XL0, YT, 0], [XL1, YT, 0], D2 + 0.003, acril); lar.castShadow = false; k_(lar, "largire", "Lărgirea bruscă 17/26 mm (tronson transparent)");
  teava([XL0 + 0.005, YT, 0], [XL1 - 0.005, YT, 0], D2, apaM).castShadow = false;
  [XL0, XL1].forEach(x => { inel([x, YT, 0], D2 + 0.012, 0.045, [1, 0, 0], pvcG); });
  teava([XL1, YT, 0], [XC - 0.03, YT, 0], D1, pvcG); k_(sc.children[sc.children.length - 1], "ingustare", "Îngustarea bruscă 26/17 mm");
  const cotJ = add(sc, new THREE.Mesh(new THREE.TorusGeometry(0.03, D1, 16, 24, Math.PI / 2), pvcG)); cotJ.position.set(XC - 0.03, YT - 0.03, 0); k_(cotJ, "cot", "Cotul 90° cu rază mică (prizele 5–6)");
  inel([XC - 0.012, YT - 0.012, 0], D1 + 0.004, 0.02, [Math.SQRT1_2, -Math.SQRT1_2, 0], pvcG);
  // ramura verticală: priza 6, robinetul cu bilă, priza 7, rotametrul, debitmetrul cu turbină, cotul de jos și returul
  const Y6 = YT - 0.15, YBV = Y6 - 0.08, Y7 = Y6 - 0.2, YRot0 = 0.32, YRot1 = 0.5, YRet = 0.15;
  teava([XC, YT - 0.03, 0], [XC, YRot1 + 0.02, 0], D1, pvcG);
  const BV = new THREE.Group(); BV.position.set(XC, YBV, 0); sc.add(BV);
  add(BV, new THREE.Mesh(BoxGeometryR(0.05, 0.075, 0.05), griT)); [-0.045, 0.045].forEach(y => cyl(BV, 0.018, 0.018, 0.02, griInch, 0, y, 0, 6));
  cyl(BV, 0.005, 0.005, 0.03, M.inox, 0, 0, 0.035, 10).rotation.x = Math.PI / 2;
  const maner = new THREE.Group(); maner.position.set(0, 0, 0.05); BV.add(maner);
  k_(add(maner, new THREE.Mesh(BoxGeometryR(0.13, 0.014, 0.012), mat({ color: 0x1f5aa6, roughness: 0.5 }))), "bila", "Robinetul cu bilă (clic = deschis / parțial închis)").position.set(0.06, 0, 0);
  // rotametrul (tub conic transparent cu plutitor roșu și scală)
  inel([XC, YRot1 + 0.01, 0], 0.024, 0.025, [0, 1, 0], griInch); inel([XC, YRot0 - 0.01, 0], 0.024, 0.025, [0, 1, 0], griInch);
  const rot = cyl(sc, 0.018, 0.014, YRot1 - YRot0 - 0.02, acril, XC, (YRot0 + YRot1) / 2, 0, 24); rot.castShadow = false; k_(rot, "rotametru", "Rotametrul (indicație orientativă; citirea exactă pe afișajul debitmetrului)");
  const plut = cyl(sc, 0.012, 0.006, 0.02, mat({ color: 0xc62828, roughness: 0.4 }), XC, YRot0 + 0.01, 0, 16);
  { const e = ecran(64, 512), x = e.x; x.fillStyle = "#fff"; x.fillRect(0, 0, 64, 512); x.fillStyle = "#123"; for (let i = 0; i <= 30; i++) { const y = 500 - i * 16; x.fillRect(0, y, i % 5 ? 14 : 26, 2); if (i % 10 === 0) { x.font = "bold 22px system-ui"; x.fillText(String(i), 30, y + 8); } } e.t.needsUpdate = true;
    add(sc, new THREE.Mesh(new THREE.PlaneGeometry(0.016, YRot1 - YRot0 - 0.03), new THREE.MeshBasicMaterial({ map: e.t }))).position.set(XC + 0.028, (YRot0 + YRot1) / 2, 0.005); }
  teava([XC, YRot0 - 0.02, 0], [XC, YRet + 0.03, 0], D1, pvcG);
  // debitmetrul cu turbină și afișajul lui
  const DB = new THREE.Group(); DB.position.set(XC, 0.25, 0); sc.add(DB); cyl(DB, 0.02, 0.02, 0.07, M.negru, 0, 0, 0, 20);
  add(DB, new THREE.Mesh(BoxGeometryR(0.11, 0.075, 0.035), mat({ color: 0x263238, roughness: 0.5 }))).position.set(-0.075, 0.0, 0.03);
  const eDB = ecran(256, 160); const fDB = add(DB, new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.056), new THREE.MeshBasicMaterial({ map: eDB.t }))); fDB.position.set(-0.075, 0, 0.0481); k_(fDB, "debitmetru", "Debitmetrul cu turbină: afișaj Q [L/s]");
  sc.add(tubM([[XC - 0.02, 0.25, 0], [XC - 0.05, 0.25, 0.02]], 0.003, M.negru, 6));
  const cotB = add(sc, new THREE.Mesh(new THREE.TorusGeometry(0.03, D1, 16, 24, Math.PI / 2), pvcG)); cotB.position.set(XC - 0.03, YRet + 0.03, 0); cotB.rotation.z = -Math.PI / 2;
  // returul transparent pe lângă cadru, cu intrare în rezervor
  const ZR = 0.12; teava([XC - 0.03, YRet, 0], [XC - 0.1, YRet, 0], D1, pvcG);
  const ret = sc.add(tubM([[XC - 0.1, YRet, 0], [XC - 0.2, YRet, ZR], [0.6, YRet, ZR], [-0.5, YRet, ZR], [-0.75, YRet + 0.02, ZR + 0.03], [RX + RW / 2 + 0.06, 0.32, ZR], [RX + RW / 2 - 0.01, 0.32, ZR]], D1, furtun, 80));
  /* ---- prizele de presiune (racord de alamă cu robinet de aerisire cu bilă albastră) */
  const PR = [[XP1, YT, "s"], [XP2, YT, "s"], [XL0 + 0.06, YT + 0.005, "s"], [XL1 - 0.06, YT + 0.005, "s"], [XC - 0.15, YT, "s"], [XC, Y6, "x"], [XC, Y7, "x"]];
  const bulePriza = [];
  PR.forEach(([x, y, o], i) => {
    const G = new THREE.Group(); G.position.set(x, y, 0); sc.add(G);
    const r0 = o === "s" ? (i === 2 || i === 3 ? D2 + 0.003 : D1) : D1;
    if (o === "s") { cyl(G, 0.006, 0.006, 0.05, M.alama, 0, r0 + 0.02, 0, 12); add(G, new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), M.alama)).position.set(0, r0 + 0.045, 0);
      cyl(G, 0.0035, 0.0035, 0.025, M.alama, 0, r0 + 0.045, 0.014, 10).rotation.x = Math.PI / 2; k_(add(G, new THREE.Mesh(new THREE.SphereGeometry(0.0075, 14, 10), mat({ color: 0x1e4fc2, roughness: 0.3 }))), "aerisire", `Priza ${i + 1}: robinetul de aerisire (clic = aerisește)`).position.set(0, r0 + 0.045, 0.03); }
    else { cyl(G, 0.006, 0.006, 0.05, M.alama, r0 + 0.02, 0, 0, 12).rotation.z = Math.PI / 2; add(G, new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), M.alama)).position.set(r0 + 0.045, 0, 0);
      cyl(G, 0.0035, 0.0035, 0.025, M.alama, r0 + 0.045, 0, 0.014, 10).rotation.x = Math.PI / 2; k_(add(G, new THREE.Mesh(new THREE.SphereGeometry(0.0075, 14, 10), mat({ color: 0x1e4fc2, roughness: 0.3 }))), "aerisire", `Priza ${i + 1}: robinetul de aerisire (clic = aerisește)`).position.set(r0 + 0.045, 0, 0.03); }
    // eticheta rotundă portocalie cu numărul prizei
    const e = ecran(64, 64); e.x.fillStyle = "#e67e22"; e.x.beginPath(); e.x.arc(32, 32, 30, 0, 7); e.x.fill(); e.x.strokeStyle = "#333"; e.x.lineWidth = 3; e.x.stroke(); e.x.fillStyle = "#fff"; e.x.font = "bold 40px system-ui"; e.x.textAlign = "center"; e.x.fillText(String(i + 1), 32, 46); e.t.needsUpdate = true;
    const et = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.035), new THREE.MeshBasicMaterial({ map: e.t, transparent: true })); et.position.set(o === "s" ? 0 : r0 + 0.1, o === "s" ? r0 + 0.1 : 0, 0.02); G.add(et);
  });
  /* ---- panoul cu piezometre, montat pe perete în spatele standului */
  const PZ = { x0: 0.0, dx: 0.13, y0: 1.12, H: 1.0, z: -0.62 };
  const cS = document.createElement("canvas"); cS.width = 1024; cS.height = 2304;
  { const x = cS.getContext("2d"), k = 2.048, y0 = 2304 - 120; x.fillStyle = "#fbfaf4"; x.fillRect(0, 0, 1024, 2304); x.fillStyle = "#1b2733"; x.textAlign = "right";
    for (let i = 0; i < 7; i++) { const cx = 150 + i * 133; for (let mm = 0; mm <= 1000; mm += 2) { const y = y0 - mm * k, L = mm % 100 === 0 ? 40 : mm % 10 === 0 ? 26 : 12; x.fillRect(cx + 16, y - 1, L, mm % 10 === 0 ? 2.4 : 1.2); }
      x.font = "bold 46px system-ui"; x.textAlign = "left"; x.fillText(String(i + 1), cx + 46, y0 + 62); x.textAlign = "right"; }
    for (let mm = 0; mm <= 1000; mm += 100) { x.font = "bold 34px system-ui"; x.fillText(String(mm), 95, y0 - mm * 2.048 + 12); }
    x.font = "28px system-ui"; x.textAlign = "left"; x.fillText("mm H₂O", 20, 70); }
  const tS = new THREE.CanvasTexture(cS); tS.colorSpace = THREE.SRGBColorSpace; tS.anisotropy = 8;
  const PW = 1.0, PH = 2304 / 1024 * PW * 0.5;      // panou 1,0 × 1,125 m
  const panou = add(sc, new THREE.Mesh(new THREE.BoxGeometry(PW + 0.04, PH + 0.04, 0.025), mat({ color: 0x37474f, roughness: 0.5 }))); panou.position.set(PZ.x0 + 0.39, PZ.y0 + PH / 2 - 120 / 2304 * PH, PZ.z - 0.02);
  const fata = add(sc, new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat({ map: tS, roughness: 0.6 }))); fata.position.set(PZ.x0 + 0.39, PZ.y0 + PH / 2 - 120 / 2304 * PH, PZ.z - 0.006); fata.castShadow = false;
  const xTub = i => PZ.x0 + 0.39 - PW / 2 + (150 + i * 133) / 1024 * PW;
  const yMm = mm => PZ.y0 + (mm) / 1000 * (2.048 * 1000 / 2304 * PH);       // corespondența scalei
  const HT = yMm(1000) - yMm(0);
  const coloane = PR.map((_, i) => { const x = xTub(i);
    const g = cyl(sc, 0.0065, 0.0065, HT + 0.08, sticla, x, yMm(0) + HT / 2, PZ.z + 0.02, 16); g.castShadow = false; k_(g, "piezo", `Piezometrul ${i + 1}`);
    const w = cyl(sc, 0.0045, 0.0045, 1, new THREE.MeshBasicMaterial({ color: 0x3d8fd1 }), x, yMm(0), PZ.z + 0.02, 12); w.castShadow = false;
    const men = cyl(sc, 0.0052, 0.0052, 0.003, new THREE.MeshBasicMaterial({ color: 0x0b3a63 }), x, yMm(0), PZ.z + 0.02, 12);
    [yMm(0) - 0.05, yMm(1000) + 0.04].forEach(y => add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.03), M.alu)).position.set(x, y, PZ.z + 0.012));
    return { w, men, x }; });
  // colectorul de sus (aerul comprimat deasupra coloanelor), supapa și pompa de mână; colectorul de jos cu racordurile
  teava([xTub(0) - 0.04, yMm(1000) + 0.06, PZ.z + 0.02], [xTub(6) + 0.06, yMm(1000) + 0.06, PZ.z + 0.02], 0.012, M.alu);
  coloane.forEach(c => teava([c.x, yMm(1000) + 0.03, PZ.z + 0.02], [c.x, yMm(1000) + 0.06, PZ.z + 0.02], 0.007, M.alu));
  const sup = new THREE.Group(); sup.position.set(xTub(6) + 0.08, yMm(1000) + 0.06, PZ.z + 0.02); sc.add(sup); cyl(sup, 0.008, 0.008, 0.04, M.alama, 0, 0.0, 0, 12).rotation.z = Math.PI / 2;
  k_(cyl(sup, 0.012, 0.012, 0.015, mat({ color: 0xc62828, roughness: 0.4 }), 0.03, 0, 0, 16), "aer", "Supapa de aer a colectorului (clic = coboară nivelurile cu ≈ 50 mm)").rotation.z = Math.PI / 2;
  const pm = new THREE.Group(); pm.position.set(xTub(0) - 0.15, yMm(1000) - 0.25, PZ.z + 0.05); sc.add(pm);
  k_(cyl(pm, 0.018, 0.018, 0.3, mat({ color: 0x263238, roughness: 0.5 }), 0, 0, 0, 20), "pompaAer", "Pompa de mână a colectorului (clic = ridică nivelurile cu ≈ 50 mm)");
  cyl(pm, 0.004, 0.004, 0.08, M.inox, 0, 0.18, 0, 8); add(pm, new THREE.Mesh(BoxGeometryR(0.09, 0.02, 0.025), M.negru)).position.set(0, 0.225, 0);
  sc.add(tubM([[xTub(0) - 0.15, yMm(1000) - 0.4, PZ.z + 0.05], [xTub(0) - 0.2, yMm(1000) - 0.5, PZ.z + 0.07], [xTub(0) - 0.1, yMm(1000) + 0.02, PZ.z + 0.06], [xTub(0) - 0.04, yMm(1000) + 0.06, PZ.z + 0.03]], 0.004, M.negru, 30));
  // furtunurile transparente de la prize la baza piezometrelor (cu bule de aer până la aerisire)
  const furt = PR.map(([x, y, o], i) => { const r0 = (i === 2 || i === 3) ? D2 + 0.003 : D1, A = o === "s" ? [x, y + r0 + 0.055, 0] : [x + r0 + 0.055, y, 0], c = coloane[i];
    const pts = o === "s" ? [A, [x, y + 0.12, -0.04], [x * 0.6 + c.x * 0.4, y + 0.1, -0.35], [c.x, yMm(0) - 0.2, PZ.z + 0.03], [c.x, yMm(0) - 0.06, PZ.z + 0.02]]
      : [A, [A[0] + 0.07, y, -0.05], [A[0] + 0.05, y + 0.2, -0.3], [c.x + 0.1, yMm(0) - 0.25, PZ.z + 0.04], [c.x, yMm(0) - 0.06, PZ.z + 0.02]];
    const crv = new THREE.CatmullRomCurve3(pts.map(p => V3(...p))); const t = add(sc, new THREE.Mesh(new THREE.TubeGeometry(crv, 50, 0.004, 8), furtun)); t.castShadow = false;
    const b = [0.3, 0.55, 0.8].map(u => { const s = add(sc, new THREE.Mesh(new THREE.SphereGeometry(0.0033, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }))); s.position.copy(crv.getPointAt(u)); return s; });
    bulePriza.push(b); return t; });
  // suporturile verticale ale conductei (stâlpi albaștri cu bride)
  [0.05, 1.0].forEach(x => { add(sc, new THREE.Mesh(BoxGeometryR(0.04, YT - 0.09, 0.04), albastruC)).position.set(x, (YT + 0.09) / 2 - 0.02, 0); inel([x, YT, 0], D1 + 0.005, 0.03, [1, 0, 0], griInch); });
  /* ---- pompa electrică de 12 V, sursa de laborator și manometrul digital (opțional) */
  const P12 = new THREE.Group(); P12.position.set(-0.45, 0.0, 0.48); P12.visible = false; sc.add(P12);
  add(P12, new THREE.Mesh(BoxGeometryR(0.22, 0.02, 0.14), M.gri)).position.set(0, 0.01, 0);
  cyl(P12, 0.04, 0.04, 0.12, M.negru, 0.02, 0.07, 0, 30).rotation.z = Math.PI / 2; cyl(P12, 0.047, 0.047, 0.035, mat({ color: 0x3a3a3a, roughness: 0.5 }), -0.06, 0.07, 0, 30).rotation.z = Math.PI / 2;
  cyl(P12, 0.012, 0.012, 0.06, M.negru, -0.1, 0.07, 0, 16).rotation.z = Math.PI / 2; cyl(P12, 0.011, 0.011, 0.05, M.negru, -0.06, 0.12, 0, 16);
  k_(P12.children[1], "p12", "Pompa electrică de lichid de răcire, 12 V");
  const furtP12 = tubM([[-0.51, 0.145, 0.48], [-0.55, 0.3, 0.35], [XR, 0.36, 0.1], [XR, 0.4, 0.012]], 0.011, M.negru, 30); furtP12.visible = false; sc.add(furtP12);
  const aspP12 = tubM([[-0.58, 0.07, 0.48], [-0.75, 0.05, 0.45], [-0.9, 0.35, 0.28], [-0.97, 0.6, 0.12], [-1.0, 0.42, 0.08]], 0.012, M.negru, 40); aspP12.visible = false; sc.add(aspP12);
  const SRS = new THREE.Group(); SRS.position.set(0.1, 0, 0.5); SRS.visible = false; sc.add(SRS);
  add(SRS, new THREE.Mesh(BoxGeometryR(0.26, 0.13, 0.22), mat({ color: 0xdedfd8, roughness: 0.5 }))).position.y = 0.065;
  add(SRS, new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.12), mat({ color: 0x2b2f33, roughness: 0.5 }))).position.set(0, 0.065, 0.1105);
  const eSR = ecran(320, 120); k_(add(SRS, new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.056), new THREE.MeshBasicMaterial({ map: eSR.t }))), "sursa", "Sursa de laborator 12 V (clic = pornește / oprește ieșirea)").position.set(-0.03, 0.08, 0.111);
  [[0.08, 0.035, 0xc62828], [0.105, 0.035, 0x111111]].forEach(([x, y, c]) => cyl(SRS, 0.008, 0.008, 0.02, mat({ color: c, roughness: 0.4 }), x, y, 0.115, 14).rotation.x = Math.PI / 2);
  [[0.08, 0xc62828], [0.105, 0x111111]].forEach(([x, c]) => SRS.add(tubM([[x, 0.035, 0.12], [x, 0.0, 0.2], [-0.2, 0.01, 0.1], [-0.55 + 0.1 - x * 0.2, 0.07, -0.02]].map(p => p), 0.003, mat({ color: c, roughness: 0.5 }), 30)));
  const MDg = new THREE.Group(); MDg.position.set(XR + 0.04, 0.4, 0.02); MDg.visible = false; sc.add(MDg);
  cyl(MDg, 0.005, 0.005, 0.04, M.alama, -0.02, 0, 0, 10).rotation.z = Math.PI / 2; cyl(MDg, 0.04, 0.04, 0.03, M.inox, 0.02, 0, 0.0, 32).rotation.x = Math.PI / 2;
  const eMD = ecran(192, 96); k_(add(MDg, new THREE.Mesh(new THREE.CircleGeometry(0.034, 32), new THREE.MeshBasicMaterial({ map: eMD.t }))), "manometru", "Manometrul digital pe refulare [kPa]").position.set(0.02, 0, 0.0155);
  /* ---- curgerea vizibilă: particule fine în tronsonul transparent și în retur */
  const NB = 90, partic = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0016, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), NB); partic.frustumCulled = false; partic.renderOrder = 2; sc.add(partic);
  const PB = Array.from({ length: NB }, (_, i) => ({ s: Math.random(), r: Math.sqrt(Math.random()) * 0.9, a: Math.random() * 6.3, z: i < 50 }));
  const curbaRet = new THREE.CatmullRomCurve3([[XC - 0.1, YRet, 0], [XC - 0.2, YRet, ZR], [0.6, YRet, ZR], [-0.5, YRet, ZR], [-0.75, YRet + 0.02, ZR + 0.03], [RX + RW / 2 + 0.06, 0.32, ZR]].map(p => V3(...p)));
  interactiune(S, clic, opt.laClic);
  const V = { pompa: false, Q: 0, Qaf: 0, h: [0, 0, 0, 0, 0, 0, 0], a: 0, bila: true, T: 20, aerisit: false, p12: false, sursa: false, U12: 0, I12: 0, kPa: 0 };
  let ultDB = "", ultT = "", ultSR = "", ultMD = "", tt = 0;
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1);
  S.porneste(dt => {
    tt += dt;
    ledP.material.color.set(V.pompa ? 0x3cff4a : 0x223322);
    roata.rotation.z = -(V.a / 100) * Math.PI * 6; maner.rotation.z = V.bila ? 0 : Math.PI / 3.5;
    coloane.forEach((c, i) => { const mm = Math.max(0, Math.min(1035, V.h[i])), y = yMm(mm), hh = Math.max(0.0005, y - yMm(-30)); c.w.scale.y = hh; c.w.position.y = yMm(-30) + hh / 2; c.men.position.y = y; c.men.visible = mm > 1 && mm < 1030; });
    bulePriza.forEach(b => b.forEach((s, j) => { s.visible = !V.aerisit; }));
    const q = V.Q; plut.position.y = YRot0 + 0.012 + Math.min(1, q / 0.5) * (YRot1 - YRot0 - 0.04) + (q > 0 ? Math.sin(tt * 9) * 0.0015 : 0);
    const k = (V.pompa || (V.p12 && V.sursa)) ? V.Qaf.toFixed(3) : "0.000";
    if (k !== ultDB) { ultDB = k; const { x, c } = eDB; x.fillStyle = "#0e1a14"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#7dff8a"; x.font = "bold 76px 'Courier New',monospace"; x.textAlign = "right"; x.fillText(k, 200, 100); x.font = "bold 26px system-ui"; x.fillText("L/s", 250, 100); x.font = "20px system-ui"; x.textAlign = "left"; x.fillStyle = "#4caf50"; x.fillText("FLOW  Q", 12, 30); eDB.t.needsUpdate = true; }
    const kT = V.T.toFixed(1); if (kT !== ultT) { ultT = kT; lcd(eT, kT, "°C"); }
    [P12, furtP12, aspP12, SRS, MDg].forEach(o => o.visible = V.p12);
    if (V.p12) { const ks = `${V.sursa}|${V.U12.toFixed(1)}|${V.I12.toFixed(2)}`; if (ks !== ultSR) { ultSR = ks; const { x, c } = eSR; x.fillStyle = "#0d0f12"; x.fillRect(0, 0, c.width, c.height); x.font = "bold 56px 'Courier New',monospace"; x.textAlign = "right"; x.fillStyle = "#ff5252"; x.fillText(V.U12.toFixed(1), 140, 75); x.fillStyle = "#69f0ae"; x.fillText(V.I12.toFixed(2), 300, 75); x.font = "18px system-ui"; x.fillStyle = "#bbb"; x.fillText("V", 158, 100); x.fillText("A", 316, 100); eSR.t.needsUpdate = true; }
      const km = V.kPa.toFixed(1); if (km !== ultMD) { ultMD = km; const { x, c } = eMD; x.fillStyle = "#b9c7b0"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#1d2414"; x.font = "bold 50px 'Courier New',monospace"; x.textAlign = "center"; x.fillText(km, 96, 58); x.font = "16px system-ui"; x.fillText("kPa", 96, 84); eMD.t.needsUpdate = true; } }
    const vel = (V.Qaf / 1000) / (Math.PI * 0.017 * 0.017 / 4);
    PB.forEach((b, i) => { let p;
      if (b.z) { const v2 = vel * Math.pow(17 / 26, 2) * (1.15 - b.r * b.r * 0.4); b.s = (b.s + v2 * dt / (XL1 - XL0)) % 1; p = v3.set(XL0 + b.s * (XL1 - XL0), YT + Math.sin(b.a) * b.r * 0.012, Math.cos(b.a) * b.r * 0.012); }
      else { b.s = (b.s + vel * dt / curbaRet.getLength()) % 1; const c = curbaRet.getPointAt(b.s); p = v3.set(c.x, c.y + Math.sin(b.a) * b.r * 0.007, c.z + Math.cos(b.a) * b.r * 0.007); }
      m4.compose(p, q0, s1); partic.setMatrixAt(i, m4); });
    partic.instanceMatrix.needsUpdate = true; partic.visible = vel > 0.02;
  });
  return { seteaza(o) { Object.assign(V, o); if (o.h) V.h = o.h.slice(); }, vedere(p, t) { S.camera.position.set(...p); S.ctl.target.set(...t); } };
}

/* ===================================================================== DA L6: standul didactic ABS/ESC și ADAS
   Cadru de laborator pe roți cu platformă: patru colțuri de roată (butuc, disc, etrier; față – roată dințată cu z = 48 și senzor pasiv,
   spate – inel multipolar în rulment și senzor activ, etriere cu frână de parcare electrică), motorul de antrenare cu curele pe cele
   două punți, direcția cu cremalieră și volanul (senzorul de unghi pe coloană), pedala cu servofrâna, pompa centrală și rezervorul,
   unitatea hidraulică ABS/ESC cu pompa, electrovalvele și modulul cu conectorul, conductele de frână, blocul senzorilor ESC (girație,
   accelerație laterală), lămpile de frână, panoul cu cheia de contact, priza OBD cu interfața testerului, lămpile ABS/ESC și
   reglajul turației, bateria; partea ADAS: parbrizul cu camera frontală, radarul și panoul-țintă de calibrare pe stativ. */
export function creeazaStandABS(gazda, opt = {}) {
  const S = scena(gazda, [1.6, 2.3, 3.6], [0.7, 0.85, 0.0]), sc = S.scene; S.ctl.maxDistance = 7; S.ctl.minDistance = 0.12; S.ctl.maxPolarAngle = Math.PI * 0.56;
  const [blat, perete] = sc.children.filter(o => o.isMesh); blat.visible = false;
  perete.geometry = new THREE.PlaneGeometry(9, 3.4); perete.position.set(0.5, 1.7, -1.6);
  const pod = add(sc, new THREE.Mesh(new THREE.PlaneGeometry(9, 6), mat({ color: 0x8e979c, roughness: 0.85 }))); pod.rotation.x = -Math.PI / 2; pod.position.set(0.5, 0, 0.8); pod.castShadow = false;
  { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); x.fillStyle = "#8e979c"; x.fillRect(0, 0, 64, 64); x.strokeStyle = "rgba(0,0,0,.18)"; x.lineWidth = 2; x.strokeRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 6); t.colorSpace = THREE.SRGBColorSpace; pod.material.map = t; pod.material.needsUpdate = true; }
  const sun = sc.children.find(o => o.isDirectionalLight); sun.position.set(1.5, 3.5, 2.5); Object.assign(sun.shadow.camera, { left: -2.5, right: 3.5, top: 2.5, bottom: -2, near: 0.5, far: 9 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0006;
  const M = materialeMAM(), clic = [], k_ = (o, k, et) => { o.userData.k = k; o.userData.et = et; clic.push(o); return o; };
  const RB = (a, b, c, r = 0.006) => new RoundedBoxGeometry(a, b, c, 2, r);
  const albastru = mat({ color: 0x24518f, roughness: 0.45, metalness: 0.35 }), otel = mat({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.85 }), fonta = mat({ color: 0x5b6066, roughness: 0.55, metalness: 0.7 });
  const rosu = mat({ color: 0xc8202a, roughness: 0.35, metalness: 0.3 }), plastic = mat({ color: 0x1c1e21, roughness: 0.6 }), cupru = mat({ color: 0xb87333, roughness: 0.35, metalness: 0.9 });
  const V3 = (...a) => new THREE.Vector3(...a);
  const tev = (pts, r, m, seg = 40) => { const o = tubM(pts, r, m, seg); sc.add(o); return o; };
  /* ---- cadrul pe roți și platforma */
  const XL = 1.15, ZL = 0.62, YD = 0.74;
  [[-XL, -ZL], [-XL, ZL], [XL, -ZL], [XL, ZL]].forEach(([x, z]) => { add(sc, new THREE.Mesh(RB(0.05, YD - 0.1, 0.05), albastru)).position.set(x, (YD - 0.1) / 2 + 0.08, z);
    const rc = cyl(sc, 0.04, 0.04, 0.03, plastic, x, 0.04, z, 20); rc.rotation.x = Math.PI / 2; add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), otel)).position.set(x, 0.09, z); });
  [-ZL, ZL].forEach(z => { add(sc, new THREE.Mesh(RB(2 * XL + 0.05, 0.05, 0.05), albastru)).position.set(0, YD - 0.03, z); add(sc, new THREE.Mesh(RB(2 * XL + 0.05, 0.04, 0.04), albastru)).position.set(0, 0.2, z); });
  [-XL, XL].forEach(x => add(sc, new THREE.Mesh(RB(0.05, 0.05, 2 * ZL), albastru)).position.set(x, YD - 0.03, 0));
  const placa = add(sc, new THREE.Mesh(RB(2 * XL, 0.012, 2 * ZL, 0.004), mat({ color: 0x3e444b, roughness: 0.75, metalness: 0.4 }))); placa.position.set(0, YD, 0);
  add(sc, new THREE.Mesh(RB(2 * XL - 0.1, 0.012, 2 * ZL - 0.1, 0.004), mat({ color: 0x50575f, roughness: 0.8, metalness: 0.3 }))).position.set(0, 0.21, 0);
  // bateria sub platformă
  const bat = add(sc, new THREE.Mesh(RB(0.28, 0.19, 0.17, 0.01), plastic)); bat.position.set(-0.75, 0.32, 0.25); k_(bat, "baterie", "Bateria 12 V a standului");
  [[-0.83, 0xc62828], [-0.67, 0x111111]].forEach(([x, c]) => cyl(sc, 0.012, 0.012, 0.02, mat({ color: c, roughness: 0.4 }), x, 0.425, 0.25, 14));
  /* ---- colțurile de roată */
  const YH = YD + 0.24, XF = 0.72, XS = -0.62, ZH = 0.4, roti = [];
  const dinte = new THREE.BoxGeometry(0.008, 0.012, 0.014);
  function colt(i, x, z) {
    const fata = i < 2, sg = Math.sign(z), G = new THREE.Group(); G.position.set(x, YH, z); sc.add(G);
    // suportul fusului (placă verticală pe platformă) – la față se rotește cu direcția
    add(sc, new THREE.Mesh(RB(0.12, YH - YD - 0.03, 0.04), fonta)).position.set(x, (YH + YD) / 2 - 0.02, z - sg * 0.1);
    const piv = new THREE.Group(); G.add(piv);
    add(piv, new THREE.Mesh(RB(0.1, 0.16, 0.05, 0.01), fonta)).position.set(0, 0, -sg * 0.06);
    const rot = new THREE.Group(); piv.add(rot);
    // butucul, prezoanele, discul (ventilat la față), clopotul
    const disc = cyl(rot, fata ? 0.13 : 0.12, fata ? 0.13 : 0.12, fata ? 0.022 : 0.01, mat({ color: 0x8d9298, roughness: 0.38, metalness: 0.9 }), 0, 0, sg * 0.02, 56); disc.rotation.x = Math.PI / 2;
    if (fata) for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2, g = add(rot, new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.03, 0.012), plastic)); g.position.set(Math.cos(a) * 0.115, Math.sin(a) * 0.115, sg * 0.02); g.rotation.z = a; }
    const clopot = cyl(rot, 0.07, 0.07, 0.045, fonta, 0, 0, sg * 0.045, 36); clopot.rotation.x = Math.PI / 2;
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4, p = cyl(rot, 0.006, 0.006, 0.035, otel, Math.cos(a) * 0.05, Math.sin(a) * 0.05, sg * 0.08, 10); p.rotation.x = Math.PI / 2; }
    // roata-generator: față – coroana dințată (z = 48); spate – inelul multipolar (segmente N/S alternate)
    const rg = new THREE.Group(); rg.position.z = -sg * 0.015; rot.add(rg);
    if (fata) { cyl(rg, 0.052, 0.052, 0.012, otel, 0, 0, 0, 48).rotation.x = Math.PI / 2; for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2, d = add(rg, new THREE.Mesh(dinte, otel)); d.position.set(Math.cos(a) * 0.057, Math.sin(a) * 0.057, 0); d.rotation.z = a; } }
    else { const e = ecran(512, 16); for (let k = 0; k < 96; k++) { e.x.fillStyle = k % 2 ? "#5b2f1f" : "#2a2c30"; e.x.fillRect(k * 512 / 96, 0, 512 / 96 + 1, 16); } e.t.needsUpdate = true; e.t.wrapS = THREE.RepeatWrapping;
      const inel = add(rg, new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.014, 96, 1, true), mat({ map: e.t, roughness: 0.6 }))); inel.rotation.x = Math.PI / 2;
      cyl(rg, 0.045, 0.045, 0.012, otel, 0, 0, 0, 36).rotation.x = Math.PI / 2; }
    // senzorul de turație (corp negru, cablu, conector) – deasupra roții-generator, radial
    const SG = new THREE.Group(); SG.position.set(0, 0.075, -sg * 0.015); piv.add(SG);
    const corp = cyl(SG, 0.009, 0.009, 0.045, plastic, 0, 0.012, 0, 16); k_(corp, "senzor" + i, `Senzorul de turație ${["față stânga (pasiv, inductiv)", "față dreapta (pasiv, inductiv)", "spate stânga (activ, 2 fire)", "spate dreapta (activ, 2 fire)"][i]}`);
    add(SG, new THREE.Mesh(RB(0.03, 0.012, 0.024, 0.003), plastic)).position.set(0, 0.03, 0);
    const hl = cyl(SG, 0.013, 0.013, 0.05, new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0, depthWrite: false }), 0, 0.012, 0, 16); hl.castShadow = false;
    // cablul până la conectorul de pe platformă (conectorul se poate decupla)
    const cx = x + (fata ? -0.12 : 0.12), cz = z - sg * 0.18;
    tev([[x, YH + 0.11, z - sg * 0.015], [x, YH + 0.16, z - sg * 0.06], [x + (cx - x) * 0.5, YH + 0.05, z - sg * 0.14], [cx, YD + 0.05, cz]], 0.004, plastic, 30);
    const conA = add(sc, new THREE.Mesh(RB(0.03, 0.022, 0.02, 0.003), mat({ color: 0x2a2d31, roughness: 0.5 }))); conA.position.set(cx, YD + 0.04, cz);
    const conB = add(sc, new THREE.Mesh(RB(0.032, 0.024, 0.022, 0.003), mat({ color: fata ? 0x7b5a2e : 0x3c5f8e, roughness: 0.5 }))); conB.position.set(cx, YD + 0.04, cz - sg * 0.024); k_(conB, "conector" + i, `Conectorul senzorului ${["FS", "FD", "SS", "SD"][i]} (clic = cuplează / decuplează)`);
    // etrierul: față roșu (flotant), spate gri cu motorul frânei de parcare electrice
    const E = new THREE.Group(); const a0 = fata ? Math.PI * 0.85 : Math.PI * 0.15; E.position.set(Math.cos(a0) * 0.105, Math.sin(a0) * 0.105, sg * 0.02); E.rotation.z = a0; piv.add(E);
    k_(add(E, new THREE.Mesh(RB(0.06, 0.1, 0.075, 0.01), fata ? rosu : mat({ color: 0x8a8f95, roughness: 0.45, metalness: 0.6 }))), "etrier" + i, fata ? "Etrierul față" : "Etrierul spate cu frâna de parcare electrică");
    const piston = cyl(E, fata ? 0.022 : 0.018, fata ? 0.022 : 0.018, 0.02, otel, -0.005, 0, -sg * 0.045, 20); piston.rotation.x = Math.PI / 2;
    let epb = null; if (!fata) { epb = new THREE.Group(); epb.position.set(0.0, 0, -sg * 0.075); E.add(epb); cyl(epb, 0.022, 0.022, 0.07, plastic, 0, 0, -sg * 0.02, 24).rotation.x = Math.PI / 2; add(epb, new THREE.Mesh(RB(0.035, 0.03, 0.025, 0.004), plastic)).position.set(0.03, 0, -sg * 0.03);
      k_(epb.children[0], "epb" + i, "Motorul frânei de parcare electrice"); }
    roti.push({ G, piv, rot, hl, conB, piston, epb, sg, fata, x, z });
  }
  colt(0, XF, ZH); colt(1, XF, -ZH); colt(2, XS, ZH); colt(3, XS, -ZH);
  // arborii punților (fiecare roată are lagăr propriu; arbore spre motorul de antrenare)
  const arbori = [XF, XS].map(x => { const g = new THREE.Group(); g.position.set(x, YH, 0); sc.add(g); cyl(g, 0.012, 0.012, 2 * ZH - 0.25, otel, 0, 0, 0, 16).rotation.x = Math.PI / 2;
    const f = cyl(g, 0.05, 0.05, 0.03, fonta, 0, 0, 0.15, 32); f.rotation.x = Math.PI / 2; for (let k = 0; k < 6; k++) { const s = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.034), otel)); s.position.z = 0.15; s.rotation.z = k * Math.PI / 6; } return g; });
  // motorul de antrenare (cu reductor) și curelele dințate
  const MA = new THREE.Group(); MA.position.set(0.05, YD + 0.09, 0); sc.add(MA);
  k_(cyl(MA, 0.07, 0.07, 0.22, mat({ color: 0x2f6aa8, roughness: 0.45, metalness: 0.3 }), 0, 0, 0, 36), "antrenare", "Motorul de antrenare a roților (viteza se reglează din panou)").rotation.x = Math.PI / 2;
  add(MA, new THREE.Mesh(RB(0.16, 0.03, 0.2), fonta)).position.set(0, -0.07, 0);
  const fulM = new THREE.Group(); fulM.position.set(0, 0, 0.15); MA.add(fulM); { const f = cyl(fulM, 0.035, 0.035, 0.03, fonta, 0, 0, 0, 24); f.rotation.x = Math.PI / 2; for (let k = 0; k < 3; k++) { const s = add(fulM, new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.034), otel)); s.rotation.z = k * Math.PI / 3; } }
  const curea = mat({ color: 0x111214, roughness: 0.8 }), yM = YD + 0.09;
  [XF, XS].forEach(x => { const s = Math.sign(x);
    [[0.035, 0.05], [-0.035, -0.05]].forEach(([a, b]) => { const A = V3(0.05 + s * 0.0, yM + a, 0.15), B = V3(x, YH + b, 0.15), L = A.distanceTo(B), o = add(sc, new THREE.Mesh(new THREE.BoxGeometry(L, 0.005, 0.026), curea)); o.position.copy(A).lerp(B, 0.5); o.rotation.z = Math.atan2(B.y - A.y, B.x - A.x); }); });
  // apărătoarea curelelor (plasă) – deschisă pentru vizibilitate
  /* ---- direcția: cremaliera, bieletele, coloana și volanul (senzorul de unghi pe coloană) */
  const XC = XF + 0.13;
  cyl(sc, 0.022, 0.022, 0.55, mat({ color: 0x6b7178, roughness: 0.4, metalness: 0.7 }), XC, YH - 0.03, 0, 24).rotation.x = Math.PI / 2;
  const biel = [ZH, -ZH].map(z => { const b = cyl(sc, 0.008, 0.008, 0.16, otel, XC - 0.05, YH - 0.03, z * 0.8, 10); b.rotation.x = Math.PI / 2; return b; });
  // coloana de direcție: pinionul pe cremalieră → cardan → coloana înclinată, cu suportul ei; volanul la capătul din față al standului, spre operator
  const ZV = 0.25, PIN = V3(XC + 0.03, YH - 0.03, ZV), CARD = V3(XC + 0.1, YH + 0.06, ZV), VPOS = V3(XL + 0.08, YD + 0.5, ZV), dirV = VPOS.clone().sub(CARD).normalize();
  cyl(sc, 0.02, 0.02, 0.05, fonta, PIN.x, PIN.y, PIN.z, 16);
  sc.add(tubM([PIN, PIN.clone().lerp(CARD, 0.5), CARD], 0.011, otel, 8));
  add(sc, new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 10), fonta)).position.copy(CARD);
  const capC = VPOS.clone().addScaledVector(dirV, -0.11), axC = add(sc, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, CARD.distanceTo(capC), 18), mat({ color: 0x2a2c30, roughness: 0.6 })));
  axC.position.copy(CARD).lerp(capC, 0.5); axC.quaternion.setFromUnitVectors(V3(0, 1, 0), dirV);
  const sup = add(sc, new THREE.Mesh(RB(0.05, VPOS.y - 0.16 - YD, 0.06), albastru)); sup.position.set(VPOS.x - 0.12, (VPOS.y - 0.16 + YD) / 2, ZV);
  const VOL = new THREE.Group(); VOL.position.copy(VPOS); VOL.lookAt(VPOS.clone().add(dirV)); sc.add(VOL);
  const volan = new THREE.Group(); VOL.add(volan);
  k_(add(volan, new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.017, 14, 48), mat({ color: 0x1e1f22, roughness: 0.7 }))), "volan", "Volanul (clic = rotire ±; butonul din pași îl centrează)");
  [0, 1, 2].forEach(k => { const s = add(volan, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.012), mat({ color: 0x2a2c30, roughness: 0.6 }))); s.position.set(Math.cos(k * 2.1 - 1.57) * 0.08, Math.sin(k * 2.1 - 1.57) * 0.08, 0); s.rotation.z = k * 2.1 - 1.57; });
  cyl(volan, 0.06, 0.06, 0.05, mat({ color: 0x2a2c30, roughness: 0.6 }), 0, 0, -0.02, 30).rotation.x = Math.PI / 2;
  const marc = add(volan, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.02), mat({ color: 0xf2b705, roughness: 0.5 }))); marc.position.set(0, 0.18, 0.005);
  const sas = cyl(VOL, 0.05, 0.05, 0.03, mat({ color: 0x3a3f46, roughness: 0.5 }), 0, 0, -0.08, 30); sas.rotation.x = Math.PI / 2; k_(sas, "sas", "Senzorul de unghi al volanului (pe coloana de direcție)");
  /* ---- pedala, servofrâna, pompa centrală, rezervorul */
  const PB = new THREE.Group(); PB.position.set(XL - 0.02, YD - 0.02, -0.25); sc.add(PB);
  add(PB, new THREE.Mesh(RB(0.06, 0.2, 0.12), fonta)).position.set(0.03, -0.08, 0);
  const pedala = new THREE.Group(); pedala.position.set(0.06, -0.02, 0); PB.add(pedala);
  add(pedala, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.36, 0.02), otel)).position.set(0.03, -0.18, 0);
  k_(add(pedala, new THREE.Mesh(RB(0.02, 0.07, 0.09, 0.004), mat({ color: 0x111111, roughness: 0.95 }))), "pedala", "Pedala de frână (clic = apasă / eliberează)").position.set(0.045, -0.36, 0);
  const contactS = add(PB, new THREE.Mesh(RB(0.025, 0.025, 0.03, 0.004), mat({ color: 0x2b2e33, roughness: 0.5 }))); contactS.position.set(0.075, 0.03, 0.04); k_(contactS, "contactStop", "Contactul lămpilor de frână (pe pedalier)");
  const servo = cyl(sc, 0.11, 0.11, 0.16, plastic, XL - 0.12, YD + 0.13, -0.25, 40); servo.rotation.z = Math.PI / 2; k_(servo, "servo", "Servofrâna cu vacuum");
  const pc = cyl(sc, 0.028, 0.028, 0.2, mat({ color: 0xa0a5aa, roughness: 0.35, metalness: 0.8 }), XL - 0.3, YD + 0.13, -0.25, 24); pc.rotation.z = Math.PI / 2; k_(pc, "pompaC", "Pompa centrală tandem");
  const rez = add(sc, new THREE.Mesh(RB(0.12, 0.06, 0.08, 0.008), new THREE.MeshPhysicalMaterial({ color: 0xf6f0d8, roughness: 0.3, transmission: 0.4, transparent: true, opacity: 0.75 }))); rez.position.set(XL - 0.3, YD + 0.2, -0.25); k_(rez, "rezervor", "Rezervorul lichidului de frână (nivel între MIN și MAX)");
  add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.035, 0.075), mat({ color: 0xd9a63a, roughness: 0.3, transparent: true, opacity: 0.85 }))).position.set(XL - 0.3, YD + 0.19, -0.25);
  cyl(sc, 0.022, 0.022, 0.02, mat({ color: 0xe8c23a, roughness: 0.6 }), XL - 0.3, YD + 0.24, -0.25, 20);
  /* ---- unitatea hidraulică ABS/ESC: blocul de aluminiu, pompa, modulul cu conectorul */
  const HU = new THREE.Group(); HU.position.set(0.2, YD + 0.1, -0.33); sc.add(HU);
  k_(add(HU, new THREE.Mesh(RB(0.13, 0.11, 0.12, 0.006), mat({ color: 0xc9ced3, roughness: 0.3, metalness: 0.85 }))), "hcu", "Unitatea hidraulică ABS/ESC (electrovalve de admisie / evacuare, acumulatoare)");
  const pompaM = cyl(HU, 0.035, 0.035, 0.08, plastic, 0, 0, 0.1, 24); pompaM.rotation.x = Math.PI / 2; k_(pompaM, "pompaABS", "Motorul pompei de retur ABS");
  const ecuC = add(HU, new THREE.Mesh(RB(0.03, 0.12, 0.13, 0.006), mat({ color: 0x1b1e22, roughness: 0.6 }))); ecuC.position.set(-0.08, 0, 0); k_(ecuC, "modul", "Modulul electronic ABS/ESC (bobinele electrovalvelor sub capac)");
  const conM = add(HU, new THREE.Mesh(RB(0.02, 0.06, 0.07, 0.004), mat({ color: 0x2a2d31, roughness: 0.5 }))); conM.position.set(-0.105, 0.01, 0); k_(conM, "conModul", "Conectorul modulului ABS/ESC (alimentare, masă, senzori, CAN)");
  const ledV = add(HU, new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), new THREE.MeshBasicMaterial({ color: 0x223322 }))); ledV.position.set(-0.096, 0.05, 0.05);
  [[-0.04, 0.03], [0, 0.03], [0.04, 0.03], [-0.04, -0.03], [0, -0.03], [0.04, -0.03]].forEach(([a, b]) => cyl(HU, 0.008, 0.008, 0.012, M.alama, a, 0.06, b, 10));
  const masa = add(sc, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.03), M.alama)); masa.position.set(0.05, YD + 0.012, -0.5); k_(masa, "masa", "Punctul de masă al modulului pe caroserie (platformă)");
  tev([[0.12, YD + 0.13, -0.33], [0.08, YD + 0.05, -0.45], [0.05, YD + 0.014, -0.5]], 0.004, mat({ color: 0x5a3b1c, roughness: 0.6 }), 16);
  // conductele de frână (cupru): pompa centrală → HCU, HCU → etriere
  tev([[XL - 0.4, YD + 0.13, -0.25], [0.6, YD + 0.2, -0.3], [0.2, YD + 0.16, -0.33]], 0.003, cupru, 30);
  tev([[XL - 0.4, YD + 0.13, -0.24], [0.6, YD + 0.18, -0.28], [0.2, YD + 0.16, -0.31]], 0.003, cupru, 30);
  roti.forEach((r, i) => tev([[0.2 + (i % 2 ? 0.03 : -0.03), YD + 0.16, -0.33 + (i < 2 ? 0.02 : -0.02)], [(0.2 + r.x) / 2, YD + 0.06 + i * 0.01, (r.z - 0.33) / 2], [r.x, YD + 0.07, r.z - r.sg * 0.12], [r.x - 0.06 * (r.fata ? 1 : -1), YH + 0.08, r.z]], 0.003, cupru, 40));
  /* ---- blocul senzorilor ESC (girație, accelerație laterală) */
  const ESC = add(sc, new THREE.Mesh(RB(0.08, 0.035, 0.06, 0.005), mat({ color: 0x23262a, roughness: 0.6 }))); ESC.position.set(-0.15, YD + 0.025, 0.05); k_(ESC, "escS", "Senzorul de viteză de girație și accelerație laterală (în centrul de greutate)");
  { const e = ecran(128, 96); e.x.fillStyle = "#23262a"; e.x.fillRect(0, 0, 128, 96); e.x.strokeStyle = "#ddd"; e.x.lineWidth = 6; e.x.beginPath(); e.x.arc(64, 48, 26, 0.3, 5.6); e.x.stroke(); e.x.beginPath(); e.x.moveTo(98, 40); e.x.lineTo(90, 26); e.x.lineTo(104, 30); e.x.fill(); e.t.needsUpdate = true;
    add(sc, new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.045), new THREE.MeshBasicMaterial({ map: e.t }))).position.set(-0.15, YD + 0.0435, 0.05); sc.children[sc.children.length - 1].rotation.x = -Math.PI / 2; }
  /* ---- lămpile de frână pe stâlp, panoul de comandă (cheie, OBD, lămpi, turație) */
  const lamp = [0.3, -0.3].map(z => { cyl(sc, 0.012, 0.012, 0.5, otel, -XL - 0.02, YD + 0.25, z, 12); const l = add(sc, new THREE.Mesh(RB(0.04, 0.07, 0.12, 0.01), mat({ color: 0x5a0d0d, roughness: 0.3, emissive: 0xff1a1a, emissiveIntensity: 0 }))); l.position.set(-XL - 0.04, YD + 0.5, z); k_(l, "lampaStop", "Lampa de frână"); return l; });
  const PN = new THREE.Group(); PN.position.set(-XL + 0.02, YD + 0.28, -ZL + 0.02); PN.rotation.y = 0; sc.add(PN);
  add(PN, new THREE.Mesh(RB(0.5, 0.42, 0.03, 0.01), mat({ color: 0xe3e5e0, roughness: 0.55 }))).position.set(0.27, 0, 0);
  [0.05, 0.49].forEach(x => add(PN, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.03), albastru)).position.set(x, -0.33, 0.0));
  const eP = ecran(512, 430); { const x = eP.x; x.fillStyle = "#e3e5e0"; x.fillRect(0, 0, 512, 430); x.fillStyle = "#1b2733"; x.font = "bold 28px system-ui"; x.fillText("STAND ABS / ESC", 24, 44); x.font = "20px system-ui"; x.fillText("CONTACT", 40, 352); x.fillText("OBD", 200, 352); x.fillText("TURAȚIE ROȚI", 320, 352); x.fillText("ABS", 60, 150); x.fillText("ESC", 160, 150); x.fillText("FRÂNĂ", 252, 150); x.fillText("P", 372, 150); eP.t.needsUpdate = true; }
  add(PN, new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), new THREE.MeshBasicMaterial({ map: eP.t }))).position.set(0.27, 0, 0.0155);
  const lampi = [["abs", 0.08, 0xffa000], ["esc", 0.17, 0xffa000], ["frana", 0.26, 0xff2020], ["p", 0.36, 0xff2020]].map(([k, x, c]) => { const l = cyl(PN, 0.018, 0.018, 0.01, mat({ color: 0x332211, roughness: 0.4, emissive: c, emissiveIntensity: 0 }), x, 0.11, 0.02, 20); l.rotation.x = Math.PI / 2; return l; });
  const cheie = new THREE.Group(); cheie.position.set(0.1, -0.08, 0.02); PN.add(cheie); cyl(cheie, 0.03, 0.03, 0.015, otel, 0, 0, 0, 24).rotation.x = Math.PI / 2;
  const cap = add(cheie, new THREE.Mesh(RB(0.012, 0.05, 0.012, 0.003), plastic)); cap.position.z = 0.015; k_(cap, "contact", "Cheia de contact (clic = pune / ia contactul)");
  const obd = add(PN, new THREE.Mesh(RB(0.05, 0.03, 0.02, 0.004), plastic)); obd.position.set(0.22, -0.08, 0.02); k_(obd, "obd", "Priza de diagnoză OBD (interfața testerului X431)");
  const vci = new THREE.Group(); vci.position.set(0.22, -0.08, 0.05); PN.add(vci); add(vci, new THREE.Mesh(RB(0.06, 0.04, 0.05, 0.006), mat({ color: 0xc62828, roughness: 0.5 }))); const ledVci = add(vci, new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshBasicMaterial({ color: 0x113311 }))); ledVci.position.set(0.02, 0.022, 0.0);
  const buton = new THREE.Group(); buton.position.set(0.39, -0.08, 0.02); PN.add(buton); cyl(buton, 0.035, 0.035, 0.02, plastic, 0, 0, 0, 30).rotation.x = Math.PI / 2;
  const indic = add(buton, new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.03, 0.006), new THREE.MeshBasicMaterial({ color: 0xffffff }))); indic.position.set(0, 0.015, 0.014); k_(buton.children[0], "turatie", "Reglajul turației roților (motorul de antrenare)");
  /* ---- ADAS: parbrizul cu camera, radarul, panoul-țintă pe stativ */
  const XW = 0.35;
  [-0.52, 0.52].forEach(z => add(sc, new THREE.Mesh(RB(0.035, 0.48, 0.035), albastru)).position.set(XW + 0.05, YD + 0.24, z));
  const PW = new THREE.Group(); PW.position.set(XW + 0.05, YD + 0.5, 0); PW.rotation.z = 0.5; sc.add(PW);
  const parbriz = add(PW, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.55), new THREE.MeshPhysicalMaterial({ color: 0xbfe0ee, roughness: 0.05, transmission: 0.85, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })));
  parbriz.rotation.y = Math.PI / 2; parbriz.castShadow = false; k_(parbriz, "parbriz", "Parbrizul (după înlocuire camera trebuie recalibrată)");
  { const ram = mat({ color: 0x15171a, roughness: 0.8 }); [0.285, -0.285].forEach(y => add(PW, new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 1.04), ram)).position.set(0, y, 0)); [0.51, -0.51].forEach(z => add(PW, new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.59, 0.022), ram)).position.set(0, 0, z)); }
  const cam = add(PW, new THREE.Mesh(RB(0.05, 0.07, 0.1, 0.008), plastic)); cam.position.set(-0.04, 0.22, 0); k_(cam, "camera", "Camera frontală (menținerea benzii, recunoașterea indicatoarelor, AEB)");
  const ob = cyl(PW, 0.012, 0.012, 0.02, mat({ color: 0x0b2a4a, roughness: 0.1, metalness: 0.6 }), -0.01, 0.2, 0, 16); ob.rotation.z = Math.PI / 2 - 0.5;
  const radar = add(sc, new THREE.Mesh(RB(0.03, 0.09, 0.11, 0.008), mat({ color: 0x2b2e33, roughness: 0.5 }))); radar.position.set(XL + 0.04, YD - 0.05, 0.0); k_(radar, "radar", "Radarul frontal (ACC / AEB)");
  const T = new THREE.Group(); T.position.set(XW + 2.2, 0, 0); sc.add(T);
  [[0, 0.25], [0.2, -0.13], [-0.2, -0.13]].forEach(([dx, dz]) => T.add(tubM([[0, 0.9, 0], [dx * 0.5, 0.45, dz * 0.5], [dx, 0.0, dz]], 0.012, plastic, 6)));
  cyl(T, 0.016, 0.016, 1.4, otel, 0.035, 0.85, 0, 12);
  const TB = new THREE.Group(); T.add(TB); TB.position.y = 1.25;
  const eT = ecran(512, 340); { const x = eT.x; x.fillStyle = "#fff"; x.fillRect(0, 0, 512, 340); const q = 40; for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) { x.fillStyle = "#111"; x.fillRect(76 + i * q, 50 + j * q, q, q); } x.strokeStyle = "#c62828"; x.lineWidth = 4; x.beginPath(); x.moveTo(256, 30); x.lineTo(256, 310); x.moveTo(60, 170); x.lineTo(452, 170); x.stroke(); x.fillStyle = "#1b2733"; x.font = "bold 18px system-ui"; x.fillText("ȚINTĂ CAMERĂ FRONTALĂ", 150, 330); eT.t.needsUpdate = true; }
  const tinta = add(TB, new THREE.Mesh(RB(0.02, 0.62, 0.92, 0.01), mat({ color: 0xe9e9e4, roughness: 0.6 }))); k_(tinta, "tinta", "Panoul-țintă de calibrare (distanța și înălțimea din documentația constructorului)");
  const ft = add(TB, new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ map: eT.t }))); ft.position.x = -0.0105; ft.rotation.y = -Math.PI / 2;
  // laserul de aliniere (linia pe pardoseală între axa standului și țintă)
  const laser = add(sc, new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.006), new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.8 }))); laser.rotation.x = -Math.PI / 2; laser.position.set(XW + 1.1, 0.003, 0); laser.castShadow = false;
  interactiune(S, clic, opt.laClic);
  const V = { contact: false, v: [0, 0, 0, 0], volan: 0, pedala: 0, pompa: false, valve: false, epb: 0, stop: false, lampi: { abs: false, esc: false, frana: false, p: false }, sel: -1, cuplat: [true, true, true, true],
    vci: false, turatie: 0, tinta: { vizibil: false, dist: 2.2, h: 1.25, laser: false }, unghiFata: 0 };
  let tt = 0, ultTint = "";
  S.porneste(dt => {
    tt += dt;
    roti.forEach((r, i) => { r.rot.rotation.z -= (V.v[i] / 3.6) / 0.297 * dt * r.sg * -1;
      r.hl.material.opacity = V.sel === i ? 0.35 + 0.25 * Math.sin(tt * 6) : 0;
      r.conB.position.y = YD + 0.04 + (V.cuplat[i] ? 0 : 0.035); r.conB.rotation.z = V.cuplat[i] ? 0 : 0.5;
      r.piston.position.z = -r.sg * (0.045 + (V.pedala > 0.3 ? 0.004 : 0));
      if (r.epb) r.epb.position.z = -r.sg * (0.075 + V.epb * 0.02); });
    const af = V.volan / 15 * Math.PI / 180; roti[0].piv.rotation.y = af; roti[1].piv.rotation.y = af; biel.forEach(b => b.position.x = XC - 0.05 - af * 0.05);
    volan.rotation.z = -V.volan * Math.PI / 180;
    pedala.rotation.z = V.pedala * 0.35;
    pompaM.rotation.y = V.pompa ? tt * 40 : 0; HU.position.y = YD + 0.1 + (V.pompa ? Math.sin(tt * 90) * 0.0008 : 0);
    ledV.material.color.set(V.valve ? (Math.sin(tt * 30) > 0 ? 0x44ff44 : 0x113311) : (V.contact ? 0x225522 : 0x112211));
    lamp.forEach(l => l.material.emissiveIntensity = V.stop ? 2.2 : 0);
    lampi.forEach((l, j) => { const on = V.lampi[["abs", "esc", "frana", "p"][j]]; l.material.emissiveIntensity = on ? 2.5 : 0; });
    cheie.rotation.z = V.contact ? -0.8 : 0; vci.visible = V.vci; ledVci.material.color.set(V.vci && V.contact ? (Math.sin(tt * 8) > 0 ? 0x33ff55 : 0x116622) : 0x113311);
    buton.rotation.z = -V.turatie / 30 * 4.2; fulM.rotation.z -= (V.turatie / 3.6 / 0.297) * dt * 1.43; arbori.forEach(a => a.rotation.z -= (V.turatie / 3.6 / 0.297) * dt);
    T.visible = V.tinta.vizibil; T.position.x = XW + 0.1 + V.tinta.dist; TB.position.y = V.tinta.h; laser.visible = V.tinta.vizibil && V.tinta.laser; laser.scale.x = V.tinta.dist / 2.2; laser.position.x = XW + 0.1 + V.tinta.dist / 2;
  });
  return { seteaza(o) { Object.keys(o).forEach(k => { if (k === "tinta" || k === "lampi") Object.assign(V[k], o[k]); else V[k] = o[k]; }); if (o.v) V.v = o.v.slice(); if (o.cuplat) V.cuplat = o.cuplat.slice(); },
    vedere(p, t) { S.camera.position.set(...p); S.ctl.target.set(...t); } };
}
