import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/store/auth-card";
import { ForgotForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "שחזור סיסמה", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthCard title="שחזור סיסמה" footer={<Link href="/account/login" className="text-teal hover:underline">חזרה להתחברות</Link>}>
      <p className="text-sm text-ink-soft">הזינו את כתובת הדוא״ל של החשבון ונשלח קישור לבחירת סיסמה חדשה.</p>
      <ForgotForm />
    </AuthCard>
  );
}
