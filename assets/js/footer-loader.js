(function () {
  var VERSION = "footer-standard-20260924c";
  function ensureStyle() {
    if (document.getElementById("ff-shared-footer-style")) return;
    var link = document.createElement("link");
    link.id = "ff-shared-footer-style";
    link.rel = "stylesheet";
    link.href = "/assets/css/footer.css?v=" + VERSION;
    document.head.appendChild(link);
  }
  function loadFooter() {
    var target = document.getElementById("footer-placeholder");
    if (!target) {
      if (document.querySelector("footer")) return;
      target = document.createElement("div");
      target.id = "footer-placeholder";
      document.body.appendChild(target);
    }
    ensureStyle();
    fetch("/footer.html?v=" + VERSION, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("footer.html failed with " + response.status);
        return response.text();
      })
      .then(function (html) {
        target.innerHTML = html;
        document.dispatchEvent(new CustomEvent("ff:footer-loaded"));
      })
      .catch(function (error) { console.error("Footer include failed:", error); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadFooter);
  else loadFooter();
})();
