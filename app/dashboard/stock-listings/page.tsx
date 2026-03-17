"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StockListingRow {
  id: string;
  stockId: string;
  status: string;
  fobPrice: number | { toString: () => string };
  currency: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  photoUrls: string[] | null;
  tag: string;
  createdAt: string;
}

export default function StockListingsPage() {
  const router = useRouter();
  const [list, setList] = useState<StockListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stock-listings?per_page=100");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setList(json.data ?? []);
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this stock listing? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/stock-listings/${id}`, { method: "DELETE" });
      if (res.ok) fetchList();
      else alert("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
            directions_car
          </span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Stock cars
            </h1>
            <p className="text-muted-foreground">
              Listings for www.zervtek.com/stock-cars
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/stock-listings/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add stock car
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-[#2C2C2C] bg-gray-50 dark:bg-[#1E1E1E] p-8 text-center">
          <p className="text-muted-foreground mb-4">No stock listings yet.</p>
          <Link
            href="/dashboard/stock-listings/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add first stock car
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-[#2C2C2C] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#2C2C2C]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Photo</th>
                  <th className="px-4 py-3 text-left font-medium">Stock ID</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Brand / Model</th>
                  <th className="px-4 py-3 text-left font-medium">Year</th>
                  <th className="px-4 py-3 text-left font-medium">FOB Price</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#2C2C2C]">
                {list.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-[#2C2C2C]/50">
                    <td className="px-4 py-3">
                      {row.photoUrls && row.photoUrls.length > 0 ? (
                        <img
                          src={row.photoUrls[0]}
                          alt=""
                          className="h-12 w-16 object-cover rounded"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">{row.stockId}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">
                      {[row.brand, row.model].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3">{row.year ?? "—"}</td>
                    <td className="px-4 py-3">
                      {row.currency === "JPY" ? "¥" : ""}
                      {typeof row.fobPrice === "number"
                        ? row.fobPrice.toLocaleString()
                        : Number(row.fobPrice?.toString?.() ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/stock-listings/${row.id}/edit`}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-primary hover:bg-primary/10 mr-2"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-red-600 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingId === row.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
