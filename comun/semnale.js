/* Forme de undă realiste pentru osciloscoapele laboratoarelor (global SEMNALE).
   – injectorul MPI de înaltă impedanță comandat pe masă: tensiunea de saturație a driverului care crește cu curentul,
     limitarea tensiunii de autoinducție de dioda Zener a ECU (palier ≈ 66 V cât se descarcă energia bobinei),
     oscilația amortizată și „cocoașa” închiderii acului (tensiunea indusă de armătura care revine pe scaun);
   – electrovalvele PWM (canistra) cu vârful de autoinducție limitat;
   – motorul clapetei electronice comandat în punte H (palierul negativ de recirculație);
   – lanțul de achiziție al osciloscopului: zgomotul etajului de intrare, cuantizarea convertorului (8 biți la
     osciloscoapele de laborator, 12 biți la cele auto) și limitarea la capătul domeniului (semnal tăiat);
   – inserarea biților de umplere (bit stuffing) pe magistrala CAN: după 5 biți identici urmează unul complementar. */
var SEMNALE = (function () {
  function gauss() { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /** tensiunea pe borna de masă a injectorului MPI. ph – timpul de la începutul comenzii [s], ti – durata comenzii [s], ub – tensiunea bateriei */
  function injectorMPI(ph, ti, ub, o) {
    o = o || {};
    var R = o.R || 14.5, L = o.L || 0.0062, Uz = o.Uz || 66, Rds = o.Rds || 0.32, tau = L / R;
    var I = function (t) { return ub / R * (1 - Math.exp(-t / tau)); };
    if (ph < ti) return 0.07 + Rds * I(ph);                                          // driverul saturat: 0,1…0,4 V
    var u = ph - ti, I0 = I(ti), tc = Math.max(12e-6, L * I0 / (Uz - ub));          // durata palierului Zener
    var v;
    if (u < tc) v = Uz + 1.2 * Math.exp(-u / 3e-6) - 1.8 * u / tc;                  // palierul de limitare (ușor descrescător)
    else { var w = u - tc; v = ub + (Uz - 1.8 - ub) * Math.exp(-w / 7e-6) - 3.2 * Math.exp(-w / 55e-6) * Math.sin(2 * Math.PI * 22e3 * w); }
    var tb = (o.tAc || 0.62e-3) + 0.15e-3 * Math.min(1, ti / 3e-3);                   // închiderea acului
    if (ti > 0.35e-3) v += (o.hAc || 1.4) * Math.exp(-Math.pow((u - tb) / 0.11e-3, 2));
    return v;
  }
  /** electrovalvă comandată PWM pe masă (ex. canistra, EGR): ph ∈ [0,T) */
  function pwmMasa(ph, T, duty, ub, o) {
    o = o || {};
    var ton = T * duty, Uz = o.Uz || 42, R = o.R || 26, L = o.L || 0.05;
    if (ph < ton) return 0.06 + 0.25 * (1 - Math.exp(-ph / (L / R)));
    var u = ph - ton, I0 = ub / R * (1 - Math.exp(-ton / (L / R))), tc = Math.max(10e-6, L * I0 / (Uz - ub) * 0.25);
    if (u < tc) return Uz - 1.5 * u / tc;
    return ub + (Uz - 1.5 - ub) * Math.exp(-(u - tc) / 40e-6);
  }
  /** borna motorului de c.c. comandat în punte H (PWM pe brațul superior, recirculație prin brațul inferior) */
  function puncteH(ph, T, duty, ub) {
    var ton = T * duty;
    if (ph < ton) { var a = ph; return ub - 0.18 - 0.6 * Math.exp(-a / 4e-6) * Math.cos(2 * Math.PI * a / 6e-6); }
    var b = ph - ton; return -0.32 + 0.9 * Math.exp(-b / 3e-6) * Math.cos(2 * Math.PI * b / 6e-6) - 0.5 * Math.exp(-b / 2e-6);
  }
  /** lanțul de achiziție: v – semnalul, vdiv – V/div, biti – rezoluția ADC, div – diviziuni verticale ale domeniului */
  function achizitie(v, vdiv, biti, div, poz) {
    biti = biti || 8; div = div || 8; poz = poz || 0;
    var FS = vdiv * div, q = FS / Math.pow(2, biti), c = -poz * vdiv;               // domeniul e centrat pe poziția verticală
    var x = v + gauss() * Math.max(q * 0.45, FS * 0.0012);
    x = c + Math.round((x - c) / q) * q;
    return Math.max(c - FS / 2 - q, Math.min(c + FS / 2 + q, x));
  }
  /** aplică bit stuffing unei secvențe (1 = dominant); prim – câți biți de la început sunt supuși regulii */
  function umplere(biti, prim) {
    var o = [], cnt = 0, ult = -1;
    for (var i = 0; i < biti.length; i++) {
      var b = biti[i]; o.push(b);
      if (i < prim) {
        if (b === ult) cnt++; else { cnt = 1; ult = b; }
        if (cnt === 5) { o.push(1 - b); ult = 1 - b; cnt = 1; }
      }
    }
    return o;
  }
  /** antetul ecranului Launch X-431 PRO: bara de stare Android + bara aplicației cu calea meniului */
  function antetX431(cale, ubat) {
    var d = new Date(), ora = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    return '<div class="x4-stare"><span>' + ora + '</span><span>VCI ● &nbsp;Wi-Fi ▴ &nbsp;▮▮▮▯ 78 %</span></div>' +
      '<div class="x4-bara"><span class="x4-sigla">LAUNCH</span><span class="x4-cale">' + cale + '</span><span class="x4-ub">' + (ubat ? "🔋 " + ubat : "") + '</span></div>';
  }
  /** fluxul de date (Data Stream): rânduri [nume, valoare (număr sau text), [min, max] sau null, unitate]; valorile din afara intervalului se afișează cu roșu, ca pe tester */
  function fluxDate(r, activ) {
    var f = function (v) { return typeof v === "number" ? String(v).replace(".", ",") : v; };
    var h = '<table class="tabel x431 x4-flux"><thead><tr><th>Nume</th><th>Valoare</th><th>Interval std.</th></tr></thead><tbody>';
    r.forEach(function (x) {
      var v = x[1], iv = x[2], afara = activ && iv && typeof v === "number" && (v < iv[0] || v > iv[1]), u = x[3] ? ' <small>' + x[3] + '</small>' : "";
      h += '<tr' + (afara ? ' class="x4-afara"' : "") + '><td>' + x[0] + '</td><td><b>' + (activ ? f(v) : "—") + '</b>' + u + '</td><td>' + (iv ? f(iv[0]) + "…" + f(iv[1]) : "") + '</td></tr>';
    });
    return h + '</tbody></table>';
  }
  function subsolX431(b) { return '<div class="x4-subsol">' + (b || ["Grafic", "Combină", "Înregistrează", "Raport"]).map(function (t) { return "<span>" + t + "</span>"; }).join("") + '</div>'; }
  return { antetX431: antetX431, fluxDate: fluxDate, subsolX431: subsolX431, gauss: gauss, injectorMPI: injectorMPI, pwmMasa: pwmMasa, puncteH: puncteH, achizitie: achizitie, umplere: umplere };
})();
