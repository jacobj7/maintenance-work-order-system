"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

function NavSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/work-orders", label: "Work Orders" },
    { href: "/assets", label: "Assets" },
    { href: "/request", label: "Submit Request" },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-4 text-xl font-bold border-b border-gray-700">CMMS</div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block px-3 py-2 rounded ${
                  pathname === link.href
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {session && (
        <div className="p-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-2">{session.user?.email}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded"
          >
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}

export default NavSidebar;
export { NavSidebar };
