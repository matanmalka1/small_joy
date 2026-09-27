import { expect, test } from "@playwright/test";

test.describe("guest purchase flow", () => {
  test("browse → variant → cart → coupon → pickup checkout → sandbox approve → paid", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("לבית ולשמחות");

    // Product with variants
    await page.goto("/p/cotton-bedding-set");
    // Single / white is not on sale, so the demo coupon (no sale stacking) applies.
    await page.getByRole("button", { name: "יחיד" }).click();
    await page.getByRole("button", { name: "לבן" }).click();
    await page.getByRole("button", { name: "הגדלת כמות" }).click();
    await page.getByRole("button", { name: "הוספה לסל", exact: true }).click();
    await expect(page.getByText("המוצר נוסף לסל")).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /סל הקניות/ })).toBeVisible();
    await expect(page.getByText("סט מצעים 100% כותנה").first()).toBeVisible();

    // Coupon (demo coupon: 10% on non-sale items, min ₪100)
    await page.getByLabel("קוד קופון").fill("welcome10");
    await page.getByRole("button", { name: "החלה" }).click();
    await expect(page.getByText(/קופון:/)).toBeVisible();
    await expect(page.getByText("הנחת קופון (WELCOME10)")).toBeVisible();

    await page.getByRole("link", { name: "מעבר לקופה" }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByLabel("שם מלא").fill("ישראל ישראלי");
    await page.getByLabel("דוא״ל").fill(`guest${Date.now()}@example.com`);
    await page.getByLabel("טלפון נייד").fill("0501234567");
    await page.locator("input[name=fulfillment][value=PICKUP]").check();
    await page.getByRole("checkbox", { name: /קראתי ואני מאשר/ }).check();
    await page.getByRole("button", { name: "מעבר לתשלום מאובטח באשראי" }).click();

    await expect(page).toHaveURL(/\/sandbox-pay\//);
    await expect(page.getByText("לא מתבצע חיוב אמיתי")).toBeVisible();
    await page.getByRole("button", { name: "אישור תשלום (בדיקה)" }).click();

    await expect(page).toHaveURL(/\/checkout\/return/);
    await expect(page.getByRole("heading", { name: "תודה! ההזמנה התקבלה" })).toBeVisible();
    await expect(page.getByText("תשלום: שולם")).toBeVisible();

    // Cart is emptied after a verified payment
    await page.goto("/cart");
    await expect(page.getByText("הסל שלך ריק")).toBeVisible();
  });

  test("declined payment keeps the order unpaid and allows retry", async ({ page }) => {
    await page.goto("/p/chef-knife");
    await page.getByRole("button", { name: "הוספה לסל", exact: true }).click();
    await expect(page.getByText("המוצר נוסף לסל")).toBeVisible();
    await page.goto("/checkout");
    await page.getByLabel("שם מלא").fill("דנה כהן");
    await page.getByLabel("דוא״ל").fill(`decline${Date.now()}@example.com`);
    await page.getByLabel("טלפון נייד").fill("0521234567");
    await page.getByRole("checkbox", { name: /קראתי ואני מאשר/ }).check();
    await page.getByRole("button", { name: "מעבר לתשלום מאובטח באשראי" }).click();
    await page.getByRole("button", { name: "דחיית כרטיס (בדיקה)" }).click();
    await expect(page.getByRole("heading", { name: "התשלום לא הושלם" })).toBeVisible();
    await page.getByRole("button", { name: "ניסיון תשלום נוסף" }).click();
    await expect(page).toHaveURL(/\/sandbox-pay\//);
    await page.getByRole("button", { name: "אישור תשלום (בדיקה)" }).click();
    await expect(page.getByRole("heading", { name: "תודה! ההזמנה התקבלה" })).toBeVisible();
  });
});
