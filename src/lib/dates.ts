export const STORE_TZ = "Asia/Jerusalem";

/** Offset (ms) of the store timezone from UTC at a given instant. */
function tzOffsetMs(at: Date): number {
  const local = new Date(at.toLocaleString("en-US", { timeZone: STORE_TZ }));
  const utc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return local.getTime() - utc.getTime();
}

/** Parses "YYYY-MM-DDTHH:mm" (datetime-local, no zone) as Israel local time. */
export function parseStoreLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const asUtc = new Date(`${value.slice(0, 16)}:00Z`);
  if (Number.isNaN(asUtc.getTime())) return null;
  const first = new Date(asUtc.getTime() - tzOffsetMs(asUtc));
  // Re-evaluate once around DST transitions.
  return new Date(asUtc.getTime() - tzOffsetMs(first));
}
