export function mountStatsScroller(doc = document, win = window) {
  const track = doc.getElementById("admin-stats");
  const prev = doc.getElementById("admin-stats-prev");
  const next = doc.getElementById("admin-stats-next");
  if (!track || !prev || !next) return;
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    prev.hidden = track.scrollLeft <= 2;
    next.hidden = max <= 2 || track.scrollLeft >= max - 2;
  };
  const step = (direction) => track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  track.addEventListener("scroll", update, { passive: true });
  win.addEventListener("resize", update);
  // La section est masquée jusqu'au chargement de la session : les tailles ne sont connues qu'ensuite.
  if (win.ResizeObserver) new win.ResizeObserver(update).observe(track);
  update();
}
