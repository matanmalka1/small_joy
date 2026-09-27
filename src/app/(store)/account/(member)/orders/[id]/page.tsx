import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { getOrderForViewer } from "@/server/orders/orders";
import { getStoreSettings } from "@/server/settings/store-settings";
import { OrderDetails } from "@/components/store/order-details";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "פרטי הזמנה", robots: { index: false } };

export default async function AccountOrderPage(props: PageProps<"/account/orders/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/account/orders/${id}`);
  // Owner check happens inside: another customer's order id returns 404.
  const order = await getOrderForViewer(id, { userId: user.id });
  if (!order) notFound();
  const settings = await getStoreSettings();
  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "ההזמנות שלי", href: "/account/orders" }, { label: "פרטי הזמנה" }]} />
      <OrderDetails order={order} pickupAddress={settings.addressLine} />
    </div>
  );
}
