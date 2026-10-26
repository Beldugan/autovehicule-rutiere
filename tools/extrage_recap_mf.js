const vm = require('vm'), fs = require('fs'), R = '/home/claude/autovehicule-rutiere/';
const out = [];
for (let n = 1; n <= 6; n++) {
  const ctx = { console, Math, JSON, Number, String, Array, Object, isFinite, parseFloat, Date, performance: { now: () => 0 } };
  ctx.window = ctx; ctx.self = ctx; ctx.document = { addEventListener() {}, querySelector() { return null; }, createElement() { return { getContext() { return {}; } }; }, documentElement: { getAttribute() {} } };
  ctx.addEventListener = () => {}; ctx.matchMedia = () => ({ matches: false });
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(R + 'comun/config.js', 'utf8') + '\n' + fs.readFileSync(R + 'comun/util.js', 'utf8'), ctx);
  vm.runInContext(`var Cadru = { porneste(l) { this.LAB = l; } }; var BAZA_COMUN = "";`, ctx);
  vm.runInContext(fs.readFileSync(R + `mf/l${n}/model.js`, 'utf8'), ctx);
  let src = fs.readFileSync(R + `mf/l${n}/lab.js`, 'utf8').replace(/^"use strict";/m, '');
  try { vm.runInContext(src, ctx); } catch (e) { console.error(n, e.message); }
  const L = ctx.Cadru.LAB; if (!L) { console.error('fara LAB', n); continue; }
  out.push({ nr: n, titlu: L.titlu, scop: L.referat.scop, relatii: L.referat.relatii, intrebari: L.continut.intrebari, test: L.continut.test });
}
fs.writeFileSync(R + 'mf/l7/date.js', '/* GENERAT din mf/l1…l6/lab.js (întrebările de verificare și testele) – tools/extrage_recap_mf.js */\nconst LUCRARI_MF = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(out.map(o => [o.nr, o.intrebari.length, o.test.length]));
