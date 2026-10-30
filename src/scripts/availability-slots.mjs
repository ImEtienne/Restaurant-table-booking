export function slotValue(slot) {
  return `${slot.service_key}|${slot.time}`;
}

export function parseSlotValue(value) {
  const [serviceKey = "", time = ""] = String(value).split("|");
  return { serviceKey, time };
}

export function slotLabel(slot, showService) {
  return showService ? `${slot.time} · ${slot.service_name}` : slot.time;
}

export function renderSlotOptions(select, slots, doc = select.ownerDocument) {
  const showService = new Set(slots.map((slot) => slot.service_key)).size > 1;
  const options = slots.map((slot) => {
    const option = doc.createElement("option");
    option.value = slotValue(slot);
    option.textContent = slotLabel(slot, showService);
    return option;
  });
  const placeholder = doc.createElement("option");
  placeholder.value = "";
  placeholder.textContent = options.length ? "Choisissez un créneau" : "Aucun créneau disponible";
  select.replaceChildren(placeholder, ...options);
  select.disabled = options.length === 0;
}
