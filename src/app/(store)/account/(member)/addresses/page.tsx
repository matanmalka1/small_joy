import type { Metadata } from "next";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { AddressBook } from "@/components/store/address-book";
import { formatAddress } from "@/components/store/order-details";

export const metadata: Metadata = { title: "כתובות שמורות", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const rows = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return (
    <section>
      <h2 className="mb-4 text-xl">כתובות שמורות</h2>
      <AddressBook
        addresses={rows.map((a) => ({
          id: a.id,
          label: a.label,
          fullName: a.fullName,
          phone: a.phone,
          isDefault: a.isDefault,
          text: formatAddress(a),
        }))}
      />
    </section>
  );
}
