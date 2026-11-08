(function () {
  "use strict";
  var SLUG = "ireovictoryvalley", WA = "919899273673", PROJECT = "IREO Victory Valley";
  var mount = document.getElementById("vv-inventory");
  if (!mount) return;

  // Verified flats: hand-maintained listings.js plus flats published from the dashboard's Listing OS
  // (verified-listings.js). Same id appearing in both: the dashboard version wins.
  var verified = (function () {
    var byId = {};
    (window.FF_LISTINGS || []).concat(window.FF_VERIFIED_LISTINGS || []).forEach(function (i) {
      if (i.projectSlug === SLUG && /verified/i.test(i.status || "")) byId[i.id] = i;
    });
    return Object.keys(byId).map(function (k) { return byId[k]; });
  })();
  var ads = (window.FF_AGENT_ADS || []).filter(function (a) { return a.projectSlug === SLUG; });
  var state = { type: "Sale", bhk: "", days: 0, sort: "bhk", open: {}, adTab: null, openLayout: null };   // default: 2 BHK first, then 3 BHK...   // days 0 = any time (ads never expire)

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // "P" = penthouses only. A BHK choice shows every flat of that BHK, penthouses included (listed last).
  function isPent(x) { return (x.tags || []).indexOf("Penthouse") >= 0 || /penthouse/i.test(x.unit || x.title || ""); }
  function bhkMatch(x, b) { return !state.bhk || (state.bhk === "P" ? isPent(x) : b === +state.bhk); }
  function bhkNum(s) { var m = String(s || "").match(/(\d)/); return m ? +m[1] : 0; }
  function sizeNum(s) { var m = String(s || "").replace(/,/g, "").match(/(\d+)/); return m ? +m[1] : 0; }
  function priceNum(s) {
    var t = String(s || "").toLowerCase().replace(/,/g, ""), m = t.match(/([\d.]+)\s*cr/);
    if (m) return parseFloat(m[1]) * 1e7;
    m = t.match(/([\d.]+)\s*l(?:ac|akh)?\b/); if (m) return parseFloat(m[1]) * 1e5;
    m = t.match(/([\d.]+)\s*k\b/); if (m) return parseFloat(m[1]) * 1e3;
    m = t.match(/(\d{4,})/); return m ? +m[1] : 0;
  }
  function money(type, n) {
    return type === "Lease" ? "\u20B9" + Math.round(n).toLocaleString("en-IN") + "/mo" : "\u20B9" + (n / 1e7).toFixed(2) + " Cr";
  }
  // price per sq. ft. (sale) or per sq. ft. per month (rent); approx = size is the layout's, not the ad's
  function psf(type, price, size, approx) {
    if (!price || !size) return "";
    var v = price / size;
    return (approx ? "\u2248 " : "") + (type === "Lease"
      ? "\u20B9" + Math.round(v).toLocaleString("en-IN") + " per sq. ft. / month"
      : "\u20B9" + (Math.round(v / 100) * 100).toLocaleString("en-IN") + " per sq. ft.");
  }
  // a layout label like "2,367\u20132,452 sq. ft." -> its middle size (0 when the label gives no size)
  function layoutMid(label) {
    var n = (String(label || "").match(/\d[\d,]*/g) || []).map(function (x) { return +x.replace(/,/g, ""); }).filter(function (x) { return x >= 500; });
    return n.length ? (Math.min.apply(null, n) + Math.max.apply(null, n)) / 2 : 0;
  }
  function range(list) {
    var p = list.map(function (a) { return a.price; }), lo = Math.min.apply(null, p), hi = Math.max.apply(null, p), t = list[0].type;
    if (lo === hi) return t === "Lease" ? "\u20B9" + lo.toLocaleString("en-IN") + "<small>/mo</small>" : money(t, lo);
    return t === "Lease"
      ? "\u20B9" + lo.toLocaleString("en-IN") + "\u2013" + hi.toLocaleString("en-IN") + "<small>/mo</small>"
      : "\u20B9" + (lo / 1e7).toFixed(2) + "\u2013" + (hi / 1e7).toFixed(2) + " Cr";
  }
  function rangeClass(html) {
    var n = html.replace(/<[^>]+>/g, "").replace(/\/mo$/, "").length;
    return n >= 18 ? " xxlong" : n >= 15 ? " xlong" : n >= 12 ? " long" : "";
  }
  function daysAgo(iso) {
    var d = new Date(iso + "T00:00:00"), n = new Date();
    return Math.max(0, Math.floor((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - d) / 864e5));
  }
  function dateLabel(iso) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  function tags(list) {
    return (list || []).map(function (t) { return '<span class="vvi-tag">' + esc(t) + "</span>"; }).join("");
  }

  function photoCount(i) { return i.photoCount || (i.gallery && i.gallery.length) || (i.image ? 1 : 0); }
  function sizeLabel(i) { var n = sizeNum(i.size); return n ? n.toLocaleString("en-IN") + " sq. ft." : "Size on request"; }
  function vPrice(i) {
    var n = priceNum(i.price);
    return n ? money(i.type, n) : (i.type === "Lease" ? "Rent on request" : "Price on request");
  }
  function vPsf(i) { var s = psf(i.type, priceNum(i.price), sizeNum(i.size)); return s ? '<div class="vvi-psf">' + s + '</div>' : ""; }
  function photoCard(i) {
    var n = photoCount(i);
    return '<article class="vvi-card vvi-vcard">' +
      '<div class="vvi-photo" style="background-image:url(\'' + esc(i.image) + '\')"><span class="vvi-badge ok">Verified</span><span class="vvi-count">' + n + (n === 1 ? ' photo' : ' photos') + '</span></div>' +
      '<div class="vvi-body"><h4>' + bhkNum(i.bhk) + ' BHK \u00B7 ' + sizeLabel(i) + '</h4>' +
      '<div class="vvi-price">' + vPrice(i) + '</div>' + vPsf(i) +
      '<div>' + tags([i.floor, i.furnishing, i.availability].filter(Boolean)) + '</div>' +
      '<div class="vvi-cardbtns">' + (i.detailUrl ? '<a class="vvi-btn dark vvi-view" href="' + esc(i.detailUrl) + '">View flat details</a>' : '') +
      '<button class="vvi-btn" data-enq="' + esc(i.id) + '" data-bhk="' + bhkNum(i.bhk) + '" data-type="' + esc(i.type) + '">Enquire</button></div></div></article>';
  }
  // Few verified flats: a wide card (photo left, details right) instead of one lonely grid card
  function featureCard(i) {
    var n = photoCount(i);
    return '<article class="vvi-card vvi-feature">' +
      '<div class="vvi-photo" style="background-image:url(\'' + esc(i.image) + '\')"><span class="vvi-badge ok">Verified</span><span class="vvi-count">' + n + (n === 1 ? ' photo' : ' photos') + '</span></div>' +
      '<div class="vvi-body"><p class="vvi-kicker">Checked by Family&amp;Flats \u00B7 real photos</p>' +
      '<h4>' + bhkNum(i.bhk) + ' BHK \u00B7 ' + sizeLabel(i) + '</h4>' +
      '<div class="vvi-price">' + vPrice(i) + '</div>' + vPsf(i) +
      '<div>' + tags([i.floor, i.furnishing, i.availability].filter(Boolean)) + '</div>' +
      '<div class="vvi-feature-actions"><button class="vvi-btn dark" data-enq="' + esc(i.id) + '" data-bhk="' + bhkNum(i.bhk) + '" data-type="' + esc(i.type) + '">Enquire about this flat</button>' +
      '<span class="vvi-mut">Ref. ' + esc(i.id) + '</span></div></div></article>';
  }
  function noPhotoRow(i) {
    return '<div class="vvi-row"><div><span class="vvi-badge ok">Verified</span> <b>' + esc(i.id) + '</b> \u00B7 ' + vPrice(i) + ' \u00B7 ' + sizeLabel(i) + (vPsf(i) ? ' \u00B7 ' + vPsf(i).replace(/<[^>]+>/g, "") : "") + '<br>' +
      tags([i.floor, i.furnishing].filter(Boolean)) + '<span class="vvi-tag">Photos on request</span></div>' +
      '<div class="vvi-actions"><button class="vvi-btn" data-photos="' + esc(i.id) + '" data-bhk="' + bhkNum(i.bhk) + '" data-type="' + esc(i.type) + '">Request photos</button>' +
      '<button class="vvi-btn" data-enq="' + esc(i.id) + '" data-bhk="' + bhkNum(i.bhk) + '" data-type="' + esc(i.type) + '">Enquire</button></div></div>';
  }
  // button to the static SEO page for a BHK tab ("P" = penthouses), when generate-bhk-pages.js has built one
  function pageSlug(tab) {
    var slug = (tab === "P" ? "penthouse" : tab + "-bhk") + "-for-" + (state.type === "Lease" ? "rent" : "sale");
    return (window.FF_VV_PAGES || []).indexOf(slug) < 0 ? "" : slug;
  }
  function pageLink(tab) {
    var slug = pageSlug(tab);
    if (!slug) return "";
    return '<a class="vvd-all" href="/projects/ireo-victory-valley/' + slug + '/">See all ' +
      (tab === "P" ? "penthouses" : tab + " BHK flats") + ' for ' + (state.type === "Lease" ? "rent" : "sale") +
      ' on one page <span class="vvd-arrow" aria-hidden="true">\u2192</span></a>';
  }
  function verTab(i) { return isPent(i) ? "P" : String(bhkNum(i.bhk)); }
  function verifiedList() {
    return verified.filter(function (i) { return i.type === state.type; });
  }
  function verifiedHtml() {
    var list = verifiedList().filter(function (i) { return verTab(i) === state.adTab; });
    if (!list.length) return '<p class="vvi-mut">No verified ' + tabLabel(state.adTab) + ' flats right now. Share your requirement below and we will check live options.</p>';
    var withPhoto = list.filter(function (i) { return i.image; }).sort(function (x, y) { return photoCount(y) - photoCount(x); });
    var noPhoto = list.filter(function (i) { return !i.image; });
    return (withPhoto.length ? '<div class="vvi-grid vvi-vgrid">' + withPhoto.map(photoCard).join("") + "</div>" : "") +
      (noPhoto.length ? '<div class="vvi-card vvi-rows">' + noPhoto.map(noPhotoRow).join("") + "</div>" : "");
  }

  // Ads of the same type + BHK whose sizes are within ~2% of each other describe the same kind of unit
  // (agents quote 2,440 / 2,450 or 2,495 / 2,500 for it), so they share one card. Ads without a size
  // get their own "Size not stated" card.
  var SIZE_TOLERANCE = 0.05;   // fallback only: ads without a founder-defined layout
  function clusterBySize(list) {
    var sized = list.filter(function (a) { return a.size; }).sort(function (x, y) { return x.size - y.size; });
    var out = [], cur = null;
    sized.forEach(function (a) {
      if (cur && a.size <= cur.anchor * (1 + SIZE_TOLERANCE)) cur.ads.push(a);
      else { cur = { anchor: a.size, ads: [a] }; out.push(cur); }
    });
    var unsized = list.filter(function (a) { return !a.size; });
    if (unsized.length) out.push({ anchor: 0, ads: unsized });
    return out;
  }
  function sizeTitle(ads, pent) {
    if (ads[0] && ads[0].unit) return ads[0].unit.replace(/~\s*/g, "");
    if (pent) return "Penthouse \u00B7 size not stated";                    // founder layout, e.g. "2,367–2,485 sq. ft."
    var s = ads.map(function (a) { return a.size; }).filter(Boolean);
    if (!s.length) return "Size not stated";
    var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s);
    if (lo === hi) return lo.toLocaleString("en-IN") + " sq. ft.";
    var mid = s.slice().sort(function (x, y) { return x - y; })[Math.floor(s.length / 2)];
    return lo.toLocaleString("en-IN") + "\u2013" + hi.toLocaleString("en-IN") + " sq. ft.";
  }
  function agentCount(ads) {
    var seen = {};
    ads.forEach(function (a) { (a.agents || [a.agent || a.id]).forEach(function (k) { seen[k] = 1; }); });   // anonymous labels A1, A2...
    return Object.keys(seen).length;
  }
  function countLabel(ads) {
    var n = ads.length, g = agentCount(ads);
    // one record = one flat (the same flat posted by several agents counts once)
    return n + (n > 1 ? " flats" : " flat") + " \u00B7 advertised by " + g + (g > 1 ? " agents" : " agent");
  }

  // One ad per row, in aligned columns: Ref. | Price | Area | Agents | Details | Advertised | Enquire.
  function adHead() {
    return '<div class="vvi-ad vvi-ad-head" aria-hidden="true"><span>Ref.</span><span>Price</span><span>Area</span><span>Agents</span>' +
      '<span>Details</span><span>Advertised</span><span></span></div>';
  }
  function adRow(a) {
    var n = (a.agents && a.agents.length) || 1;
    return '<div class="vvi-ad">' +
      '<span class="vvi-c-id" data-l="Ref."><b>' + esc(a.id) + '</b>' + (a.photos ? ' <span class="vvi-badge">' + a.photos + ' photos</span>' : "") + '</span>' +
      '<span class="vvi-c-price" data-l="Price"><b>' + money(a.type, a.price) + '</b>' + (psf(a.type, a.price, a.size) ? '<span class="vvi-psf">' + psf(a.type, a.price, a.size) + '</span>' : "") + (a.reduced ? '<span class="vvi-tag vvi-reduced">Price reduced</span>' : "") + '</span>' +
      '<span class="vvi-c-num" data-l="Area">' + (a.size ? a.size.toLocaleString("en-IN") + ' sq. ft.' : '<span class="vvi-mut">Not stated</span>') + '</span>' +
      '<span class="vvi-c-num" data-l="Agents">' + n + (n > 1 ? " agents" : " agent") + '</span>' +
      '<span class="vvi-c-tags">' + (a.tags && a.tags.length ? tags(a.tags) : '<span class="vvi-mut">No further details</span>') + '</span>' +
      '<span class="vvi-c-date" data-l="Advertised">' + dateLabel(a.advertisedOn) + '</span>' +
      '<span class="vvi-c-act"><button class="vvi-btn" data-enq="' + esc(a.id) + '" data-bhk="' + a.bhk + '" data-type="' + esc(a.type) + '">Enquire</button></span></div>';
  }
  // Agent ads, summary first: BHK tabs -> one card per layout -> the flats of a layout only when asked.
  function adGroups() {
    var byBhk = {}, groups = [];
    ads.forEach(function (a) {
      if (a.type !== state.type) return;
      a._age = daysAgo(a.advertisedOn);
      (byBhk[a.bhk] = byBhk[a.bhk] || []).push(a);
    });
    Object.keys(byBhk).forEach(function (b) {
      // ads stamped with a founder layout group by it; the rest fall back to ~5% size clusters
      var byUnit = {}, rest = [];
      byBhk[b].forEach(function (a) {
        var u = a.unit || (isPent(a) ? "Penthouse · size not stated" : "");
        if (u) (byUnit[u] = byUnit[u] || []).push(a); else rest.push(a);
      });
      Object.keys(byUnit).map(function (u) { return { anchor: "u:" + u, ads: byUnit[u] }; }).concat(clusterBySize(rest)).forEach(function (c) {
        var l = c.ads.slice().sort(function (x, y) { return x.price - y.price || x._age - y._age; });
        var sizes = l.map(function (a) { return a.size || 0; }).filter(Boolean);
        var um = /([\d,]{3,})/.exec(l[0].unit || "");
        var pent = l.every(isPent);
        groups.push({ k: state.type + "|" + b + "|" + (c.anchor || 0), l: l, pent: pent, bhk: +b, tab: pent ? "P" : String(b),
          area: um ? +um[1].replace(/,/g, "") : sizes.length ? Math.min.apply(null, sizes) : 1e9 });
      });
    });
    return groups.sort(function (x, y) { return x.bhk - y.bhk || x.area - y.area; });
  }
  var TAB_ORDER = ["1", "2", "3", "4", "5", "6", "P"];
  function tabLabel(k) { return k === "P" ? "Penthouses" : k + " BHK"; }
  function layoutName(g) {
    var t = sizeTitle(g.l, g.pent).replace(/^Penthouse\s*(·\s*)?/, "");
    return (g.pent ? g.bhk + " BHK · " : "") + (t || "Size not stated");
  }
  // card head, always three lines: size / BHK / note (blank when there is none), so prices line up across cards
  function cardHead(g) {
    var t = sizeTitle(g.l, g.pent).replace(/~\s*/g, "").replace(/^Penthouse\s*(\u00B7\s*)?/, "") || "Size not stated";
    var m = /^(.*?sq\. ft\.)\s*(.*)$/.exec(t);
    var size = m ? m[1] : t, note = m ? m[2] : "";
    return '<p class="vvd-size"><span class="vvd-sz">' + esc(size) + '</span><span class="vvd-bhk">' + g.bhk + ' BHK</span>' +
      '<span class="vvd-note">' + (note ? esc(note) : "&nbsp;") + '</span></p>';
  }
  // Shared BHK tabs (under Sale/Lease): one choice drives both the Verified and the Agent-advertised section
  function tabsHtml() {
    var groups = adGroups(), counts = {};
    groups.forEach(function (g) { counts[g.tab] = (counts[g.tab] || 0) + g.l.length; });
    verifiedList().forEach(function (i) { var k = verTab(i); counts[k] = (counts[k] || 0) + 1; });
    var tabs = Object.keys(counts).sort(function (x, y) { return TAB_ORDER.indexOf(x) - TAB_ORDER.indexOf(y); });
    if (!tabs.length) { state.adTab = null; return ""; }
    if (tabs.indexOf(state.adTab) < 0) { state.adTab = tabs[0]; state.openLayout = null; }
    return '<div class="vvd-tabs" role="tablist" aria-label="Choose configuration">' + tabs.map(function (k) {
      var on = k === state.adTab;
      return '<button type="button" role="tab" aria-selected="' + on + '" class="vvd-tab' + (on ? " on" : "") + '" data-adtab="' + k + '">' +
        tabLabel(k) + '<span>' + counts[k] + '</span></button>';
    }).join("") + '</div>';
  }
  function adsHtml() {
    var groups = adGroups();
    var inTab = groups.filter(function (g) { return g.tab === state.adTab; });
    if (!inTab.length) return '<p class="vvi-mut vvi-empty">No advertisements for this selection right now. Share your requirement below and we will check live options.</p>' + (state.adTab ? pageLink(state.adTab) : "");
    var open = inTab.filter(function (g) { return g.k === state.openLayout; })[0];
    var html = "";

    var slide = inTab.length > 4;   // more than 4 layouts: show 4 and slide for the rest
    html += (slide ? '<div class="vvd-slider"><button type="button" class="vvd-nav prev" data-slide="-1" aria-label="Previous layouts">&#8249;</button>' : '') +
      '<div class="vvd-cards' + (slide ? ' slide' : '') + '">' + inTab.map(function (g) {
      var prices = g.l.map(function (a) { return a.price; });
      var average = prices.reduce(function (t, p) { return t + p; }, 0) / prices.length;
      var sz = g.l.map(function (a) { return a.size; }).filter(Boolean), base = 0;
      if (sz.length) base = sz.reduce(function (t, x) { return t + x; }, 0) / sz.length; else base = layoutMid(g.l[0].unit);
      var lease = g.l[0].type === "Lease";
      var avgVal = lease ? "\u20B9" + Math.round(average).toLocaleString("en-IN") : money("Sale", average);
      var psfVal = base ? "\u20B9" + (lease ? Math.round(average / base) : Math.round(average / base / 100) * 100).toLocaleString("en-IN") : "";
      var on = open && open.k === g.k, n = g.l.length;
      return '<article class="vvd-card' + (on ? " on" : "") + '">' +
        cardHead(g) +
        '<p class="vvd-range' + rangeClass(range(g.l)) + '">' + range(g.l) + '</p>' +
        '<p class="vvd-typ"><span>' + (lease ? "Average rent/month" : "Average price") + '</span><b>' + avgVal + '</b></p>' +
        '<p class="vvd-psf">' + (psfVal ? '<span>' + (lease ? "Avg. rent per sq. ft./mo" : "Avg. price per sq. ft.") + '</span><b>' + psfVal + '</b>' : "&nbsp;") + '</p>' +
        '<p class="vvd-count">' + n + (n === 1 ? " flat" : " flats") + ' available</p>' +
        (pageSlug(state.adTab)
          ? '<a class="vvd-view" href="/projects/ireo-victory-valley/' + pageSlug(state.adTab) + '/" target="_blank" rel="noopener" aria-label="View ' + (n === 1 ? "flat" : n + " flats") + ' \u2013 opens all ' + tabLabel(state.adTab).toLowerCase() + ' flats for ' + (state.type === "Lease" ? "rent" : "sale") + ' in a new tab">View ' + (n === 1 ? "flat" : n + " flats") + '</a>'
          : '<button type="button" class="vvd-view" data-layout="' + esc(g.k) + '" aria-expanded="' + !!on + '">' +
            (on ? "Hide flats" : "View " + (n === 1 ? "flat" : n + " flats")) + '</button>') +
        '</article>';
    }).join("") + '</div>' + (slide ? '<button type="button" class="vvd-nav next" data-slide="1" aria-label="More layouts">&#8250;</button></div>' : '');

    if (open) {
      html += '<section class="vvd-panel" aria-label="Flats in this layout">' +
        '<div class="vvd-panel-head"><div><h4>' + (open.pent ? "" : open.bhk + " BHK · ") + esc(layoutName(open)) + '</h4>' +
        '<p>' + open.l.length + (open.l.length === 1 ? " flat" : " flats") + ', lowest price first · photos and video of any flat on request</p></div>' +
        '<button type="button" class="vvd-close" data-layout="' + esc(open.k) + '" aria-label="Close list">×</button></div>' +
        '<div class="vvd-list">' + open.l.map(function (a) { return flatLine(a, layoutMid(open.l[0].unit)); }).join("") + '</div></section>';
    }
    html += pageLink(state.adTab);
    return html;
  }
  function flatLine(a, mid) {
    var sq = a.size ? psf(a.type, a.price, a.size) : psf(a.type, a.price, mid, true);
    var details = (a.reduced ? ["Price reduced"] : []).concat(a.tags || []).slice(0, 3).join(" · ");
    return '<div class="vvd-row">' +
      '<div class="vvd-p"><b>' + money(a.type, a.price) + '</b>' + (sq ? '<em class="vvd-psf">' + sq + '</em>' : "") + '<span>Ref. ' + esc(a.id) + '</span></div>' +
      '<div class="vvd-a">' + (a.size ? a.size.toLocaleString("en-IN") + " sq ft" : '<span class="vvi-mut">Size not stated</span>') + '</div>' +
      '<div class="vvd-d">' + esc(details) + '</div>' +
      '<div class="vvd-t">' + dateLabel(a.advertisedOn) + '</div>' +
      '<div class="vvd-e"><button type="button" class="vvi-btn" data-enq="' + esc(a.id) + '" data-bhk="' + a.bhk + '" data-type="' + esc(a.type) + '">Enquire</button></div>' +
      '</div>';
  }
  function isoMinus(d) {
    var x = new Date(); x.setDate(x.getDate() - d);
    return x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2) + "-" + ("0" + x.getDate()).slice(-2);
  }

  function shell() {
    mount.innerHTML =
      '<div class="vvi-tabs" id="vvi-type"><button class="vvi-pill on" data-t="Sale">Sale</button><button class="vvi-pill" data-t="Lease">Lease</button></div>' +
      '<div id="vvi-bhktabs"></div>' +
      '<div id="vvi-toplink" class="vvi-toplink"></div>' +
      '<section class="vvs vvs-ver" aria-labelledby="vvs-ver-h">' +
        '<div class="vvs-head"><span class="vvs-tag"><span class="vvs-dot">✓</span>Checked by our team · real photos</span>' +
        '<h3 class="vvs-title" id="vvs-ver-h">Verified by Family&amp;Flats</h3>' +
        '</div>' +
        '<div id="vvi-ver"></div></section>' +
      '<section class="vvs vvs-ads" aria-labelledby="vvs-ads-h">' +
        '<div class="vvs-head"><span class="vvs-tag"><span class="vvs-dot">i</span>From the market</span>' +
        '<h3 class="vvs-title" id="vvs-ads-h">Agent-advertised</h3>' +
        '</div>' +
        '<div id="vvi-ads"></div></section>';
  }
  // a price range may never cross its card: shrink the figure one pixel at a time until it fits (never below 12px)
  function fitRanges() {
    var els = document.querySelectorAll("#vvi-ads .vvd-range");
    for (var i = 0; i < els.length; i++) {
      var el = els[i], size = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = "";
      size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth + 1 && size > 12) { size -= 1; el.style.fontSize = size + "px"; }
    }
  }
  window.addEventListener("resize", function () { fitRanges(); });
  function draw() {
    var old = document.querySelector("#vvi-ads .vvd-cards.slide"), keepX = old ? old.scrollLeft : 0, keepTab = state._slideTab;
    document.getElementById("vvi-bhktabs").innerHTML = tabsHtml();
    // same "see all on one page" button as below the ads, repeated right under the BHK tabs so it is seen first
    document.getElementById("vvi-toplink").innerHTML = state.adTab ? pageLink(state.adTab) : "";
    document.getElementById("vvi-ver").innerHTML = verifiedHtml();
    document.getElementById("vvi-ads").innerHTML = adsHtml();
    fitRanges();
    var track = document.querySelector("#vvi-ads .vvd-cards.slide");
    if (track) {
      if (keepTab === state.adTab + state.type) track.scrollLeft = keepX;
      state._slideTab = state.adTab + state.type;
      track.addEventListener("scroll", sliderArrows, { passive: true });
      sliderArrows();
    }
  }
  function sliderArrows() {
    var track = document.querySelector("#vvi-ads .vvd-cards.slide");
    if (!track) return;
    var max = track.scrollWidth - track.clientWidth - 2;
    var prev = document.querySelector("#vvi-ads .vvd-nav.prev"), next = document.querySelector("#vvi-ads .vvd-nav.next");
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max;
  }

  function enquire(ref, bhk, type, note, kind) {
    if (window.FFVVEnquiry) { window.FFVVEnquiry.setRef(ref, { bhk: bhk, type: type, kind: kind || "enquiry" }); return; }
    var f = document.getElementById("vv-enquiry");
    if (f && f.elements && f.elements.message) {
      if (f.elements.project) f.elements.project.value = PROJECT;
      if (f.elements.configuration && bhk) f.elements.configuration.value = bhk + " BHK";
      if (f.elements.transactionType) f.elements.transactionType.value = type === "Lease" ? "LEASE" : "BUY";
      f.elements.message.value = note;
      f.scrollIntoView({ behavior: "smooth", block: "center" });
      if (f.elements.name) setTimeout(function () { f.elements.name.focus({ preventScroll: true }); }, 600);
    } else {
      window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent("Hi Family&Flats, " + note), "_blank", "noopener");
    }
  }

  mount.addEventListener("click", function (e) {
    var t = e.target.closest("button,.vvi-head");
    if (!t) return;
    if (t.dataset.slide) {
      var track = document.querySelector("#vvi-ads .vvd-cards.slide"), card = track && track.querySelector(".vvd-card");
      if (track && card) track.scrollBy({ left: (+t.dataset.slide) * (card.getBoundingClientRect().width + 16), behavior: "smooth" }); setTimeout(sliderArrows, 500);
      return;
    }
    if (t.dataset.adtab) { state.adTab = t.dataset.adtab; state.openLayout = null; draw(); return; }
    if (t.dataset.layout) {
      state.openLayout = state.openLayout === t.dataset.layout ? null : t.dataset.layout;
      draw();
      var panel = document.querySelector("#vvi-ads .vvd-panel");
      if (panel && panel.getBoundingClientRect().top > window.innerHeight - 120) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    if (t.dataset.nav) {                       // slider arrows: one screen of tiles at a time
      var track = t.parentNode.querySelector(".vvt-track");
      track.scrollBy({ left: (+t.dataset.nav) * track.clientWidth, behavior: "smooth" });
      return;
    }
    if (t.dataset.t) {
      state.type = t.dataset.t;
      Array.prototype.forEach.call(document.querySelectorAll("#vvi-type .vvi-pill"), function (p) { p.classList.toggle("on", p === t); });
      draw();
    } else if (t.dataset.g) {
      var k = t.dataset.g, cur = state.open[k];
      if (cur === undefined) cur = t.dataset.first === "true";
      state.open[k] = !cur; draw();
    } else if (t.dataset.enq) {
      enquire(t.dataset.enq, t.dataset.bhk, t.dataset.type, "I am interested in " + t.dataset.enq + " (Reference: " + t.dataset.enq + ") at " + PROJECT + ". Please confirm availability and price.");
    } else if (t.dataset.photos) {
      enquire(t.dataset.photos, t.dataset.bhk, t.dataset.type, "Please share photos of " + t.dataset.photos + " (Reference: " + t.dataset.photos + ") at " + PROJECT + ".", "photos");
    }
  });
  mount.addEventListener("change", function (e) {
    if (e.target.id === "vvi-bhk") state.bhk = e.target.value;
    else if (e.target.id === "vvi-days") state.days = +e.target.value;
    else if (e.target.id === "vvi-sort") state.sort = e.target.value;
    else return;
    draw();
  });

  shell();
  draw();
})();
