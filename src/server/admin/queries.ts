import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// ───────────── Dashboard (real data only) ─────────────

const PAID_STATUSES = ["PAID", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "COMPLETED"] as const;

/** Israel-local midnight N days ago, as UTC Date. */
function startOfDayIL(daysAgo = 0): Date {
  const now = new Date();
  const il = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const offsetMs = il.getTime() - now.getTime();
  il.setHours(0, 0, 0, 0);
  il.setDate(il.getDate() - daysAgo);
  return new Date(il.getTime() - offsetMs);
}

async function revenueSince(from: Date) {
  const agg = await db.order.aggregate({
    where: { paidAt: { gte: from }, status: { in: [...PAID_STATUSES] } },
    _sum: { total: true },
    _count: true,
  });
  return { revenue: agg._sum.total ?? 0, orders: agg._count };
}

export async function getDashboardData() {
  const [today, week, month, newOrders, pendingPayment, attention] = await Promise.all([
    revenueSince(startOfDayIL(0)),
    revenueSince(startOfDayIL(6)),
    revenueSince(startOfDayIL(29)),
    db.order.count({ where: { status: "PAID" } }),
    db.order.count({ where: { status: "PENDING_PAYMENT", createdAt: { gte: startOfDayIL(1) } } }),
    db.order.count({ where: { needsAttention: true } }),
  ]);

  const daily = await db.$queryRaw<{ day: Date; revenue: bigint; orders: bigint }[]>`
    SELECT date_trunc('day', "paidAt" AT TIME ZONE 'Asia/Jerusalem') AS day,
           SUM(total)::bigint AS revenue, COUNT(*)::bigint AS orders
    FROM "Order"
    WHERE "paidAt" >= ${startOfDayIL(29)} AND status::text IN ('PAID','PROCESSING','READY_FOR_PICKUP','SHIPPED','COMPLETED')
    GROUP BY 1 ORDER BY 1`;

  const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), { revenue: Number(d.revenue), orders: Number(d.orders) }]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = startOfDayIL(29 - i);
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    const label = d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric" });
    const hit = byDay.get(key);
    return { key, label, revenue: hit?.revenue ?? 0, orders: hit?.orders ?? 0 };
  });

  const top = await db.$queryRaw<{ productName: string; productId: string | null; qty: bigint; revenue: bigint }[]>`
    SELECT oi."productName", oi."productId", SUM(oi.quantity)::bigint AS qty, SUM(oi."lineTotal")::bigint AS revenue
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."paidAt" >= ${startOfDayIL(29)} AND o.status::text IN ('PAID','PROCESSING','READY_FOR_PICKUP','SHIPPED','COMPLETED')
    GROUP BY 1, 2 ORDER BY qty DESC LIMIT 5`;

  const lowStock = await listLowStock(8);
  const recentOrders = await db.order.findMany({
    where: { status: { not: "PENDING_PAYMENT" } },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, number: true, customerName: true, total: true, status: true, paymentStatus: true, createdAt: true, fulfillment: true },
  });

  return {
    today,
    week,
    month,
    newOrders,
    pendingPayment,
    attention,
    series,
    topProducts: top.map((t) => ({ name: t.productName, productId: t.productId, qty: Number(t.qty), revenue: Number(t.revenue) })),
    lowStock,
    recentOrders,
  };
}

export async function listLowStock(limit = 50) {
  // Compare against each variant's own threshold (column-to-column → raw SQL).
  return db.$queryRaw<{ id: string; sku: string; stockQuantity: number; lowStockThreshold: number; productId: string; productName: string; options: Record<string, string> }[]>`
    SELECT v.id, v.sku, v."stockQuantity", v."lowStockThreshold", p.id AS "productId", p.name AS "productName", v.options
    FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId"
    WHERE v."isActive" AND p.status = 'ACTIVE' AND v."stockQuantity" <= v."lowStockThreshold"
    ORDER BY v."stockQuantity" ASC, p.name ASC
    LIMIT ${limit}`;
}

// ───────────── Orders ─────────────

