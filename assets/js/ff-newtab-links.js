/* Project page: every link inside the page content opens in a new tab, so the visitor keeps this page.
   One delegated handler, so cards drawn later by ff-vv-inventory.js are covered too.
   Left alone: header/footer menus, in-page # jumps, tel:/mailto:/javascript: links, ctrl/shift/middle clicks (browser default). */
(function () {
  "use strict";
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || !a.closest("#main-content")) return;
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || /^(tel:|mailto:|javascript:)/i.test(href)) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;   // already opens in a new tab / is a download
    e.preventDefault();
    var w = window.open(a.href, "_blank", "noopener");
    if (!w) window.location.href = a.href;                              // popup blocked: fall back to same tab
  }, true);
})();
