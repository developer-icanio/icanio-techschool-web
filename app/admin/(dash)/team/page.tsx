import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import AddMemberForm from "@/components/admin/AddMemberForm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { removeMember } from "../../actions";

export const metadata: Metadata = { title: "Team" };

const owners = () => (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export default async function Team() {
  const me = await requireAdmin(["owner", "admin"]);
  const db = await getDb();
  const members = db ? await db.select().from(schema.adminUsers).orderBy(asc(schema.adminUsers.createdAt)) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Team</h1>
        <p className="mt-1 text-body">People who can sign in to this dashboard with Google. Roles: <b>owner</b> (everything), <b>admin</b> (everything except adding owners), <b>seo</b> (scoreboard only).</p>
      </header>

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">Permanent owners</h2>
        <p className="mt-1 text-sm text-muted">Set in the ADMIN_EMAILS environment variable. They can always sign in, even if the database is down.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {owners().length ? owners().map((e) => <li key={e} className="rounded-full bg-soft-2 px-3 py-1 text-sm font-medium text-navy">{e}</li>) : <li className="text-sm text-red-700">None set. Add ADMIN_EMAILS=bd@icanio.com.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">Invite someone</h2>
        {db ? <AddMemberForm canAddOwner={me.role === "owner"} /> : <p className="mt-2 text-sm text-muted">Connect a database (DATABASE_URL) to invite team members.</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <h2 className="border-b border-line px-6 py-4 text-lg font-semibold">Invited members ({members.length})</h2>
        {members.length ? (
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
                <div>
                  <p className="font-medium text-heading">{m.name ? `${m.name} · ` : ""}{m.email}</p>
                  <p className="text-xs text-muted">Added by {m.addedBy ?? "unknown"} · {m.lastLoginAt ? `last sign-in ${m.lastLoginAt.toLocaleDateString("en-IN")}` : "never signed in"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-semibold text-navy">{m.role}</span>
                  {m.email !== me.email && !(m.role === "owner" && me.role !== "owner") && (
                    <form action={removeMember}>
                      <input type="hidden" name="email" value={m.email} />
                      <button className="text-xs font-semibold text-red-700 hover:underline">Remove</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-4 text-sm text-muted">No one invited yet.</p>
        )}
      </section>
    </div>
  );
}
