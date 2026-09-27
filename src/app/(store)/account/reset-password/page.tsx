import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/store/auth-card";
import { ResetForm } from "@/components/store/auth-forms";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "בחירת סיסמה חדשה", robots: { index: false } };

export default async function ResetPage(props: PageProps<"/account/reset-password">) {
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const invalid = !token || sp.error === "INVALID_TOKEN";
  return (
    <AuthCard title="בחירת סיסמה חדשה">
      {invalid ? (
        <Alert tone="danger" title="הקישור אינו תקף">
          ייתכן שפג תוקפו. <Link href="/account/forgot-password" className="underline">לבקשת קישור חדש</Link>
        </Alert>
      ) : (
        <ResetForm token={token} />
      )}
    </AuthCard>
  );
}
