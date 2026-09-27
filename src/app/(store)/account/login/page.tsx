import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { safeNext } from "@/lib/validation/auth";
import { AuthCard } from "@/components/store/auth-card";
import { LoginForm } from "@/components/store/auth-forms";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "התחברות", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/account/login">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthCard
      title="התחברות"
      footer={<>אין לך חשבון? <Link href={`/account/register?next=${encodeURIComponent(next)}`} className="font-semibold text-teal hover:underline">להרשמה</Link></>}
    >
      {sp.reset === "1" && <Alert tone="success">הסיסמה עודכנה. אפשר להתחבר עם הסיסמה החדשה.</Alert>}
      <LoginForm next={next} />
      <p className="text-center text-sm text-ink-soft">אפשר גם להזמין כאורח – ללא הרשמה.</p>
    </AuthCard>
  );
}
