import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { inviteAdminUser } from "./actions";
import TeamUserRow from "./TeamUserRow";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export default async function TeamAccessPage() {
  const session = await auth();
  const isOwner =
    session?.user?.role === "admin" && (session.user.adminRole ?? "owner") === "owner";
  // Defense in depth — proxy.ts already blocks non-owners from this
  // route, but this page mutates who else gets admin access, so it
  // checks again rather than trusting middleware alone.
  if (!isOwner) {
    redirect("/admin");
  }

  const adminUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(desc(users.createdAt));

  const rows = adminUsers.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    adminRole: (adminEmails.includes(user.email.toLowerCase()) ? "owner" : user.adminRole) as
      | "owner"
      | "seo"
      | "sales"
      | null,
    isSelf: user.id === session?.user?.id,
    isAllowlisted: adminEmails.includes(user.email.toLowerCase()),
  }));

  // Allowlisted owners who have never signed in yet have no users row —
  // surface them anyway so the owner can see the full picture of who has
  // access.
  const missingAllowlisted = adminEmails.filter(
    (email) => !rows.some((r) => r.email.toLowerCase() === email)
  );
  for (const email of missingAllowlisted) {
    rows.push({
      id: `allowlist:${email}`,
      email,
      name: null,
      adminRole: "owner",
      isSelf: false,
      isAllowlisted: true,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Team &amp; Access</h1>
        <p className="mt-2 text-gray-500">
          Anyone in ADMIN_EMAILS always has full owner access regardless of what&apos;s below - 
          this only grants narrower access to other people.
        </p>
      </div>

      <form
        action={inviteAdminUser}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Email</label>
          <input
            name="email"
            type="email"
            required
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="person@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Name</label>
          <input name="name" type="text" className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Role</label>
          <select name="role" defaultValue="seo" className="rounded-lg border px-3 py-2 text-sm capitalize">
            <option value="owner">Owner</option>
            <option value="seo">SEO</option>
            <option value="sales">Sales</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Invite
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-center">Role</th>
              <th className="p-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <TeamUserRow key={user.id} user={user} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">
                  No admin users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
