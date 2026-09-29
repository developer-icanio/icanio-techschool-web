import { db } from "@/db";
import { warehouses } from "@/db/schema";
import { desc } from "drizzle-orm";
import { createWarehouse } from "../actions";
import WarehouseRow from "./WarehouseRow";

export default async function WarehousesPage() {
  const allWarehouses = await db.select().from(warehouses).orderBy(desc(warehouses.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Warehouses</h1>
        <p className="mt-2 text-gray-500">
          Single-location today, but component stock and finished-goods are tracked per warehouse so
          adding a second location later is a config change, not a redesign.
        </p>
      </div>

      <form
        action={createWarehouse}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Name</label>
          <input
            name="name"
            type="text"
            required
            placeholder="Main Warehouse"
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Code</label>
          <input
            name="code"
            type="text"
            required
            placeholder="MAIN"
            className="rounded-lg border px-3 py-2 text-sm uppercase"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Add Warehouse
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {allWarehouses.map((w) => (
              <WarehouseRow key={w.id} warehouse={w} />
            ))}
            {allWarehouses.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">
                  No warehouses yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
