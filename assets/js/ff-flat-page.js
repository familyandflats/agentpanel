(function () {
  "use strict";
  var root = document.getElementById("ffp-root");
  if (!root) return;
  var id = document.body.getAttribute("data-flat-id");
  var all = (window.FF_LISTINGS || []).concat(window.FF_VERIFIED_LISTINGS || []);
  var item = null;
  all.forEach(function (i) { if (i && i.id === id && /verified/i.test(i.status || "")) item = i; });   // later list wins
  if (!item) return;
  var PHONE = "919899273673";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(s) { var m = String(s || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/); return m ? +m[1] : 0; }
  var isLease = item.type === "Lease";
  var gallery = (item.gallery && item.gallery.length ? item.gallery : [item.image]).filter(Boolean);
  var caps = item.captions || [];
  var bhk = num(item.bhk), size = num(item.size);
  var priceText = String(item.price || "").replace(/^Rs\.?\s*/i, "₹");
  var cr = /cr/i.test(item.price || "") ? num(item.price) * 1e7 : 0;
  var psf = cr && size ? "₹" + (Math.round(cr / size / 100) * 100).toLocaleString("en-IN") + " per sq. ft." : "";
  var h1 = bhk + " BHK Flat " + (isLease ? "for Rent" : "for Sale") + " in " + item.project;
  var msg = "Hi Family&Flats, I am interested in " + item.id + " (" + bhk + " BHK, " + item.project + "). Please share details and a visit slot.";
  var wa = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
  // The page's own <title> (written by scripts/prerender-flat-pages.js) stays: it is unique per flat.
  if (!document.title) document.title = h1 + " | Family&Flats";

  var facts = [["Configuration", bhk + " BHK"], ["Area", size ? size.toLocaleString("en-IN") + " sq. ft." : "On request"], ["Floor", item.floor], ["Furnishing", item.furnishing], ["Availability", item.availability], [isLease ? "Monthly rent" : "Asking price", priceText]];
  if (psf) facts.push(["Rate", psf.replace(" per sq. ft.", " / sq. ft.")]);
  facts.push(["Project", item.project], ["Reference", item.id]);

  var others = all.filter(function (i) { return i && i.id !== item.id && i.projectSlug === item.projectSlug && /verified/i.test(i.status || "") && i.type === item.type && i.detailUrl; });
  var seen = {}; others = others.filter(function (i) { if (seen[i.id]) return false; seen[i.id] = 1; return true; });

  root.innerHTML =
    '<nav class="ffp-crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="' + esc(item.projectUrl) + '">' + esc(item.project) + '</a><span>›</span>' + esc(bhk + " BHK for " + (isLease ? "rent" : "sale")) + '</nav>' +
    '<div class="ffp-top"><div><span class="ffp-badge">✓ Verified by Family&amp;Flats · real photos</span><h1>' + esc(h1) + '</h1><p class="ffp-loc">' + esc(item.location) + '</p></div></div>' +
    '<div class="ffp-gal"><div class="ffp-stage"><img id="ffp-main" alt=""><button class="ffp-arrow prev" aria-label="Previous photo">‹</button><button class="ffp-arrow next" aria-label="Next photo">›</button><span class="ffp-cap" id="ffp-cap"></span><span class="ffp-count" id="ffp-count"></span></div>' +
    '<div class="ffp-thumbs" role="list">' + gallery.map(function (src, n) { return '<button type="button" role="listitem" class="ffp-thumb" data-n="' + n + '" aria-label="Show photo ' + (n + 1) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>'; }).join("") + '</div></div>' +
    '<div class="ffp-grid"><div>' +
      '<section class="ffp-sec"><h2>Key details</h2><dl class="ffp-facts">' + facts.map(function (f) { return '<div class="ffp-fact"><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join("") + '</dl></section>' +
      '<section class="ffp-sec"><h2>About this flat</h2><p>' + esc(item.description) + '</p></section>' +
      ((item.highlights || []).length ? '<section class="ffp-sec"><h2>Highlights</h2><ul class="ffp-list">' + item.highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join("") + '</ul></section>' : "") +
      '<section class="ffp-sec ffp-note"><h2>About these photos</h2><p>' + (item.photoNote ? esc(item.photoNote) : 'These photos have been cleaned and colour-corrected by Family&amp;Flats so rooms are easier to see. The layout, fittings and condition are as found. We recommend a visit before you decide.') + '</p></section>' +
      (others.length ? '<section class="ffp-sec"><h2>Other verified flats in ' + esc(item.project) + '</h2><div class="ffp-more">' + others.map(function (o) { return '<a class="ffp-mini" href="' + esc(o.detailUrl) + '"><div style="background-image:url(\'' + esc(o.image) + '\')"></div><b>' + esc(num(o.bhk) + " BHK · " + o.size) + '</b><span>' + esc(String(o.price).replace(/^Rs\.?\s*/i, "₹")) + '</span></a>'; }).join("") + '</div></section>' : "") +
    '</div><aside class="ffp-side"><div class="ffp-box"><div class="ffp-lbl">' + (isLease ? "Monthly rent" : "Asking price") + '</div><div class="ffp-price">' + esc(priceText) + '</div>' + (psf ? '<p class="ffp-psf">' + esc(psf) + '</p>' : "") + '<p class="ffp-ref">Ref. ' + esc(item.id) + '</p>' +
      '<a class="ffp-btn wa" href="' + esc(wa) + '" target="_blank" rel="noopener">Enquire on WhatsApp</a><a class="ffp-btn ghost" href="tel:+' + PHONE + '">Call Family&amp;Flats</a><a class="ffp-btn ghost" href="' + esc(item.projectUrl) + '">View all flats in this project</a>' +
      '<p class="ffp-trust">' + esc(item.priceNote || "") + ' Final price, availability and visit timing are confirmed with the owner side through Family&amp;Flats.</p></div></aside></div>' +
    '<div class="ffp-bar"><div><b>' + esc(priceText) + '</b><small>' + esc(bhk + " BHK · " + (size ? size.toLocaleString("en-IN") + " sq. ft." : "")) + '</small></div><a href="' + esc(wa) + '" target="_blank" rel="noopener">Enquire</a></div>' +
    '<div class="ffp-lb" id="ffp-lb" role="dialog" aria-modal="true" aria-label="Photo viewer"><button class="x" aria-label="Close photo viewer">×</button><button class="arrow prev" aria-label="Previous photo">‹</button><img id="ffp-lbimg" alt=""><div class="cap" id="ffp-lbcap"></div><button class="arrow next" aria-label="Next photo">›</button></div>';

  var cur = 0, main = document.getElementById("ffp-main"), lb = document.getElementById("ffp-lb"), lbimg = document.getElementById("ffp-lbimg"), opener = null;
  function alt(n) { return (caps[n] ? caps[n] + " – " : "") + bhk + " BHK flat in " + item.project + ", photo " + (n + 1) + " of " + gallery.length; }
  function show(n) {
    cur = (n + gallery.length) % gallery.length;
    main.src = gallery[cur]; main.alt = alt(cur); lbimg.src = gallery[cur]; lbimg.alt = alt(cur);
    document.getElementById("ffp-lbcap").textContent = (caps[cur] ? caps[cur] + "  \u00B7  " : "") + (cur + 1) + " / " + gallery.length;
    document.getElementById("ffp-count").textContent = (cur + 1) + " / " + gallery.length;
    var cap = document.getElementById("ffp-cap"); cap.textContent = caps[cur] || ""; cap.style.display = caps[cur] ? "" : "none";
    Array.prototype.forEach.call(root.querySelectorAll(".ffp-thumb"), function (t, i) { t.classList.toggle("on", i === cur); if (i === cur) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current"); });
    var on = root.querySelector(".ffp-thumb.on"); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "center" });
  }
  function openLb() { opener = document.activeElement; lb.classList.add("on"); lb.querySelector(".x").focus(); }
  function closeLb() { lb.classList.remove("on"); if (opener && opener.focus) opener.focus(); }
  root.addEventListener("click", function (e) {
    var t = e.target.closest("button, #ffp-main"); if (!t) return;
    if (t.classList.contains("prev")) show(cur - 1);
    else if (t.classList.contains("next")) show(cur + 1);
    else if (t.classList.contains("ffp-thumb")) { show(+t.dataset.n); openLb(); }
    else if (t.id === "ffp-main") openLb();
    else if (t.classList.contains("x")) closeLb();
  });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lb.classList.contains("on")) closeLb();
    else if (e.key === "ArrowLeft") show(cur - 1);
    else if (e.key === "ArrowRight") show(cur + 1);
  });
  main.addEventListener("load", function () {
    if (cur === 0 && main.naturalWidth > main.naturalHeight) root.querySelector(".ffp-gal").classList.add("land");
  }, { once: true });
  show(0);
})();
