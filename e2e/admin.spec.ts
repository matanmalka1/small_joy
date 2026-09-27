import { expect, test, type Page } from "@playwright/test";

// Test admin created with: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "dev-admin-password-123";

async function login(page: Page, email: string, password: string, next = "/admin") {
  await page.goto(`/account/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("דוא״ל").fill(email);
  await page.getByLabel("סיסמה").fill(password);
  await page.getByRole("button", { name: "התחברות" }).click();
}

test.describe("admin", () => {
  test.skip(({ isMobile }) => isMobile, "admin flows are covered on desktop");

  test("anonymous visitor is redirected away from admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account\/login/);
  });

  test("a customer cannot access the admin", async ({ page }) => {
    const email = `cust${Date.now()}@example.com`;
    await page.goto("/account/register");
    await page.getByLabel("שם מלא").fill("לקוח בדיקה");
    await page.getByLabel("דוא״ל").fill(email);
    await page.locator("input[name=password]").fill("customer-pass-1");
    await page.getByLabel("אימות סיסמה").fill("customer-pass-1");
    await page.getByRole("button", { name: "הרשמה" }).click();
    await expect(page.getByRole("heading", { name: /שלום, לקוח בדיקה/ })).toBeVisible();
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test("create product, manage an order and adjust stock", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByRole("heading", { name: "לוח בקרה" })).toBeVisible();

    // Create product
    const sku = `E2E-${Date.now()}`;
    await page.goto("/admin/products/new");
    await page.getByLabel("שם המוצר").fill(`מוצר בדיקה ${sku}`);
    await page.getByLabel("סטטוס פרסום").selectOption("ACTIVE");
    await page.getByLabel("מק״ט (SKU)").fill(sku);
    await page.getByLabel("מחיר (₪)").fill("19.90");
    await page.getByLabel("מלאי", { exact: true }).fill("7");
    await page.getByRole("checkbox", { name: "כלי בית", exact: true }).check();
    await page.getByRole("button", { name: "שמירת מוצר" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[^/]+\?created=1/);
    await expect(page.getByText("המוצר נוצר")).toBeVisible();

    // Adjust stock from the inventory screen
    await page.goto(`/admin/inventory?q=${sku}`);
    await page.getByLabel(`כמות חדשה – ${sku}`).fill("12");
    await page.getByRole("button", { name: "עדכון" }).click();
    await expect(page.getByText("המלאי עודכן (+5)")).toBeVisible();

    // Change status of a paid order (created by the purchase spec)
    await page.goto("/admin/orders?status=PAID");
    const first = page.locator("tbody tr a").first();
    await first.click();
    await page.getByLabel("סטטוס חדש").selectOption("PROCESSING");
    await page.getByRole("button", { name: "עדכון סטטוס" }).click();
    await expect(page.getByText("הסטטוס עודכן")).toBeVisible();
  });
});
