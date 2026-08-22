// `<input type="datetime-local">` values have no timezone info and represent
// the browser's local wall-clock time. Sending that string to the backend
// as-is gets compared against real UTC time there, silently shifting sales
// windows/event times by the user's UTC offset. Convert to a real UTC ISO
// string at submission time so what the user picks is what the server means.
export function toUtcIso(datetimeLocalValue) {
  if (!datetimeLocalValue) return datetimeLocalValue;
  return new Date(datetimeLocalValue).toISOString();
}
