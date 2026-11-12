/* IREO Victory Valley hero: 3-photo collage, tap to open every overview photo full screen. */
(function () {
  "use strict";
  var box = document.querySelector(".vv-collage");
  if (!box) return;
  var P = [{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-06.jpg","w":1600,"h":742,"alt":"Clubhouse and pool from above, daytime"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-04.jpg","w":1600,"h":900,"alt":"Night aerial view of the pool and paths"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-01.jpg","w":1600,"h":656,"alt":"Swimming pool with towers and clubhouse"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-16.jpg","w":1600,"h":742,"alt":"Clubhouse and pool from above"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-07.jpg","w":1254,"h":1254,"alt":"Clubhouse pavilion by the pool"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-03.jpg","w":1600,"h":756,"alt":"Clubhouse plaza at night"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-11.jpg","w":1086,"h":1448,"alt":"Towers and pool under a blue sky"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-08.jpg","w":1087,"h":1447,"alt":"Pool and island garden with towers"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-02.jpg","w":1086,"h":1448,"alt":"Towers reflected in the pool"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-22.jpg","w":1600,"h":960,"alt":"Landscaped central greens"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-36.jpg","w":905,"h":1600,"alt":"Pool and greens seen from a tower"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-09.jpg","w":1086,"h":1448,"alt":"Flower beds, pool and towers"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-10.jpg","w":1086,"h":1448,"alt":"Tower and landscaped walk at dusk"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-12.jpg","w":1086,"h":1448,"alt":"Lit garden paths at night"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-13.jpg","w":1086,"h":1448,"alt":"Towers and garden walkway at night"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-24.jpg","w":1086,"h":1448,"alt":"Tower and lit garden at night"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-25.jpg","w":1086,"h":1448,"alt":"Garden lawn and tower at night"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-34.jpg","w":1086,"h":1448,"alt":"Garden steps and towers at night"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-44.jpg","w":1086,"h":1448,"alt":"Towers at night, looking up"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-05.jpg","w":1448,"h":1086,"alt":"Tower at dusk between the buildings"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-43.jpg","w":721,"h":1600,"alt":"Tower seen from the garden"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-41.jpg","w":743,"h":1600,"alt":"Pool water and towers"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-15.jpg","w":738,"h":1600,"alt":"White flower beds near the towers"},{"src":"/projects/ireovictoryvalley/images/ff-vv-ov-20.jpg","w":1600,"h":756,"alt":"Clubhouse restaurant seating"}];
  var dlg, img, cap, cur = 0, last = null;
  function build() {
    dlg = document.createElement("div");
    dlg.className = "vv-lb"; dlg.hidden = true;
    dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true"); dlg.setAttribute("aria-label", "IREO Victory Valley photos");
    dlg.innerHTML = '<button type="button" class="vv-lb-x" aria-label="Close photos">\u00d7</button>' +
      '<button type="button" class="vv-lb-prev" aria-label="Previous photo">\u2039</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="vv-lb-next" aria-label="Next photo">\u203a</button>';
    document.body.appendChild(dlg);
    img = dlg.querySelector("img"); cap = dlg.querySelector("figcaption");
    dlg.querySelector(".vv-lb-x").onclick = close;
    dlg.querySelector(".vv-lb-prev").onclick = function () { show(cur - 1); };
    dlg.querySelector(".vv-lb-next").onclick = function () { show(cur + 1); };
    dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") show(cur - 1); else if (e.key === "ArrowRight") show(cur + 1);
    });
    var x0 = null;
    dlg.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener("touchend", function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
  }
  function show(n) {
    cur = (n + P.length) % P.length;
    img.src = P[cur].src; img.alt = P[cur].alt; img.width = P[cur].w; img.height = P[cur].h;
    cap.textContent = P[cur].alt + "  \u00b7  " + (cur + 1) + " / " + P.length;
    var nx = new Image(); nx.src = P[(cur + 1) % P.length].src;
  }
  function open(n) {
    if (!dlg) build();
    last = document.activeElement; dlg.hidden = false; document.documentElement.style.overflow = "hidden";
    show(n); dlg.querySelector(".vv-lb-next").focus();
  }
  function close() { dlg.hidden = true; document.documentElement.style.overflow = ""; if (last) last.focus(); }
  box.addEventListener("click", function (e) { var t = e.target.closest(".vv-tile"); if (t) open(Number(t.dataset.i) || 0); });
})();
