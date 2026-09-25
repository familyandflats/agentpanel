(function () {
  function loadStyleOnce(href, id) {
    if (id && document.getElementById(id)) return;
    var link = document.createElement("link");
    if (id) link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
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
    return fetch(requestPath, options)
      .then(function (response) {
        if (!response.ok) throw new Error(path + " failed with " + response.status);
        return response.text();
      })
      .then(function (html) {
        target.innerHTML = html;
        if (path.indexOf("header.html") !== -1) initHeaderInteractions(target);
      });
  }

  function loadIncludes() {
    var includes = document.querySelectorAll("[data-include]");
    includes.forEach(function (target) {
      includeFragment(target, target.getAttribute("data-include")).catch(function (error) {
        console.error("Include failed:", error);
      });
    });

    var header = document.getElementById("header-placeholder");
    if (header && !header.hasAttribute("data-include")) {
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
