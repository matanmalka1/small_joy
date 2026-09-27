import { expect, type Page } from "@playwright/test";

/** Buys a single-variant product as a guest and approves payment in the sandbox. */
export async function buyAsGuest(page: Page, slug = "chef-knife") {
  await page.goto(`/p/${slug}`);
  await page.getByRole("button", { name: "הוספה לסל", exact: true }).click();
  await expect(page.getByText("המוצר נוסף לסל")).toBeVisible();
  await page.goto("/checkout");
  await page.getByLabel("שם מלא").fill("קונה בדיקה");
  await page.getByLabel("דוא״ל").fill(`buyer${Date.now()}@example.com`);
  await page.getByLabel("טלפון נייד").fill("0541234567");
  await page.getByRole("checkbox", { name: /קראתי ואני מאשר/ }).check();
  await page.getByRole("button", { name: "מעבר לתשלום מאובטח באשראי" }).click();
  await page.getByRole("button", { name: "אישור תשלום (בדיקה)" }).click();
  await expect(page.getByRole("heading", { name: "תודה! ההזמנה התקבלה" })).toBeVisible();
  return (await page.getByText(/^SK-\d+$/).first().textContent())?.trim() ?? "";
}
