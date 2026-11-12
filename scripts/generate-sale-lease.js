#!/usr/bin/env node
/* Family&Flats: writes /sale.html and /lease.html (design B) from the site data.
   Run from anywhere:  node scripts/generate-sale-lease.js [--check]
   Reads  assets/data/listings.js, verified-listings.js (our verified homes)
          assets/data/agent-ads.js (IREO Victory Valley agent ads), anant-raj-ads.js (Anant Raj Estate)
          locations/golf-course-extension-road-gurugram/index.html (the list of projects on the road)
   Writes plain HTML that Google and no-JavaScript visitors can read; assets/js/ff-sale-lease.js
   only adds the filters. After running: inject-shell.py --apply (rule 2.9), then the deploy check.
   Ads whose numbers don't add up are held back and listed in the output for checking. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const SITE = "https://familyandflats.com";
const CHECK = process.argv.includes("--check");
const WA = "919899273673";
const CSS_V = "2", JS_V = "1";

function load(files) {
  const ctx = { window: {} };
  for (const f of files) { const p = path.join(ROOT, f); if (fs.existsSync(p)) vm.runInNewContext(fs.readFileSync(p, "utf8"), ctx); }
  return ctx.window;
}
const W = load(["assets/data/listings.js", "assets/data/verified-listings.js", "assets/data/agent-ads.js", "assets/data/anant-raj-ads.js"]);
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtCr = (v) => (v / 1e7).toFixed(2).replace(/\.?0+$/, "");
const fmtRent = (v) => (v >= 1e5 ? (v / 1e5).toFixed(2).replace(/\.?0+$/, "") + " L" : Math.round(v / 1000) + "K");
function priceRange(lo, hi, sale) {
  if (sale) return lo === hi ? `₹${fmtCr(lo)} Cr` : `₹${fmtCr(lo)}–${fmtCr(hi)} Cr`;
  const a = fmtRent(lo), b = fmtRent(hi);
  if (lo === hi) return `₹${a}/month`;
  const sameUnit = a.endsWith(" L") === b.endsWith(" L");
  return `₹${sameUnit ? a.replace(" L", "") : a}–${b}/month`;
}
const toRupees = (s) => { const m = String(s || "").replace(/,/g, "").match(/([\d.]+)\s*(cr|crore|l|lac|lakh|k)?/i); if (!m) return 0;
  const n = parseFloat(m[1]), u = (m[2] || "").toLowerCase(); return u.startsWith("c") ? n * 1e7 : u.startsWith("l") ? n * 1e5 : u === "k" ? n * 1e3 : n; };

// ---------------------------------------------------------------- the homes, one flat list
// Each home: {c: community key, t: "s"|"r", k: kind, b: bhk|null, p: price in rupees|0, z: size text}
const held = [];
const homes = [];
for (const a of W.FF_AGENT_ADS || []) {
  if (a.projectSlug !== "ireovictoryvalley") continue;
  const ph = (a.tags || []).some((t) => /pent/i.test(t));
  homes.push({ id: a.id, c: "vv", t: a.type === "Sale" ? "s" : "r", k: ph ? "Penthouse" : "Flat", b: a.bhk || null, p: a.price || 0, sz: a.size || 0 });
}
for (const a of W.FF_ARE_ADS || []) {
  const t = a.txn === "Sale" ? "s" : "r";
  const p = t === "s" ? (a.cr ? a.cr * 1e7 : 0) : (a.rentL ? a.rentL * 1e5 : 0);
  // Plots: price ÷ size must give a believable rate (₹2–5 L per sq yd); 1 BHK floors on full plots are a known misread.
  if (a.kind === "Plot" && p && a.plot) { const rate = p / 1e5 / a.plot; if (rate < 2 || rate > 5) { held.push(`${a.id} plot ${a.plot} sq yd at ₹${a.cr} Cr (₹${rate.toFixed(2)} L/sq yd)`); continue; } }
  if (a.kind === "Independent floor" && a.bhk === 1) { held.push(`${a.id} "1 BHK" floor${a.plot ? " on " + a.plot + " sq yd" : ""}${a.cr ? " at ₹" + a.cr + " Cr" : ""}`); continue; }
  homes.push({ id: a.id, c: "are", t, k: a.kind, b: a.kind === "Independent floor" ? a.bhk || null : null, p, plot: a.plot || 0, por: !!a.por });
}
const verified = (W.FF_LISTINGS || []).concat(W.FF_VERIFIED_LISTINGS || [])
  .filter((i) => i && /verified/i.test(i.status || "") && i.detailUrl && fs.existsSync(path.join(ROOT, i.detailUrl.replace(/^\//, ""))));

const COMM = {
  vv: { name: "IREO Victory Valley", url: "/projects/ireo-victory-valley/", line: "Sector 67 · high-rise apartments · ready to move",
        img: "/projects/ireovictoryvalley/images/ff-vv-ov-04-800.jpg", slug: "ireo-victory-valley" },
  are: { name: "Anant Raj Estate", url: "/projects/anant-raj-estate/", line: { s: "Sector 63A · independent floors, villas and plots · blocks A–L", r: "Sector 63A · independent floors and villas · blocks A–L" },
         mono: "AR", slug: "anant-raj-estate" },
};

// group label and link for one home
function group(h, sale) {
  if (h.c === "vv") {
    const name = h.k === "Penthouse" ? "Penthouse" : `${h.b} BHK`;
    const dir = h.k === "Penthouse" ? "penthouse" : `${h.b}-bhk`;
    const rel = `projects/ireo-victory-valley/${dir}-for-${sale ? "sale" : "rent"}/index.html`;
    return { key: name, name, order: h.k === "Penthouse" ? 99 : h.b, url: fs.existsSync(path.join(ROOT, rel)) ? "/" + rel.replace("index.html", "") : COMM.vv.url };
  }
  if (h.k === "Independent floor") return { key: h.b ? `${h.b} BHK floor` : "Independent floor", name: h.b ? `${h.b} BHK floor` : "Independent floor", order: h.b || 9, url: COMM.are.url };
  return { key: h.k + "s", name: h.k + "s", order: h.k === "Villa" ? 20 : 30, url: COMM.are.url };
}
function groups(list, sale) {
  const g = new Map();
  for (const h of list) { const x = group(h, sale); if (!g.has(x.key)) g.set(x.key, { ...x, homes: [] }); g.get(x.key).homes.push(h); }
  return [...g.values()].sort((a, b) => a.order - b.order).map((x) => {
    const P = x.homes.map((h) => h.p).filter(Boolean), Z = x.homes.map((h) => h.sz).filter(Boolean), Y = x.homes.map((h) => h.plot).filter(Boolean);
    const por = x.homes.filter((h) => !h.p).length;
    const sub = Z.length ? (Math.min(...Z) === Math.max(...Z) ? `${Math.min(...Z).toLocaleString("en-IN")} sq ft` : `${Math.min(...Z).toLocaleString("en-IN")}–${Math.max(...Z).toLocaleString("en-IN")} sq ft`)
      : Y.length ? (Math.min(...Y) === Math.max(...Y) ? `${Y[0]} sq yd plot` : `${Math.min(...Y)}–${Math.max(...Y)} sq yd plots`) : "Size on request";
    return { ...x, n: x.homes.length, sub, price: P.length ? priceRange(Math.min(...P), Math.max(...P), sale) : "Price on request", note: P.length && por ? `${por} price on request` : "" };
  });
}

// projects on Golf Course Extension Road (from the area page's own list)
function roadProjects() {
  const f = path.join(ROOT, "locations/golf-course-extension-road-gurugram/index.html");
  const s = fs.readFileSync(f, "utf8");
  for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { const j = JSON.parse(m[1]); const g = j["@graph"] || [j];
      const list = g.find((x) => x["@type"] === "ItemList");
      if (list) return list.itemListElement.map((i) => ({ name: i.name, url: i.url.replace(SITE, "") }));
    } catch (e) { /* next block */ }
  }
  return [];
}

