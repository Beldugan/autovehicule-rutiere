/* Grafice pe canvas: axe liniare sau logaritmice, serii linie/puncte, temă luminoasă/întunecată */
"use strict";

function paleta(luminos) {
  if (luminos) return { text: "#1c2430", sec: "#5b6575", grila: "#e6e9ee", fundal: "#ffffff", s: ["#1f5f9e", "#c0492b", "#2e8b57", "#8a5a9e", "#b07d12", "#2a9d9f"] };
  return { text: css("--text"), sec: css("--text-sec"), grila: css("--grila"), fundal: css("--suprafata"), s: [css("--serie-0"), css("--serie-1"), css("--serie-2"), css("--serie-3"), css("--serie-4") || "#b07d12", css("--serie-5") || "#2a9d9f"] };
}
function niceMax(v) { if (!(v > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; }

/**
 * o = { xmin, xmax, ymin, ymax, xlog, ylog, xlab, ylab, serii:[{tip:"linie"|"pct", pts:[[x,y]], culoare: idx|css, punctat, gros, r, gol, eticheta}],
 *       xticks:[valori], yticks:[valori], fmtX, fmtY, adnotari:[{x,y,text}] }
 */
function deseneazaGrafic(cv, o, luminos) {
  const dpr = window.devicePixelRatio || 1;
  if (!cv.dataset.h) cv.dataset.h = parseInt(cv.getAttribute("height"), 10) || 300;
  const W = cv.clientWidth || parseInt(cv.style.width, 10) || 600, H = +cv.dataset.h;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + "px";
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const P = paleta(luminos);
  g.fillStyle = P.fundal; g.fillRect(0, 0, W, H);
  const m = { l: 56, r: 14, t: 12, b: 40 };
  const w = W - m.l - m.r, h = H - m.t - m.b;
  const xmin = o.xmin ?? 0, ymin = o.ymin ?? 0, xmax = o.xmax, ymax = o.ymax;
  const tx = v => o.xlog ? Math.log10(v) : v, ty = v => o.ylog ? Math.log10(v) : v;
  const X = x => m.l + (tx(x) - tx(xmin)) / (tx(xmax) - tx(xmin)) * w;
  const Y = y => m.t + h - (ty(y) - ty(ymin)) / (ty(ymax) - ty(ymin)) * h;
  const ticks = (a, b, log, n) => {
    if (log) { const r = []; for (let e = Math.floor(Math.log10(a)); e <= Math.ceil(Math.log10(b)); e++) [1, 2, 5].forEach(k => { const v = k * Math.pow(10, e); if (v >= a * 0.999 && v <= b * 1.001) r.push(v); }); return r; }
    const r = []; for (let i = 0; i <= n; i++) r.push(a + (b - a) * i / n); return r;
  };
  const fx = o.fmtX || (v => fmt(v, Math.abs(xmax - xmin) < 1 ? 2 : Math.abs(xmax - xmin) < 10 ? 1 : 0));
  const fy = o.fmtY || (v => fmt(v, Math.abs(ymax - ymin) < 1 ? 2 : Math.abs(ymax - ymin) < 10 ? 1 : 0));
  g.font = "11px system-ui, sans-serif"; g.lineWidth = 1;
  (o.xticks || ticks(xmin, xmax, o.xlog, 5)).forEach(v => {
    g.strokeStyle = P.grila; g.beginPath(); g.moveTo(X(v), m.t); g.lineTo(X(v), m.t + h); g.stroke();
    g.fillStyle = P.sec; g.textAlign = "center"; g.fillText(o.xlog ? String(v).replace(".", ",") : fx(v), X(v), m.t + h + 15);
  });
  (o.yticks || ticks(ymin, ymax, o.ylog, 5)).forEach(v => {
    g.strokeStyle = P.grila; g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(m.l + w, Y(v)); g.stroke();
    g.fillStyle = P.sec; g.textAlign = "right"; g.fillText(o.ylog ? String(+v.toPrecision(3)).replace(".", ",") : fy(v), m.l - 6, Y(v) + 4);
  });
  g.fillStyle = P.text; g.textAlign = "center"; g.fillText(o.xlab || "", m.l + w / 2, H - 6);
  g.save(); g.translate(13, m.t + h / 2); g.rotate(-Math.PI / 2); g.fillText(o.ylab || "", 0, 0); g.restore();
  g.save(); g.beginPath(); g.rect(m.l, m.t, w, h); g.clip();
  (o.serii || []).forEach(s => {
    const col = s.culoare != null ? (typeof s.culoare === "number" ? P.s[s.culoare % P.s.length] : s.culoare) : P.s[0];
    const pts = (s.pts || []).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && (!o.xlog || x > 0) && (!o.ylog || y > 0));
    g.strokeStyle = col; g.fillStyle = col;
    if (s.tip === "linie") {
      g.lineWidth = s.gros || 2; g.setLineDash(s.punctat ? [6, 4] : []);
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); g.setLineDash([]);
    } else {
      pts.forEach(([x, y]) => { g.beginPath(); g.arc(X(x), Y(y), s.r || 4.5, 0, 2 * Math.PI); if (s.gol) { g.lineWidth = 1.8; g.stroke(); } else g.fill(); });
    }
  });
  (o.adnotari || []).forEach(a => { g.fillStyle = a.culoare || P.text; g.textAlign = a.align || "left"; g.fillText(a.text, X(a.x) + (a.dx || 4), Y(a.y) + (a.dy || -4)); });
  g.restore();
  g.strokeStyle = P.sec; g.lineWidth = 1; g.strokeRect(m.l, m.t, w, h);
}

/** legendă HTML pentru un grafic */
function legendaHTML(elemente) {
  return elemente.map(([text, culoare, tip]) => `<span><i class="${tip === "pct" ? "pct" : ""}" style="${tip === "gol" ? `border:2px solid ${culoare}` : `background:${culoare}`}${tip === "gol" ? ";width:9px;height:9px;border-radius:50%" : ""}"></i>${text}</span>`).join("");
}

/** imagine PNG (temă luminoasă) a unui grafic, pentru referat și documentul Google */
function graficPNGdin(o, latime = 720, inaltime = 340) {
  const cv = document.createElement("canvas"); cv.setAttribute("height", inaltime);
  cv.style.width = latime + "px"; cv.style.position = "absolute"; cv.style.left = "-9999px";
  document.body.appendChild(cv); deseneazaGrafic(cv, o, true);
  const d = cv.toDataURL("image/png"); cv.remove(); return d;
}