export type AdminOrderFilters = {
  q?: string;
  status?: string;
  payment?: string;
  fulfillment?: string;
  from?: string;
  to?: string;
  attention?: string;
  page?: number;
};

export async function listAdminOrders(f: AdminOrderFilters) {
  const pageSize = 30;
  const page = Math.max(1, f.page ?? 1);
  const and: Prisma.OrderWhereInput[] = [];
  if (f.q) {
    const q = f.q.trim().replace(/^SK-/i, "");
    const num = Number(q);
    and.push({
      OR: [
        ...(Number.isInteger(num) && num > 0 && num < 2_000_000_000 ? [{ number: num }] : []),
        { customerName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    });
  }
  if (f.status) and.push({ status: f.status as "PAID" });
  if (f.payment) and.push({ paymentStatus: f.payment as "PAID" });
  if (f.fulfillment) and.push({ fulfillment: f.fulfillment as "PICKUP" });
  if (f.attention === "1") and.push({ needsAttention: true });
  if (f.from && !Number.isNaN(Date.parse(f.from))) and.push({ createdAt: { gte: new Date(f.from) } });
  if (f.to && !Number.isNaN(Date.parse(f.to))) and.push({ createdAt: { lte: new Date(`${f.to}T23:59:59`) } });
  const where: Prisma.OrderWhereInput = { AND: and };
  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: { select: { productName: true, quantity: true } } },
    }),
  ]);
  return { rows, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminOrder(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "asc" }, include: { events: { orderBy: { processedAt: "asc" } } } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

// ───────────── Customers ─────────────

export async function listCustomers(params: { q?: string; page?: number }) {
  const pageSize = 30;
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(params.q
      ? { OR: [{ name: { contains: params.q, mode: "insensitive" } }, { email: { contains: params.q, mode: "insensitive" } }, { profile: { phone: { contains: params.q } } }] }
      : {}),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { profile: true } }),
  ]);
  const stats = users.length
    ? await db.order.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((u) => u.id) }, paymentStatus: "PAID", status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
      })
    : [];
  const byUser = new Map(stats.map((s) => [s.userId, s]));
  return {
    rows: users.map((u) => ({ ...u, orderCount: byUser.get(u.id)?._count ?? 0, totalSpent: byUser.get(u.id)?._sum.total ?? 0 })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCustomer(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    include: { profile: true, addresses: true, orders: { orderBy: { createdAt: "desc" }, take: 100 } },
  });
  if (!user) return null;
  const paid = user.orders.filter((o) => o.paymentStatus === "PAID" && o.status !== "CANCELLED");
  return { ...user, totalSpent: paid.reduce((s, o) => s + o.total, 0), paidOrders: paid.length };
}

// ───────────── Inventory ─────────────

export async function listInventory(params: { q?: string; page?: number }) {
  const pageSize = 40;
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.ProductVariantWhereInput = {
    isActive: true,
    ...(params.q
      ? { OR: [{ sku: { contains: params.q, mode: "insensitive" } }, { product: { name: { contains: params.q, mode: "insensitive" } } }] }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.productVariant.count({ where }),
    db.productVariant.findMany({
      where,
      orderBy: [{ stockQuantity: "asc" }, { sku: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { product: { select: { id: true, name: true, status: true } } },
    }),
  ]);
  return { rows, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listMovements(params: { variantId?: string; page?: number }) {
  const pageSize = 50;
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.InventoryMovementWhereInput = params.variantId ? { variantId: params.variantId } : {};
  const [total, rows] = await Promise.all([
    db.inventoryMovement.count({ where }),
    db.inventoryMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { variant: { select: { sku: true, product: { select: { name: true } } } } },
    }),
  ]);
  const orderIds = [...new Set(rows.flatMap((r) => (r.orderId ? [r.orderId] : [])))];
  const orders = orderIds.length ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, number: true } }) : [];
  const numbers = new Map(orders.map((o) => [o.id, o.number]));
  return { rows: rows.map((r) => ({ ...r, orderNumber: r.orderId ? numbers.get(r.orderId) ?? null : null })), total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
