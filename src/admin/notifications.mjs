const notificationLabels = {
  client_registered: "Inscription client",
  reservation_created: "Nouvelle réservation",
  reservation_updated: "Réservation modifiée",
  reservation_cancelled: "Réservation annulée",
};

export function mountNotifications({ api, onSessionError, onOpenClient, onOpenCenter, doc = document }) {
  const $ = (name) => doc.getElementById(`admin-notifications${name ? `-${name}` : ""}`);
  const toggle = $(""), panel = $("panel"), badge = $("badge"), status = $("status");
  const list = $("list"), retry = $("retry"), readAll = $("read-all"), summary = $("summary");
  const pagination = $("pagination"), prev = $("prev"), next = $("next"), pageLabel = $("page");
  const center = $("center"), centerList = $("center-list"), centerDetail = $("center-detail");
  const centerStatus = $("center-status"), centerRetry = $("center-retry"), centerSummary = $("center-summary");
  const centerReadAll = $("center-read-all"), centerPagination = $("center-pagination");
  const centerPrev = $("center-prev"), centerNext = $("center-next"), centerPage = $("center-page");
  let enabled = false, busy = false, revision = 0, page = 1, total = 0, unread = 0;
  let centerActive = false, selectedId = null, currentItems = [];

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }

  function setBusy(value) {
    busy = value;
    panel.setAttribute("aria-busy", String(value));
    center.setAttribute("aria-busy", String(value));
    readAll.disabled = value;
    centerReadAll.disabled = value;
    prev.disabled = value || page <= 1;
    next.disabled = value || page * 20 >= total;
    centerPrev.disabled = prev.disabled;
    centerNext.disabled = next.disabled;
    list.querySelectorAll("button").forEach((button) => { button.disabled = value; });
    centerList.querySelectorAll("button").forEach((button) => { button.disabled = value; });
    centerDetail.querySelectorAll("button").forEach((button) => { button.disabled = value; });
  }

  function centerElement(tag, text, parent, className = "") {
    const node = doc.createElement(tag);
    if (text !== null) node.textContent = text;
    if (className) node.className = className;
    parent.append(node);
    return node;
  }

  function renderCenter(restoreFocus = false) {
    centerList.replaceChildren();
    centerDetail.replaceChildren();
    if (!currentItems.some((item) => item.id === selectedId)) selectedId = currentItems[0]?.id || null;
    let selectedButton = null;
    for (const notification of currentItems) {
      const item = centerElement("li", null, centerList);
      const select = centerElement("button", null, item, `admin-notification-center-row${notification.read_at === null ? " is-unread" : ""}${notification.id === selectedId ? " is-selected" : ""}`);
      select.type = "button";
      select.setAttribute("aria-pressed", String(notification.id === selectedId));
      if (notification.id === selectedId) selectedButton = select;
      const name = typeof notification.name === "string" ? notification.name.trim() : "";
      const avatar = centerElement("span", name ? Array.from(name)[0].toLocaleUpperCase("fr") : "•", select, "admin-notifications-avatar");
      avatar.setAttribute("aria-hidden", "true");
      const text = centerElement("span", null, select, "admin-notification-center-row-text");
      centerElement("strong", name || notificationLabels[notification.type] || "Notification", text);
      centerElement("span", notification.message, text);
      select.addEventListener("click", () => { selectedId = notification.id; renderCenter(true); });
    }
    if (restoreFocus) selectedButton?.focus();
    const selected = currentItems.find((item) => item.id === selectedId);
    if (!selected) {
      centerElement("p", "Aucune notification à afficher.", centerDetail, "admin-notification-center-placeholder");
      return;
    }
    const label = notificationLabels[selected.type] || "Notification";
    const name = typeof selected.name === "string" ? selected.name.trim() : "";
    centerElement("span", selected.read_at === null ? "Non lue" : "Lue", centerDetail, "admin-notification-center-state");
    centerElement("h2", name || label, centerDetail);
    if (name) centerElement("p", label, centerDetail, "admin-notification-center-category");
    const card = centerElement("div", null, centerDetail, "admin-notification-center-message");
    centerElement("p", selected.message, card);
    if (selected.created_at) {
      const date = new Date(selected.created_at);
      if (!Number.isNaN(date.getTime())) {
        const time = centerElement("time", new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date), card);
        time.dateTime = selected.created_at;
      }
    }
    const actions = centerElement("div", null, centerDetail, "admin-notification-center-actions");
    if (selected.type === "client_registered") {
      if (Number.isSafeInteger(selected.user_id) && selected.user_id > 0) {
        const open = centerElement("button", "Voir le compte", actions);
        open.type = "button";
        open.addEventListener("click", () => onOpenClient(selected.user_id));
      } else {
        centerElement("p", "Impossible d’ouvrir ce compte : identifiant client invalide.", centerDetail);
      }
    }
    if (selected.read_at === null) {
      const mark = centerElement("button", "Marquer comme lu", actions);
      mark.type = "button";
      mark.addEventListener("click", () => run(() => api.readNotification(selected.id)));
    }
  }

  function render(response) {
    const meta = response?.meta;
    if (!Array.isArray(response?.data) || !Number.isInteger(meta?.unread_count) || meta.unread_count < 0 ||
        !Number.isInteger(meta.total) || meta.total < 0 || !Number.isInteger(meta.current_page) || meta.current_page < 1 ||
        response.data.some((item) => typeof item?.id !== "string" || typeof item.message !== "string" || !("read_at" in item))) {
      throw new Error("La réponse des notifications est invalide.");
    }
    unread = meta.unread_count;
    total = meta.total;
    page = meta.current_page;
    badge.hidden = unread === 0;
    badge.textContent = unread > 99 ? "99+" : String(unread);
    toggle.setAttribute("aria-label", unread ? `Notifications : ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications");
    readAll.hidden = unread === 0;
    summary.hidden = false;
    summary.textContent = unread ? `${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}` : "Toutes vos notifications sont lues";
    centerSummary.textContent = summary.textContent;
    centerReadAll.hidden = unread === 0;
    centerPagination.hidden = total <= 20;
    centerPage.textContent = `Page ${page} / ${Math.max(1, Math.ceil(total / 20))}`;
    currentItems = response.data;
    renderCenter();
    list.replaceChildren();
    for (const notification of response.data) {
      const item = doc.createElement("li");
      item.className = `admin-notifications-item${notification.read_at === null ? " is-unread" : ""}`;
      const label = notificationLabels[notification.type] || "Notification";
      const name = typeof notification.name === "string" ? notification.name.trim() : "";
      const row = centerElement("button", null, item, "admin-notifications-row");
      row.type = "button";
      row.setAttribute("aria-label", `${name || label} : ${notification.message}${notification.read_at === null ? " (non lue)" : ""}. Voir le détail`);
      row.addEventListener("click", () => {
        selectedId = notification.id;
        renderCenter();
        setOpen(false);
        onOpenCenter();
      });
      const avatar = centerElement("span", name ? Array.from(name)[0].toLocaleUpperCase("fr") : "•", row, "admin-notifications-avatar");
      avatar.setAttribute("aria-hidden", "true");
      const content = centerElement("span", null, row, "admin-notifications-content");
      centerElement("strong", name || label, content);
      centerElement("span", notification.message, content);
      const arrow = centerElement("span", "→", row, "admin-notifications-arrow");
      arrow.setAttribute("aria-hidden", "true");
      list.append(item);
    }
    status.textContent = response.data.length ? "" : "Aucune notification pour le moment.";
    pagination.hidden = total <= 20;
    pageLabel.textContent = `Page ${page} / ${Math.max(1, Math.ceil(total / 20))}`;
  }

  async function run(action, requestedPage = page) {
    if (!enabled || busy) return;
    const token = revision;
    setBusy(true);
    retry.hidden = true;
    centerRetry.hidden = true;
    status.textContent = "Chargement des notifications…";
    centerStatus.textContent = status.textContent;
    try {
      if (action) await action();
      const response = await api.notifications(requestedPage);
      if (token === revision && enabled) render(response);
      if (token === revision && enabled) centerStatus.textContent = response.data.length ? "" : "Aucune notification pour le moment.";
    } catch (error) {
      if (token !== revision || !enabled) return;
      if ([401, 403, 419].includes(error.status)) onSessionError(error);
      status.textContent = `Impossible de charger les notifications : ${error.message}`;
      centerStatus.textContent = status.textContent;
      retry.hidden = false;
      centerRetry.hidden = false;
    } finally {
      if (token === revision) setBusy(false);
    }
  }

  toggle.addEventListener("click", () => {
    const open = panel.hidden;
    setOpen(open);
    if (open) run(null, 1);
  });
  readAll.addEventListener("click", () => run(() => api.readAllNotifications()));
  retry.addEventListener("click", () => run(null));
  centerRetry.addEventListener("click", () => run(null));
  centerReadAll.addEventListener("click", () => run(() => api.readAllNotifications()));
  $("view-all").addEventListener("click", () => { setOpen(false); onOpenCenter(); });
  prev.addEventListener("click", () => { if (page > 1) run(null, page - 1); });
  next.addEventListener("click", () => { if (page * 20 < total) run(null, page + 1); });
  centerPrev.addEventListener("click", () => { if (page > 1) run(null, page - 1); });
  centerNext.addEventListener("click", () => { if (page * 20 < total) run(null, page + 1); });
  doc.addEventListener("click", (event) => {
    if (!panel.hidden && !panel.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });
  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });

  return {
    setCenterActive(value) {
      if (centerActive === value) return;
      centerActive = value;
      if (value && enabled && !busy) run(null, page);
    },
    setEnabled(value) {
      if (enabled === value) return;
      enabled = value;
      toggle.hidden = !value;
      if (value) {
        run(null, 1);
      } else {
        revision++;
        busy = false;
        setOpen(false);
        badge.hidden = true;
        summary.hidden = true;
        summary.textContent = "";
        readAll.hidden = true;
        retry.hidden = true;
        pagination.hidden = true;
        list.replaceChildren();
        centerList.replaceChildren();
        centerDetail.replaceChildren();
        centerStatus.textContent = "";
        centerSummary.textContent = "";
        centerReadAll.hidden = true;
        centerRetry.hidden = true;
        centerPagination.hidden = true;
        currentItems = [];
        selectedId = null;
        status.textContent = "";
        page = 1;
        total = unread = 0;
      }
    },
  };
}
