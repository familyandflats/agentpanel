/* Family&Flats home page (design B): search, and verified homes built live from listings.js */
(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(s) { var m = String(s || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/); return m ? +m[1] : 0; }

  // search (same destinations as before)
  var mode = "buy";
  function seg(group, btn) { $$("button", group).forEach(function (b) { var on = b === btn; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); }); }
  var form = $("#homeSearch");
  if (form) {
    $$(".hb-seg button", form).forEach(function (b) { b.addEventListener("click", function () { mode = b.getAttribute("data-mode"); seg(b.parentNode, b); }); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = ($("#homeQuery").value || "").trim(), bhk = $("#homeBhk").value;
      if (mode === "projects") { location.href = q ? "/projects.html?query=" + encodeURIComponent(q) : "/projects.html"; return; }
      var url = mode === "lease" ? "/lease.html" : "/sale.html", p = [];
      if (q) p.push("query=" + encodeURIComponent(q));
      if (bhk) p.push("bhk=" + encodeURIComponent(bhk));
      location.href = url + (p.length ? "?" + p.join("&") : "");
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
