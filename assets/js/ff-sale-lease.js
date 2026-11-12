/* Family&Flats sale / rent pages: filters for the prerendered cards (scripts/generate-sale-lease.js).
   Works on the page as written; without JavaScript every home is simply shown. */
(function () {
  "use strict";
  var form = document.getElementById("sl-filter");
  if (!form) return;
  var sale = document.body.getAttribute("data-page") === "sale";
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var cards = $$(".sl-pc, .sl-vcard");
  var showBtn = form.querySelector("[data-show]"), live = form.querySelector("[data-live]");
  var none = document.querySelector("[data-none]");

  cards.forEach(function (c) {
    var n = c.querySelector(".sl-pc-n"), p = c.querySelector(".sl-pc-price"), note = c.querySelector(".sl-pc-note");
    c._orig = { n: n ? n.textContent : "", p: p ? p.textContent : "", note: note ? note.textContent : "" };
    c._ps = String(c.getAttribute("data-ps") || "").split(",").map(Number);
  });

  function cr(v) { return (v / 1e7).toFixed(2).replace(/\.?0+$/, ""); }
  function rent(v) { return v >= 1e5 ? (v / 1e5).toFixed(2).replace(/\.?0+$/, "") + " L" : Math.round(v / 1000) + "K"; }
  function range(lo, hi) {
    if (sale) return lo === hi ? "₹" + cr(lo) + " Cr" : "₹" + cr(lo) + "–" + cr(hi) + " Cr";
    var a = rent(lo), b = rent(hi);
    if (lo === hi) return "₹" + a + "/month";
    return "₹" + (/ L$/.test(a) === / L$/.test(b) ? a.replace(" L", "") : a) + "–" + b + "/month";
  }

  // ?bhk=3bhk, ?project=..., ?type=..., ?budget=... (the home page search sends ?bhk=)
  var q = new URLSearchParams(window.location.search);
  ["project", "type", "bhk", "budget"].forEach(function (k) {
    var v = q.get(k), el = form.elements.namedItem(k);
    if (v && el && $$("option", el).some(function (o) { return o.value === v.toLowerCase(); })) el.value = v.toLowerCase();
  });

  function apply(scroll) {
    var f = { project: form.elements.project.value, type: form.elements.type.value, bhk: form.elements.bhk.value, budget: form.elements.budget.value };
    var lo = 0, hi = Infinity;
    if (f.budget) { var b = f.budget.split("-"); lo = Number(b[0]) || 0; hi = b[1] ? Number(b[1]) : Infinity; }
    var total = 0;
    cards.forEach(function (c) {
      var comm = c.closest("[data-c]"), proj = c.getAttribute("data-c") || (comm && comm.getAttribute("data-c"));
      var k = c.getAttribute("data-k"), b = c.getAttribute("data-b");
      var ok = (!f.project || proj === f.project) && (!f.type || k === f.type);
      if (ok && f.bhk) ok = f.bhk === "penthouse" ? b === "ph" : f.bhk === "5bhk" ? Number(b) >= 5 : b === f.bhk.replace("bhk", "");
      var ps = c._ps, hit = ps.filter(function (p) { return !f.budget || (p > 0 && p >= lo && p < hi); });
      if (ok && !hit.length) ok = false;
      c.hidden = !ok;
      if (!ok) return;
      total += hit.length;
      if (c.classList.contains("sl-pc")) {
        var n = c.querySelector(".sl-pc-n"), pr = c.querySelector(".sl-pc-price"), note = c.querySelector(".sl-pc-note");
        if (f.budget) {
          var priced = hit.filter(Boolean);
          n.textContent = hit.length + (hit.length === 1 ? " home" : " homes") + " →";
          pr.textContent = priced.length ? range(Math.min.apply(null, priced), Math.max.apply(null, priced)) : c._orig.p;
          if (note) note.hidden = true;
        } else { n.textContent = c._orig.n; pr.textContent = c._orig.p; if (note) note.hidden = false; }
      }
    });
    $$(".sl-comm").forEach(function (g) { g.hidden = !$$(".sl-pc", g).some(function (c) { return !c.hidden; }); });
    var anyMarket = $$(".sl-comm").some(function (g) { return !g.hidden; });
    if (none) none.hidden = anyMarket;
    var vnext = document.querySelector(".sl-vnext");
    if (vnext) vnext.hidden = !!(f.project || f.type || f.bhk || f.budget);
    showBtn.textContent = total ? "Show " + total + (total === 1 ? " home" : " homes") : "No homes match";
    if (live) live.textContent = total + (total === 1 ? " home matches." : " homes match.");
    var p = new URLSearchParams();
    Object.keys(f).forEach(function (k) { if (f[k]) p.set(k, f[k]); });
    var qs = p.toString();
    try { history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : "") + window.location.hash); } catch (e) { /* ignore */ }
    if (scroll) {
      var first = $$(".sl-vcard").some(function (c) { return !c.hidden; }) ? document.getElementById("verified") : document.getElementById("market");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  form.addEventListener("change", function () { apply(false); });
  form.addEventListener("submit", function (e) { e.preventDefault(); apply(true); });
  var reset = document.querySelector("[data-reset]");
  if (reset) reset.addEventListener("click", function () { form.reset(); apply(false); });
  if (q.toString()) apply(false);
})();
