/* Anant Raj Estate (Sector 63A): independent floors, villas and plots, with the enquiry form.
   Data: /assets/data/anant-raj-ads.js (window.FF_ARE_ADS). Every enquiry goes to Family&Flats only. */
(function () {
  "use strict";
  var PROJECT = "Anant Raj Estate";
  var DATA = window.FF_ARE_ADS || [];
  var app = document.getElementById("are-app");
  if (!app) return;
  var TABS = [
    ["fs", "Floors for sale", function (x) { return x.kind === "Independent floor" && x.txn === "Sale"; }],
    ["fr", "Floors for rent", function (x) { return x.kind === "Independent floor" && x.txn === "Rent"; }],
    ["pl", "Plots", function (x) { return x.kind === "Plot"; }],
    ["vi", "Villas", function (x) { return x.kind === "Villa"; }]
  ];
  var st = { tab: (location.hash.match(/^#(fs|fr|pl|vi)$/) || [])[1] || "fs", bhk: "All", block: "All" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function inr(n) { return Number(n).toLocaleString("en-IN"); }
  function priceHtml(x) {
    if (x.por) return '<p class="are-price are-por">Price on request</p>';
    if (x.kind === "Plot") {
      var t = x.cr ? "₹" + x.cr + " Cr" : "", r = x.rateL ? "₹" + x.rateL + " L / sq yd" : "";
      return '<p class="are-price">' + (t || r) + (t && r ? " <small>" + r + "</small>" : "") + "</p>";
    }
    if (x.txn === "Rent") return '<p class="are-price">₹' + inr(Math.round(x.rentL * 100000)) + " <small>/ month</small></p>";
    return '<p class="are-price">₹' + x.cr + " Cr</p>";
  }
  function title(x) {
    if (x.kind === "Plot") return (x.plot ? x.plot + " sq yd " : "") + "plot";
    var f = (x.floors || []).join(", ");
    return (x.bhk ? x.bhk + " BHK " : "") + (x.kind === "Villa" ? "villa" : "independent floor") +
      (f ? " · " + f + (/(Upper ground|Ground|Top|Middle)/.test(f) ? "" : " floor") : "");
  }
  function card(x) {
    var facts = [];
    if (x.block) facts.push("<span>Block <b>" + esc(x.block) + "</b></span>");
    if (x.kind !== "Plot" && x.plot) facts.push("<span>Plot <b>" + x.plot + " sq yd</b></span>");
    if (x.area) facts.push("<span><b>" + inr(x.area) + "</b> sq ft</span>");
    if (x.kind === "Independent floor" && !(x.floors || []).length) facts.push("<span>Floor on request</span>");
    var tags = [x.uc && '<span class="are-tag are-uc">Under construction</span>', x.terrace && '<span class="are-tag">Terrace / roof rights</span>',
      x.basement && '<span class="are-tag">Basement share</span>', x.stilt && '<span class="are-tag">Stilt parking</span>',
      x.lift && '<span class="are-tag">Lift</span>', x.furnishing && '<span class="are-tag">' + esc(x.furnishing) + "</span>"].filter(Boolean).join("");
    return '<article class="are-card"><h3>' + esc(title(x)) + "</h3>" + priceHtml(x) +
      '<div class="are-facts">' + facts.join("") + "</div>" + (tags ? '<div class="are-tags">' + tags + "</div>" : "") +
      '<div class="are-foot"><span>Ref. ' + x.id + '</span><button type="button" class="are-ask" data-ref="' + x.id + '">Ask Family&amp;Flats</button></div></article>';
  }
  function chips(label, vals, cur, key) {
    if (vals.length < 3) return "";
    return '<div class="are-chips" role="group" aria-label="' + label + '"><span>' + label + "</span>" +
      vals.map(function (v) { return '<button type="button" aria-pressed="' + (v === cur) + '" data-' + key + '="' + esc(v) + '">' + esc(v) + "</button>"; }).join("") + "</div>";
  }
  function val(x) { return x.por ? 1e9 : (x.cr || x.rentL || 1e9); }
  function render() {
    var T = TABS.filter(function (t) { return t[0] === st.tab; })[0];
    var inTab = DATA.filter(T[2]);
    var bhks = ["All"].concat(Array.from(new Set(inTab.map(function (x) { return x.bhk; }).filter(Boolean))).sort().map(function (b) { return b + " BHK"; }));
    var blocks = ["All"].concat(Array.from(new Set(inTab.map(function (x) { return x.block; }).filter(Boolean))).sort());
    var list = inTab.filter(function (x) { return (st.bhk === "All" || x.bhk + " BHK" === st.bhk) && (st.block === "All" || x.block === st.block); })
      .sort(function (a, b) { return val(a) - val(b); });
    app.innerHTML =
      '<div class="are-tabs" role="tablist">' + TABS.map(function (t) {
        return '<button type="button" role="tab" aria-selected="' + (t[0] === st.tab) + '" data-tab="' + t[0] + '">' + t[1] + " <span>" + DATA.filter(t[2]).length + "</span></button>";
      }).join("") + "</div>" +
      (st.tab === "pl" ? "" : chips("BHK", bhks, st.bhk, "bhk")) + chips("Block", blocks, st.block, "block") +
      '<div class="are-grid">' + (list.length ? list.map(card).join("") : '<p class="are-empty">No listings for this choice right now. Ask us and we will check.</p>') + "</div>";
  }
  app.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.tab) { st.tab = b.dataset.tab; st.bhk = "All"; st.block = "All"; try { history.replaceState(null, "", "#" + st.tab); } catch (x) {} render(); }
    else if (b.dataset.bhk) { st.bhk = b.dataset.bhk; render(); }
    else if (b.dataset.block) { st.block = b.dataset.block; render(); }
    else if (b.dataset.ref) { setRef(b.dataset.ref); }
  });
  render();

  // ------------------------------------------------------------ enquiry form
  var form = document.getElementById("are-enquiry");
  var ref = "";
  function $(id) { return document.getElementById(id); }
  function apiUrl() {
    var s = window.FF_SITE_SETTINGS || {};
    if (s.enquiryApiUrl) return String(s.enquiryApiUrl);
    var h = location.hostname;
    return h === "localhost" || h === "127.0.0.1" ? "http://localhost:3000/api/public/enquiry" : "https://field.familyandflats.com/api/public/enquiry";
  }
  function setRef(id) {
    var x = DATA.filter(function (d) { return d.id === id; })[0];
    if (!x || !form) return;
    ref = id;
    $("are-ref").hidden = false;
    $("are-ref-text").textContent = id + ": " + title(x);
    $("are-looking").value = x.txn === "Rent" ? "LEASE" : "BUY";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () { $("are-name").focus(); }, 400);
  }
  if (!form) return;
  $("are-ref-remove").addEventListener("click", function () { ref = ""; $("are-ref").hidden = true; });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("are-name").value.trim(), phone = $("are-phone").value.replace(/\D/g, "");
    if (!name) { $("are-err").textContent = "Enter your name"; $("are-name").focus(); return; }
    if (phone.length < 10) { $("are-err").textContent = "Enter a 10-digit mobile number"; $("are-phone").focus(); return; }
    if (!$("are-consent").checked) { $("are-err").textContent = "Tick the box to agree to be contacted"; return; }
    var payload = { name: name, phone: $("are-phone").value.trim(), transactionType: $("are-looking").value, project: PROJECT,
      configuration: $("are-type").value, message: (ref ? "Reference: " + ref + ". " : "") + $("are-note").value.trim(), listingRef: ref,
      requestType: "enquiry", consent: true, company: form.elements.company.value, sourcePage: location.pathname, formId: "are-enquiry" };
    var btn = $("are-send"); btn.disabled = true; btn.textContent = "Sending…"; $("are-err").textContent = "";
    fetch(apiUrl(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { if (!r.ok || b.ok === false) throw new Error(b.error || "Unable to submit."); }); })
      .then(function () { location.href = "/thank-you/?source=website-enquiry"; })
      .catch(function () {
        btn.disabled = false; btn.textContent = "Send requirement";
        var text = "Hi Family&Flats, I am " + name + " (" + payload.phone + "). Anant Raj Estate: " + (payload.transactionType === "LEASE" ? "rent" : "buy") +
          (payload.configuration ? ", " + payload.configuration : "") + (ref ? ", ref " + ref : "") + (payload.message ? ". " + payload.message : "");
        $("are-err").innerHTML = 'Our form could not send this just now. <a href="https://api.whatsapp.com/send?phone=919899273673&amp;text=' +
          encodeURIComponent(text) + '" target="_blank" rel="noopener">Send it on WhatsApp</a> or call +91 98992 73673.';
      });
  });
})();
