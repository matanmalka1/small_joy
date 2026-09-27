import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONE, type OrderStatusKey, type PaymentStatusKey } from "@/server/orders/status";

export function OrderStatusBadge({ status }: { status: OrderStatusKey }) {
  return <Badge tone={ORDER_STATUS_TONE[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatusKey }) {
  return <Badge tone={PAYMENT_STATUS_TONE[status]}>תשלום: {PAYMENT_STATUS_LABELS[status]}</Badge>;
}
