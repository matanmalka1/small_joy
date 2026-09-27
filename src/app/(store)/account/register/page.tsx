import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { safeNext } from "@/lib/validation/auth";
import { AuthCard } from "@/components/store/auth-card";
import { RegisterForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "הרשמה", robots: { index: false } };

export default async function RegisterPage(props: PageProps<"/account/register">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthCard title="יצירת חשבון" footer={<>כבר רשומים? <Link href="/account/login" className="font-semibold text-teal hover:underline">להתחברות</Link></>}>
      <RegisterForm next={next} />
      <p className="text-xs text-ink-soft">
        בהרשמה הנך מאשר/ת את <Link href="/pages/terms" className="underline">התקנון</Link> ואת <Link href="/pages/privacy" className="underline">מדיניות הפרטיות</Link>.
      </p>
    </AuthCard>
  );
}
