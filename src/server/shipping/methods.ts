import "server-only";
import { db, type Tx } from "@/lib/db";

type Client = Tx | typeof db;

export type ShippingOption = {
  id: string;
  name: string;
  description: string | null;
  type: "PICKUP" | "DELIVERY";
  price: number;
  freeShippingThreshold: number | null;
  etaText: string | null;
  zones: string[];
};

function normalizeCity(city: string) {
  return city.replace(/[\s\-־'"״׳]/g, "").toLowerCase();
}

export function methodServesCity(zones: string[], city: string | null | undefined): boolean {
  if (zones.length === 0) return true;
  if (!city) return false;
  const c = normalizeCity(city);
  return zones.some((z) => normalizeCity(z) === c);
}

/** Only active methods with a configured price are offered. */
export async function listShippingOptions(client: Client = db): Promise<ShippingOption[]> {
  const rows = await client.shippingMethod.findMany({
    where: { isActive: true, price: { not: null } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type,
    price: r.price!,
    freeShippingThreshold: r.freeShippingThreshold,
    etaText: r.etaText,
    zones: r.zones,
  }));
}

export async function getShippingOption(id: string, client: Client = db): Promise<ShippingOption | null> {
  const all = await listShippingOptions(client);
  return all.find((m) => m.id === id) ?? null;
}
