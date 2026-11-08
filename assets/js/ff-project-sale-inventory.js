(function () {
  "use strict";

  var root = document.getElementById("inventory-main");
  if (!root) return;
  function get(id) { return document.getElementById("inventory-" + id); }
  function text(value) { return typeof value === "string" ? value.trim() : ""; }
  function normalize(value) { return text(value).replace(/\s+/g, " ").toLowerCase(); }
  function element(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  // Use only same-site record URLs; never convert a missing detail link to an enquiry.
  function localUrl(value) {
    if (!text(value) || /^[?#]/.test(text(value))) return "";
    try {
      var url = new URL(value, window.location.origin + "/");
      if (!/^https?:$/.test(url.protocol) || url.origin !== window.location.origin ||
          url.username || url.password || url.pathname === "/") return "";
      return url.pathname + url.search + url.hash;
    } catch (error) { return ""; }
  }
  function detailUrl(value) {
    var path = localUrl(value);
    return /^\/(?:search|projects)(?:\/|\?|$)/i.test(path) ? "" : path;
  }
  function bhk(value) {
    var match = text(value).match(/\b(\d+(?:\.5)?)\s*BHK\b/i);
    return match ? match[1] : "";
  }
  // Parse explicit amounts only. On-request prices stay unknown for filters/sort.
  function askingPrice(value) {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
    var price = text(value).replace(/,/g, "");
    var match = price.match(/^(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(cr(?:ore)?s?|lacs?|lakhs?|k)?\s*(?:\/?\s*(?:per\s+)?(?:month|mo|pm))?\.?$/i);
    if (!match) return null;
    var unit = (match[2] || "").toLowerCase();
    var amount = Number(match[1]) * (/^cr/.test(unit) ? 10000000 : /^la/.test(unit) ? 100000 : unit === "k" ? 1000 : 1);
    return amount > 0 ? amount : null;
  }

  var params = new URLSearchParams(window.location.search);
  var query = text(params.get("query")) || "Mahindra Luminare";
  var transaction = normalize(params.get("transaction"));
  var renting = transaction === "rent" || transaction === "lease";
  var mode = renting ? "rent" : "sale";
  var projects = {
    "mahindra luminare": { name: "Mahindra Luminare", location: "Golf Course Extension Road, Sector 59, Gurugram", url: "/projects/mahindra-luminare/" },
    "ireo victory valley": { name: "IREO Victory Valley", location: "Golf Course Extension Road, Sector 67, Gurugram", url: "/projects/ireo-victory-valley/" }
  };
  var project = Object.prototype.hasOwnProperty.call(projects, normalize(query)) ? projects[normalize(query)] : { name: query, location: "", url: "" };
  var sourceAvailable = Array.isArray(window.FF_LISTINGS);
  var listings = (sourceAvailable ? window.FF_LISTINGS : []).filter(function (listing) {
    return listing && normalize(listing.status) === "verified" &&
      normalize(listing.availability) === "available" &&
      normalize(listing.project) === normalize(project.name) &&
      normalize(listing.type) === (renting ? "lease" : "sale") && detailUrl(listing.detailUrl);
  });

  // Localhost-only illustrative cards. Never add these to FF_LISTINGS or published inventory.
  var isDemoPreview = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) && normalize(project.name) === "mahindra luminare" && listings.length === 0;
  var demoListings = isDemoPreview ? (renting ? [
    { type:"Lease",project:"Mahindra Luminare",bhk:"3BHK + 3T + SQ",size:"3008 Sq. Ft.",floor:"Higher Floor",price:"Rent on request",image:"/projects/mahindra-luminare/images/med-mu7bwls7-g128g-desktop.webp" },
    { type:"Lease",project:"Mahindra Luminare",bhk:"3BHK + 3T",size:"2980 Sq. Ft.",floor:"Middle Floor",price:"Rent on request",image:"/projects/mahindra-luminare/images/med-mu7bwm4a-pur2p-desktop.webp" },
    { type:"Lease",project:"Mahindra Luminare",bhk:"4BHK + 4T + SQ",size:"4200 Sq. Ft.",floor:"Higher Floor",price:"Rent on request",image:"/projects/mahindra-luminare/images/med-mu7bwmm4-8w8mx-desktop.webp" }
  ] : [
    { type:"Sale",project:"Mahindra Luminare",bhk:"3BHK + 3T + SQ",size:"3008 Sq. Ft.",floor:"Higher Floor",price:"₹7.00 Cr",image:"/projects/mahindra-luminare/images/med-mu7bwls7-g128g-desktop.webp" },
    { type:"Sale",project:"Mahindra Luminare",bhk:"3BHK + 3T",size:"2980 Sq. Ft.",floor:"Middle Floor",price:"₹6.50 Cr",image:"/projects/mahindra-luminare/images/med-mu7bwm4a-pur2p-desktop.webp" },
    { type:"Sale",project:"Mahindra Luminare",bhk:"4BHK + 4T + SQ",size:"4200 Sq. Ft.",floor:"Higher Floor",price:"₹9.25 Cr",image:"/projects/mahindra-luminare/images/med-mu7bwmm4-8w8mx-desktop.webp" }
  ]) : [];
  var displayedListings = isDemoPreview ? demoListings : listings;

  get("title").textContent = project.name;
  get("subtitle").textContent = "Flats for " + (renting ? "Rent" : "Sale") + (project.location ? " · " + project.location : "");
  ["back", "project"].forEach(function (id) {
    get(id).hidden = !project.url;
    if (project.url) get(id).href = project.url;
    else get(id).removeAttribute("href");
  });
  get("back").textContent = "← Back to " + project.name;
  ["sale", "rent"].forEach(function (id) {
    var linkParams = new URLSearchParams({ transaction: id === "rent" ? "rent" : "buy", query: project.name });
    get(id).href = "/search/?" + linkParams.toString();
    if (id === mode) get(id).setAttribute("aria-current", "page");
    else get(id).removeAttribute("aria-current");
  });
  get("request").href = "https://wa.me/919899273673?text=" + encodeURIComponent(
    "Hi Family&Flats, I am looking to " + (renting ? "rent" : "buy") + " a flat in " + project.name + ". Please help me check availability. I would like to share my preferred configuration and budget."
  );

  var filters = get("filters");
  var fields = { bhk: get("bhk"), budget: get("budget"), floor: get("floor"), furnishing: get("furnishing"), sort: get("sort") };
  function option(select, value, label) {
    var node = element("option", "", label);
    node.value = value;
    select.appendChild(node);
  }
  function populate(field, values, label) {
    Array.from(new Set(values.filter(Boolean))).sort(function (a, b) {
      return a.localeCompare(b, undefined, { numeric: true });
    }).forEach(function (value) { option(fields[field], value, label ? label(value) : value); });
    fields[field].disabled = fields[field].options.length === 1;
  }
  populate("bhk", displayedListings.map(function (listing) { return bhk(listing.bhk); }), function (value) { return value + " BHK"; });
  populate("floor", displayedListings.map(function (listing) { return text(listing.floor); }));
  populate("furnishing", displayedListings.map(function (listing) { return text(listing.furnishing); }));
  var budgets = renting ? [
    { label: "Below ₹50,000 / month", min: 0, max: 50000 },
    { label: "₹50,000–₹1 lakh / month", min: 50000, max: 100000 },
    { label: "₹1–₹2 lakh / month", min: 100000, max: 200000 },
    { label: "₹2 lakh+ / month", min: 200000, max: Infinity }
  ] : [
    { label: "Below ₹3 Cr", min: 0, max: 30000000 },
    { label: "₹3–₹5 Cr", min: 30000000, max: 50000000 },
    { label: "₹5–₹8 Cr", min: 50000000, max: 80000000 },
    { label: "₹8 Cr+", min: 80000000, max: Infinity }
  ];
  budgets.forEach(function (budget, index) { option(fields.budget, String(index), budget.label); });
  option(fields.budget, "request", "Price on request / unspecified");
  fields.budget.disabled = !displayedListings.length;
  fields.sort.disabled = !displayedListings.length;
  filters.hidden = false;

  function card(listing) {
    var demo = isDemoPreview && demoListings.includes(listing);
    var article = element("article", "ff-inventory-card");
    if (demo) { article.classList.add("ff-inventory-demo"); article.setAttribute("aria-label", "Illustrative demo property; not available for purchase or rent"); }
    var photo = element("div", "ff-inventory-photo", "Photograph not available");
    var imageUrl = localUrl(listing.image);
    if (imageUrl) {
      var image = element("img");
      image.alt = project.name + " flat for " + mode;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", function () { photo.textContent = "Photograph not available"; }, { once: true });
      image.src = imageUrl;
      photo.replaceChildren(image);
    }
    if (demo) photo.appendChild(element("span", "ff-inventory-demo-label", "DEMO · Not a real listing"));
    var body = element("div", "ff-inventory-card-body");
    var layout = bhk(listing.bhk);
    body.appendChild(element("h3", "", (layout ? layout + "BHK " : "") + "Flat on " + (renting ? "Rent" : "Sale") + " in " + project.name));
    body.appendChild(element("p", "ff-inventory-location", project.location || text(listing.location)));
    var specs = element("dl", "ff-inventory-specs");
    [["Layout", text(listing.bhk)], ["Area", text(listing.size)], ["Floor", text(listing.floor)]].forEach(function (spec) {
      var tile = element("div");
      tile.append(element("dt", "", spec[0]), element("dd", "", spec[1] || "Not specified"));
      specs.appendChild(tile);
    });
    body.appendChild(specs);
    var price = typeof listing.price === "number" && askingPrice(listing.price) !== null
      ? "₹" + listing.price.toLocaleString("en-IN") + (renting ? " / month" : "")
      : text(listing.price) || "Price on request";
    body.appendChild(element("p", "ff-inventory-price", price));
    if (text(listing.priceNote)) body.appendChild(element("p", "ff-inventory-price-note", text(listing.priceNote)));
    var details = element(demo ? "span" : "a", "ff-inventory-details", demo ? "Demo only · No property page" : "View Details");
    if (!demo) details.href = detailUrl(listing.detailUrl);
    details.setAttribute("aria-label", "View details: " + (layout ? layout + "BHK flat in " : "Flat in ") + project.name + " for " + mode);
    body.appendChild(details);
    article.append(photo, body);
    return article;
  }

  function render() {
    var matches = displayedListings.filter(function (listing) {
      if (fields.bhk.value !== "all" && bhk(listing.bhk) !== fields.bhk.value) return false;
      if (fields.floor.value !== "all" && text(listing.floor) !== fields.floor.value) return false;
      if (fields.furnishing.value !== "all" && text(listing.furnishing) !== fields.furnishing.value) return false;
      var price = askingPrice(listing.price);
      if (fields.budget.value === "request") return price === null;
      if (fields.budget.value !== "all") {
        var budget = budgets[Number(fields.budget.value)];
        return price !== null && price >= budget.min && price < budget.max;
      }
      return true;
    });
    // Recommended preserves the verified feed's ordering; unspecified prices sort last.
    if (fields.sort.value !== "recommended") matches.sort(function (a, b) {
      var first = askingPrice(a.price);
      var second = askingPrice(b.price);
      if (first === null) return second === null ? 0 : 1;
      if (second === null) return -1;
      return fields.sort.value === "price-asc" ? first - second : second - first;
    });
    var fragment = document.createDocumentFragment();
    matches.forEach(function (listing) { fragment.appendChild(card(listing)); });
    get("grid").replaceChildren(fragment);
    get("results").hidden = !matches.length;
    get("empty").hidden = !!matches.length;
    get("count").textContent = isDemoPreview ? "3 sample cards · Not available inventory" : matches.length + (matches.length === 1 ? " flat" : " flats");
    get("results-title").textContent = isDemoPreview ? "Illustrative " + mode + " cards · Design review only" : "Available flats";
    var filteredOut = displayedListings.length > 0 && !matches.length;
    get("empty-title").textContent = !sourceAvailable ? "Inventory is temporarily unavailable" : filteredOut
      ? "No verified " + mode + " listings match your filters"
      : "No verified " + mode + " listings currently available";
    get("empty-copy").textContent = filteredOut
      ? "Try adjusting your filters, or tell us your preferred configuration and budget. Our team can help check availability."
      : "Tell us your preferred configuration and budget. Our team can help check availability.";
    get("clear").hidden = !filteredOut;
    get("status").textContent = isDemoPreview ? "Three illustrative demo cards. No verified Mahindra Luminare listings are available." : matches.length ? matches.length + " verified available " + mode + " " + (matches.length === 1 ? "listing" : "listings") + " shown." : get("empty-title").textContent;
  }
  filters.addEventListener("submit", function (event) { event.preventDefault(); });
  filters.addEventListener("change", render);
  filters.addEventListener("reset", function (event) {
    event.preventDefault();
    Object.keys(fields).forEach(function (key) { fields[key].value = key === "sort" ? "recommended" : "all"; });
    render();
  });
  get("more").addEventListener("click", function () {
    var expanded = get("more").getAttribute("aria-expanded") !== "true";
    get("more").setAttribute("aria-expanded", String(expanded));
    get("more").querySelector("span").textContent = expanded ? "−" : "+";
    get("advanced").hidden = !expanded;
  });
  get("clear").addEventListener("click", function () {
    filters.reset();
    get("more").focus();
  });
  render();
})();
