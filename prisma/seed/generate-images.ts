import { join } from "node:path";
import { demoCategories, demoProducts } from "./demo-data";
import { writeDemoImage } from "./demo-images";

const root = join(process.cwd(), "public", "demo");
demoCategories.forEach((c, i) => writeDemoImage(join(root, "categories"), `${c.slug}.svg`, c.image, i));
demoProducts.forEach((p, i) => writeDemoImage(join(root, "products"), `${p.slug}.svg`, p.image, i));
console.log(`✓ wrote ${demoCategories.length + demoProducts.length} demo images to public/demo`);
