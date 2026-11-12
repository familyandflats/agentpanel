#!/usr/bin/env node
/*
 * Family&Flats project-page SEO generator.
 * Run from the public_html folder:   node scripts/generate-project-seo.js
 * Re-run whenever assets/data/*.js changes (new ads, price changes) so the page's
 * static price guide, counts, meta description and schema match the live inventory.
 *
 * It only rewrites these parts of each configured project page:
 *   - <title>, meta description, og:title, og:description
 *   - the block between <!-- ff-seo-summary:start --> and <!-- ff-seo-summary:end -->
 *   - the text of elements carrying data-ff-gen="..."
 *   - the <script type="application/ld+json" data-ff-project-schema> block
 * Everything else on the page is left exactly as it is.
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://familyandflats.com";
const AGENT = {
  name: "Family&Flats",
  telephone: "+91-98992-73673",
  rera: "RC/HARERA/GGM/1766/1361/2022/134",
};

// One entry per project page. Add more projects here as you roll the template out.
const PROJECTS = {
  "ireo-victory-valley": {
    dataSlug: "ireovictoryvalley",
    name: "IREO Victory Valley",
    developer: "IREO",
    locality: "Sector 67",
    road: "Golf Course Extension Road",
    city: "Gurugram",
    altCity: "Gurgaon",
    acres: 25,
    unitsMin: 750,
    image: "/projects/ireovictoryvalley/images/ff-vv-ov-06.jpg",
  },
};

// ---------- data ----------
function loadData() {
  const win = {};
  for (const f of ["listings.js", "agent-ads.js", "verified-listings.js"]) {
    const p = path.join(ROOT, "assets", "data", f);
    if (fs.existsSync(p)) vm.runInNewContext(fs.readFileSync(p, "utf8"), { window: win });
  }
  return win;
}
const num = (v) => { const m = String(v || "").replace(/,/g, "").match(/\d+(\.\d+)?/); return m ? +m[0] : null; };
function rupees(v) {
  const s = String(v || "");
  if (/cr/i.test(s)) return num(s) * 1e7;
  if (/lac|lakh/i.test(s)) return num(s) * 1e5;
  return num(s);
}
const isPent = (x) => (x.tags || []).includes("Penthouse") || /penthouse/i.test(x.unit || x.title || x.bhk || "");

function itemsFor(win, slug) {
  const out = [];
  (win.FF_LISTINGS || []).concat(win.FF_VERIFIED_LISTINGS || []).filter((i) => i.projectSlug === slug).forEach((i) => {
    out.push({ verified: true, type: i.type, bhk: num(i.bhk), size: num(i.size), price: rupees(i.price),
      pent: isPent(i), title: i.title, url: i.detailUrl, floor: i.floor, furnishing: i.furnishing, date: null });
  });
  (win.FF_AGENT_ADS || []).filter((a) => a.projectSlug === slug).forEach((a) => {
    out.push({ verified: false, type: a.type, bhk: a.bhk, size: a.size || null, price: a.price || null,
      pent: isPent(a), date: a.advertisedOn });
  });
  return out;
}

// ---------- formatting ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inr = (n) => Math.round(n).toLocaleString("en-IN");
const cr = (n) => "₹" + parseFloat((n / 1e7).toFixed(2)) + " Cr";
const crRange = (a, b) => (a === b ? cr(a) : "₹" + (a / 1e7).toFixed(2) + "–" + (b / 1e7).toFixed(2) + " Cr");
const rent = (n) => "₹" + inr(n);
const rentShort = (n) => "₹" + (n >= 100000 ? (n / 100000).toFixed(2).replace(/0$/, "") + " lakh" : inr(n));
const rentRange = (a, b) => (a === b ? rent(a) : rent(a) + "–" + rent(b).slice(1));
const sqft = (a, b) => (a === b ? inr(a) : inr(a) + "–" + inr(b)) + " sq. ft.";
const prettyDate = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const ROWS = [
  { key: "2", label: "2 BHK", slug: "2-bhk" },
  { key: "3", label: "3 BHK", slug: "3-bhk" },
  { key: "4", label: "4 BHK", slug: "4-bhk" },
  { key: "5", label: "5 BHK", slug: "5-bhk" },
  { key: "P", label: "Penthouse", slug: "penthouse" },
];
const rowKey = (i) => (i.pent ? "P" : String(i.bhk));

// Same rules as the live price cards on the page (assets/js/ff-vv-prices.js), so the two never disagree:
// count = agent listings + verified flats; sizes and prices from agent listings; the price range uses
// listings advertised in the last 90 days (counted back from the newest listing) when at least 3 are priced.
let LATEST = null;
const RECENT_DAYS = 90;
function stats(items) {
  const ads = items.filter((i) => !i.verified);
  const cutoff = LATEST ? new Date(LATEST + "T00:00:00Z").getTime() - RECENT_DAYS * 864e5 : 0;
  const recent = ads.filter((i) => i.price && i.date && new Date(i.date + "T00:00:00Z").getTime() >= cutoff);
  const priced = recent.length >= 3 ? recent : ads.filter((i) => i.price);
  const sized = ads.filter((i) => i.size);
  const psf = priced.filter((i) => i.size).map((i) => i.price / i.size);
  const mm = (arr) => (arr.length ? [Math.min(...arr), Math.max(...arr)] : null);
  return {
    count: items.length,
    price: mm(priced.map((i) => i.price)),
    avgPrice: priced.length ? priced.reduce((s, i) => s + i.price, 0) / priced.length : null,
    size: mm(sized.map((i) => i.size)),
    psf: psf.length ? psf.reduce((a, b) => a + b, 0) / psf.length : null,
  };
}

function build(cfg, items, pageSlug) {
  const sale = items.filter((i) => i.type === "Sale");
  const lease = items.filter((i) => i.type !== "Sale");
  const by = (list) => Object.fromEntries(ROWS.map((r) => [r.key, stats(list.filter((i) => rowKey(i) === r.key))]));
  const dates = items.map((i) => i.date).filter(Boolean).sort();
  const updated = dates.length ? dates[dates.length - 1] : new Date().toISOString().slice(0, 10);
  LATEST = dates.length ? updated : null;
  const S = by(sale), L = by(lease);
  const all = { sale: stats(sale), lease: stats(lease), saleNonPent: stats(sale.filter((i) => !i.pent)) };

  const pageUrl = `${SITE}/projects/${pageSlug}/`;
  const minSale = all.sale.price ? all.sale.price[0] : null;
  const minRent = all.lease.price ? all.lease.price[0] : null;

  // ---- text bits reused in FAQ and meta ----
  const saleLines = ROWS.filter((r) => S[r.key].price).map((r) => `${r.label}: ${crRange(...S[r.key].price)}`);
  const rentLines = ROWS.filter((r) => L[r.key].price).map((r) => `${r.label}: ${rentRange(...L[r.key].price)} a month`);
  const sizeLines = ROWS.filter((r) => S[r.key].size || L[r.key].size).map((r) => {
    const z = [S[r.key].size, L[r.key].size].filter(Boolean).flat();
    return `${r.label}: ${sqft(Math.min(...z), Math.max(...z))}`;
  });
  const gen = {
    "faq-sale-price": `Current asking prices in ${cfg.name} (${all.sale.count} flats for sale, updated ${prettyDate(updated)}) are ${saleLines.join("; ")}. ` +
      (all.saleNonPent.psf ? `That works out to an average of about ₹${inr(Math.round(all.saleNonPent.psf / 100) * 100)} per sq. ft. for 2, 3 and 4 BHK flats. ` : "") +
      `Final price depends on floor, view, condition and furnishing, so Family&Flats confirms each flat with the owner before you visit.`,
    "faq-rent": `Current rents in ${cfg.name} (${all.lease.count} flats for rent) are ${rentLines.join("; ")}. Maintenance, deposit and furnishing terms vary by owner and are confirmed before a visit.`,
    "faq-sizes": `Across flats for sale and rent, typical super areas are ${sizeLines.join("; ").replace(/\.$/, "")}. Some 3 and 4 BHK layouts include a servant room, study or duplex level.`,
    "stat-updated": prettyDate(updated),
  };

  const title = `${cfg.name} ${cfg.locality} ${cfg.altCity} | Resale & Rent Flats`;
  const desc = `${all.sale.count} flats for sale & ${all.lease.count} for rent in ${cfg.name}, ${cfg.locality} ${cfg.altCity}. ` +
    `2–4 BHK & penthouses` + (minSale ? ` from ${cr(minSale)}` : "") + (minRent ? `, rent from ${rentShort(minRent)}/month` : "") + `. Verified prices.`;

  // ---- static price guide (visible HTML, no JavaScript needed) ----
  const tr = (r, st, type) => {
    const href = `/projects/${pageSlug}/${r.slug}-for-${type === "sale" ? "sale" : "rent"}/`;
    const priceCell = st.price ? (type === "sale" ? crRange(...st.price) : rentRange(...st.price) + "/month") : "On request";
    const psfCell = type === "sale" ? `<td>${st.psf ? "₹" + inr(Math.round(st.psf / 100) * 100) : "–"}</td>` : "";
    return `<tr><th scope="row"><a href="${href}">${r.label} for ${type === "sale" ? "sale" : "rent"}</a></th><td>${priceCell}</td>${psfCell}<td>${st.size ? sqft(...st.size) : "–"}</td><td>${st.count}</td></tr>`;
  };
  const verified = items.filter((i) => i.verified && i.url);
  const summary = `<!-- ff-seo-summary:start (generated by scripts/generate-project-seo.js; do not edit by hand) -->
  <section class="vvx-section vvx-pricelist" id="price-guide" aria-labelledby="price-guide-title">
    <div class="vvx-wrap">
      <div class="vvx-head">
        <h2 id="price-guide-title">${esc(cfg.name)} price list: sale and rent</h2>
        <p>Asking prices from ${all.sale.count + all.lease.count} current listings in ${esc(cfg.name)}, ${esc(cfg.locality)}, ${esc(cfg.city)}. Latest listing ${esc(prettyDate(updated))}.</p>
      </div>
      <div class="ff-pg-grid">
        <div class="ff-pg-card">
          <h3>For sale</h3>
          <div class="ff-pg-scroll"><table class="ff-pg-table">
            <thead><tr><th scope="col">Home</th><th scope="col">Price range</th><th scope="col">Avg. ₹/sq. ft.</th><th scope="col">Size</th><th scope="col">Homes</th></tr></thead>
            <tbody>${ROWS.filter((r) => S[r.key].count).map((r) => tr(r, S[r.key], "sale")).join("")}</tbody>
          </table></div>
        </div>
        <div class="ff-pg-card">
          <h3>For rent</h3>
          <div class="ff-pg-scroll"><table class="ff-pg-table">
            <thead><tr><th scope="col">Home</th><th scope="col">Monthly rent</th><th scope="col">Size</th><th scope="col">Homes</th></tr></thead>
            <tbody>${ROWS.filter((r) => L[r.key].count).map((r) => tr(r, L[r.key], "rent")).join("")}</tbody>
          </table></div>
        </div>
      </div>
      <p class="ff-pg-note">Asking prices from owners and agents (price ranges from listings of the last ${RECENT_DAYS} days), not final transaction values. Family&amp;Flats confirms availability and price with the owner before every visit.</p>
    </div>
  </section>
  <!-- ff-seo-summary:end -->`;

  return { title, desc, summary, gen, updated, pageUrl, verified };
}

function schema(cfg, html, b) {
  // FAQ schema mirrors the visible FAQ text on the page, so the two never disagree.
  const faq = [];
  const faqBlock = (html.match(/<div class="vv-faq">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/) || [])[1] || "";
  const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  for (const m of faqBlock.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g)) faq.push([strip(m[1]), strip(m[2])]);
  const id = (h) => b.pageUrl + "#" + h;
  const graph = [
    { "@type": "WebPage", "@id": id("webpage"), url: b.pageUrl, name: b.title, description: b.desc, inLanguage: "en-IN",
      dateModified: b.updated, isPartOf: { "@id": SITE + "/#website" }, about: { "@id": id("project") },
      breadcrumb: { "@id": id("breadcrumb") }, primaryImageOfPage: SITE + cfg.image, publisher: { "@id": SITE + "/#agent" } },
    { "@type": "WebSite", "@id": SITE + "/#website", url: SITE + "/", name: "Family&Flats", publisher: { "@id": SITE + "/#agent" } },
    { "@type": "BreadcrumbList", "@id": id("breadcrumb"), itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "Projects in " + cfg.city, item: SITE + "/projects/" },
      { "@type": "ListItem", position: 3, name: cfg.name, item: b.pageUrl } ] },
    { "@type": "ApartmentComplex", "@id": id("project"), name: cfg.name, url: b.pageUrl, image: SITE + cfg.image,
      description: `${cfg.name} is a ready-to-move residential project by ${cfg.developer} in ${cfg.locality}, ${cfg.road}, ${cfg.city} (${cfg.altCity}), spread over about ${cfg.acres} acres with ${cfg.unitsMin}+ homes in 2, 3 and 4 BHK and penthouse layouts.`,
      address: { "@type": "PostalAddress", streetAddress: `${cfg.locality}, ${cfg.road}`, addressLocality: cfg.city, addressRegion: "Haryana", addressCountry: "IN" },
      numberOfAccommodationUnits: { "@type": "QuantitativeValue", minValue: cfg.unitsMin },
      amenityFeature: ["Clubhouse", "Swimming pool", "Fitness centre", "Landscaped central greens", "Gated community with security"]
        .map((n) => ({ "@type": "LocationFeatureSpecification", name: n, value: true })) },
    { "@type": "RealEstateAgent", "@id": SITE + "/#agent", name: AGENT.name, url: SITE + "/", telephone: AGENT.telephone,
      identifier: { "@type": "PropertyValue", propertyID: "HARERA Gurugram agent registration", value: AGENT.rera },
      areaServed: { "@type": "City", name: cfg.city } },
  ];
  if (b.verified.length) graph.push({ "@type": "ItemList", "@id": id("verified-flats"), name: `Verified flats in ${cfg.name}`,
    itemListElement: b.verified.map((v, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + v.url, name: v.title })) });
  if (faq.length) graph.push({ "@type": "FAQPage", "@id": id("faq"), mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
  return `<script type="application/ld+json" data-ff-project-schema>${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;
}

function run() {
  const win = loadData();
  for (const [pageSlug, cfg] of Object.entries(PROJECTS)) {
    const file = path.join(ROOT, "projects", pageSlug, "index.html");
    let html = fs.readFileSync(file, "utf8");
    const items = itemsFor(win, cfg.dataSlug);
    const b = build(cfg, items, pageSlug);
    const need = (re, what) => { if (!re.test(html)) throw new Error(`${pageSlug}: could not find ${what}`); };

    need(/<title>[\s\S]*?<\/title>/, "<title>");
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(b.title)}</title>`);
    html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(b.desc)}$2`);
    html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(b.title)}$2`);
    html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(b.desc)}$2`);

    need(/<!-- ff-seo-summary:start[\s\S]*?<!-- ff-seo-summary:end -->/, "ff-seo-summary markers");
    html = html.replace(/<!-- ff-seo-summary:start[\s\S]*?<!-- ff-seo-summary:end -->/, () => b.summary);

    for (const [k, v] of Object.entries(b.gen)) {
      html = html.replace(new RegExp(`(<([a-z0-9]+)[^>]*data-ff-gen="${k}"[^>]*>)[\\s\\S]*?(</\\2>)`, "g"), (m, open, tag, close) => open + esc(v) + close);
    }

    need(/<script type="application\/ld\+json" data-ff-project-schema>[\s\S]*?<\/script>/, "project schema block");
    html = html.replace(/<script type="application\/ld\+json" data-ff-project-schema>[\s\S]*?<\/script>/, () => schema(cfg, html, b));

    fs.writeFileSync(file, html);
    console.log(`Updated projects/${pageSlug}/index.html: ${items.length} listings, data updated ${b.updated}`);
    console.log(`  title: ${b.title} (${b.title.length} chars)`);
    console.log(`  description: ${b.desc} (${b.desc.length} chars)`);
  }
}
run();
