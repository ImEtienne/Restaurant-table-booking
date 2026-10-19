const SELECTOR = ".admin-table-wrap:not(.is-scroll) table";

export function labelTables(root) {
  for (const table of root.querySelectorAll(SELECTOR)) {
    const labels = Array.from(table.querySelectorAll("thead th"), (th) => th.textContent.trim());
    table.setAttribute("role", "table");
    table.querySelectorAll("thead, tbody").forEach((group) => group.setAttribute("role", "rowgroup"));
    table.querySelectorAll("tr").forEach((row) => row.setAttribute("role", "row"));
    table.querySelectorAll("th").forEach((cell) => cell.setAttribute("role", "columnheader"));
    for (const row of table.querySelectorAll("tbody tr")) {
      Array.from(row.children).forEach((cell, index) => {
        cell.setAttribute("role", "cell");
        // Les lignes « aucun résultat » fusionnent les colonnes et n'ont pas de libellé.
        if (cell.colSpan > 1 || !labels[index]) cell.removeAttribute("data-label");
        else cell.setAttribute("data-label", labels[index]);
      });
    }
  }
}

export function mountTableLabels(doc = document, Observer = globalThis.MutationObserver) {
  const root = doc.querySelector(".admin-main");
  if (!root) return;
  labelTables(root);
  if (!Observer) return;
  let queued = false;
  new Observer(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; labelTables(root); });
  }).observe(root, { childList: true, subtree: true });
}
