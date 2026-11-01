import { statusLabels } from "./reservationTable.mjs";

export function validatePeriod({ start_date, end_date }) {
  if (!start_date || !end_date) return "";
  const days = (Date.parse(end_date) - Date.parse(start_date)) / 86400000 + 1;
  if (days < 1) return "La fin de période doit être postérieure ou égale au début.";
  if (days > 366) return "La période ne peut pas dépasser 366 jours inclus.";
  return "";
}

export const chartStatuses = [
  ["pending", "En attente"],
  ["confirmed", "Confirmées"],
  ["rejected", "Refusées"],
  ["cancelled", "Annulées"],
];

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const count = (value) => Math.max(0, Number(value) || 0);

const totalOf = (item) => chartStatuses.reduce((sum, [status]) => sum + count(item?.[status]), 0);
const tipData = (title, item) => escapeHtml(JSON.stringify({ title, total: totalOf(item), rows: chartStatuses.map(([status, name]) => [status, name, count(item[status])]) }));

let svgId = 0;
const fixed = (value) => Number(value.toFixed(2));

// Courbe monotone : lisse sans jamais dépasser les valeurs réelles (pas de comptes négatifs).
export function monotonePath(points) {
  const n = points.length;
  if (n < 2) return "";
  const dx = [], slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1][0] - points[i][0]);
    slope.push((points[i + 1][1] - points[i][1]) / (dx[i] || 1));
  }
  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i++) tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  tangent.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { tangent[i] = 0; tangent[i + 1] = 0; continue; }
    const a = tangent[i] / slope[i], b = tangent[i + 1] / slope[i], s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); tangent[i] = tau * a * slope[i]; tangent[i + 1] = tau * b * slope[i]; }
  }
  let path = `M${fixed(points[0][0])},${fixed(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1], third = dx[i] / 3;
    path += ` C${fixed(x0 + third)},${fixed(y0 + tangent[i] * third)} ${fixed(x1 - third)},${fixed(y1 - tangent[i + 1] * third)} ${fixed(x1)},${fixed(y1)}`;
  }
  return path;
}

export function renderStackedBars(rows, key, label, { width = 640, height = 180 } = {}) {
  if (!rows.length) return "";
  const top = 10, bottom = 26, left = 28, right = 6;
  const plot = height - top - bottom;
  const slot = (width - left - right) / rows.length;
  const barWidth = Math.min(16, Math.max(4, slot * 0.5));
  const max = Math.max(2, Math.ceil(Math.max(...rows.map(totalOf)) / 2) * 2);
  const step = Math.ceil(rows.length / 8);
  let body = "";
  for (const tick of [0, max / 2, max]) {
    const y = top + plot - (tick / max) * plot;
    body += `<line class="chart-grid" x1="${left}" x2="${width - right}" y1="${y}" y2="${y}"/><text class="chart-axis" x="${left - 8}" y="${y + 3}" text-anchor="end">${tick}</text>`;
  }
  rows.forEach((item, index) => {
    const slotX = left + index * slot;
    const x = slotX + (slot - barWidth) / 2;
    const title = String(item[key]);
    const clipId = `pill-${++svgId}`;
    let y = top + plot;
    let bars = "";
    for (const [status] of chartStatuses) {
      const h = (count(item[status]) / max) * plot;
      if (h <= 0) continue;
      y -= h;
      bars += `<rect class="chart-seg chart-${status}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}"/>`;
    }
    const pill = `x="${x.toFixed(1)}" y="${top}" width="${barWidth.toFixed(1)}" height="${plot}" rx="${(barWidth / 2).toFixed(1)}"`;
    body += `<g class="chart-col" tabindex="0" role="img" aria-label="${escapeHtml(title)} : ${totalOf(item)} réservation(s)" data-tip="${tipData(title, item)}"><clipPath id="${clipId}"><rect ${pill}/></clipPath><rect class="chart-track" ${pill}/><g clip-path="url(#${clipId})">${bars}</g><rect class="chart-hit" x="${slotX.toFixed(1)}" y="${top}" width="${slot.toFixed(1)}" height="${plot}"/></g>`;
    if (index % step === 0) body += `<text class="chart-axis" x="${(x + barWidth / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle">${escapeHtml(label(item[key]))}</text>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="Histogramme des réservations par statut">${body}</svg>`;
}

export function renderAreaChart(rows, key, label, title = String) {
  if (!rows.length) return "";
  const width = 640, height = 200, top = 16, bottom = 26, left = 28, right = 12;
  const plotWidth = width - left - right, plot = height - top - bottom, base = top + plot;
  const max = Math.max(2, Math.ceil(Math.max(...rows.map(totalOf)) / 2) * 2);
  const xAt = (index) => rows.length === 1 ? left + plotWidth / 2 : left + (index / (rows.length - 1)) * plotWidth;
  const yAt = (value) => base - (value / max) * plot;
  const points = rows.map((item, index) => [xAt(index), yAt(totalOf(item))]);
  const drawn = rows.length === 1 ? [[left, points[0][1]], [width - right, points[0][1]]] : points;
  const line = monotonePath(drawn);
  const gradient = `area-${++svgId}`;
  const slot = rows.length === 1 ? plotWidth : plotWidth / (rows.length - 1);
  const step = Math.ceil(rows.length / 8);
  let body = `<defs><linearGradient id="${gradient}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--admin-accent)" stop-opacity=".28"/><stop offset="1" style="stop-color:var(--admin-accent)" stop-opacity="0"/></linearGradient></defs>`;
  for (const tick of [0, max / 2, max]) {
    const y = yAt(tick);
    body += `<line class="chart-grid" x1="${left}" x2="${width - right}" y1="${y}" y2="${y}"/><text class="chart-axis" x="${left - 8}" y="${y + 3}" text-anchor="end">${tick}</text>`;
  }
  body += `<path class="chart-area" d="${line} L${fixed(drawn.at(-1)[0])},${base} L${fixed(drawn[0][0])},${base} Z" fill="url(#${gradient})"/><path class="chart-line" d="${line}" pathLength="1"/>`;
  rows.forEach((item, index) => {
    const [x, y] = points[index];
    const name = title(item[key]);
    body += `<g class="chart-col chart-point" tabindex="0" role="img" aria-label="${escapeHtml(name)} : ${totalOf(item)} réservation(s)" data-tip="${tipData(name, item)}"><rect class="chart-hit" x="${fixed(x - slot / 2)}" y="${top}" width="${fixed(slot)}" height="${plot}"/><line class="chart-guide" x1="${fixed(x)}" x2="${fixed(x)}" y1="${top}" y2="${base}"/><circle class="chart-dot" cx="${fixed(x)}" cy="${fixed(y)}" r="4"/></g>`;
    if (index % step === 0) body += `<text class="chart-axis" x="${fixed(x)}" y="${height - 10}" text-anchor="middle">${escapeHtml(label(item[key]))}</text>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="Évolution des réservations par jour">${body}</svg>`;
}

export function renderSparkline(values, tone = "neutral") {
  const data = values.map((value) => Number(value) || 0);
  if (!data.length) return "";
  const series = data.length === 1 ? [data[0], data[0]] : data;
  const width = 100, height = 40, pad = 4;
  const min = Math.min(...series), span = Math.max(...series) - min;
  const points = series.map((value, index) => [(index / (series.length - 1)) * width, span ? height - pad - ((value - min) / span) * (height - pad * 2) : height / 2]);
  const line = monotonePath(points);
  const id = `spark-${++svgId}`;
  return `<svg class="spark is-${tone}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".25"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="spark-area" d="${line} L${width},${height} L0,${height} Z" fill="url(#${id})"/><path class="spark-line" d="${line}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

// Tendance interne à la période : seconde moitié comparée à la première.
export function trendOf(values, mode = "sum") {
  const data = values.map(count);
  const half = Math.floor(data.length / 2);
  if (half < 1) return null;
  const aggregate = (part) => part.reduce((sum, value) => sum + value, 0) / (mode === "avg" ? part.length : 1);
  const before = aggregate(data.slice(0, half)), after = aggregate(data.slice(data.length - half));
  if (before === 0) return after === 0 ? { percent: 0, direction: "flat" } : null;
  const percent = Math.round(((after - before) / before) * 100);
  return { percent, direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat" };
}

export function formatTrend(trend) {
  if (!trend) return "";
  const arrow = { up: "↑", down: "↓", flat: "→" }[trend.direction];
  return `${arrow} ${trend.percent > 0 ? "+" : trend.percent < 0 ? "−" : ""}${Math.abs(trend.percent)} %`;
}

export function kpiTone(trend, inverse = false) {
  if (!trend || trend.direction === "flat") return "neutral";
  return (trend.direction === "up") !== inverse ? "good" : "bad";
}

export function kpiSeries(daily) {
  let lastRate = 0;
  const rate = daily.map((item) => {
    const total = count(item.total_reservations);
    if (total) lastRate = (count(item.confirmed) / total) * 100;
    return lastRate;
  });
  return {
    total: daily.map((item) => count(item.total_reservations)),
    pending: daily.map((item) => count(item.pending)),
    confirmed: daily.map((item) => count(item.confirmed)),
    "confirmed-guests": daily.map((item) => count(item.confirmed_guests)),
    rate,
  };
}

export function renderDonut(summary) {
  const radius = 15.9155;
  const total = chartStatuses.reduce((sum, [status]) => sum + count(summary?.[status]), 0);
  if (!total) return "";
  const active = chartStatuses.filter(([status]) => count(summary[status]) > 0).length;
  const gap = active > 1 ? 0.8 : 0;
  let offset = 25;
  let arcs = "";
  for (const [status, name] of chartStatuses) {
    const value = count(summary[status]);
    if (!value) continue;
    const share = (value / total) * 100;
    const percent = Math.round(share * 10) / 10;
    const tip = escapeHtml(JSON.stringify({ title: name, total: value, rows: [[status, `${percent} % des réservations`, value]] }));
    arcs += `<circle class="chart-seg chart-arc chart-${status}" tabindex="0" role="img" aria-label="${name} : ${value} (${percent} %)" data-tip="${tip}" data-value="${value}" data-label="${name}" cx="21" cy="21" r="${radius}" fill="none" stroke-width="3.6" stroke-dasharray="${Math.max(share - gap, 0.1).toFixed(2)} ${(100 - Math.max(share - gap, 0.1)).toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"/>`;
    offset -= share;
  }
  const text = `<text class="chart-donut-total" x="21" y="22.5" text-anchor="middle" data-default="${total}">${total}</text><text class="chart-donut-label" x="21" y="27" text-anchor="middle" data-default="réservations">réservations</text>`;
  return `<svg viewBox="0 0 42 42" role="group" aria-label="Répartition des réservations par statut">${arcs}${text}</svg>`;
}

export function renderLegend(summary, doc = document) {
  const list = doc.createElement("ul");
  list.className = "chart-legend";
  for (const [status, name] of chartStatuses) {
    const item = doc.createElement("li");
    item.className = `chart-${status}`;
    item.textContent = summary ? `${name} : ${count(summary[status])}` : name;
    list.append(item);
  }
  return list;
}

export function recentReservations(reservations, limit = 6) {
  return [...reservations].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, limit);
}

const pad = (value) => String(value).padStart(2, "0");
export const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export function shiftDate(iso, days) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function renderCalendarDay(iso, reservations, total, formatDay, limit = 4) {
  const items = [...reservations].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const rows = items.slice(0, limit).map((reservation) => {
    const status = Object.hasOwn(statusLabels, reservation.status) ? reservation.status : "";
    return `<li class="cal-item chart-${status}"><time>${escapeHtml(String(reservation.time ?? "").slice(0, 5))}</time><span class="cal-bar" aria-hidden="true"></span><div><small>${escapeHtml(`${reservation.guests} pers. · ${statusLabels[reservation.status] || "Inconnu"}`)}</small><strong>${escapeHtml(reservation.name)}</strong></div></li>`;
  }).join("");
  const hidden = Math.max(count(total), items.length) - Math.min(items.length, limit);
  const more = hidden > 0 ? `<li class="cal-more"><a href="#reservations">+ ${hidden} autre(s)</a></li>` : "";
  const body = rows ? `<ul>${rows}${more}</ul>` : "<p>Aucune réservation</p>";
  return `<section class="cal-day"><h3>${escapeHtml(formatDay(iso))}</h3>${body}</section>`;
}
