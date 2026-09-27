import { z } from "zod";
import { phoneSchema } from "./contact";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v ? v : undefined))
    .optional();

export const addressSchema = z.object({
  city: z.string().trim().min(2, "יש להזין עיר").max(60),
  street: z.string().trim().min(2, "יש להזין רחוב").max(80),
  houseNumber: z.string().trim().min(1, "יש להזין מספר בית").max(10),
  apartment: optionalText(10),
  floor: optionalText(10),
  zip: z
    .string()
    .trim()
    .transform((v) => (v ? v : undefined))
    .pipe(z.string().regex(/^\d{7}$/, "מיקוד צריך להכיל 7 ספרות").optional())
    .optional(),
  notes: optionalText(300),
});

export const checkoutSchema = z
  .object({
    fullName: z.string().trim().min(2, "יש להזין שם מלא").max(80),
    email: z.email("כתובת דוא״ל לא תקינה").max(120).transform((v) => v.toLowerCase()),
    phone: phoneSchema,
    fulfillment: z.enum(["PICKUP", "DELIVERY"], { message: "יש לבחור אופן אספקה" }),
    shippingMethodId: z.string().min(1, "יש לבחור שיטת משלוח").max(40),
    address: addressSchema.optional(),
    notes: optionalText(500),
    saveAddress: z.boolean().optional(),
    acceptTerms: z.literal(true, { message: "יש לאשר את התקנון ומדיניות הפרטיות" }),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "DELIVERY" && !v.address) ctx.addIssue({ code: "custom", path: ["address"], message: "יש למלא כתובת למשלוח" });
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Converts flat FormData (address.city etc.) into the nested checkout shape. */
export function checkoutFromFormData(fd: FormData) {
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const fulfillment = get("fulfillment");
  return {
    fullName: get("fullName"),
    email: get("email"),
    phone: get("phone"),
    fulfillment,
    shippingMethodId: get("shippingMethodId"),
    notes: get("notes"),
    saveAddress: get("saveAddress") === "on",
    acceptTerms: get("acceptTerms") === "on",
    address:
      fulfillment === "DELIVERY"
        ? {
            city: get("city"),
            street: get("street"),
            houseNumber: get("houseNumber"),
            apartment: get("apartment"),
            floor: get("floor"),
            zip: get("zip"),
            notes: get("addressNotes"),
          }
        : undefined,
  };
}
