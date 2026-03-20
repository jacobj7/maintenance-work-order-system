"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Asset = {
  id: number;
  name: string;
  serial_number: string;
  category: string;
  status: string;
  location: string;
};

type Props = {
  assets: Asset[];
};

const STATUS_OPTIONS = [
  "All",
  "Active",
  "Inactive",
  "Maintenance",
  "Retired",
  "Lost",
];
const CATEGORY_OPTIONS = ["All"];

export default function AssetListClient({ assets }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortField, setSortField] = useState<keyof Asset>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(assets.map((a) => a.category).filter(Boolean)),
    );
    return ["All", ...cats];
  }, [assets]);

  const filtered = useMemo(() => {
    let result = [...assets];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.serial_number?.toLowerCase().includes(q) ||
          a.category?.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (categoryFilter !== "All") {
      result = result.filter((a) => a.category === categoryFilter);
    }

    result.sort((a, b) => {
      const aVal = (a[sortField] ?? "").toString().toLowerCase();
      const bVal = (b[sortField] ?? "").toString().toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [assets, search, statusFilter, categoryFilter, sortField, sortDir]);

  const handleSort = (field: keyof Asset) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: keyof Asset }) => {
    if (sortField !== field)
      return <span className="ml-1 text-gray-300">↕</span>;
    return (
      <span className="ml-1 text-blue-500">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-700";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "retired":
        return "bg-red-100 text-red-800";
      case "lost":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} of {assets.length} asset
            {assets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/assets/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors"
        >
          <span>+</span> New Asset
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, serial number, category, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All Categories" : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              {(
                [
                  { label: "Name", field: "name" },
                  { label: "Serial Number", field: "serial_number" },
                  { label: "Category", field: "category" },
                  { label: "Status", field: "status" },
                  { label: "Location", field: "location" },
                ] as { label: string; field: keyof Asset }[]
              ).map(({ label, field }) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  {label}
                  <SortIcon field={field} />
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-gray-400"
                >
                  No assets found. Try adjusting your search or filters.
                </td>
              </tr>
            ) : (
              filtered.map((asset) => (
                <tr
                  key={asset.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {asset.name || "—"}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {asset.serial_number || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {asset.category || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(asset.status)}`}
                    >
                      {asset.status || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {asset.location || "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline mr-4"
                    >
                      View
                    </Link>
                    <Link
                      href={`/assets/${asset.id}/edit`}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
