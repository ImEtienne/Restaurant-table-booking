const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function scrollProgress(scrollY, scrollHeight, viewportHeight) {
  const max = scrollHeight - viewportHeight;
  if (!(max > 0)) return 0;
  return Math.min(1, Math.max(0, scrollY / max));
}

export function mountScrollTop(doc = document, win = window) {
  const button = doc.querySelector(".bton");
  if (!button || button.querySelector(".scroll-ring")) return null;

  button.insertAdjacentHTML("afterbegin", `
    <svg class="scroll-ring" viewBox="0 0 48 48" aria-hidden="true">
      <circle class="scroll-ring-track" cx="24" cy="24" r="${RADIUS}"></circle>
      <circle class="scroll-ring-bar" cx="24" cy="24" r="${RADIUS}" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${CIRCUMFERENCE}"></circle>
    </svg>`);
  const bar = button.querySelector(".scroll-ring-bar");

  let frame = 0;
  const update = () => {
    frame = 0;
    const progress = scrollProgress(win.scrollY, doc.documentElement.scrollHeight, win.innerHeight);
    bar.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
    button.classList.toggle("is-visible", win.scrollY > 200);
  };
  const onScroll = () => { frame ||= win.requestAnimationFrame(update); };

  win.addEventListener("scroll", onScroll, { passive: true });
  win.addEventListener("resize", onScroll);
  button.addEventListener("click", () => win.scrollTo({ top: 0, left: 0, behavior: "smooth" }));
  update();
  return button;
}
