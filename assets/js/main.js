(function () {
  function loadStyleOnce(href, id) {
    if (id && document.getElementById(id)) return;
    var link = document.createElement("link");
    if (id) link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function appOriginForCurrentEnvironment() {
    var host = String(window.location.hostname || "").toLowerCase();
    var port = String(window.location.port || "");
    var isLocalWebsitePreview =
      (host === "localhost" || host === "127.0.0.1") &&
      port === "8091";

    return isLocalWebsitePreview
      ? "http://localhost:3000"
      : "";
  }

  function routeAppLinks(scope) {
    var appOrigin = appOriginForCurrentEnvironment();
    if (!appOrigin) return;

    var root = scope || document;
    root.querySelectorAll("a[href]").forEach(function (anchor) {
      var href = anchor.getAttribute("href") || "";
      if (
        href === "/login" ||
        href === "/account" ||
        href === "/post-property" ||
        href.indexOf("/post-property/") === 0 ||
        href === "/founder" ||
        href.indexOf("/founder/") === 0
      ) {
        anchor.setAttribute("href", appOrigin + href);
      }
    });
  }

  function initHeaderInteractions(scope) {
    var root = scope || document;
    root.querySelectorAll(".ff-nav-dropdown-trigger").forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var dropdown = trigger.closest(".ff-nav-dropdown");
        document.querySelectorAll(".ff-nav-dropdown.is-open").forEach(function (item) {
          if (item !== dropdown) item.classList.remove("is-open");
        });
        var isOpen = dropdown.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    });

    root.querySelectorAll(".ff-nav-dropdown-menu").forEach(function (menu) {
      menu.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      menu.addEventListener("mousedown", function (event) {
        event.stopPropagation();
      });
    });

    document.addEventListener("click", function () {
      document.querySelectorAll(".ff-nav-dropdown.is-open").forEach(function (item) {
        item.classList.remove("is-open");
        var trigger = item.querySelector(".ff-nav-dropdown-trigger");
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      });
    });
  }

  function includeFragment(target, path) {
    var requestPath = path;
    var options;
    if (path.indexOf("footer.html") !== -1) {
      if (path.indexOf("?") === -1) requestPath = path + "?v=footer-standard-20260924c";
      options = { cache: "no-store" };
    }
    if (path.indexOf("header.html") !== -1) {
      if (path.indexOf("?") === -1) requestPath = path + "?v=header-standard-20260925a";
      options = { cache: "no-store" };
    }
    return fetch(requestPath, options)
      .then(function (response) {
        if (!response.ok) throw new Error(path + " failed with " + response.status);
        return response.text();
      })
      .then(function (html) {
        target.innerHTML = html;
        routeAppLinks(target);
        if (path.indexOf("header.html") !== -1) initHeaderInteractions(target);
      });
  }

  function loadIncludes() {
    routeAppLinks(document);

    var includes = document.querySelectorAll("[data-include]");
    includes.forEach(function (target) {
      includeFragment(target, target.getAttribute("data-include")).catch(function (error) {
        console.error("Include failed:", error);
      });
    });

    var header = document.getElementById("header-placeholder");
    if (header && !header.hasAttribute("data-include")) {
      loadStyleOnce("/assets/css/header.css?v=header-standard-20260925a", "ff-shared-header-style");
      includeFragment(header, "/header.html").catch(function (error) {
        console.error("Header include failed:", error);
      });
    }

    var footer = document.getElementById("footer-placeholder");
    if (!footer && !document.querySelector("footer")) {
      footer = document.createElement("div");
      footer.id = "footer-placeholder";
      document.body.appendChild(footer);
    }
    if (footer && !footer.hasAttribute("data-include")) {
      loadStyleOnce("/assets/css/footer.css?v=footer-standard-20260924c", "ff-shared-footer-style");
      includeFragment(footer, "/footer.html").catch(function (error) {
        console.error("Footer include failed:", error);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadIncludes);
  } else {
    loadIncludes();
  }
})();

/* Family&Flats Website Enquiry V1 */
(function () {
  if (!document.getElementById("ff-enquiry-css")) {
    var link = document.createElement("link");
    link.id = "ff-enquiry-css";
    link.rel = "stylesheet";
    link.href = "/assets/css/enquiry.css?v=enquiry-v1";
    document.head.appendChild(link);
  }
  if (!document.getElementById("ff-enquiry-js")) {
    var script = document.createElement("script");
    script.id = "ff-enquiry-js";
    script.src = "/assets/js/enquiry.js?v=enquiry-v1";
    document.head.appendChild(script);
  }
})();
