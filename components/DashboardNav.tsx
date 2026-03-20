"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/work-orders", label: "Work Orders" },
  { href: "/dashboard/assets", label: "Assets" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full w-64 bg-gray-900 text-white p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Maintenance App</h1>
      </div>

      <ul className="flex flex-col gap-1 flex-1">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-4 border-t border-gray-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}

export default DashboardNav;