// ---------------------------------------------------------------- page
function page(sale) {
  const t = sale ? "s" : "r";
  const mine = verified.filter((v) => (v.type === "Sale") === sale);
  const list = homes.filter((h) => h.t === t);
  const byC = (c) => list.filter((h) => h.c === c);
  const total = mine.length + list.length;
  const file = sale ? "sale.html" : "lease.html";
  const url = `${SITE}/${file}`;
  const word = sale ? "sale" : "rent";
  const title = `Flats & Floors for ${sale ? "Sale" : "Rent"} in Gurugram | Family&Flats`;
  const comms = Object.keys(COMM).filter((c) => byC(c).length);
  const desc = `${total} homes for ${word} on Golf Course Extension Road, Gurugram: ${comms.map((c) => COMM[c].name).join(" and ")}. Verified first, agent listings checked before you visit.`;
  if (desc.length > 160) console.log(`NOTE description is ${desc.length} characters`);
  const withHomes = new Set(comms.map((c) => COMM[c].url));
  const others = roadProjects().filter((p) => !withHomes.has(p.url));

  const vcard = (v) => `<a class="sl-vcard" href="${esc(v.detailUrl)}" data-c="${v.projectSlug === "ireovictoryvalley" ? "ireo-victory-valley" : esc(v.projectSlug)}" data-k="flat" data-b="${parseInt(v.bhk, 10) || ""}" data-ps="${Math.round(toRupees(v.price))}">
<span class="sl-vphoto"><img src="${esc(v.image)}" alt="${esc(v.title)}" width="800" height="600" loading="lazy"><span class="sl-badge">Verified</span>${v.photoCount ? `<span class="sl-count">${v.photoCount} photos</span>` : ""}</span>
<span class="sl-vbody"><span class="sl-vprice">${esc(String(v.price).replace(/^Rs\.?\s*/i, "₹"))}${sale ? "" : ""}</span><span class="sl-vline">${esc(String(v.bhk).replace(/(\d)\s*BHK/i, "$1 BHK"))} · ${esc(String(v.size).replace(/(\d)(\d{3})\b/, "$1,$2").replace(/\s*Sq\.?\s*Ft\.?/i, " sq ft"))}</span>
<span class="sl-vmeta">${esc(v.project)} · ${esc(v.floor)} · ${esc(v.furnishing)}</span><span class="sl-vlink">View flat and photos →</span></span></a>`;
  const verifiedHtml = mine.length
    ? `<div class="sl-vgrid" id="sl-verified">${mine.map(vcard).join("\n")}
<div class="sl-vnext"><p class="sl-eyebrow">Coming next</p><p>New verified homes are being photographed. They appear here first, with real photos and a confirmed price.</p><a class="sl-link" href="#need">Tell us what you need →</a></div></div>`
    : `<div class="sl-empty"><div><p class="sl-empty-t">No verified ${sale ? "homes for sale" : "rentals"} at this moment</p><p>We visit and photograph every home we mark verified. New ones are being photographed now and appear here first. Meanwhile, the homes below are listed by agents, and we confirm each one before your visit.</p></div><a class="sl-btn green" href="#need">Tell us what you need</a></div>`;
  const pc = (x) => `<a class="sl-pc" href="${esc(x.url)}" data-k="${x.homes[0].k === "Penthouse" ? "flat" : x.homes[0].k.toLowerCase().replace(/\s+/g, "-")}" data-b="${x.homes[0].k === "Penthouse" ? "ph" : x.homes[0].b || ""}" data-ps="${x.homes.map((h) => Math.round(h.p)).join(",")}"><span class="sl-pc-name">${esc(x.name)}</span><span class="sl-pc-sub">${esc(x.sub)}</span><span class="sl-pc-price">${esc(x.price)}</span>${x.note ? `<span class="sl-pc-note">${esc(x.note)}</span>` : ""}<span class="sl-pc-n">${x.n} ${x.n === 1 ? "home" : "homes"} →</span></a>`;
  const comm = (c) => { const C = COMM[c], L = byC(c), line = typeof C.line === "string" ? C.line : C.line[t];
    return `<div class="sl-comm" data-c="${C.slug}"><div class="sl-comm-head">${C.img ? `<img src="${C.img}" alt="" width="64" height="64" loading="lazy">` : `<span class="sl-mono" aria-hidden="true">${C.mono}</span>`}<div><h3>${esc(C.name)}</h3><p>${esc(line)}</p></div><a class="sl-link" href="${C.url}" data-all>All ${L.length} ${L.length === 1 ? "home" : "homes"} →</a></div>
<div class="sl-pgrid">${groups(L, sale).map(pc).join("")}</div></div>`; };
  const kinds = [...new Set(list.map((h) => (h.k === "Penthouse" ? "Flat" : h.k)))];
  const budgets = sale ? [["0-30000000", "Up to ₹3 Cr"], ["30000000-50000000", "₹3–5 Cr"], ["50000000-80000000", "₹5–8 Cr"], ["80000000-", "Above ₹8 Cr"]]
    : [["0-75000", "Up to ₹75K"], ["75000-125000", "₹75K–1.25 L"], ["125000-", "Above ₹1.25 L"]];
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": url + "#page", url, name: title.replace(" | Family&Flats", ""), description: desc, isPartOf: { "@type": "WebSite", name: "Family&Flats", url: SITE + "/" } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: sale ? "Buy" : "Rent", item: url }] },
    { "@type": "ItemList", name: `Homes for ${word} in Gurugram`, itemListElement: mine.map((v) => ({ url: SITE + v.detailUrl, name: v.title }))
        .concat(comms.flatMap((c) => groups(byC(c), sale).map((x) => ({ url: SITE + x.url, name: `${x.name} for ${word} in ${COMM[c].name}` }))))
        .filter((x, i, a) => a.findIndex((y) => y.url === x.url && y.name === x.name) === i).map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })) },
  ] };

  return `﻿<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="shortcut icon" type="image/x-icon" href="/assets/logo-new-fav.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
<link rel="stylesheet" href="/assets/css/tokens.css?v=home-v2">
<link rel="stylesheet" href="/assets/css/typography.css?v=home-v2">
<link rel="stylesheet" href="/assets/css/header.css?v=header-standard-20260925a">
<link rel="stylesheet" href="/assets/css/footer.css?v=footer-standard-20260924c">
<link rel="stylesheet" href="/assets/css/ff-sale-lease.css?v=${CSS_V}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Family&amp;Flats">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}${mine[0] ? mine[0].image : "/projects/ireovictoryvalley/images/ff-vv-ov-04.jpg"}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body data-page="${sale ? "sale" : "lease"}">
<!-- Generated by scripts/generate-sale-lease.js; do not edit by hand. -->
<div id="header-placeholder"></div>
<main class="sl" id="main">
<section class="sl-hero"><div class="sl-wrap sl-hero-in">
<div class="sl-hero-copy"><nav class="sl-crumb" aria-label="Breadcrumb"><a href="/">Home</a> / <span>${sale ? "Buy" : "Rent"}</span></nav>
<h1>Homes for ${word} in Gurugram</h1>
<p class="sl-lead">${total} homes for ${word} on Golf Course Extension Road. Our own verified homes come first. The rest are listed by agents, and we check each one before you visit.</p>
<div class="sl-facts"><span><b>${total}</b> homes</span>${mine.length ? `<span><b>${mine.length}</b> verified by us</span>` : ""}<span><b>${comms.length}</b> communities with live prices</span></div></div>
<form class="sl-search" id="sl-filter" action="/${file}" method="get" role="search" aria-label="Filter homes">
<div class="sl-seg"><a href="/sale.html"${sale ? ' class="on" aria-current="page"' : ""}>Buy</a><a href="/lease.html"${sale ? "" : ' class="on" aria-current="page"'}>Rent</a></div>
<label>Project<select name="project"><option value="">All projects</option>${comms.map((c) => `<option value="${COMM[c].slug}">${esc(COMM[c].name)} (${byC(c).length})</option>`).join("")}</select></label>
<div class="sl-row"><label>Home type<select name="type"><option value="">Any</option>${kinds.map((k) => `<option value="${k.toLowerCase().replace(/\s+/g, "-")}">${k === "Flat" ? "Flat / apartment" : k}</option>`).join("")}</select></label>
<label>BHK<select name="bhk"><option value="">Any</option><option value="2bhk">2 BHK</option><option value="3bhk">3 BHK</option><option value="4bhk">4 BHK</option><option value="5bhk">5 BHK +</option><option value="penthouse">Penthouse</option></select></label></div>
<label>Budget<select name="budget"><option value="">Any budget</option>${budgets.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label>
<button class="sl-btn green" type="submit" data-show>Show ${total} homes</button>
<p class="sl-live" aria-live="polite" data-live></p></form>
</div></section>

<section class="sl-sec" id="verified"><div class="sl-wrap"><p class="sl-eyebrow"><span class="sl-tick" aria-hidden="true">✓</span> Checked by our team · real photos</p><h2>Verified by Family&amp;Flats</h2>
${verifiedHtml}</div></section>

<section class="sl-sec soft" id="market"><div class="sl-wrap"><p class="sl-eyebrow grey">Listed by agents · confirmed by us before your visit</p><h2>From the market</h2>
<p class="sl-sub">Asking prices from current listings. Every enquiry comes to Family&amp;Flats.</p>
${comms.map(comm).join("\n")}
<div class="sl-none" data-none hidden><p class="sl-empty-t">No homes match these filters</p><p>Try a wider budget or another BHK, or tell us what you need and we will look for it.</p><button type="button" class="sl-btn ghost-dark" data-reset>Clear filters</button></div>
</div></section>

<section class="sl-sec" id="other-projects"><div class="sl-wrap"><h2>Other projects on Golf Course Extension Road</h2><p class="sl-sub">No live listings on our website yet. We have contacts in these communities: ask, and we check current availability for you.</p>
<div class="sl-chips">${others.map((p) => `<a class="sl-chip" href="${esc(p.url)}">${esc(p.name)}</a>`).join("")}</div>
<p class="sl-more"><a class="sl-link" href="/locations/golf-course-extension-road-gurugram/">All projects on Golf Course Extension Road →</a> <a class="sl-link" href="${sale ? "/lease.html" : "/sale.html"}">Homes for ${sale ? "rent" : "sale"} →</a></p></div></section>

<section class="sl-sec" id="need"><div class="sl-wrap"><div class="sl-cta"><div><p class="sl-eyebrow gold">Can't find it?</p><h2>Tell us the home you want</h2><p>Project, BHK, budget and move-in date. One advisor finds it, checks it and arranges the visit.</p></div>
<div class="sl-ctas"><a class="sl-btn green" href="#requirement-form">Share your requirement</a><a class="sl-btn ghost" href="https://wa.me/${WA}?text=${encodeURIComponent(`Hi Family&Flats, I am looking for a home to ${sale ? "buy" : "rent"} in Gurugram.`)}" rel="noopener">WhatsApp us</a></div></div>
<div class="sl-form"><form id="requirement-form" data-requirement-form>
<input name="name" type="text" placeholder="Your name" required aria-label="Your name">
<input name="phone" type="tel" placeholder="Phone number" required aria-label="Phone number">
<select name="bhk" aria-label="BHK"><option value="">Preferred BHK</option><option>2 BHK</option><option>3 BHK</option><option>4 BHK</option><option>5 BHK</option></select>
<input name="project" type="text" placeholder="Preferred project or area" aria-label="Preferred project or area">
<button type="submit">Send requirement</button></form></div></div></section>
</main>
<div id="footer-placeholder"></div>
<script src="/assets/js/main.js?v=home-v2"></script>
<script src="/assets/js/ff-sale-lease.js?v=${JS_V}" defer></script>
</body>
</html>
`;
}

// keep the prerendered header/footer that inject-shell.py wrote last time, so --check is stable
function keepShell(next, file) {
  if (!fs.existsSync(file)) return next;
  const old = fs.readFileSync(file, "utf8");
  for (const k of ["header", "footer"]) {
    const m = old.match(new RegExp(`<div id="${k}-placeholder"[^>]*>[\\s\\S]*?</div><!--/ff-${k}-->`));
    if (m) next = next.replace(`<div id="${k}-placeholder"></div>`, m[0]);
  }
  return next;
}

let changed = 0;
for (const sale of [true, false]) {
  const file = path.join(ROOT, sale ? "sale.html" : "lease.html");
  const html = keepShell(page(sale), file).replace(/\r?\n/g, "\r\n");
  const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (old !== html) { changed++; if (!CHECK) fs.writeFileSync(file, html); }
  console.log(`${CHECK ? (old === html ? "OK   " : "STALE") : "WROTE"} /${path.basename(file)}`);
}
if (held.length) console.log(`HELD BACK (numbers don't add up; check with the agent): ${held.length}\n  ` + held.join("\n  "));
console.log(`SALE_LEASE_${CHECK ? "CHECK" : "DONE"} changed=${changed}`);
if (CHECK && changed) process.exitCode = 1;
