export const NUMBER_FIELDS = ["day_of_week", "slot_interval_minutes", "duration_minutes", "capacity_guests"];
export const HOUR_FIELD_NAMES = ["opens_at", "closes_at", "slot_interval_minutes", "duration_minutes", "capacity_guests"];

export function schedulePayload(values, { creating }) {
  const body = {
    service_name: values.service_name.trim(),
    opens_at: values.opens_at,
    closes_at: values.closes_at,
    slot_interval_minutes: Number(values.slot_interval_minutes),
    duration_minutes: Number(values.duration_minutes),
    capacity_guests: Number(values.capacity_guests),
  };
  if (creating) {
    body.service_key = values.service_key.trim();
    body.day_of_week = Number(values.day_of_week);
  }
  return body;
}

export function exceptionPayload(values, { creating }) {
  const closed = Boolean(values.is_closed);
  const body = { start_date: values.start_date, end_date: values.end_date, is_closed: closed };
  if (creating) body.service_key = values.service_key.trim();
  if (!closed) {
    body.service_name = values.service_name.trim();
    for (const name of HOUR_FIELD_NAMES) body[name] = NUMBER_FIELDS.includes(name) ? Number(values[name]) : values[name];
  }
  return body;
}
