/* Family&Flats home page (design B): search, and verified homes built live from listings.js */
(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(s) { var m = String(s || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/); return m ? +m[1] : 0; }

  // search: a project name opens its page (Victory Valley + home type opens that BHK page),
  // "Golf Course Extension" or "Sector NN" opens the area page, anything else the sale or rent list.
  var mode = "buy";
  function seg(group, btn) { $$("button", group).forEach(function (b) { var on = b === btn; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); }); }
  var PROJECTS = [["IREO Grand Arch", "/projects/ireograndarch/"], ["Conscient Hines Elevate", "/projects/conscienthineselevate/"], ["Mahindra Luminare", "/projects/mahindra-luminare/"], ["Paras Floret", "/projects/paras-floret/"], ["TATA Raisina Residency", "/projects/tata-raisina-residency/"], ["IREO Skyon", "/projects/ireo-skyon/"], ["Pioneer Park", "/projects/pioneer-park/"], ["Puri The Aravallis", "/projects/puri-the-aravallis/"], ["Smart World Orchard", "/projects/smart-world-orchard/"], ["Conscient Elevate Reserve", "/projects/conscient-elevate-reserve/"], ["Conscient Heritage One", "/projects/conscient-heritage-one/"], ["Emaar Amaris", "/projects/emaar-amaris/"], ["Emaar DigiHomes", "/projects/emaardigihomes/"], ["Emaar Urban Oasis", "/projects/emaar-urban-oasis/"], ["Pioneer Araya", "/projects/pioneer-araya/"], ["Pioneer Presidia", "/projects/pioneer-presidia/"], ["Adani Samsara Ivana", "/projects/adani-samsara-ivana/"], ["DLF The Arbour", "/projects/dlf-the-arbour/"], ["Anant Raj Estate", "/projects/anant-raj-estate/"], ["Birla Navya", "/projects/birla-navya/"], ["Birla Navya Avik", "/projects/birla-navya-avik/"], ["Laburnum Victory Floors", "/projects/laburnum-victory-floors/"], ["Silverglades Legacy", "/projects/silverglades-legacy/"], ["TARC Ishva", "/projects/tarc-ishva/"], ["M3M Altitude", "/projects/m3m-altitude/"], ["M3M Golf Estate", "/projects/m3m-golf-estate/"], ["M3M Heights", "/projects/m3mheights/"], ["M3M Latitude", "/projects/m3m-latitude/"], ["Trump Towers", "/projects/trump-towers/"], ["Emaar MGF Marbella", "/projects/emaar-mgf-marbella/"], ["Emaar MGF Palm Terraces Select", "/projects/emaar-mgf-pal-terraces-select/"], ["Emaar MGF The Palm Drive", "/projects/emaar-mgf-the-palm-drive/"], ["IREO Uptown", "/projects/ireouptown/"], ["Smart World The Edition", "/projects/smart-world-the-edition/"], ["IREO Victory Valley", "/projects/ireo-victory-valley/"], ["M3M Merlin", "/projects/m3m-merlin/"]];
  var VV_PAGES = { buy: ["2", "3", "4", "penthouse"], lease: ["2", "3", "4", "5", "penthouse"] };
  var SECTORS = ["58", "59", "60", "61", "62", "63", "63a", "65", "66", "67"];
  function norm(t) { return String(t || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim(); }
  function findProject(q) {
    var words = norm(q).split(" ").filter(function (w) { return w && !/^(the|in|at|flat|flats|for|sale|rent|bhk|gurgaon|gurugram)$/.test(w); });
    if (!words.length) return null;
    var hits = PROJECTS.filter(function (pr) {
      var n = " " + norm(pr[0]) + " ";
      return words.every(function (w) { return n.indexOf(" " + w) >= 0; });
    });
    return hits.length === 1 ? hits[0] : hits.length ? "many" : null;
  }
  function destination(q, bhk) {
    var n = norm(q), want = bhk === "Penthouse" ? "penthouse" : (String(bhk).match(/\d/) || [""])[0];
    var word = mode === "lease" ? "rent" : "sale";
    if (mode !== "projects") {
      var sec = n.match(/sector\s*(\d+\s*a?)\b/);
      if (sec && SECTORS.indexOf(sec[1].replace(/\s/g, "")) >= 0) return "/locations/golf-course-extension-road-gurugram/#sector-" + sec[1].replace(/\s/g, "");
    }
    if (/golf course ext|gcer|extension road/.test(n)) return "/locations/golf-course-extension-road-gurugram/";
    var pr = findProject(q);
    if (pr === "many") return "/locations/golf-course-extension-road-gurugram/";   // e.g. "M3M" or "Emaar": show them all
    if (pr) {
      if (pr[1] === "/projects/ireo-victory-valley/" && mode !== "projects" && want && VV_PAGES[mode === "lease" ? "lease" : "buy"].indexOf(want) >= 0)
        return pr[1] + (want === "penthouse" ? "penthouse" : want + "-bhk") + "-for-" + word + "/";
      return pr[1];
    }
    if (mode === "projects") return "/projects.html";
    var url = mode === "lease" ? "/lease.html" : "/sale.html";
    return want && want !== "penthouse" ? url + "?bhk=" + want + "bhk" : url;
  }
  var form = $("#homeSearch");
  if (form) {
    $$(".hb-seg button", form).forEach(function (b) { b.addEventListener("click", function () { mode = b.getAttribute("data-mode"); seg(b.parentNode, b); }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      location.href = destination(($("#homeQuery").value || "").trim(), $("#homeBhk").value);
    });
  }

  // verified homes
  var all = (window.FF_LISTINGS || []).filter(function (i) { return /verified/i.test(i.status || "") && i.detailUrl; });
  var grid = $("#hb-vgrid"), more = $("#hb-vall");
  function label(i) {
    var t = (i.bhk || "") + " " + (i.title || "");
    if (/penthouse/i.test(t)) return num(i.bhk) + " BHK " + (/duplex/i.test(t) ? "duplex " : "") + "penthouse";
    return num(i.bhk) + " BHK";
  }
  function price(i) {
    var t = String(i.price || ""), n = num(t);
    if (!n) return i.type === "Lease" ? "Rent on request" : "Price on request";
    if (/cr/i.test(t)) return "₹" + n.toFixed(2).replace(/\.00$/, "") + " Cr";
    return "₹" + Math.round(n).toLocaleString("en-IN") + (i.type === "Lease" ? "/month" : "");
  }
  function card(i) {
    var n = (i.gallery || [i.image]).filter(Boolean).length;
    return '<a class="hb-vcard" href="' + esc(i.detailUrl) + '">' +
      '<div class="hb-vphoto"><img src="' + esc(i.image) + '" alt="' + esc(label(i) + " in " + i.project) + '" loading="lazy"><span class="hb-badge">Verified</span>' + (n > 1 ? '<span class="hb-count">' + n + " photos</span>" : "") + "</div>" +
      '<div class="hb-vbody"><div class="hb-vprice">' + esc(price(i)) + "</div><h3>" + esc(label(i)) + " · " + esc(num(i.size).toLocaleString("en-IN")) + " sq ft</h3>" +
      "<p>" + esc([i.project, i.floor, i.furnishing].filter(Boolean).join(" · ")) + "</p></div></a>";
  }
  function draw(type) {
    if (!grid) return;
    var list = all.filter(function (i) { return i.type === type; }).sort(function (a, b) { return (b.gallery || []).length - (a.gallery || []).length; }).slice(0, 3);
    grid.innerHTML = list.length ? list.map(card).join("") : '<p class="hb-empty">New verified homes are added every week. <a href="https://wa.me/919899273673">Ask us on WhatsApp</a>.</p>';
    if (more) { more.href = type === "Lease" ? "/lease.html" : "/sale.html"; more.textContent = type === "Lease" ? "See all homes for rent" : "See all homes for sale"; }
  }
  $$("[data-vtype]").forEach(function (b) { b.addEventListener("click", function () { seg(b.parentNode, b); draw(b.getAttribute("data-vtype")); }); });
  draw("Sale");
})();
/* featured communities: rotate every 6 s, pause on hover/focus or the pause button; no autoplay for reduced motion */
(function () {
  var box = document.getElementById("hb-feature"); if (!box) return;
  var slides = [].slice.call(box.querySelectorAll(".hb-slide")), dots = [].slice.call(box.querySelectorAll(".hb-dots button"));
  var pauseBtn = box.querySelector(".hb-pause"), cur = 0, timer = null, hold = false, stopped = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function show(n) {
    cur = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) {
      var on = i === cur; s.classList.toggle("on", on);
      if (on) s.removeAttribute("aria-hidden"); else s.setAttribute("aria-hidden", "true");
      s.querySelectorAll(".hb-feature-copy a").forEach(function (a) { if (on) a.removeAttribute("tabindex"); else a.setAttribute("tabindex", "-1"); });
    });
    dots.forEach(function (d, i) { d.classList.toggle("on", i === cur); if (i === cur) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
  }
  function tick() { clearTimeout(timer); if (!stopped && !hold && !document.hidden) timer = setTimeout(function () { show(cur + 1); tick(); }, 6000); }
  box.querySelectorAll(".hb-fbtn[data-dir]").forEach(function (b) { b.addEventListener("click", function () { show(cur + +b.getAttribute("data-dir")); tick(); }); });
  dots.forEach(function (d, i) { d.addEventListener("click", function () { show(i); tick(); }); });
  if (pauseBtn) {
    if (stopped) { pauseBtn.setAttribute("aria-pressed", "true"); pauseBtn.setAttribute("aria-label", "Play rotation"); pauseBtn.innerHTML = "&#9654;"; }
    pauseBtn.addEventListener("click", function () {
      stopped = !stopped; pauseBtn.setAttribute("aria-pressed", stopped ? "true" : "false");
      pauseBtn.setAttribute("aria-label", stopped ? "Play rotation" : "Pause rotation"); pauseBtn.innerHTML = stopped ? "&#9654;" : "&#10073;&#10073;"; tick();
    });
  }
  box.addEventListener("mouseenter", function () { hold = true; tick(); });
  box.addEventListener("mouseleave", function () { hold = false; tick(); });
  box.addEventListener("focusin", function () { hold = true; tick(); });
  box.addEventListener("focusout", function () { hold = false; tick(); });
  document.addEventListener("visibilitychange", tick);
  show(0); tick();
})();
