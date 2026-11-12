/* IREO Victory Valley "Prices right now": computed on every page load from the published listings (window.FF_AGENT_ADS),
   so the cards always match the listings on the page. Price ranges use listings advertised in the last 90 days when
   there are at least 3 such priced listings, otherwise all current listings; the note under the title says which. */
(function () {
  "use strict";
  var grid = document.getElementById("vvpr-grid");
  if (!grid) return;
  var ADS = (window.FF_AGENT_ADS || []).filter(function (a) { return !a.projectSlug || a.projectSlug === "ireovictoryvalley"; });
  // Verified flats (checked by our team) count too, exactly as in the listings section below.
  var VER = (function () {
    var byId = {};
    (window.FF_LISTINGS || []).concat(window.FF_VERIFIED_LISTINGS || []).forEach(function (i) {
      if (i.projectSlug === "ireovictoryvalley" && /verified/i.test(i.status || "")) byId[i.id] = i;
    });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  })();
  function verGroup(i) {
    var txt = [i.bhk, i.title, i.unit, (i.tags || []).join(" ")].join(" ");
    if (/penthouse/i.test(txt)) return "P";
    var m = /(\d)/.exec(String(i.bhk || "")); return m ? m[1] : "";
  }
  var PAGES = ["2-bhk-for-sale","3-bhk-for-sale","4-bhk-for-sale","penthouse-for-sale","2-bhk-for-rent","3-bhk-for-rent","4-bhk-for-rent","5-bhk-for-rent","penthouse-for-rent"];
  var GROUPS = [["2", "2 BHK"], ["3", "3 BHK"], ["4", "4 BHK"], ["5", "5 BHK"], ["P", "Penthouse"]];
  var DAY = 864e5, RECENT = 90;
  function isPent(a) { return (a.tags || []).indexOf("Penthouse") >= 0 || /penthouse/i.test(a.unit || ""); }
  function inGroup(a, g) { return g === "P" ? isPent(a) : String(a.bhk) === g && !isPent(a); }
  function inr(n) { return Math.round(n).toLocaleString("en-IN"); }
  function cr(n) { return (n / 1e7).toFixed(2); }
  function priceText(type, lo, hi) {
    if (type === "Lease") {
      var f = function (n) { return n >= 1e5 ? (n / 1e5).toFixed(2).replace(/\.?0+$/, "") + " L" : inr(n / 1000) + "k"; };
      return "₹" + (lo === hi ? f(lo) : f(lo) + "–" + f(hi)) + " <small>/ month</small>";
    }
    return "₹" + (lo === hi ? cr(lo) : cr(lo) + "–" + cr(hi)) + " Cr";
  }
  var latest = ADS.reduce(function (m, a) { return a.advertisedOn && a.advertisedOn > m ? a.advertisedOn : m; }, "");
  var latestDate = latest ? new Date(latest + "T00:00:00") : null;
  function render(type) {
    document.getElementById("vvpr-kind").textContent = type === "Lease" ? "for rent" : "for sale";
    var usedRecent = false, html = "";
    GROUPS.forEach(function (g) {
      var all = ADS.filter(function (a) { return a.type === type && inGroup(a, g[0]); });
      var ver = VER.filter(function (i) { return i.type === type && verGroup(i) === g[0]; }).length;
      if (!all.length && !ver) return;
      var cutoff = latestDate ? latestDate.getTime() - RECENT * DAY : 0;
      var recent = all.filter(function (a) { return a.price && a.advertisedOn && new Date(a.advertisedOn + "T00:00:00").getTime() >= cutoff; });
      var priced = recent.length >= 3 ? (usedRecent = true, recent) : all.filter(function (a) { return a.price; });
      var p = priced.map(function (a) { return a.price; }).sort(function (x, y) { return x - y; });
      var s = all.map(function (a) { return a.size; }).filter(Boolean).sort(function (x, y) { return x - y; });
      var slug = (g[0] === "P" ? "penthouse" : g[0] + "-bhk") + "-for-" + (type === "Lease" ? "rent" : "sale");
      var href = PAGES.indexOf(slug) >= 0 ? "/projects/ireo-victory-valley/" + slug + "/" : "#Ready-to-move";
      html += '<a class="vvpr-card" href="' + href + '"><span class="vvpr-name">' + g[1] + "</span>" +
        '<span class="vvpr-size">' + (s.length ? (s[0] === s[s.length - 1] ? inr(s[0]) : inr(s[0]) + "–" + inr(s[s.length - 1])) + " sq ft" : "Size on request") + "</span>" +
        '<span class="vvpr-price">' + (p.length ? priceText(type, p[0], p[p.length - 1]) : "Price on request") + "</span>" +
        '<span class="vvpr-count">' + (all.length + ver) + " home" + (all.length + ver === 1 ? "" : "s") + " →</span></a>";
    });
    grid.innerHTML = html || '<p class="vvpr-note">No listings right now. Ask us and we will check.</p>';
    var when = latestDate ? latestDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
    document.getElementById("vvpr-note").textContent = "Asking prices from current listings" +
      (usedRecent ? ", last " + RECENT + " days" : "") + (when ? " · latest listing " + when : "") + ".";
  }
  var type = "Sale";
  Array.prototype.forEach.call(document.querySelectorAll(".vvb-seg button"), function (b) {
    b.addEventListener("click", function () { type = b.dataset.type === "Lease" ? "Lease" : "Sale"; render(type); });
  });
  document.addEventListener("ff:vv-type", function (e) { type = e.detail === "Lease" ? "Lease" : "Sale"; render(type); });
  render(type);
})();
