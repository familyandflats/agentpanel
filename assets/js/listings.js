(function () {
  const listings = window.FF_LISTINGS || [];
  const moneyPhone = "919899273673";

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function slug(text) {
    return String(text || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function wa(text) {
    return "https://wa.me/" + moneyPhone + "?text=" + encodeURIComponent(text);
  }

  const projectLabels = {
    "adani-samsara-ivana": "Adani Samsara Ivana",
    "birla-navya": "Birla Navya",
    "birla-navya-avik": "Birla Navya Avik",
    "conscient-elevate-reserve": "Conscient Elevate Reserve",
    "conscient-heritage-one": "Conscient Heritage One",
    "conscienthineselevate": "Conscient Hines Elevate",
    "dlf-the-arbour": "DLF The Arbour",
    "emaar-amaris": "Emaar Amaris",
    "emaar-digi-homes-2bhk-for-sale-gurgaon": "2BHK in Emaar DigiHomes",
    "emaar-digihomes": "Emaar DigiHomes",
    "emaar-india-developer": "Emaar India project guide.",
    "emaar-mgf-marbella": "Emaar MGF Marbella",
    "emaar-mgf-pal-terraces-select": "Emaar MGF Palm Terraces Select",
    "emaar-mgf-the-palm-drive": "Emaar MGF The Palm Drive",
    "emaar-urban-oasis": "Emaar Urban Oasis",
    "emaardigihomes": "Emaar DigiHomes",
    "emaartheserenityhills": "Emaar Serenity Hills",
    "godrej-aristocrat": "Godrej Aristocrat",
    "ireo-skyon": "IREO Skyon",
    "ireo-victory-valley": "IREO Victory Valley",
    "ireograndarch": "IREO Grand Arch",
    "ireoskyon": "IREO Skyon",
    "ireothecorridors": "IREO The Corridors",
    "ireouptown": "IREO Uptown",
    "ireovictoryvalley": "IREO Victory Valley",
    "laburnum-victory-floors": "Laburnum Victory Floors",
    "m3m-altitude": "M3M Altitude",
    "m3m-golf-estate": "M3M Golf Estate",
    "m3m-latitude": "M3M Latitude",
    "m3m-merlin": "M3M Merlin",
    "m3mheights": "M3M Heights",
    "mahindraluminare": "Mahindra Luminare",
    "paras-floret": "Paras Floret",
    "pioneer-araya": "Pioneer Araya",
    "pioneer-park": "Pioneer Park",
    "pioneer-presidia": "Pioneer Presidia",
    "puri-the-aravallis": "Puri The Aravallis",
    "re-conscienthineselevate": "Conscient Hines Elevate",
    "regrandarch": "IREO Grand Arch",
    "signature-global-city": "Signature Global City",
    "silverglades-legacy": "Silverglades Legacy",
    "smart-world-orchard": "Smart World Orchard",
    "smart-world-the-edition": "Smart World The Edition",
    "tarc-ishva": "TARC Ishva",
    "tata-raisina-residency": "TATA Raisina Residency",
    "trump-towers": "Trump Towers",
    "victoryvalley": "IREO Victory Valley"
  };

  function projectLabel(projectFilter) {
    if (!projectFilter) return "Gurugram";
    return projectLabels[slug(projectFilter)] || String(projectFilter).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function listingCard(item) {
    const badgeClass = item.type === "Lease" ? "lease" : "sale";
    return `
      <article class="ff-listing-card" data-bhk="${slug(item.bhk)}" data-project="${slug(item.project)}">
        <a class="ff-listing-photo" href="${item.detailUrl}" style="background-image:url('${item.image}')">
          <span class="ff-listing-badge ${badgeClass}">${item.type}</span>
          <span class="ff-listing-status">${item.status}</span>
        </a>
        <div class="ff-listing-body">
          <div class="ff-listing-kicker">${item.project}</div>
          <h3><a href="${item.detailUrl}">${item.title}</a></h3>
          <p>${item.location}</p>
          <div class="ff-listing-price">${item.price}</div>
          <div class="ff-listing-meta">
            <span>${item.bhk}</span>
            <span>${item.size}</span>
            <span>${item.floor}</span>
          </div>
          <div class="ff-listing-actions">
            <a class="ff-primary" href="${item.detailUrl}">View Details</a>
            <a class="ff-secondary" target="_blank" href="${wa("Hi Family&Flats, please share current details for " + item.id + ".")}">WhatsApp</a>
          </div>
        </div>
      </article>
    `;
  }

  function priceNumber(item) {
    const text = String(item.price || "").toLowerCase();
    const match = text.match(/([\d.]+)\s*cr/);
    if (match) return parseFloat(match[1]) * 10000000;
    const rent = text.match(/([\d.]+)\s*l/);
    if (rent) return parseFloat(rent[1]) * 100000;
    const k = text.match(/([\d.]+)\s*k/);
    if (k) return parseFloat(k[1]) * 1000;
    return null;
  }

  function matchesBudget(item, value, mode) {
    if (value === "all") return true;
    const price = priceNumber(item);
    const text = String(item.price || "").toLowerCase();
    if (value === "request") return price === null || text.includes("request");
    if (price === null) return false;
    if (mode === "sale") {
      if (value === "under-2cr") return price < 20000000;
      if (value === "2-5cr") return price >= 20000000 && price <= 50000000;
      if (value === "5cr-plus") return price > 50000000;
    }
    if (value === "under-75k") return price < 75000;
    if (value === "75k-150k") return price >= 75000 && price <= 150000;
    if (value === "150k-plus") return price > 150000;
    return true;
  }

  function populateProjectFilter(list) {
    const select = document.querySelector('[data-filter="project"]');
    if (!select) return;
    const seen = new Set();
    list.forEach((item) => {
      const value = slug(item.projectSlug || item.project);
      if (seen.has(value)) return;
      seen.add(value);
      const option = document.createElement("option");
      option.value = value;
      option.textContent = item.project;
      select.appendChild(option);
    });
  }

  function requirementCard(label, projectName) {
    return `
      <div class="ff-empty-state">
        <h3>No matching ${label.toLowerCase()} listing found</h3>
        <p>Use the requirement form below and Family&Flats will check live availability${projectName ? " in " + projectName : ""}.</p>
        <a class="ff-primary" href="#requirement-form">Share Requirement</a>
      </div>
    `;
  }

  function initRequirementForm(mode) {
    const form = document.querySelector("[data-requirement-form]");
    if (!form) return;
    form.id = "requirement-form";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const label = mode === "sale" ? "buy" : "lease";
      const text = [
        "Hi Family&Flats, I want to " + label + " a property.",
        "Name: " + (data.get("name") || ""),
        "Phone: " + (data.get("phone") || ""),
        "BHK: " + (data.get("bhk") || ""),
        "Project/location: " + (data.get("project") || ""),
        mode === "sale" ? "Budget: " + (data.get("budget") || "") : "Rent: " + (data.get("budget") || ""),
        "Timeline: " + (data.get("timeline") || ""),
        "Notes: " + (data.get("notes") || "")
      ].join("\n");
      window.open(wa(text), "_blank", "noopener");
    });
  }

  function renderIndex(mode) {
    const list = listings.filter((item) => item.type.toLowerCase() === mode);
    const projectFilter = qs("project");
    const filtered = projectFilter ? list.filter((item) => slug(item.project) === slug(projectFilter) || slug(item.projectSlug) === slug(projectFilter)) : list;
    const grid = document.querySelector("[data-listings-grid]");
    const count = document.querySelector("[data-listings-count]");
    const projectName = filtered[0] ? filtered[0].project : projectLabel(projectFilter);
    const label = mode === "sale" ? "Sale" : "Lease";

    document.querySelectorAll("[data-listing-mode]").forEach((el) => { el.textContent = label; });
    document.querySelectorAll("[data-project-name]").forEach((el) => { el.textContent = projectFilter ? projectName : "Gurugram"; });
    if (count) count.textContent = String(filtered.length);
    populateProjectFilter(list);
    initRequirementForm(mode);

    if (!grid) return;
    function applyFilters() {
      const values = {};
      document.querySelectorAll("[data-filter]").forEach((input) => {
        values[input.getAttribute("data-filter")] = input.value || "all";
      });
      const visible = filtered.filter((item) => {
        if (values.bhk && values.bhk !== "all" && !slug(item.bhk).includes(values.bhk)) return false;
        if (values.project && values.project !== "all" && slug(item.projectSlug || item.project) !== values.project) return false;
        if (values.furnishing && values.furnishing !== "all" && !slug(item.furnishing).includes(values.furnishing)) return false;
        if (values.floor && values.floor !== "all" && !slug(item.floor).includes(values.floor)) return false;
        if (values.availability && values.availability !== "all" && !slug(item.availability + " " + item.status).includes(values.availability)) return false;
        if (values.budget && !matchesBudget(item, values.budget, mode)) return false;
        return true;
      });

      grid.innerHTML = visible.length ? visible.map(listingCard).join("") : requirementCard(label, projectFilter ? projectName : "");
    }

    applyFilters();

    document.querySelectorAll("[data-filter]").forEach((input) => {
      input.addEventListener("change", applyFilters);
    });
    document.querySelectorAll("[data-filter-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-filter]").forEach((input) => { input.value = "all"; });
        applyFilters();
      });
    });
  }

  function findCurrentListing() {
    const byQuery = qs("id");
    const path = location.pathname.toLowerCase();
    return listings.find((item) => byQuery && item.id.toLowerCase() === byQuery.toLowerCase()) ||
      listings.find((item) => path.includes(slug(item.id))) ||
      listings[0];
  }

  function renderDetail() {
    const item = findCurrentListing();
    if (!item) return;
    const isLease = item.type === "Lease";
    document.title = item.title + " | Family&Flats";

    const set = (selector, value) => {
      document.querySelectorAll(selector).forEach((el) => { el.textContent = value; });
    };
    const setHref = (selector, value) => {
      document.querySelectorAll(selector).forEach((el) => { el.href = value; });
    };

    set("[data-title]", item.title);
    set("[data-type]", item.type);
    set("[data-id]", item.id);
    set("[data-project]", item.project);
    set("[data-location]", item.location);
    set("[data-price]", item.price);
    set("[data-price-note]", item.priceNote);
    set("[data-description]", item.description);
    set("[data-bhk]", item.bhk);
    set("[data-size]", item.size);
    set("[data-floor]", item.floor);
    set("[data-furnishing]", item.furnishing);
    set("[data-availability]", item.availability);
    set("[data-commercial-label]", isLease ? "Monthly Rent" : "Asking Price");
    setHref("[data-project-link]", item.projectUrl);
    setHref("[data-back-link]", isLease ? "/lease.html" : "/sale.html");
    setHref("[data-whatsapp]", wa("Hi Family&Flats, please share current details for " + item.id + "."));

    const hero = document.querySelector("[data-detail-hero]");
    if (hero) hero.style.backgroundImage = "url('" + item.image + "')";

    const gallery = document.querySelector("[data-gallery]");
    if (gallery) {
      gallery.innerHTML = item.gallery.map((src) => `<img src="${src}" alt="${item.title}">`).join("");
    }

    const highlights = document.querySelector("[data-highlights]");
    if (highlights) {
      highlights.innerHTML = item.highlights.map((text) => `<li>${text}</li>`).join("");
    }

    const related = document.querySelector("[data-related]");
    if (related) {
      related.innerHTML = listings.filter((other) => other.id !== item.id).map(listingCard).join("");
    }
  }

  function renderProjectListings() {
    const blocks = document.querySelectorAll("[data-project-listings]");
    if (!blocks.length) return;

    blocks.forEach((block) => {
      const project = block.getAttribute("data-project-listings");
      const mode = block.getAttribute("data-listing-type");
      const projectName = projectLabel(project);
      const matched = listings.filter((item) => {
        const sameProject = slug(item.project) === slug(project) || slug(item.projectSlug) === slug(project);
        const sameMode = !mode || item.type.toLowerCase() === mode.toLowerCase();
        return sameProject && sameMode;
      });

      if (matched.length) {
        block.innerHTML = matched.map(listingCard).join("");
        return;
      }

      const label = mode === "lease" ? "lease" : "sale";
      block.innerHTML = `
        <div class="ff-empty-state compact">
          <h3>No published ${label} listing right now</h3>
          <p>Ask Family&Flats to check current ${label} availability in ${projectName}.</p>
          <a class="ff-primary" target="_blank" href="${wa("Hi Family&Flats, please check current " + label + " availability in " + projectName + ".")}">Check Availability</a>
        </div>
      `;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const mode = document.body.getAttribute("data-listing-page");
    if (mode === "sale" || mode === "lease") renderIndex(mode);
    if (document.body.hasAttribute("data-listing-detail")) renderDetail();
    renderProjectListings();
  });
})();
