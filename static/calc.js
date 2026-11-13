// Quiltwell web calculators — JS port of QuiltMath (keep in sync with quiltmath.py / QuiltMath.swift).
(function () {
  "use strict";
  var EIGHTH_YARD = 4.5;
  function upYard(x) { return x <= 0 ? 0 : Math.ceil(x / EIGHTH_YARD - 1e-9) * EIGHTH_YARD; }
  function upEighth(x) { return x <= 0 ? 0 : Math.ceil(x * 8 - 1e-9) / 8; }

  function panels(span, usable, loss) {
    if (span <= 0 || usable <= loss) return 0;
    if (span <= usable) return 1;
    return Math.ceil((span - loss) / (usable - loss) - 1e-9);
  }
  function backing(w, l, oh, usable) {
    var bw = w + 2 * oh, bl = l + 2 * oh, loss = 1;
    var nv = panels(bw, usable, loss), nh = panels(bl, usable, loss);
    var v = { o: "vertical", n: nv, len: bl, total: nv * bl, buy: upYard(nv * bl) };
    var h = { o: "horizontal", n: nh, len: bw, total: nh * bw, buy: upYard(nh * bw) };
    var best = (v.buy < h.buy || (v.buy === h.buy && v.n <= h.n)) ? v : h;
    var alt = best === v ? h : v;
    return { bw: bw, bl: bl, best: best, alt: alt };
  }
  function binding(w, l, strip, usable, bias) {
    var per = 2 * (w + l), need = per + 12;
    if (bias) {
      var side = upEighth(Math.sqrt(need * strip) + strip);
      return { per: per, need: need, strips: 0, fabric: side, buy: upYard(side), side: side };
    }
    var strips = Math.ceil(need / Math.max(usable - strip, 1) - 1e-9);
    return { per: per, need: need, strips: strips, fabric: strips * strip, buy: upYard(strips * strip), side: null };
  }
  var PKGS = [["Crib", 45, 60], ["Throw", 60, 60], ["Twin", 72, 90], ["Full", 81, 96], ["Queen", 90, 108], ["King", 120, 120]];
  function batting(w, l, oh) {
    var bw = w + 2 * oh, bl = l + 2 * oh, pkg = null;
    for (var i = 0; i < PKGS.length; i++) {
      var p = PKGS[i];
      if ((p[1] >= bw && p[2] >= bl) || (p[1] >= bl && p[2] >= bw)) { pkg = p; break; }
    }
    function roll(rw) { var s = Math.min(bw, bl), L = Math.max(bw, bl); return s > rw ? 0 : upYard(rw >= L ? s : L); }
    return { bw: bw, bl: bl, pkg: pkg, r96: roll(96), r120: roll(120) };
  }

  // ---- formatting / parsing ----
  function frac(v) {
    var t = Math.round(Math.abs(v) * 8), whole = Math.floor(t / 8), num = t % 8, den = 8;
    while (num && num % 2 === 0 && den % 2 === 0) { num /= 2; den /= 2; }
    var s = num === 0 ? String(whole) : (whole === 0 ? num + "/" + den : whole + " " + num + "/" + den);
    return (v < 0 ? "-" : "") + s;
  }
  function parse(raw) {
    var s = String(raw || "").trim().replace(/,/g, ".").replace(/["″]/g, "")
      .replace(/½/g, " 1/2").replace(/¼/g, " 1/4").replace(/¾/g, " 3/4").replace(/⅛/g, " 1/8")
      .replace(/⅜/g, " 3/8").replace(/⅝/g, " 5/8").replace(/⅞/g, " 7/8").replace(/-/g, " ");
    var parts = s.split(/\s+/).filter(Boolean);
    if (!parts.length || parts.length > 2) return null;
    var total = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.indexOf("/") >= 0) {
        var nd = p.split("/"); var n = parseFloat(nd[0]), d = parseFloat(nd[1]);
        if (nd.length !== 2 || isNaN(n) || isNaN(d) || d === 0) return null;
        total += n / d;
      } else { var x = Number(p); if (isNaN(x)) return null; total += x; }
    }
    return total > 0 && isFinite(total) ? total : null;
  }
  function metric() { var el = document.querySelector("[data-units]"); return el && el.value === "metric"; }
  function inIn(v) { return metric() ? v / 2.54 : v; }
  function len(x) { return metric() ? (Math.round(x * 2.54 * 10) / 10) + " cm" : frac(x) + "″"; }
  function buy(exact, rounded) {
    if (metric()) return (Math.ceil(exact * 2.54 / 10 - 1e-9) * 10 / 100).toFixed(1) + " m";
    return frac(rounded / 36) + " yd";
  }
  function val(form, name) { var el = form.querySelector('[name="' + name + '"]'); if (!el) return null; var p = parse(el.value); return p == null ? null : inIn(p); }
  function out(form, html) { form.querySelector("[data-out]").innerHTML = html; }
  function big(label, value, detail) {
    return '<div class="answer"><div class="answer-label">' + label + '</div><div class="answer-value">' + value + "</div>" +
      (detail ? '<div class="answer-detail">' + detail + "</div>" : "") + "</div>";
  }
  function row(k, v) { return '<div class="kv"><span>' + k + "</span><b>" + v + "</b></div>"; }
  var ERR = '<p class="muted">Enter sizes like 60, 60.5 or 60 1/2.</p>';

  var run = {
    backing: function (f) {
      var w = val(f, "w"), l = val(f, "l"), oh = val(f, "oh"); if (oh == null) oh = 0;
      if (!w || !l) return out(f, ERR);
      var wide = f.querySelector('[name="wide"]').checked;
      var r = backing(w, l, oh, wide ? 104 : 40);
      var d = function (o) { return o.n === 1 ? "1 piece, no seams" : o.n + " panels × " + len(o.len) + ", " + (o.n - 1) + " " + o.o + " seam" + (o.n > 2 ? "s" : ""); };
      out(f, big("Buy", buy(r.best.total, r.best.buy) + (wide ? " of wide-back" : ""), d(r.best)) +
        row("Backing size", len(r.bw) + " × " + len(r.bl)) +
        row("Other way (" + r.alt.o + ")", buy(r.alt.total, r.alt.buy)));
    },
    binding: function (f) {
      var w = val(f, "w"), l = val(f, "l"), s = val(f, "s");
      if (!w || !l || !s) return out(f, ERR);
      var bias = f.querySelector('[name="bias"]').checked;
      var r = binding(w, l, s, 40, bias);
      out(f, big("Buy", buy(r.fabric, r.buy), r.side ? "Cut one " + len(r.side) + " square for continuous bias" : "Cut " + r.strips + " strips × " + len(s) + " across the width") +
        row("Binding length", len(r.need)) + row("Quilt perimeter", len(r.per)));
    },
    batting: function (f) {
      var w = val(f, "w"), l = val(f, "l"), oh = val(f, "oh"); if (oh == null) oh = 0;
      if (!w || !l) return out(f, ERR);
      var r = batting(w, l, oh);
      out(f, big("Batting", r.pkg ? r.pkg[0] + " package" : "By the yard", "Needs " + len(r.bw) + " × " + len(r.bl)) +
        (r.pkg ? row(r.pkg[0] + " package", len(r.pkg[1]) + " × " + len(r.pkg[2])) : "") +
        row("96″ roll", r.r96 ? buy(r.r96, r.r96) : "too narrow") + row("120″ roll", r.r120 ? buy(r.r120, r.r120) : "too narrow"));
    }
  };

  function wire(form) {
    var kind = form.getAttribute("data-calc");
    var go = function () { run[kind](form); };
    form.addEventListener("input", go);
    form.addEventListener("submit", function (e) { e.preventDefault(); go(); });
    go();
  }
  document.addEventListener("DOMContentLoaded", function () {
    var units = document.querySelector("[data-units]");
    var forms = document.querySelectorAll("form[data-calc]");
    for (var i = 0; i < forms.length; i++) wire(forms[i]);
    if (units) units.addEventListener("change", function () {
      try { localStorage.setItem("qk-units", units.value); } catch (e) {}
      for (var j = 0; j < forms.length; j++) forms[j].dispatchEvent(new Event("input"));
    });
    try { var saved = localStorage.getItem("qk-units"); if (saved && units) { units.value = saved; units.dispatchEvent(new Event("change")); } } catch (e) {}
  });
})();
