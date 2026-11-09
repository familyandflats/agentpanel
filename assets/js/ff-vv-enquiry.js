/* IREO Victory Valley enquiry form (approved Design 2): reference chip, consent, photo requests.
   Sends to the Family&Flats CRM endpoint used by the rest of the site. */
(function () {
  "use strict";
  var PROJECT = "IREO Victory Valley";
  var form = document.getElementById("vv-enquiry");
  if (!form) return;
  var state = { ref: "", kind: "enquiry" };
  var $ = function (id) { return document.getElementById(id); };

  function apiUrl() {
    var s = window.FF_SITE_SETTINGS || {};
    if (s.enquiryApiUrl) return String(s.enquiryApiUrl);
    var h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1"
      ? (window.location.port === "3000" ? "/api/public/enquiry" : "http://localhost:3000/api/public/enquiry")   // same origin when the dashboard serves the site
      : "https://field.familyandflats.com/api/public/enquiry";
  }

  // ---------------------------------------------------------------- flat pop-up
  // Enquire on a specific flat opens a short form about THAT flat (not the general requirement form).
  // The buyer's details go only to Family&Flats; the dashboard asks the advertising agents for the flat's details.
  function flatInfo(ref, opts) {
    var w = window, id = String(ref).toUpperCase();
    var a = (w.FF_AGENT_ADS || []).filter(function (x) { return String(x.id).toUpperCase() === id; })[0];
    var v = (w.FF_LISTINGS || []).concat(w.FF_VERIFIED_LISTINGS || []).filter(function (x) { return String(x.id).toUpperCase() === id; })[0];
    var type = (a && a.type) || (v && v.type) || opts.type || "Sale";
    var bhk = (a && a.bhk) || opts.bhk || (v && (/(\d)/.exec(v.bhk || "") || [])[1]) || "";
    var pent = a ? ((a.tags || []).indexOf("Penthouse") >= 0 || /penthouse/i.test(a.unit || "")) : !!opts.pent;
    var price = a && !a.price ? "Price on request" : a ? (type === "Lease" ? "₹" + Math.round(a.price).toLocaleString("en-IN") + "/month" : "₹" + (a.price / 1e7).toFixed(2) + " Cr")
                  : v ? String(v.price || "").replace(/^Rs\.?\s*/i, "₹") : (opts.price || "");
    var size = a && a.size ? a.size.toLocaleString("en-IN") + " sq ft" : v && v.size ? String(v.size).replace(/sq\.?\s*ft\.?/i, "sq ft") : (opts.size || "");
    var details = a ? (a.tags || []).filter(function (t) { return t !== "Penthouse"; }).slice(0, 3).join(" · ") : v ? [v.floor, v.furnishing].filter(Boolean).join(" · ") : "";
    return { ref: id, type: type, bhk: bhk, pent: pent, verified: !!v && !a,
      title: (bhk ? bhk + " BHK" + (pent ? " penthouse" : "") : "Flat") + (size ? " · " + size : ""),
      price: price, details: details, config: bhk ? bhk + " BHK" + (pent ? " Penthouse" : "") : "" };
  }
  var modal;
  function buildModal() {
    var d = document.createElement("div");
    d.className = "vvm"; d.hidden = true;
    d.innerHTML =
      '<div class="vvm-back" data-close></div>' +
      '<div class="vvm-box" role="dialog" aria-modal="true" aria-labelledby="vvm-h">' +
        '<button type="button" class="vvm-x" data-close aria-label="Close">×</button>' +
        '<p class="vvm-kicker">' + PROJECT + ' · <span id="vvm-type"></span></p>' +
        '<h3 id="vvm-h"></h3>' +
        '<div class="vvm-flat"><b id="vvm-price"></b><span id="vvm-details"></span><span class="vvm-ref">Ref. <span id="vvm-ref"></span></span></div>' +
        '<p class="vvm-promise">We confirm availability with the owner side and send you <b>photos, video, floor and final price on WhatsApp</b>, usually the same day.</p>' +
        '<form id="vvm-form" novalidate>' +
          '<label for="vvm-name">Your name *</label><input id="vvm-name" autocomplete="name" required>' +
          '<label for="vvm-phone">Mobile (WhatsApp) *</label><input id="vvm-phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="10-digit mobile" required>' +
          '<label for="vvm-email">Email <span>(optional)</span></label><input id="vvm-email" type="email" autocomplete="email">' +
          '<label class="vvm-consent"><input type="checkbox" id="vvm-consent" checked> I agree to be contacted by Family&amp;Flats about this flat.</label>' +
          '<input class="vv-hp" id="vvm-company" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<p class="vvm-err" id="vvm-err" role="alert"></p>' +
          '<button type="submit" id="vvm-send">Get photos &amp; details of this flat</button>' +
          '<p class="vvm-note">Your number is shared only with the Family&amp;Flats team, never with agents.</p>' +
        '</form></div>';
    document.body.appendChild(d);
    d.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !d.hidden) closeModal(); });
    d.querySelector("#vvm-form").addEventListener("submit", submitModal);
    return d;
  }
  var current = null, lastFocus = null;
  function openFlat(ref, opts) {
    modal = modal || buildModal();
    current = flatInfo(ref, opts || {});
    current.kind = opts && opts.kind === "photos" ? "photos" : "enquiry";
    modal.querySelector("#vvm-type").textContent = (current.verified ? "Verified flat · " : "") + (current.type === "Lease" ? "for rent" : "for sale");
    modal.querySelector("#vvm-h").textContent = current.title;
    modal.querySelector("#vvm-price").textContent = current.price;
    modal.querySelector("#vvm-details").textContent = current.details;
    modal.querySelector("#vvm-ref").textContent = current.ref;
    modal.querySelector("#vvm-err").textContent = "";
    var btn = modal.querySelector("#vvm-send"); btn.disabled = false; btn.textContent = "Get photos & details of this flat";
    lastFocus = document.activeElement;
    modal.hidden = false; document.documentElement.classList.add("vvm-open");
    setTimeout(function () { modal.querySelector("#vvm-name").focus(); }, 50);
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true; document.documentElement.classList.remove("vvm-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // If the enquiry service cannot be reached, hand the same details to WhatsApp so no enquiry is lost.
  var FF_WA_NUMBER = "919899273673";
  function showWhatsAppFallback(el, p) {
    var lines = ["New enquiry from familyandflats.com"];
    function add(label, v) { if (v) lines.push(label + ": " + v); }
    add("Name", p.name); add("Mobile", p.phone); add("Email", p.email);
    add("Looking to", p.transactionType === "LEASE" ? "Rent" : (p.transactionType ? "Buy" : ""));
    add("Project", p.project); add("Configuration", p.configuration); add("Flat", p.listingRef);
    add("Budget", p.budget); add("Timeline", p.timeline); add("Message", p.message);
    lines.push("Page: " + window.location.href);
    var url = "https://wa.me/" + FF_WA_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
    el.textContent = "";
    var msg = document.createElement("span");
    msg.textContent = "Our form couldn't send this just now. Tap below to send the same details on WhatsApp, or call +91 98992 73673.";
    var a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Send on WhatsApp";
    a.setAttribute("style", "display:inline-block;margin-top:8px;padding:10px 16px;background:#1f8f4e;color:#fff;border-radius:9px;font-weight:800;text-decoration:none");
    el.appendChild(msg); el.appendChild(document.createElement("br")); el.appendChild(a);
  }

  function submitModal(e) {
    e.preventDefault();
    var q = function (id) { return modal.querySelector(id); };
    var name = q("#vvm-name").value.trim(), phone = q("#vvm-phone").value.replace(/\D/g, ""), email = q("#vvm-email").value.trim();
    if (!name) { q("#vvm-err").textContent = "Enter your name"; q("#vvm-name").focus(); return; }
    if (phone.length < 10) { q("#vvm-err").textContent = "Enter a 10-digit mobile number"; q("#vvm-phone").focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { q("#vvm-err").textContent = "Check the email address, or leave it empty"; q("#vvm-email").focus(); return; }
    if (!q("#vvm-consent").checked) { q("#vvm-err").textContent = "Tick the box to agree to be contacted"; return; }
    var payload = {
      name: name, phone: q("#vvm-phone").value.trim(), email: email,
      transactionType: current.type === "Lease" ? "LEASE" : "BUY",
      project: PROJECT, configuration: current.config,
      message: "Enquiry about " + current.ref + ": " + current.title + ", " + current.price + ".",
      listingRef: current.ref, requestType: current.kind, consent: true,
      company: q("#vvm-company").value, sourcePage: window.location.pathname, formId: "vv-flat-popup"
    };
    var btn = q("#vvm-send");
    btn.disabled = true; btn.textContent = "Sending…"; q("#vvm-err").textContent = "";
    fetch(apiUrl(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { if (!r.ok || b.ok === false) throw new Error(b.error || "Unable to submit."); return b; }); })
      .then(function () { window.location.href = "/thank-you/?source=" + (current.kind === "photos" ? "photo-request" : "flat-enquiry"); })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "Get photos & details of this flat";
        showWhatsAppFallback(q("#vvm-err"), payload);
      });
  }

  function setRef(ref, opts) {
    opts = opts || {};
    if (ref && !opts.useForm) { openFlat(ref, opts); return; }
    state.ref = ref || "";
    state.kind = ref && opts.kind === "photos" ? "photos" : "enquiry";
    $("vv-ref").hidden = !state.ref;
    $("vv-ref-id").textContent = state.ref;
    $("vv-ref-kind").textContent = state.kind === "photos" ? " · photos requested" : "";
    if (opts.bhk) $("vv-config").value = opts.bhk + " BHK";
    if (opts.type) $("vv-looking").value = opts.type === "Lease" ? "LEASE" : "BUY";
    if (state.kind === "photos" && !$("vv-note").value.trim()) $("vv-note").value = "Please share photos of " + state.ref + ".";
    $("vv-err").textContent = "";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(function () { $("vv-name").focus({ preventScroll: true }); }, 600);
  }

  $("vv-ref-remove").addEventListener("click", function () {
    if (state.kind === "photos" && /^Please share photos of /.test($("vv-note").value)) $("vv-note").value = "";
    state.ref = ""; state.kind = "enquiry"; $("vv-ref").hidden = true;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("vv-name").value.trim(), phone = $("vv-phone").value.replace(/\D/g, "");
    if (!name) { $("vv-err").textContent = "Enter your name"; $("vv-name").focus(); return; }
    if (phone.length < 10) { $("vv-err").textContent = "Enter a 10-digit mobile number"; $("vv-phone").focus(); return; }
    if (!$("vv-consent").checked) { $("vv-err").textContent = "Tick the box to agree to be contacted"; return; }
    var note = $("vv-note").value.trim();
    var payload = {
      name: name,
      phone: $("vv-phone").value.trim(),
      transactionType: $("vv-looking").value,
      project: PROJECT,
      configuration: $("vv-config").value,
      message: (state.ref ? "Reference: " + state.ref + ". " : "") + note,
      listingRef: state.ref,
      requestType: state.kind,
      consent: true,
      company: form.elements.company.value,
      sourcePage: window.location.pathname,
      formId: "vv-enquiry"
    };
    var btn = $("vv-send");
    btn.disabled = true; btn.textContent = "Sending…"; $("vv-err").textContent = "";
    fetch(apiUrl(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { if (!r.ok || b.ok === false) throw new Error(b.error || "Unable to submit."); return b; }); })
      .then(function () { window.location.href = "/thank-you/?source=" + (state.kind === "photos" ? "photo-request" : "website-enquiry"); })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = "Send requirement";
        showWhatsAppFallback($("vv-err"), payload);
      });
  });

  window.FFVVEnquiry = { setRef: setRef, openFlat: openFlat };
})();
