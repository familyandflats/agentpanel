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
  // 14 Nov 2026 (Arun): a flat can be verified by us before we have photos; it still gets its own page.
  var hasPhotos = gallery.length > 0;
  var bhk = num(item.bhk), size = num(item.size);
  var priceText = String(item.price || "").replace(/^Rs\.?\s*/i, "₹");
  var cr = /cr/i.test(item.price || "") ? num(item.price) * 1e7 : 0;
  var psf = cr && size ? "₹" + (Math.round(cr / size / 100) * 100).toLocaleString("en-IN") + " per sq. ft." : "";
  var kindTxt = (item.bhk || "") + " " + (item.title || "");
  var kind = /penthouse/i.test(kindTxt) ? bhk + " BHK " + (/duplex/i.test(kindTxt) ? "Duplex " : "") + "Penthouse" : bhk + " BHK " + (/furnished/i.test(item.furnishing || "") ? item.furnishing + " " : "") + "Flat";  // 18 Nov 2026 (Arun): "2 BHK Fully Furnished Flat for Rent"
  var h1 = kind + " " + (isLease ? "for Rent" : "for Sale") + " in " + item.project;
  var pid = item.ref || item.id;  // 18 Nov 2026 (Arun): shown as "Property ID: 14257"; the internal FF-... code is never shown
  var msg = "Hi Family&Flats, I am interested in Property ID " + pid + " (" + bhk + " BHK, " + item.project + "). Please share details and a visit slot.";
  var wa = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
  var waPhotos = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent("Hi Family&Flats, please share current photos of Property ID " + pid + " (" + bhk + " BHK, " + item.project + ").");
  // The page's own <title> (written by scripts/prerender-flat-pages.js) stays: it is unique per flat.
  if (!document.title) document.title = h1 + " | Family&Flats";

  // 18 Nov 2026 (Arun): "Available From 1 Dec 2026" shows as label Available From, value 1 Dec 2026
  var facts = [["Configuration", bhk + " BHK"], ["Area", size ? size.toLocaleString("en-IN") + " sq. ft." : "On request"], ["Floor", item.floor], ["Furnishing", item.furnishing], (/^available from\s+/i.test(item.availability || "") ? ["Available From", String(item.availability).replace(/^available from\s+/i, "")] : ["Availability", item.availability]), [isLease ? "Monthly rent" : "Asking price", priceText]];
  if (psf) facts.push(["Rate", psf.replace(" per sq. ft.", " / sq. ft.")]);
  // 13 Nov 2026 (Arun): balcony and entrance direction, car parkings and club membership on every flat page
  if (item.balconyFacing) facts.push(["Balcony faces", item.balconyFacing]);
  if (item.entranceFacing) facts.push(["Entrance faces", item.entranceFacing]);
  if (item.carParkings != null) facts.push(["Car parking", item.carParkings ? String(item.carParkings) : "None"]);
  if (item.clubMembership != null) facts.push(["Club membership", item.clubMembership ? "Yes" : "No"]);
  if ((item.features || []).length) facts.push(["Facing / view", item.features.join(", ")]);
  facts.push(["Project", item.project], ["Property ID", pid]);
  // 18 Nov 2026 (Arun): the floor is never disclosed unless he gives the wording for that flat (e.g. "Lower"); empty rows are not shown
  facts = facts.filter(function (f) { return f[1] != null && String(f[1]).trim() !== ""; });

  var others = all.filter(function (i) { return i && i.id !== item.id && i.projectSlug === item.projectSlug && /verified/i.test(i.status || "") && i.type === item.type && i.detailUrl; });
  var seen = {}; others = others.filter(function (i) { if (seen[i.id]) return false; seen[i.id] = 1; return true; });

  root.innerHTML =
    '<nav class="ffp-crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="' + esc(item.projectUrl) + '">' + esc(item.project) + '</a><span>›</span>' + esc(bhk + " BHK for " + (isLease ? "rent" : "sale")) + '</nav>' +
    '<div class="ffp-top"><div><span class="ffp-badge">✓ Verified by Family&amp;Flats' + (hasPhotos ? ' · real photos' : '') + '</span><h1>' + esc(h1) + '</h1><p class="ffp-loc">' + esc(item.location) + '</p></div></div>' +
    (!hasPhotos ? '<div class="ffp-nophoto"><div><b>Photos on request</b><p>This flat is checked by Family&amp;Flats. Ask us and we share current photos or a video of the actual flat on WhatsApp.</p><a class="ffp-btn wa" href="' + esc(waPhotos) + '" target="_blank" rel="noopener">Request photos on WhatsApp</a></div></div>' :
    '<div class="ffp-gal"><div class="ffp-stage"><img id="ffp-main" alt=""><button class="ffp-arrow prev" aria-label="Previous photo">‹</button><button class="ffp-arrow next" aria-label="Next photo">›</button><span class="ffp-cap" id="ffp-cap"></span><span class="ffp-count" id="ffp-count"></span></div>' +
    '<div class="ffp-thumbs">' + gallery.map(function (src, n) { return '<button type="button" class="ffp-thumb" data-n="' + n + '" aria-label="Show photo ' + (n + 1) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>'; }).join("") + '</div></div>') +
    '<div class="ffp-grid"><div>' +
      '<section class="ffp-sec"><h2>Key details</h2><dl class="ffp-facts">' + facts.map(function (f) { return '<div class="ffp-fact"><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join("") + '</dl></section>' +
      '<section class="ffp-sec"><h2>About this flat</h2><p>' + esc(item.description) + '</p></section>' +
      ((item.highlights || []).length ? '<section class="ffp-sec"><h2>Highlights</h2><ul class="ffp-list">' + item.highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join("") + '</ul></section>' : "") +
      // 18 Nov 2026 (Arun): no "About these photos" note and nothing about photo editing on the website
      (others.length ? '<section class="ffp-sec"><h2>Other verified flats in ' + esc(item.project) + '</h2><div class="ffp-more">' + others.map(function (o) { return '<a class="ffp-mini" href="' + esc(o.detailUrl) + '"><div' + (o.image ? ' style="background-image:url(\'' + esc(o.image) + '\')"' : ' class="ffp-mini-none">Photos on request') + '</div><b>' + esc(num(o.bhk) + " BHK · " + o.size) + '</b><span>' + esc(String(o.price).replace(/^Rs\.?\s*/i, "₹")) + '</span></a>'; }).join("") + '</div></section>' : "") +
    '</div><aside class="ffp-side"><div class="ffp-box"><div class="ffp-lbl">' + (isLease ? "Monthly rent" : "Asking price") + '</div><div class="ffp-price">' + esc(priceText) + '</div>' + (psf ? '<p class="ffp-psf">' + esc(psf) + '</p>' : "") + '<p class="ffp-ref">Property ID: ' + esc(pid) + '</p>' +
      '<a class="ffp-btn wa" href="' + esc(wa) + '" target="_blank" rel="noopener">Enquire on WhatsApp</a><a class="ffp-btn ghost" href="tel:+' + PHONE + '">Call Family&amp;Flats</a><a class="ffp-btn ghost" href="' + esc(item.projectUrl) + '">View all flats in this project</a>' +
      '<p class="ffp-trust">' + esc(item.priceNote || "") + ' Final price, availability and visit timing are confirmed with the owner side through Family&amp;Flats.</p></div></aside></div>' +
    '<div class="ffp-bar"><div><b>' + esc(priceText) + '</b><small>' + esc(bhk + " BHK · " + (size ? size.toLocaleString("en-IN") + " sq. ft." : "")) + '</small></div><a href="' + esc(wa) + '" target="_blank" rel="noopener">Enquire</a></div>' +
    '<div class="ffp-lb" id="ffp-lb" role="dialog" aria-modal="true" aria-label="Photo viewer"><button class="x" aria-label="Close photo viewer">×</button><button class="arrow prev" aria-label="Previous photo">‹</button><img id="ffp-lbimg" alt=""><div class="cap" id="ffp-lbcap"></div><button class="arrow next" aria-label="Next photo">›</button></div>';

  // T0179 client links (Arun 18 Nov 2026): opened as familyandflats.com/f/<Property ID>-<code>, the page tells
  // Family&Flats it was opened, how many photos were seen, whether the price came into view and whether Enquire or
  // Call was tapped. Only a random id kept in this browser is sent; never a name, number or contacts.
  var linkM = ((typeof location !== "undefined" && location.pathname) || "").match(/^\/f\/(\d{5})-([a-z0-9]{4,8})\/?$/) || [];
  var track = function () {};
  if (linkM[1] && linkM[1] === String(item.ref || "")) {
    var dev = "";
    try {
      dev = localStorage.getItem("ff_dev") || "";
      if (!dev) { dev = ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32); localStorage.setItem("ff_dev", dev); }
    } catch (e) { dev = "tmp" + Math.random().toString(36).slice(2, 14); }
    track = function (k, n, t, v) {
      var body = JSON.stringify({ c: linkM[2], r: linkM[1], d: dev, k: k, n: n, t: t, v: v });
      try {
        if (!(navigator.sendBeacon && navigator.sendBeacon("/api/integrations/link-event", new Blob([body], { type: "application/json" }))))
          fetch("/api/integrations/link-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true });
      } catch (e) {}
    };
    track("open");
    var priceEl = root.querySelector(".ffp-price");
    if (priceEl && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { track("price"); io.disconnect(); } }, { threshold: 0.6 });
      io.observe(priceEl);
    }
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.ffp-btn.wa, .ffp-bar a, a[href^='tel:']");
      if (a) track("enquire", null, null, /^tel:/.test(a.getAttribute("href") || "") ? "call" : "whatsapp");
    }, true);
  }
  var seenPhotos = {}, seenCount = 0, sentCount = 0, photoTimer = null;
  function notePhoto(n) {
    if (!seenPhotos[n]) { seenPhotos[n] = 1; seenCount++; }
    if (!linkM[1]) return;   // only client links report photos
    if (seenCount > sentCount) { clearTimeout(photoTimer); photoTimer = setTimeout(function () { sentCount = seenCount; track("photo", seenCount, gallery.length); }, 1500); }
  }

  if (!hasPhotos) return;   // no slider or photo viewer to wire up
  var cur = 0, main = document.getElementById("ffp-main"), lb = document.getElementById("ffp-lb"), lbimg = document.getElementById("ffp-lbimg"), opener = null;
  function alt(n) { return (caps[n] ? caps[n] + " – " : "") + bhk + " BHK flat in " + item.project + ", photo " + (n + 1) + " of " + gallery.length; }
  function show(n) {
    cur = (n + gallery.length) % gallery.length;
    notePhoto(cur);
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
