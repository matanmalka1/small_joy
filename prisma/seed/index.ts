/**
 * Seed entry point.
 *  - Base data (always, idempotent): store settings, shipping methods, draft content pages.
 *  - Demo catalog (only when SEED_DEMO !== "false"): categories, products, coupons,
 *    promotions — all flagged isDemo=true.
 *
 * Usage: npm run db:seed            (base + demo)
 *        SEED_DEMO=false npm run db:seed   (base only, for production)
 */
import { createSeedClient } from "./client";
import { baseContentPages } from "./base-content";
import { seedDemo } from "./demo";

const db = createSeedClient();

async function seedBase() {
  await db.storeSettings.upsert({ where: { id: "store" }, update: {}, create: { id: "store" } });

  const methods = await db.shippingMethod.count();
  if (methods === 0) {
    await db.shippingMethod.createMany({
      data: [
        {
          name: "איסוף עצמי מהחנות",
          description: "פנחס לבון 18, נתניה. נודיע לך כשההזמנה מוכנה לאיסוף.",
          type: "PICKUP",
          price: 0,
          isActive: true,
          sortOrder: 0,
        },
        {
          // Price / ETA intentionally left empty: must be set by the owner in the admin
          // before this method can be activated.
          name: "משלוח עד הבית",
          description: "משלוח לכל הארץ",
          type: "DELIVERY",
          price: null,
          etaText: null,
          isActive: false,
          sortOrder: 1,
        },
      ],
    });
  }

  for (const page of baseContentPages) {
    await db.contentPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: { ...page, isDraft: true },
    });
  }
  console.log("✓ base data");
}

async function main() {
  await seedBase();
  if (process.env.SEED_DEMO !== "false") {
    await seedDemo(db);
  } else {
    console.log("• SEED_DEMO=false — skipping demo catalog");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
