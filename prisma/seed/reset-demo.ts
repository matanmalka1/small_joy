/**
 * Removes ONLY demo data (isDemo=true) and re-seeds it.
 * Real products, categories, coupons, orders and customers are never touched.
 * Orders that referenced demo variants keep their item snapshots.
 *
 * Usage: npm run demo:reset            (wipe + reseed demo)
 *        npm run demo:reset -- --wipe  (wipe only, e.g. before launch)
 */
import { createSeedClient } from "./client";
import { seedDemo } from "./demo";

const db = createSeedClient();

async function main() {
  const wipeOnly = process.argv.includes("--wipe");
  await db.$transaction([
    db.promotion.deleteMany({ where: { isDemo: true } }),
    db.coupon.deleteMany({ where: { isDemo: true } }),
    db.product.deleteMany({ where: { isDemo: true } }),
    // Keep demo categories that real products were attached to.
    db.category.deleteMany({ where: { isDemo: true, products: { none: {} }, children: { none: { isDemo: false } } } }),
  ]);
  console.log("✓ demo data removed");
  if (!wipeOnly) await seedDemo(db);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
