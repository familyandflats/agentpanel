/* IREO Victory Valley hero search (design B): Buy/Rent + home type, live count, goes to the matching page. */
(function () {
  "use strict";
  var form = document.getElementById("vvb-search");
  if (!form) return;
  var ADS = (window.FF_AGENT_ADS || []).filter(function (a) { return !a.projectSlug || a.projectSlug === "ireovictoryvalley"; });
  // Verified flats count too, exactly as in the listings section below.
  var VER = (function () {
    var byId = {};
    (window.FF_LISTINGS || []).concat(window.FF_VERIFIED_LISTINGS || []).forEach(function (i) {
      if (i.projectSlug === "ireovictoryvalley" && /verified/i.test(i.status || "")) byId[i.id] = i;
    });
    return Object.keys(byId).map(function (k) { return { type: i_type(byId[k]), bhk: (/(\d)/.exec(String(byId[k].bhk || "")) || [])[1], tags: byId[k].tags, unit: byId[k].unit || byId[k].title }; });
    function i_type(i) { return i.type; }
  })();
  ADS = ADS.concat(VER);
  var PAGES = ["2-bhk-for-sale","3-bhk-for-sale","4-bhk-for-sale","penthouse-for-sale","2-bhk-for-rent","3-bhk-for-rent","4-bhk-for-rent","5-bhk-for-rent","penthouse-for-rent"];
  var type = "Sale", sel = document.getElementById("vvb-bhk"), go = document.getElementById("vvb-go");
  function isPent(a) { return (a.tags || []).indexOf("Penthouse") >= 0 || /penthouse/i.test(a.unit || ""); }
  function count() {
    var b = sel.value;
    return ADS.filter(function (a) {
      if (a.type !== type) return false;
      if (!b) return true;
      if (b === "P") return isPent(a);
      return String(a.bhk) === b && !isPent(a);
    }).length;
  }
  function refresh() {
    var n = count();
    go.textContent = n ? "Show " + n + " home" + (n === 1 ? "" : "s") : "Ask us for options";
  }
  var sale = ADS.filter(function (a) { return a.type === "Sale"; }).length, rent = ADS.length - sale;
  if (ADS.length) { document.getElementById("vvb-sale").textContent = sale; document.getElementById("vvb-rent").textContent = rent; }
  Array.prototype.forEach.call(form.querySelectorAll(".vvb-seg button"), function (btn) {
    btn.addEventListener("click", function () {
      type = btn.dataset.type;
      Array.prototype.forEach.call(form.querySelectorAll(".vvb-seg button"), function (b) { var on = b === btn; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
      refresh();
    });
  });
  sel.addEventListener("change", refresh);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var b = sel.value, slug = b ? (b === "P" ? "penthouse" : b + "-bhk") + "-for-" + (type === "Lease" ? "rent" : "sale") : "";
    if (slug && PAGES.indexOf(slug) >= 0) { window.location.href = "/projects/ireo-victory-valley/" + slug + "/"; return; }
    if (!count()) { var enq = document.getElementById("enquire"); if (enq) enq.scrollIntoView({ behavior: "smooth" }); return; }
    var t = document.querySelector('#vvi-type .vvi-pill[data-t="' + type + '"]');
    if (t) t.click();
    var list = document.getElementById("Ready-to-move");
    if (list) list.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  refresh();
})();
