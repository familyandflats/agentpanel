/* Family&Flats project pages: the hero "Ask for current flats" bar fills the enquiry form and takes the
   visitor to it (projects with no listings on the website yet). */
(function () {
  "use strict";
  var ask = document.getElementById("pjb-ask");
  var looking = document.getElementById("vv-looking"), config = document.getElementById("vv-config");
  var type = "BUY";
  function go() {
    if (looking) looking.value = type;
    var bhk = document.getElementById("pjb-bhk");
    if (config && bhk && bhk.value) config.value = bhk.value;
    var target = document.getElementById("enquire");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    var name = document.getElementById("vv-name");
    if (name) setTimeout(function () { try { name.focus({ preventScroll: true }); } catch (e) { name.focus(); } }, 450);
  }
  if (ask) {
    Array.prototype.forEach.call(ask.querySelectorAll(".vvb-seg button"), function (b) {
      b.addEventListener("click", function () {
        type = b.getAttribute("data-type") || "BUY";
        Array.prototype.forEach.call(ask.querySelectorAll(".vvb-seg button"), function (x) {
          var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
    });
    ask.addEventListener("submit", function (e) { e.preventDefault(); go(); });
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-ask]"), function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); go(); });
  });
})();
