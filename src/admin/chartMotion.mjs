import { animate, stagger } from "motion";

const reducedMotion = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const format = (value, digits = 0) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(value);

export function countUp(element, target, suffix = "") {
  const value = Number(target);
  if (!element || !Number.isFinite(value) || reducedMotion()) return;
  const digits = Number.isInteger(value) ? 0 : 1;
  animate(0, value, {
    duration: 0.9,
    ease: "easeOut",
    onUpdate: (current) => { element.textContent = `${format(current, digits)}${suffix}`; },
    onComplete: () => { element.textContent = `${format(value, digits)}${suffix}`; },
  });
}

export function animateCards(root) {
  if (reducedMotion()) return;
  animate(root.querySelectorAll(".admin-card"), { opacity: [0, 1], y: [14, 0] }, { duration: 0.5, delay: stagger(0.06), ease: "easeOut" });
}

export function animateCharts(root) {
  if (reducedMotion()) return;
  const bars = root.querySelectorAll("rect.chart-seg");
  if (bars.length) animate(bars, { scaleY: [0, 1] }, { duration: 0.6, delay: stagger(0.015), ease: [0.22, 1, 0.36, 1] });
  root.querySelectorAll("path.chart-line").forEach((line) => animate(line, { strokeDashoffset: [1, 0] }, { duration: 1.1, ease: "easeInOut" }));
  root.querySelectorAll("path.chart-area").forEach((area) => animate(area, { opacity: [0, 1] }, { duration: 0.9, delay: 0.25 }));
  const sparks = root.querySelectorAll(".kpi-spark .spark");
  if (sparks.length) animate(sparks, { opacity: [0, 1], x: [-8, 0] }, { duration: 0.6, delay: stagger(0.08), ease: "easeOut" });
  root.querySelectorAll("circle.chart-arc").forEach((arc, index) => {
    const dash = arc.getAttribute("stroke-dasharray");
    animate(arc, { strokeDasharray: ["0 100", dash], opacity: [0, 1] }, { duration: 0.8, delay: index * 0.1, ease: "easeOut" });
  });
}

export function mountChartInteractions(root) {
  const tip = document.createElement("div");
  tip.className = "chart-tooltip";
  tip.hidden = true;
  tip.setAttribute("role", "status");
  root.append(tip);
  let current = null;

  const fill = (data) => {
    const title = document.createElement("strong");
    title.textContent = data.title;
    const list = document.createElement("ul");
    for (const [status, name, value] of data.rows) {
      const item = document.createElement("li");
      item.className = `chart-${status}`;
      const label = document.createElement("span");
      label.textContent = name;
      const number = document.createElement("b");
      number.textContent = String(value);
      item.append(label, number);
      list.append(item);
    }
    tip.replaceChildren(title, list);
    if (data.rows.length > 1) {
      const total = document.createElement("p");
      total.textContent = `Total : ${data.total}`;
      tip.append(total);
    }
  };
  const place = (x, y) => {
    const margin = 14;
    const { width, height } = tip.getBoundingClientRect();
    const left = Math.min(Math.max(8, x + margin), window.innerWidth - width - 8);
    const top = y - height - margin < 8 ? y + margin : y - height - margin;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };
  const centerText = (svg, active) => {
    const value = svg.querySelector(".chart-donut-total");
    const label = svg.querySelector(".chart-donut-label");
    if (!value || !label) return;
    value.textContent = active ? active.dataset.value : value.dataset.default;
    label.textContent = active ? active.dataset.label : label.dataset.default;
  };
  const show = (target, x, y) => {
    if (current !== target) {
      hide();
      let data;
      try {
        data = JSON.parse(target.dataset.tip);
        if (!data || !Array.isArray(data.rows) || !data.rows.every((row) => Array.isArray(row) && row.length === 3)) return;
        fill(data);
      } catch { return; }
      current = target;
      target.classList.add("is-active");
      target.closest("svg").classList.add("has-active");
      centerText(target.closest("svg"), target);
      if (!reducedMotion()) animate(tip, { opacity: [0, 1], scale: [0.96, 1] }, { duration: 0.15 });
    }
    tip.hidden = false;
    place(x, y);
  };
  const hide = () => {
    if (!current) return;
    const svg = current.closest("svg");
    current.classList.remove("is-active");
    svg.classList.remove("has-active");
    centerText(svg, null);
    current = null;
    tip.hidden = true;
  };

  root.addEventListener("pointermove", (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (target) show(target, event.clientX, event.clientY);
    else hide();
  });
  root.addEventListener("pointerleave", hide);
  root.addEventListener("focusin", (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (!target) return;
    const box = target.getBoundingClientRect();
    show(target, box.left + box.width / 2, box.top);
  });
  root.addEventListener("focusout", hide);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") hide(); });
}
