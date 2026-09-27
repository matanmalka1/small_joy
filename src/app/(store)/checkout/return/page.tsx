import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { getOrderForViewer } from "@/server/orders/orders";
import { getStoreSettings } from "@/server/settings/store-settings";
import { OrderResult } from "@/components/store/order-result";

export const metadata: Metadata = { title: "סטטוס הזמנה", robots: { index: false } };

export default async function CheckoutReturnPage(props: PageProps<"/checkout/return">) {
  const sp = await props.searchParams;
  const orderId = typeof sp.order === "string" ? sp.order : "";
  const token = typeof sp.token === "string" ? sp.token : "";
  const user = await getCurrentUser();
  const order = await getOrderForViewer(orderId, { userId: user?.id, token });
  if (!order) notFound();
  const settings = await getStoreSettings();
  return (
    <div className="container-page max-w-3xl py-8">
      <OrderResult order={order} pickupAddress={settings.addressLine} showRetryError={sp.error === "retry"} />
    </div>
  );
}
