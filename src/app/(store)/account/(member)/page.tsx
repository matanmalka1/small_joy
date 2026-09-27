import type { Metadata } from "next";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/store/profile-form";

export const metadata: Metadata = { title: "האזור האישי", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 md:p-8">
      <h2 className="mb-4 text-xl">הפרטים שלי</h2>
      <ProfileForm name={user.name} email={user.email} phone={profile?.phone ?? ""} marketingOptIn={profile?.marketingOptIn ?? false} />
    </section>
  );
}
