import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { formatOrderNumber } from "@/server/orders/status";
import { getPaymentProvider, PaymentsNotConfiguredError } from "@/server/payments/providers";
import { sandboxCancelAction, sandboxDecisionAction } from "@/actions/sandbox";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { title: "סביבת בדיקה – תשלום", robots: { index: false, follow: false } };

/** Simulated hosted payment page. DEVELOPMENT SANDBOX – NO REAL CHARGE. */
export default async function SandboxPayPage(props: PageProps<"/sandbox-pay/[paymentId]">) {
  try {
    getPaymentProvider("mock");
  } catch (e) {
    if (e instanceof PaymentsNotConfiguredError) notFound();
    throw e;
  }
  const { paymentId } = await props.params;
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || payment.provider !== "mock") notFound();

  return (
    <main id="main" className="min-h-dvh bg-[#eef1f5] px-4 py-10">
      <div className="mx-auto max-w-md space-y-5">
        <div role="alert" className="rounded-2xl border-2 border-dashed border-warning bg-warning-soft p-4 text-center font-bold text-warning">
          סביבת בדיקה (Sandbox) – לא מתבצע חיוב אמיתי
          <p className="mt-1 text-sm font-normal">עמוד זה מדמה עמוד תשלום של חברת סליקה לצורכי פיתוח בלבד.</p>
        </div>
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-xl">תשלום עבור הזמנה {formatOrderNumber(payment.order.number)}</h1>
          <p className="text-3xl font-extrabold">{formatPrice(payment.amount)}</p>
          {payment.status !== "CREATED" ? (
            <p className="text-ink-soft">ניסיון תשלום זה כבר טופל ({payment.status}).</p>
          ) : (
            <>
              <p className="text-sm text-ink-soft">בחרו את תוצאת העסקה המדומה:</p>
              <form action={sandboxDecisionAction} className="grid gap-3">
                <input type="hidden" name="paymentId" value={payment.id} />
                <SubmitButton name="decision" value="approve" size="lg" pendingText="מעבד...">אישור תשלום (בדיקה)</SubmitButton>
                <SubmitButton name="decision" value="decline" variant="outline" size="lg" pendingText="מעבד...">דחיית כרטיס (בדיקה)</SubmitButton>
              </form>
            </>
          )}
          <form action={sandboxCancelAction}>
            <input type="hidden" name="paymentId" value={payment.id} />
            <button className="w-full text-center text-sm text-ink-soft underline">ביטול וחזרה לחנות</button>
          </form>
        </div>
      </div>
    </main>
  );
}
