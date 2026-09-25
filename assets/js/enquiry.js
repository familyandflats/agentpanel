(function () {
  "use strict";

  function isLocal() {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  }

  function settings() {
    return window.FF_SITE_SETTINGS || {};
  }

  function apiUrl() {
    var configured = String(settings().enquiryApiUrl || "").trim();
    if (configured) return configured;
    return isLocal() ? "http://localhost:3000/api/public/enquiry" : "https://familyflats-field-capture-v1.onrender.com/api/public/enquiry";
  }

  function isEnquiryForm(form) {
    if (!form || form.dataset.ffEnquiry === "off") return false;
    if (form.matches("[data-property-search-strip], .vv-inventory-search-strip, #propertyForm")) return false;
    if (form.matches("#contactForm, [data-requirement-form], [data-ff-enquiry]")) return true;
    var action = String(form.getAttribute("action") || "").toLowerCase();
    return /send[-_]?email\d*\.php/.test(action);
  }

  function titleCaseSlug(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function (m) { return m.toUpperCase(); })
      .trim();
  }

  function pageContext() {
    var path = window.location.pathname.toLowerCase();
    var transaction = path.indexOf("for-rent") !== -1 || path.indexOf("/lease") !== -1 ? "LEASE" : "BUY";
    var configMatch = path.match(/\/(\d+)-bhk-for-(?:rent|sale)\//);
    var projectMatch = path.match(/\/projects\/([^/]+)\//);
    var project = projectMatch ? titleCaseSlug(projectMatch[1]) : "";
    if (project === "Ireo Victory Valley") project = "IREO Victory Valley";
    if (project === "Mahindra Luminare") project = "Mahindra Luminare";
    if (project === "Emaar Digi Homes") project = "Emaar DigiHomes";

    return {
      transactionType: transaction,
      configuration: configMatch ? configMatch[1] + " BHK" : "",
      project: project
    };
  }

  function originalValue(form, names) {
    for (var i = 0; i < names.length; i += 1) {
      var field = form.querySelector('[name="' + names[i] + '"]');
      if (field && field.value) return String(field.value).trim();
    }
    return "";
  }

  function render(form) {
    if (form.dataset.ffEnquiryReady === "true") return;
    var context = pageContext();
    var original = {
      name: originalValue(form, ["name", "full_name", "display_name"]),
      phone: originalValue(form, ["phone", "mobile", "phone_number"]),
      email: originalValue(form, ["email"]),
      project: originalValue(form, ["project", "project_name", "property_name"]) || context.project,
      configuration: originalValue(form, ["bhk", "configuration"]) || context.configuration
    };

    form.dataset.ffEnquiryReady = "true";
    form.classList.add("ff-enquiry-form");
    form.removeAttribute("action");
    form.setAttribute("novalidate", "novalidate");
    form.innerHTML = [
      '<div class="ff-enquiry-head">',
      '  <span class="ff-enquiry-kicker">Family&Flats Requirement Desk</span>',
      '  <h3>Tell us what you are looking for</h3>',
      '  <p>Share the basics. Your requirement will reach the Family&Flats CRM for follow-up.</p>',
      '</div>',
      '<div class="ff-enquiry-grid">',
      '  <label><span>Name *</span><input name="name" autocomplete="name" required></label>',
      '  <label><span>Mobile *</span><input name="phone" inputmode="tel" autocomplete="tel" required></label>',
      '  <label><span>Email</span><input name="email" type="email" autocomplete="email"></label>',
      '  <label><span>Looking to</span><select name="transactionType"><option value="BUY">Buy</option><option value="LEASE">Rent</option><option value="SELL">Sell</option><option value="LET">Lease out</option></select></label>',
      '  <label><span>Project</span><input name="project" placeholder="Preferred project"></label>',
      '  <label><span>Configuration</span><select name="configuration"><option value="">Any configuration</option><option>2 BHK</option><option>3 BHK</option><option>4 BHK</option><option>5 BHK</option></select></label>',
      '  <label><span>Budget / rent range</span><input name="budget" placeholder="Your preferred range"></label>',
      '  <label><span>Timeline</span><select name="timeline"><option value="">Select timeline</option><option>Immediate</option><option>Within 30 days</option><option>1-3 months</option><option>Exploring</option></select></label>',
      '  <label class="ff-enquiry-wide"><span>Anything specific?</span><textarea name="message" rows="3" placeholder="Floor, furnishing, view, visit timing or other preference"></textarea></label>',
      '  <input class="ff-enquiry-hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">',
      '</div>',
      '<div class="ff-enquiry-actions"><button type="submit">Send Requirement</button><span data-ff-enquiry-status aria-live="polite"></span></div>'
    ].join("");

    form.elements.name.value = original.name;
    form.elements.phone.value = original.phone;
    form.elements.email.value = original.email;
    form.elements.project.value = original.project;
    form.elements.transactionType.value = context.transactionType;
    if (original.configuration && form.elements.configuration) {
      form.elements.configuration.value = original.configuration;
    }
  }

  function submit(form) {
    var endpoint = apiUrl();
    var status = form.querySelector("[data-ff-enquiry-status]");
    if (!endpoint) {
      status.textContent = "Enquiry service is not configured yet.";
      status.dataset.state = "error";
      return;
    }

    var data = new FormData(form);
    var payload = {
      name: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      email: String(data.get("email") || "").trim(),
      transactionType: String(data.get("transactionType") || "BUY"),
      project: String(data.get("project") || "").trim(),
      configuration: String(data.get("configuration") || "").trim(),
      budget: String(data.get("budget") || "").trim(),
      timeline: String(data.get("timeline") || "").trim(),
      message: String(data.get("message") || "").trim(),
      company: String(data.get("company") || "").trim(),
      sourcePage: window.location.pathname + window.location.search,
      formId: form.id || form.dataset.formId || "website-enquiry"
    };

    if (!payload.name || !payload.phone) {
      status.textContent = "Please enter your name and mobile number.";
      status.dataset.state = "error";
      return;
    }

    var button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    status.textContent = "Sending...";
    status.dataset.state = "busy";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          if (!response.ok || body.ok === false) throw new Error(body.error || "Unable to submit.");
          return body;
        });
      })
      .then(function () {
        window.location.href = "/thank-you/?source=website-enquiry";
      })
      .catch(function (error) {
        status.textContent = error.message || "Unable to submit right now. Please call or WhatsApp us.";
        status.dataset.state = "error";
        if (button) button.disabled = false;
      });
  }

  function init() {
    document.querySelectorAll("form").forEach(function (form) {
      if (!isEnquiryForm(form)) return;
      render(form);
      if (form.dataset.ffEnquiryBound === "true") return;
      form.dataset.ffEnquiryBound = "true";
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        submit(form);
      }, true);
    });
  }

  window.FFEnquiry = { init: init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  document.addEventListener("ff:includes-loaded", init);
})();
