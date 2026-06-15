(function () {
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
    return fetch(path)
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
    if (footer && !footer.hasAttribute("data-include")) {
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
