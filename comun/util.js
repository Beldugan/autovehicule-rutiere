/* Utilitare comune – portalul de laborator Autovehicule Rutiere (FIMIM, UOC) */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
/** număr formatat românește (virgulă zecimală) */
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace(".", ",") : "—");
/** notație științifică a·10ⁿ în HTML */
const fmtE = (x, d = 2) => {
  if (!Number.isFinite(x) || x === 0) return fmt(x, d);
  const e = Math.floor(Math.log10(Math.abs(x)));
  return `${fmt(x / Math.pow(10, e), d)}·10<sup>${e}</sup>`;
};
const num = v => { const x = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(x) ? x : NaN; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const FR = (a, b) => `<span class="fr"><span>${a}</span><span>${b}</span></span>`;
const EC = (expr, nr) => `<div class="ec"><span>${expr}</span>${nr ? `<span class="nr">(${nr})</span>` : ""}</div>`;

/** generator pseudoaleator determinist – identic cu cel din serverul Apps Script */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/** regresie liniară y = a + b·x */
function regresie(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; syy += ys[i] * ys[i]; }
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-30) return null;
  const b = (n * sxy - sx * sy) / den, a = (sy - b * sx) / n;
  const r2den = (n * sxx - sx * sx) * (n * syy - sy * sy);
  return { a, b, r2: r2den > 0 ? Math.pow(n * sxy - sx * sy, 2) / r2den : 1 };
}
/** salvare/încărcare sigură în localStorage */
const Stocare = {
  citeste(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  scrie(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  sterge(k) { try { localStorage.removeItem(k); } catch (e) { } }
};
