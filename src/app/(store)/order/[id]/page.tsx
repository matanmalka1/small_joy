import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { getOrderForViewer } from "@/server/orders/orders";
import { getStoreSettings } from "@/server/settings/store-settings";
import { OrderResult } from "@/components/store/order-result";

export const metadata: Metadata = { title: "צפייה בהזמנה", robots: { index: false } };

/** Guest order view: requires the order's secret token (or the owner's session). */
export default async function GuestOrderPage(props: PageProps<"/order/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await getCurrentUser();
  const order = await getOrderForViewer(id, { userId: user?.id, token: typeof sp.token === "string" ? sp.token : null });
  if (!order) notFound();
  const settings = await getStoreSettings();
  return (
    <div className="container-page max-w-3xl py-8">
      <OrderResult order={order} pickupAddress={settings.addressLine} />
    </div>
  );
}
