export function toDateInput(d: Date | null | undefined) {
  if (!d) return "";
  // datetime-local expects local time without zone; admin works in Israel time.
  const il = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${il.getFullYear()}-${pad(il.getMonth() + 1)}-${pad(il.getDate())}T${pad(il.getHours())}:${pad(il.getMinutes())}`;
}
