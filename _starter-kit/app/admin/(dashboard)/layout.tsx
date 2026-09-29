import { ReactNode } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

// Every admin page is per-request, auth-gated (proxy.ts) and reads live
// data - none should be prerendered at build time. Marking the segment
// dynamic also keeps the build from opening a DB connection per admin
// route during static generation, which was contributing to the
// Supabase-pooler "max client connections reached" build failures.
export const dynamic = "force-dynamic";

export default function Layout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}