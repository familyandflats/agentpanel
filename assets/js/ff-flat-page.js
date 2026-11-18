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
  // T0190 (Arun 18 Nov 2026, design D): replaced by the two sections below (our verified flats first, then agent listings)
  others = [];

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

  // T0190 (Arun 18 Nov 2026, design D): "More <n> BHK homes for <rent|sale> in <society>" and "Similar <n> BHK homes
  // nearby". Our own verified flats first (photo, Property ID, View flat), then agent listings (a project photo marked
  // "Project photo", never presented as the flat; Enquire names the listing code). Closest in price to this flat first.
  if (typeof location !== "undefined" && typeof document.createElement === "function") (function () {
    var GCE = /golf course extension/i;
    var range = function (a, b, n) { var o = []; for (var i = a; i <= b; i++) o.push(n(i)); return o; };
    var PROJ = {
      "ireo-skyon": { name: "IREO Skyon", ads: "/assets/data/agent-ads-ireo-skyon.js", url: "/projects/ireo-skyon/", pics: range(1, 15, function (i) { return "/projects/ireo-skyon/images/ff-sky-ov-" + (i < 10 ? "0" : "") + i + "-800.jpg"; }) },
      "ireovictoryvalley": { name: "IREO Victory Valley", ads: "/assets/data/agent-ads.js", url: "/projects/ireo-victory-valley/", pics: ["01-sm", "03-800", "04-800", "06-800", "12-600", "05", "10", "20", "43", "24", "25", "34"].map(function (n) { return "/projects/ireovictoryvalley/images/ff-vv-ov-" + n + ".jpg"; }) },
      "conscienthineselevate": { name: "Conscient Hines Elevate", ads: "/assets/data/agent-ads-conscienthineselevate.js", url: "/projects/conscienthineselevate/", pics: ["banner-800", "club-view-800", "elevate", "gallery-1", "gallery-2"].map(function (n) { return "/projects/conscienthineselevate/images/" + n + ".jpg"; }) }
    };
    var slugOf = function (i) { return i.projectSlug === "ireo-victory-valley" ? "ireovictoryvalley" : i.projectSlug; };
    var mySlug = slugOf(item), word = isLease ? "rent" : "sale";
    var priceOf = function (x) { return x.price ? +x.price : (x.refRange ? (x.refRange[0] + x.refRange[1]) / 2 : 0); };
    var myPrice = priceOf({ price: isLease ? num(item.price) : (cr || 0) });
    var money = function (v) { if (!v) return ""; if (isLease) return v >= 1000 ? "₹" + Math.round(v).toLocaleString("en-IN") : "₹" + v; return "₹" + (v / 1e7).toFixed(2).replace(/\.00$/, "") + " Cr"; };
    var k = function (v) { return isLease ? Math.round(v / 1000) + "k" : (v / 1e7).toFixed(2).replace(/\.?0+$/, "") + " Cr"; };
    var adPrice = function (x) { return x.price ? money(+x.price) : x.refRange ? "₹" + k(x.refRange[0]) + "–" + k(x.refRange[1]) : "On request"; };
    var near = function (a, b) { return Math.abs(priceOf(a) - myPrice) - Math.abs(priceOf(b) - myPrice); };
    var ourFlats = all.filter(function (i, idx) { return i && i.id !== item.id && /verified/i.test(i.status || "") && i.type === item.type && num(i.bhk) === bhk && i.detailUrl && all.indexOf(i) === idx; });
    var ourPrice = function (i) { var n = num(i.price); return /cr/i.test(i.price || "") ? n * 1e7 : n; };
    var ourSame = ourFlats.filter(function (i) { return slugOf(i) === mySlug; }).sort(function (a, b) { return Math.abs(ourPrice(a) - myPrice) - Math.abs(ourPrice(b) - myPrice); });
    var ourNear = ourFlats.filter(function (i) { return slugOf(i) !== mySlug && GCE.test(i.location || "") && GCE.test(item.location || ""); }).sort(function (a, b) { return Math.abs(ourPrice(a) - myPrice) - Math.abs(ourPrice(b) - myPrice); });
    var dayWord = function (d) { var t = new Date(d); return isNaN(t) ? "" : "Listed " + t.getDate() + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][t.getMonth()]; };
    var ourCard = function (o) {
      var img = (o.gallery && o.gallery[0]) || o.image || "";
      var feats = [o.furnishing, o.availability].filter(Boolean).slice(0, 2);
      return '<a class="ffx-card ffx-ours" href="' + esc(o.detailUrl) + '">' + (img ? '<span class="ffx-img"><img src="' + esc(img) + '" alt="" loading="lazy"></span>' : '<span class="ffx-img ffx-none">Photos on request</span>') +
        '<span class="ffx-badge ok">' + (slugOf(o) === mySlug ? "Verified" : esc((PROJ[slugOf(o)] || { name: o.project }).name.replace(/^IREO\s+/, "")) + " · Verified") + (o.photoCount ? " · " + o.photoCount + " photos" : "") + '</span>' +
        '<b class="ffx-price">' + esc(String(o.price || "").replace(/^Rs\.?\s*/i, "₹").replace(/\/month/, "")) + (isLease ? '<small> /month</small>' : "") + '</b>' +
        '<span class="ffx-chips">' + feats.map(function (f) { return '<i>' + esc(f) + '</i>'; }).join("") + '</span>' +
        '<span class="ffx-id">Property ID ' + esc(o.ref || o.id) + '</span><span class="ffx-btn">View flat</span></a>';
    };
    var adCard = function (x, slug, n) {
      var P = PROJ[slug], pic = P.pics[n % P.pics.length];
      var feats = (x.tags || []).filter(function (t) { return !/plus maintenance|possession ready/i.test(t); }).slice(0, 2);
      if (feats.length < 2 && x.size) feats.push(Math.round(x.size).toLocaleString("en-IN") + " sq ft");
      var msg = "Hi Family&Flats, I am interested in listing " + x.id + " (" + bhk + " BHK for " + word + ", " + P.name + "). Please share details.";
      return '<div class="ffx-card"><span class="ffx-img"><img src="' + esc(pic) + '" alt="' + esc(P.name) + ' project photo" loading="lazy"><em>Project photo</em></span>' +
        '<span class="ffx-badge ag">' + (slug === mySlug ? "Agent listing" : esc(P.name.replace(/^IREO\s+/, "")) + " · agent") + '</span>' +
        '<b class="ffx-price">' + esc(adPrice(x)) + (isLease ? '<small> /month</small>' : "") + '</b>' +
        '<span class="ffx-chips">' + feats.map(function (f) { return '<i>' + esc(f) + '</i>'; }).join("") + '</span>' +
        '<span class="ffx-id">' + esc(dayWord(x.advertisedOn)) + (x.id ? " · " + esc(x.id) : "") + '</span>' +
        '<a class="ffx-btn wa" target="_blank" rel="noopener" href="https://wa.me/' + PHONE + '?text=' + encodeURIComponent(msg) + '">Enquire</a></div>';
    };
    var loadAds = function (slug, done) {
      var P = PROJ[slug]; if (!P) return done([]);
      if (P.list) return done(P.list);
      var prev = window.FF_AGENT_ADS; window.FF_AGENT_ADS = undefined;
      var s = document.createElement("script"); s.src = P.ads;
      s.onload = function () { P.list = (window.FF_AGENT_ADS || []).slice(); window.FF_AGENT_ADS = prev; done(P.list); };
      s.onerror = function () { window.FF_AGENT_ADS = prev; done([]); };
      document.head.appendChild(s);
    };
    var fits = function (x) { return x && x.type === item.type && +x.bhk === bhk; };
    var nearSlugs = GCE.test(item.location || "") ? Object.keys(PROJ).filter(function (s2) { return s2 !== mySlug; }) : [];
    var host = document.createElement("div"); host.className = "ffx"; host.id = "ffx-more";
    var grid = root.querySelector(".ffp-grid"); if (!grid) return;
    grid.parentNode.insertBefore(host, grid.nextSibling);
    var section = function (title, cards, seeAll, seeHref) {
      if (!cards.length) return "";
      return '<section class="ffx-sec"><h2>' + esc(title) + '</h2><div class="ffx-row">' + cards.join("") + '</div>' + (seeAll ? '<a class="ffx-all" href="' + esc(seeHref) + '">' + esc(seeAll) + ' →</a>' : "") + '</section>';
    };
    var out = { same: "", near: "" };
    var paint = function () { host.innerHTML = out.same + out.near; };
    loadAds(mySlug, function (list) {
      var ads = list.filter(fits).sort(near);
      var cards = ourSame.slice(0, 6).map(ourCard).concat(ads.slice(0, Math.max(0, 6 - ourSame.length)).map(function (x, i) { return adCard(x, mySlug, i); }));
      var total = ourSame.length + ads.length;
      out.same = section("More " + bhk + " BHK homes for " + word + " in " + item.project, cards,
        total > cards.length ? "See all: " + (ourSame.length ? ourSame.length + " verified by us + " : "") + ads.length + " agent listings" : "", (PROJ[mySlug] || {}).url || item.projectUrl || (isLease ? "/lease.html" : "/sale.html"));
      paint();
      var pending = nearSlugs.length, nearAds = [];
      var finish = function () {
        nearAds.sort(function (a, b) { return near(a.x, b.x); });
        var c2 = ourNear.slice(0, 6).map(ourCard).concat(nearAds.slice(0, Math.max(0, 6 - ourNear.length)).map(function (o, i) { return adCard(o.x, o.slug, i + 3); }));
        out.near = section("Similar " + bhk + " BHK homes nearby", c2, (ourNear.length + nearAds.length) > c2.length ? "See all " + bhk + " BHK homes for " + word + " nearby" : "", isLease ? "/lease.html" : "/sale.html");
        paint();
      };
      if (!pending) return finish();
      nearSlugs.forEach(function (s2) { loadAds(s2, function (l2) { l2.filter(fits).forEach(function (x) { nearAds.push({ x: x, slug: s2 }); }); if (--pending === 0) finish(); }); });
    });
  })();

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
