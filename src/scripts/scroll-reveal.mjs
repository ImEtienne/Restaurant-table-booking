const STAGGER = ".menu-category, .services-list > li, .card-avis > *, .about-value";
const SECTIONS = "main > section:not(#presentation):not(.about-hero)";
const EASE_MS = 700;

export function revealTargets(root = document) {
  const groups = [];
  for (const section of root.querySelectorAll(SECTIONS)) {
    for (const child of section.children) {
      const staggered = child.matches(STAGGER) ? [child] : [...child.querySelectorAll(STAGGER)];
      groups.push(staggered.length ? staggered : [child]);
    }
  }
  return groups;
}

export function mountScrollReveal(doc = document, win = window) {
  if (!("IntersectionObserver" in win)) return null;
  if (win.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;

  const reveal = (el) => {
    el.classList.add("is-revealed");
    const cleanup = () => el.classList.remove("reveal", "is-revealed");
    el.addEventListener("transitionend", (e) => e.propertyName === "opacity" && cleanup(), { once: true });
    win.setTimeout(cleanup, EASE_MS + 600);
  };

  const observer = new win.IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting && entry.boundingClientRect.top >= 0) continue;
      observer.unobserve(entry.target);
      reveal(entry.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  for (const group of revealTargets(doc)) {
    group.forEach((el, index) => {
      if (el.getBoundingClientRect().top < win.innerHeight) return;
      el.classList.add("reveal");
      el.style.setProperty("--reveal-delay", `${Math.min(index, 4) * 90}ms`);
      observer.observe(el);
    });
  }
  return observer;
}
