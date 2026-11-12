/* Anant Raj Estate (Sector 63A) listings in the Victory Valley "Homes available now" design (same CSS classes).
   Data: /assets/data/anant-raj-ads.js (window.FF_ARE_ADS), read from agent ads by Family&Flats
   (plotted-community rules, 12 Nov 2026). Grouped by type, then BHK, then plot size. No agent names or numbers.
   Every enquiry goes to Family&Flats through the page's enquiry form (ff-vv-enquiry.js). */
(function () {
  "use strict";
  var mount = document.getElementById("are-inventory");
  if (!mount) return;
  var PROJECT = mount.getAttribute("data-project") || "Anant Raj Estate";
  var SIZE_TOLERANCE = 0.03;

  // Same hold-backs as the Buy and Rent pages: a plot whose price / size gives an unbelievable rate,
  // and "1 BHK" floors on full plots, are known misreads and wait for Arun's check.
  function held(a) {
    if (a.kind === "Plot" && a.cr && a.plot) { var r = a.cr * 100 / a.plot; if (r < 2 || r > 5) return true; }
    return a.kind === "Independent floor" && a.bhk === 1;
  }
  var ADS = (window.FF_ARE_ADS || []).filter(function (a) { return !held(a); }).map(function (a) {
    var type = a.txn === "Rent" ? "Lease" : "Sale";
    var price = a.por ? 0 : a.kind === "Plot" ? (a.cr ? a.cr * 1e7 : a.rateL && a.plot ? a.rateL * 1e5 * a.plot : 0)
      : type === "Lease" ? (a.rentL ? a.rentL * 1e5 : 0) : (a.cr ? a.cr * 1e7 : 0);
    var rate = a.kind === "Plot" ? (a.rateL || (a.cr && a.plot ? a.cr * 100 / a.plot : 0)) : 0;
    var tab = a.kind === "Plot" ? "pl" : a.kind === "Villa" ? "vi" : "f" + (a.bhk || 0);
    return { a: a, id: a.id, type: type, price: price, rate: rate, tab: tab };
  });
  var state = { type: "Sale", tab: null, open: null };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function inr(n) { return Math.round(n).toLocaleString("en-IN"); }
  function cr(n) { return "₹" + (n / 1e7).toFixed(2) + " Cr"; }
  function money(x) {
    if (!x.price) return "Price on request";
    return x.type === "Lease" ? "₹" + inr(x.price) + "/mo" : cr(x.price);
  }
  function range(list) {
    var p = list.map(function (x) { return x.price; }).filter(Boolean);
    if (!p.length) return "Price on request";
    var lo = Math.min.apply(null, p), hi = Math.max.apply(null, p), lease = list[0].type === "Lease";
    if (lo === hi) return lease ? "₹" + inr(lo) + "<small>/mo</small>" : cr(lo);
    return lease ? "₹" + inr(lo) + "–" + inr(hi) + "<small>/mo</small>" : "₹" + (lo / 1e7).toFixed(2) + "–" + (hi / 1e7).toFixed(2) + " Cr";
  }
  function rangeClass(html) {
    var n = html.replace(/<[^>]+>/g, "").replace(/\/mo$/, "").length;
    return n >= 18 ? " xxlong" : n >= 15 ? " xlong" : n >= 12 ? " long" : "";
  }
  function dateLabel(iso) { return iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""; }
  var TAB_LABEL = { pl: "Plots", vi: "Villas" };
  function tabLabel(k) { return TAB_LABEL[k] || k.slice(1) + " BHK floors"; }
  function tabOrder(k) { return k === "vi" ? 90 : k === "pl" ? 95 : +k.slice(1); }
  function noun(k, n) { return (k === "pl" ? "plot" : k === "vi" ? "villa" : "floor") + (n === 1 ? "" : "s"); }

  // cards: one per plot size (sizes within 3% are the same plot size; agents write 382 / 383); plots in size bands
  var BANDS = [[0, 200], [201, 260], [261, 300], [301, 400], [401, 600], [601, 1e9]];
  function groups() {
    var inType = ADS.filter(function (x) { return x.type === state.type && x.tab === state.tab; });
    var out = [];
    if (state.tab === "pl") {
      BANDS.forEach(function (b) {
        var l = inType.filter(function (x) { return x.a.plot && x.a.plot >= b[0] && x.a.plot <= b[1]; });
        if (l.length) out.push({ k: "b" + b[0], l: l });
      });
    } else {
      var sized = inType.filter(function (x) { return x.a.plot; }).sort(function (x, y) { return x.a.plot - y.a.plot; }), cur = null;
      sized.forEach(function (x) {
        if (cur && x.a.plot <= cur.anchor * (1 + SIZE_TOLERANCE)) cur.l.push(x);
        else { cur = { k: "s" + x.a.plot, anchor: x.a.plot, l: [x] }; out.push(cur); }
      });
    }
    var none = inType.filter(function (x) { return !x.a.plot; });
    if (none.length) out.push({ k: "none", l: none });
    out.forEach(function (g) {
      g.l.sort(function (x, y) { return (x.price ? 0 : 1) - (y.price ? 0 : 1) || x.price - y.price; });
    });
    return out;
  }
  function sizeText(g) {
    if (g.k === "none") return "Plot size not stated";
    var s = g.l.map(function (x) { return x.a.plot; }), lo = Math.min.apply(null, s), hi = Math.max.apply(null, s);
    return (lo === hi ? inr(lo) : inr(lo) + "–" + inr(hi)) + " sq yd" + (state.tab === "pl" ? "" : " plot");
  }
  function cardHead(g) {
    var uc = g.l.filter(function (x) { return x.a.uc; }).length;
    var blocks = g.l.map(function (x) { return x.a.block; }).filter(function (b, i, l) { return b && l.indexOf(b) === i; }).sort();
    var note = uc ? uc + " under construction" : blocks.length ? "Block " + blocks.join(", ") : "";
    var kind = state.tab === "pl" ? "Plot" : state.tab === "vi" ? "Villa" : state.tab.slice(1) + " BHK";
    return '<p class="vvd-size"><span class="vvd-sz">' + esc(sizeText(g)) + '</span><span class="vvd-bhk">' + esc(kind) + '</span>' +
      '<span class="vvd-note">' + (note ? esc(note) : "&nbsp;") + '</span></p>';
  }
  var FLOOR_ORDER = ["Upper ground", "Ground", "1st", "2nd", "3rd", "4th", "Middle", "Top"];
  // short enough for the card's one line: up to 3 levels by name, more as a count
  function floorsOf(l) {
    var seen = [];
    l.forEach(function (x) { (x.a.floors || []).forEach(function (f) { if (seen.indexOf(f) < 0) seen.push(f); }); });
    seen.sort(function (x, y) { return FLOOR_ORDER.indexOf(x) - FLOOR_ORDER.indexOf(y); });
    return seen.length > 3 ? seen.length + " floor levels" : seen.join(", ");
  }
  function card(g) {
    var lease = state.type === "Lease", n = g.l.length, on = state.open === g.k;
    var prices = g.l.map(function (x) { return x.price; }).filter(Boolean);
    var avg = prices.length ? prices.reduce(function (t, p) { return t + p; }, 0) / prices.length : 0;
    var extra;
    if (state.tab === "pl") {
      var r = g.l.map(function (x) { return x.rate; }).filter(Boolean);
      extra = r.length ? '<span>Avg. rate per sq yd</span><b>₹' + (r.reduce(function (t, v) { return t + v; }, 0) / r.length).toFixed(2) + ' L</b>' : "&nbsp;";
    } else {
      var f = floorsOf(g.l);
      extra = f ? '<span>Floors</span><b>' + esc(f) + '</b>' : "&nbsp;";
    }
    var rg = range(g.l);
    return '<article class="vvd-card' + (on ? " on" : "") + '">' + cardHead(g) +
      '<p class="vvd-range' + rangeClass(rg) + '">' + rg + '</p>' +
      '<p class="vvd-typ"><span>' + (lease ? "Average rent/month" : "Average price") + '</span><b>' +
        (!avg ? "On request" : lease ? "₹" + inr(avg) : cr(avg)) + '</b></p>' +
      '<p class="vvd-psf">' + extra + '</p>' +
      '<p class="vvd-count">' + n + " " + noun(state.tab, n) + ' available</p>' +
      '<button type="button" class="vvd-view" data-layout="' + esc(g.k) + '" aria-expanded="' + on + '">' +
        (on ? "Hide " + noun(state.tab, 2) : "View " + (n === 1 ? noun(state.tab, 1) : n + " " + noun(state.tab, n))) + '</button></article>';
  }
  function desc(x) {
    var a = x.a, parts = [];
    if (a.block) parts.push("Block " + a.block);
    if (a.plot) parts.push(inr(a.plot) + " sq yd");
    if (a.kind !== "Plot") { var f = a.floors || []; parts.push(f.length ? f.join(", ") + (f.length === 1 ? " floor" : " floors") : "Floor on request"); }
    return parts.join(" · ");
  }
  function tags(x) {
    var a = x.a;
    return [a.uc && "Under construction", a.terrace && "Terrace / roof rights", a.basement && "Basement share", a.stilt && "Stilt parking",
      a.lift && "Lift", a.area && inr(a.area) + " sq ft", a.furnishing].filter(Boolean).slice(0, 3).join(" · ");
  }
  function row(x) {
    return '<div class="vvd-row">' +
      '<div class="vvd-p"><b>' + money(x) + '</b>' + (x.rate ? '<em class="vvd-psf">₹' + x.rate.toFixed(2) + ' L per sq yd</em>' : "") + '<span>Ref. ' + esc(x.id) + '</span></div>' +
      '<div class="vvd-a">' + esc(desc(x)) + '</div>' +
      '<div class="vvd-d">' + esc(tags(x)) + '</div>' +
      '<div class="vvd-t">' + dateLabel(x.a.seen) + '</div>' +
      '<div class="vvd-e"><button type="button" class="vvi-btn" data-enq="' + esc(x.id) + '">Enquire</button></div></div>';
  }
  function tabsHtml() {
    var counts = {};
    ADS.forEach(function (x) { if (x.type === state.type) counts[x.tab] = (counts[x.tab] || 0) + 1; });
    var tabs = Object.keys(counts).sort(function (x, y) { return tabOrder(x) - tabOrder(y); });
    if (!tabs.length) { state.tab = null; return ""; }
    if (tabs.indexOf(state.tab) < 0) { state.tab = tabs.indexOf("f3") >= 0 ? "f3" : tabs[0]; state.open = null; }
    return '<div class="vvd-tabs" role="tablist" aria-label="Choose type">' + tabs.map(function (k) {
      var on = k === state.tab;
      return '<button type="button" role="tab" aria-selected="' + on + '" class="vvd-tab' + (on ? " on" : "") + '" data-adtab="' + k + '">' +
        tabLabel(k) + '<span>' + counts[k] + '</span></button>';
    }).join("") + '</div>';
  }
  function adsHtml() {
    var gs = groups();
    if (!gs.length) return '<p class="vvi-mut vvi-empty">No listings for this choice right now. Share your requirement below and we will check live options.</p>';
    var slide = gs.length > 4, open = gs.filter(function (g) { return g.k === state.open; })[0];
    var html = (slide ? '<div class="vvd-slider"><button type="button" class="vvd-nav prev" data-slide="-1" aria-label="Previous">&#8249;</button>' : '') +
      '<div class="vvd-cards' + (slide ? ' slide' : '') + '">' + gs.map(card).join("") + '</div>' +
      (slide ? '<button type="button" class="vvd-nav next" data-slide="1" aria-label="More">&#8250;</button></div>' : '');
    if (open) {
      html += '<section class="vvd-panel" aria-label="Listings in this group">' +
        '<div class="vvd-panel-head"><div><h4>' + esc(tabLabel(state.tab)) + ' · ' + esc(sizeText(open)) + '</h4>' +
        '<p>' + open.l.length + " " + noun(state.tab, open.l.length) + ', lowest price first · photos and video on request</p></div>' +
        '<button type="button" class="vvd-close" data-layout="' + esc(open.k) + '" aria-label="Close list">×</button></div>' +
        '<div class="vvd-list">' + open.l.map(row).join("") + '</div></section>';
    }
    return html;
  }
  function shell() {
    mount.innerHTML =
      '<div class="vvi-tabs" id="vvi-type"><button class="vvi-pill on" data-t="Sale">Buy</button><button class="vvi-pill" data-t="Lease">Rent</button></div>' +
      '<div id="vvi-bhktabs"></div>' +
      '<section class="vvs vvs-ver" aria-labelledby="vvs-ver-h">' +
        '<div class="vvs-head"><span class="vvs-tag"><span class="vvs-dot">✓</span>Checked by our team · real photos</span>' +
        '<h3 class="vvs-title" id="vvs-ver-h">Verified by Family&amp;Flats</h3></div>' +
        '<div id="vvi-ver"><p class="vvi-mut">No verified homes in ' + esc(PROJECT) + ' yet. Share your requirement below and we will check live options.</p></div></section>' +
      '<section class="vvs vvs-ads" aria-labelledby="vvs-ads-h">' +
        '<div class="vvs-head"><span class="vvs-tag"><span class="vvs-dot">i</span>Listed by agents · confirmed by us before your visit</span>' +
        '<h3 class="vvs-title" id="vvs-ads-h">From the market</h3></div>' +
        '<div id="vvi-ads"></div></section>';
  }
  function fitRanges() {
    var els = mount.querySelectorAll(".vvd-range");
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; el.style.fontSize = "";
      var size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth + 1 && size > 12) { size -= 1; el.style.fontSize = size + "px"; }
    }
  }
  function arrows() {
    var t = mount.querySelector(".vvd-cards.slide");
    if (!t) return;
    var p = mount.querySelector(".vvd-nav.prev"), n = mount.querySelector(".vvd-nav.next");
    if (p) p.disabled = t.scrollLeft <= 2;
    if (n) n.disabled = t.scrollLeft >= t.scrollWidth - t.clientWidth - 2;
  }
  function draw() {
    document.getElementById("vvi-bhktabs").innerHTML = tabsHtml();
    document.getElementById("vvi-ads").innerHTML = adsHtml();
    fitRanges();
    var t = mount.querySelector(".vvd-cards.slide");
    if (t) { t.addEventListener("scroll", arrows, { passive: true }); arrows(); }
  }
  function setType(type) {
    if (type !== "Sale" && type !== "Lease") return;
    state.type = type; state.open = null;
    Array.prototype.forEach.call(mount.querySelectorAll("#vvi-type .vvi-pill"), function (p) { p.classList.toggle("on", p.dataset.t === type); });
    draw();
  }
  function enquire(id) {
    var x = ADS.filter(function (d) { return d.id === id; })[0];
    if (!x) return;
    var label = (x.a.kind === "Plot" ? "Plot" : x.a.kind === "Villa" ? "Villa" : (x.a.bhk ? x.a.bhk + " BHK " : "") + "independent floor");
    if (window.FFVVEnquiry) window.FFVVEnquiry.setRef(id, { useForm: true, type: x.type });
    var cfg = document.getElementById("vv-config"), note = document.getElementById("vv-note");
    var want = x.a.kind === "Plot" ? "Plot" : x.a.kind === "Villa" ? "Villa" : x.a.bhk + " BHK floor";
    if (cfg) Array.prototype.forEach.call(cfg.options, function (o) { if (o.text === want) cfg.value = o.value || o.text; });
    if (note && !note.value.trim()) note.value = label + ", " + desc(x) + ", " + money(x) + ". Please confirm availability and price.";
  }
  mount.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.t) { setType(t.dataset.t); return; }
    if (t.dataset.adtab) { state.tab = t.dataset.adtab; state.open = null; draw(); return; }
    if (t.dataset.slide) {
      var track = mount.querySelector(".vvd-cards.slide"), c = track && track.querySelector(".vvd-card");
      if (track && c) track.scrollBy({ left: (+t.dataset.slide) * (c.getBoundingClientRect().width + 16), behavior: "smooth" });
      setTimeout(arrows, 500); return;
    }
    if (t.dataset.layout) {
      state.open = state.open === t.dataset.layout ? null : t.dataset.layout; draw();
      var panel = mount.querySelector(".vvd-panel");
      if (panel && panel.getBoundingClientRect().top > window.innerHeight - 120) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    if (t.dataset.enq) enquire(t.dataset.enq);
  });
  window.addEventListener("resize", fitRanges);
  // the hero's Buy / Rent choice drives this section too
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#pjb-ask [data-type]");
    if (b) setType(b.getAttribute("data-type") === "LEASE" ? "Lease" : "Sale");
  });
  window.FFVVInventory = { setType: setType, getType: function () { return state.type; } };
  shell();
  draw();
})();
