(function () {
  "use strict";
  var box = document.querySelector(".vv-hero-image");
  if (!box) return;
  var slides = box.querySelectorAll(".vv-slides img"), dots = box.querySelector(".vv-dots");
  if (slides.length < 2 || !dots) return;
  var cur = 0, timer = null, reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  Array.prototype.forEach.call(slides, function (img, i) {
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", "Show photo " + (i + 1) + " of " + slides.length);
    b.addEventListener("click", function () { show(i); restart(); });
    dots.appendChild(b);
  });
  function show(n) {
    cur = (n + slides.length) % slides.length;
    Array.prototype.forEach.call(slides, function (img, i) { img.classList.toggle("on", i === cur); if (i === cur) img.removeAttribute("loading"); });
    Array.prototype.forEach.call(dots.children, function (b, i) { b.classList.toggle("on", i === cur); b.setAttribute("aria-selected", i === cur ? "true" : "false"); });
  }
  function restart() { stop(); if (!reduce) timer = setInterval(function () { show(cur + 1); }, 5000); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  box.addEventListener("mouseenter", stop); box.addEventListener("mouseleave", restart);
  box.addEventListener("focusin", stop); box.addEventListener("focusout", restart);
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else restart(); });
  show(0); restart();
})();
