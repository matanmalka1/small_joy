import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/authz";
import { exportProductsCsv } from "@/server/admin/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const csv = await exportProductsCsv();
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
