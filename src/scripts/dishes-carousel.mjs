export function mountDishesCarousel(doc = document) {
  const track = doc.getElementById("popular-track");
  const prev = doc.getElementById("popular-prev");
  const next = doc.getElementById("popular-next");
  if (!track || !prev || !next) return;
  const step = () => (track.firstElementChild?.getBoundingClientRect().width || track.clientWidth) + 20;
  const scroll = (direction) => track.scrollBy({ left: direction * step(), behavior: "smooth" });
  prev.addEventListener("click", () => scroll(-1));
  next.addEventListener("click", () => scroll(1));
}
