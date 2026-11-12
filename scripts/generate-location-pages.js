#!/usr/bin/env node
/* Family&Flats: build the Golf Course Extension Road area page from the project pages already on the site.
   Run from public_html after adding or changing a project page:  node scripts/generate-location-pages.js [--check]
   Only facts already published on the site are used (project name, sector, configurations, photo, verified flats).
   Add another road to ROADS once it has enough project pages (8-10) to stand on its own. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const SITE = "https://familyandflats.com";
const PHONE = "919899273673", PHONE_SHOW = "+91 98992 73673";
const check = process.argv.includes("--check");

const ROADS = [{
  slug: "golf-course-extension-road-gurugram",
  name: "Golf Course Extension Road",
  sectors: ["58", "59", "60", "61", "62", "63", "63A", "64", "65", "66", "67"],
  mustMention: /golf course extension/i,
}];
const NOT_PROJECTS = new Set(["emaar-india-developer", "emaar-digi-homes-2bhk-for-sale-gurgaon"]); // a developer guide and a BHK sub-page
const DEVELOPERS = [["M3M", "M3M"], ["Emaar", "Emaar"], ["DLF", "DLF"], ["IREO", "IREO"], ["Mahindra", "Mahindra Lifespaces"], ["Conscient", "Conscient"], ["Pioneer", "Pioneer Urban"], ["Birla", "Birla Estates"], ["TATA", "Tata Housing"], ["Tata", "Tata Housing"], ["Smart World", "Smartworld"], ["TARC", "TARC"], ["Adani", "Adani Realty"], ["Paras", "Paras Buildtech"], ["Puri", "Puri Constructions"], ["Silverglades", "Silverglades"]];

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const unesc = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const sectorKey = (s) => { const m = String(s).match(/(\d+)([A-Z]?)/); return m ? +m[1] * 10 + (m[2] ? 1 : 0) : 9999; };

function redirectedSlugs() {
  const ht = fs.readFileSync(path.join(ROOT, ".htaccess"), "utf8");
  return new Set([...ht.matchAll(/\^projects\/([a-z0-9-]+)(?:\(\/\.\*\)\?|\/\?)\$ \/projects\//g)].map((m) => m[1]));
}

function projects() {
  const skip = redirectedSlugs(), out = [];
  for (const slug of fs.readdirSync(path.join(ROOT, "projects"))) {
    const f = path.join(ROOT, "projects", slug, "index.html");
    if (!fs.existsSync(f) || skip.has(slug) || NOT_PROJECTS.has(slug)) continue;
    const h = fs.readFileSync(f, "utf8");
    if (/name="robots" content="[^"]*noindex/i.test(h)) continue;
    const canon = (h.match(/rel="canonical" href="([^"]+)"/) || [])[1] || "";
    if (canon && !canon.endsWith(`/projects/${slug}/`)) continue;
    const desc = unesc((h.match(/name="description" content="([^"]+)"/) || [])[1]);
    const sector = ((desc.match(/Sector (\d+[A-Z]?)/i) || h.match(/Sector (\d+[A-Z]?)/i) || [])[1] || "").toUpperCase();
    const title = unesc((h.match(/<title>([\s\S]*?)<\/title>/) || [])[1]).split("|")[0].trim();
    const ld = (h.match(/"@type": ?"WebPage", ?"name": ?"([^"]+)"/) || [])[1];
    const name = unesc(ld || title).replace(/ (verified|curated|flats for sale|project guide).*$/i, "").replace(/,? Sector \d+[A-Z]?\b.*$/i, "").trim();
    // Configurations: every BHK size the project's own page mentions (e.g. "2/3/4 BHK", "3 and 4 BHK", "4BHK").
    const nums = new Set();
    // Read only the page body: the site header injected into every page has a "2/3/4/5 BHK" filter.
    const body = h.replace(/<header[\s\S]*?<\/header>/gi, "").replace(/<footer[\s\S]*?<\/footer>/gi, "").replace(/<select[\s\S]*?<\/select>/gi, "");
    for (const m of body.matchAll(/((?:\b[1-6]\s*(?:\/|,|&|and|-)\s*)*[1-6])\s*BHK/gi)) for (const d of m[1].match(/[1-6]/g)) nums.add(+d);
    const list = [...nums].sort();
    const cfg = list.length ? (list.length > 1 ? list.slice(0, -1).join(", ") + " and " + list[list.length - 1] : String(list[0])) + " BHK" : "";
    // Card photo: the page's share image if that file exists, else the first photo of this project the page shows.
    const exists = (u) => u && fs.existsSync(path.join(ROOT, decodeURI(u.split("?")[0]).replace(/^\//, "")));
    let img = ((h.match(/property="og:image" content="([^"]+)"/) || [])[1] || "").replace(SITE, "");
    if (!exists(img)) {
      const cands = [...h.matchAll(/url\(["']?([^)"']+)|<img[^>]+src="([^"]+)"/g)].map((m) => (m[1] || m[2]).replace(SITE, ""))
        .map((u) => (u.startsWith("/") ? u : `/projects/${slug}/${u.replace(/^\.\//, "")}`));
      img = cands.find((u) => u.startsWith(`/projects/${slug}/`) && /\.(jpe?g|png|webp)$/i.test(u) && exists(u)) || "";
    }
    const dev = (DEVELOPERS.find(([k]) => name.startsWith(k)) || [])[1] || "";
    out.push({ slug, name, sector, cfg, img, dev, text: h });
  }
  return out;
}

function verifiedFlats() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/data/listings.js"), "utf8"), ctx);
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/data/verified-listings.js"), "utf8"), ctx);
  const all = (ctx.window.FF_LISTINGS || []).concat(ctx.window.FF_VERIFIED_LISTINGS || []);
  const seen = new Set();
  return all.filter((i) => i && /verified/i.test(i.status || "") && i.detailUrl && fs.existsSync(path.join(ROOT, i.detailUrl.replace(/^\//, ""))) && !seen.has(i.id) && seen.add(i.id));
}

function agentAds() {
  const f = path.join(ROOT, "assets/data/agent-ads.js");
  if (!fs.existsSync(f)) return { ads: [], generated: "" };
  const src = fs.readFileSync(f, "utf8"), ctx = { window: {} };
  vm.runInNewContext(src, ctx);
  return { ads: ctx.window.FF_AGENT_ADS || [], generated: (src.match(/Generated (\d{4}-\d{2}-\d{2})/) || [])[1] || "" };
}

function build(road) {
  const P0 = projects().filter((p) => road.sectors.includes(p.sector) && road.mustMention.test(p.text)).sort((a, b) => sectorKey(a.sector) - sectorKey(b.sector) || a.name.localeCompare(b.name));
  // Many project pages share the same placeholder photo. Show a photo only when it is unique to that project.
  const crypto = require("crypto");
  const hashOf = (u) => crypto.createHash("md5").update(fs.readFileSync(path.join(ROOT, decodeURI(u).replace(/^\//, "")))).digest("hex");
  const hashCount = new Map();
  for (const p of P0) if (p.img) { p.hash = hashOf(p.img); hashCount.set(p.hash, (hashCount.get(p.hash) || 0) + 1); }
  const P = P0.map((p) => (p.img && hashCount.get(p.hash) > 1 ? { ...p, img: "", placeholder: true } : p));
  const slugs = new Set(P.map((p) => p.slug));
  const flats = verifiedFlats().filter((f) => slugs.has((f.projectUrl || "").replace(/^\/projects\/|\/$/g, "")));
  // Inventory per project: agent ads (advertised, not yet checked) and Family&Flats verified flats.
  // Project pages and data files spell some projects differently (ireo-victory-valley vs ireovictoryvalley).
  const key = (x) => String(x || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const { ads, generated } = agentAds();
  const inv = new Map();
  const bump = (slug, field) => { const k = key(slug); const o = inv.get(k) || { sale: 0, rent: 0, verified: 0 }; o[field]++; inv.set(k, o); };
  for (const ad of ads) bump(ad.projectSlug, ad.type === "Lease" ? "rent" : "sale");
  for (const f of flats) bump((f.projectUrl || "").replace(/^\/projects\/|\/$/g, ""), "verified");
  for (const p of P) p.inv = inv.get(key(p.slug)) || { sale: 0, rent: 0, verified: 0 };
  const asOf = generated ? new Date(generated + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
  const totalAds = P.reduce((n, p) => n + p.inv.sale + p.inv.rent, 0);
  P.sort((a, b) => sectorKey(a.sector) - sectorKey(b.sector) || (b.inv.sale + b.inv.rent + b.inv.verified) - (a.inv.sale + a.inv.rent + a.inv.verified) || a.name.localeCompare(b.name));
  const bySector = new Map();
  for (const p of P) { if (!bySector.has(p.sector)) bySector.set(p.sector, []); bySector.get(p.sector).push(p); }
  const sectors = [...bySector.keys()];
  const devCount = new Map(); for (const p of P) if (p.dev) devCount.set(p.dev, (devCount.get(p.dev) || 0) + 1);
  const devs = [...devCount.keys()].sort((a, b) => devCount.get(b) - devCount.get(a) || a.localeCompare(b));
  const url = `${SITE}/locations/${road.slug}/`;
  const title = `${road.name} Flats: ${P.length} Projects | Family&Flats`; // 50-60 characters (SEO rule 2.6)
  const desc = `Compare ${P.length} residential projects on ${road.name}, Gurugram, in Sectors ${sectors[0]} to ${sectors[sectors.length - 1]}: ${devs.slice(0, 3).join(", ")} and more, with verified flats for sale and rent.`;
  const wa = `https://wa.me/${PHONE}?text=${encodeURIComponent(`Hi Family&Flats, I am looking for a flat on ${road.name}. Please share options.`)}`;
  const flatCard = (f) => {
    const isLease = f.type === "Lease", bhk = (String(f.bhk).match(/\d+/) || [""])[0];
    const price = String(f.price || "").replace(/^Rs\.?\s*/i, "₹");
    return `<a class="ffloc-flat" href="${esc(f.detailUrl)}"><img src="${esc(f.image)}" alt="${esc(`${bhk} BHK flat ${isLease ? "for rent" : "for sale"} in ${f.project}`)}" loading="lazy" width="320" height="220"><span class="ffloc-tag">${isLease ? "For rent" : "For sale"} · verified</span><b>${esc(`${bhk} BHK in ${f.project}`)}</b><span>${esc([(String(f.size).match(/[\d,]+/) ? (+String(f.size).replace(/,/g, "").match(/\d+/)[0]).toLocaleString("en-IN") + " sq. ft." : f.size), f.floor, f.furnishing].filter(Boolean).join(" · "))}</span><strong>${esc(price)}</strong></a>`;
  };
  const secInv = (s, long) => {
    const t = bySector.get(s).reduce((o, p) => ({ sale: o.sale + p.inv.sale, rent: o.rent + p.inv.rent }), { sale: 0, rent: 0 });
    if (!t.sale && !t.rent) return "";
    return long ? ` · ${t.sale} for sale, ${t.rent} for rent` : ` · ${t.sale + t.rent} flats`;
  };
  const invLine = (p) => {
    const parts = [];
    if (p.inv.sale) parts.push(`<b class="s">${p.inv.sale}</b> for sale`);
    if (p.inv.rent) parts.push(`<b class="r">${p.inv.rent}</b> for rent`);
    if (p.inv.verified) parts.push(`<b class="v">${p.inv.verified}</b> verified`);
    return parts.length ? `<span class="ffloc-inv">${parts.join(" · ")}</span>` : `<span class="ffloc-inv none">Ask for current availability</span>`;
  };
  const projCard = (p) => `<a class="ffloc-proj${p.img ? "" : " noimg"}" href="/projects/${esc(p.slug)}/">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}, Sector ${esc(p.sector)}, ${esc(road.name)}" loading="lazy" width="72" height="72">` : `<span class="ffloc-ph" aria-hidden="true">${esc((p.dev || p.name).replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase())}</span>`}<span class="ffloc-pt"><b>${esc(p.name)}</b><span>${esc([p.dev, p.cfg].filter(Boolean).join(" · ") || "Project details")}</span>${invLine(p)}</span></a>`;
  const faqs = [
    [`How many projects on ${road.name} does Family&Flats cover?`, `${P.length} residential projects across ${sectors.length} sectors (Sector ${sectors.join(", ")}), each with its own project page.`],
    [`Which developers have projects here?`, `${devs.join(", ")}, among others.`],
    [`Can I buy or rent a flat through Family&Flats?`, `Yes. Family&Flats handles both resale and rentals. ${flats.length ? `${flats.length} flats on ${road.name} are currently verified with real photos, and` : ""} for any other project you can share your requirement and the team checks current availability with owners.`],
  ];
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name: title.replace(" | Family&Flats", ""), description: desc, isPartOf: { "@type": "WebSite", name: "Family&Flats", url: SITE }, about: { "@type": "Place", name: road.name, address: { "@type": "PostalAddress", addressLocality: "Gurugram", addressRegion: "Haryana", addressCountry: "IN" } } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: road.name, item: url }] },
    { "@type": "ItemList", name: `Residential projects on ${road.name}`, numberOfItems: P.length, itemListElement: P.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: `${SITE}/projects/${p.slug}/` })) },
    { "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ] };
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <!-- Generated by scripts/generate-location-pages.js from the project pages. Do not edit by hand: change the project pages or the script, then rerun. -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title).replace("&amp;Flats", "&Flats")}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Family&amp;Flats">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}${esc((P.find((p) => p.slug === "ireo-victory-valley") || P[0] || {}).img || "/assets/logo-new.png")}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="shortcut icon" type="image/x-icon" href="/assets/logo-new-fav.png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
  <link rel="stylesheet" href="/assets/css/tokens.css?v=evergreen-inventory">
  <link rel="stylesheet" href="/assets/css/typography.css?v=evergreen-inventory">
  <link rel="stylesheet" href="/assets/css/layout.css?v=evergreen-inventory">
  <link rel="stylesheet" href="/assets/css/components.css?v=evergreen-inventory">
  <link rel="stylesheet" href="/assets/css/header.css?v=remove-top-project-search-20260620a">
  <link rel="stylesheet" href="/assets/css/footer.css?v=footer-final">
  <link rel="stylesheet" href="/assets/css/ff-location.css?v=1">
  <link rel="stylesheet" href="/assets/css/ff-location-b.css?v=3">
  <script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
  </script>
</head>
<body>
  <div id="header-placeholder"></div>
  <main class="ffloc">
    <nav class="ffloc-crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span>${esc(road.name)}</nav>
    <header class="ffloc-hero">
      <span class="ffloc-kicker"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Gurugram · Sectors ${esc(sectors[0])} to ${esc(sectors[sectors.length - 1])}</span>
      <h1>Flats on ${esc(road.name)}, Gurugram</h1>
      <p class="ffloc-lede">${P.length} residential projects in ${sectors.length} sectors, from ${esc(devs.slice(0, 6).join(", "))} and more. Family&amp;Flats has worked in Gurugram real estate for 12 years and handles resale and rentals across this road.</p>
      <div class="ffloc-facts">
        <div><b>${P.length}</b><span>projects</span></div>
        <div><b>${sectors.length}</b><span>sectors</span></div>
        <div><b>${devs.length}</b><span>developers</span></div>
        <div><b>${flats.length}</b><span>verified flats now</span></div>
      </div>
      <div class="ffloc-cta"><a class="ffloc-btn" href="${esc(wa)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Ask on WhatsApp</a><a class="ffloc-btn ghost" href="tel:+${PHONE}">Call ${PHONE_SHOW}</a></div>
    </header>
${flats.length ? `
    <section class="ffloc-sec" aria-labelledby="ffloc-flats">
      <h2 id="ffloc-flats">Verified flats on ${esc(road.name)} right now</h2>
      <p class="ffloc-note">Checked by Family&amp;Flats, with real photos. Prices are asking prices; confirm before a visit.</p>
      <div class="ffloc-flats">${flats.map(flatCard).join("")}</div>
    </section>` : ""}
    <section class="ffloc-sec" aria-labelledby="ffloc-browse">
      <h2 id="ffloc-browse">Homes for sale and rent on ${esc(road.name)}</h2>
      <p class="ffloc-note">Our verified homes and current agent listings across these projects, each on one page.</p>
      <p class="ffloc-browse"><a class="ffloc-btn" href="/sale.html">Homes for sale</a> <a class="ffloc-btn ghost" href="/lease.html">Homes for rent</a></p>
    </section>
    <section class="ffloc-sec" aria-labelledby="ffloc-projects">
      <h2 id="ffloc-projects">All ${P.length} projects, by sector</h2>
      <p class="ffloc-note">${totalAds ? `Flat counts are agent advertisements imported${asOf ? ` on ${esc(asOf)}` : ""}; Family&amp;Flats checks price and availability with the owner side before a visit. "Verified" flats have been checked by our team, with real photos.` : ""} Projects without a count may still have flats: ask and we check current availability.</p>
      <nav class="ffloc-jump" aria-label="Jump to a sector">${sectors.map((s) => `<a href="#sector-${s.toLowerCase()}">Sector ${esc(s)} <small>${bySector.get(s).length} project${bySector.get(s).length === 1 ? "" : "s"}${secInv(s)}</small></a>`).join("")}</nav>
${sectors.map((s) => `      <div class="ffloc-sector" id="sector-${s.toLowerCase()}">
        <h3>Sector ${esc(s)} <small>${bySector.get(s).length} project${bySector.get(s).length === 1 ? "" : "s"}${secInv(s, true)}</small></h3>
        <div class="ffloc-projs">${bySector.get(s).map(projCard).join("")}</div>
      </div>`).join("\n")}
    </section>
    <section class="ffloc-sec ffloc-two" aria-labelledby="ffloc-help">
      <div>
        <h2 id="ffloc-help">Not sure which project fits?</h2>
        <p>Tell us your configuration, budget and whether you want to buy or rent. We check current availability with owners across these projects and arrange visits.</p>
        <form data-ff-enquiry><input type="hidden" name="project" value="${esc(road.name)}"><noscript><p>Call or WhatsApp ${PHONE_SHOW} to share your requirement.</p></noscript></form>
      </div>
      <div>
        <h2>Common questions</h2>
        <dl class="ffloc-faq">${faqs.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
      </div>
    </section>
  </main>
  <div id="footer-placeholder"></div>
  <script src="/assets/js/main.js?v=phase3-listings"></script>
</body>
</html>
`;
  return { html, file: path.join(ROOT, "locations", road.slug, "index.html"), count: P.length, flats: flats.length, sectors };
}

let stale = 0;
for (const road of ROADS) {
  const r = build(road);
  const cur = fs.existsSync(r.file) ? fs.readFileSync(r.file, "utf8") : "";
  if (cur === r.html) { console.log(`UP TO DATE /locations/${road.slug}/`); continue; }
  stale++;
  if (check) console.log(`OUT OF DATE /locations/${road.slug}/`);
  else { fs.mkdirSync(path.dirname(r.file), { recursive: true }); fs.writeFileSync(r.file, r.html); console.log(`WROTE /locations/${road.slug}/ projects=${r.count} flats=${r.flats} sectors=${r.sectors.join(",")}`); }
}
if (check) process.exit(stale ? 1 : 0);
