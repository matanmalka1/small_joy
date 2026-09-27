import { Input } from "@/components/ui/field";

type Defaults = Partial<Record<"city" | "street" | "houseNumber" | "apartment" | "floor" | "zip" | "addressNotes", string>>;
type Errors = Record<string, string[] | undefined>;

/** Shared delivery address inputs (checkout + saved addresses). */
export function AddressFields({ defaults = {}, errors = {}, required = true }: { defaults?: Defaults; errors?: Errors; required?: boolean }) {
  const e = (k: string) => errors[k] ?? errors[`address.${k}`];
  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <Input label="עיר / יישוב" name="city" autoComplete="address-level2" required={required} defaultValue={defaults.city} error={e("city")} fieldClassName="sm:col-span-3" />
      <Input label="רחוב" name="street" autoComplete="address-line1" required={required} defaultValue={defaults.street} error={e("street")} fieldClassName="sm:col-span-3" />
      <Input label="מספר בית" name="houseNumber" required={required} defaultValue={defaults.houseNumber} error={e("houseNumber")} fieldClassName="sm:col-span-2" />
      <Input label="דירה" name="apartment" defaultValue={defaults.apartment} error={e("apartment")} fieldClassName="sm:col-span-2" />
      <Input label="קומה" name="floor" defaultValue={defaults.floor} error={e("floor")} fieldClassName="sm:col-span-2" />
      <Input label="מיקוד (אם ידוע)" name="zip" inputMode="numeric" dir="ltr" autoComplete="postal-code" defaultValue={defaults.zip} error={e("zip")} fieldClassName="sm:col-span-2" />
      <Input label="הערות לשליח" name="addressNotes" defaultValue={defaults.addressNotes} placeholder="קוד כניסה, שעות נוחות וכו׳" error={e("notes")} fieldClassName="sm:col-span-4" />
    </div>
  );
}
