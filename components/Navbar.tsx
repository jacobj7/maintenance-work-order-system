"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path + "/");

  const navLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      roles: ["admin", "manager", "technician"],
    },
    {
      href: "/work-orders",
      label: "Work Orders",
      roles: ["admin", "manager", "technician"],
    },
    {
      href: "/technician",
      label: "Technician View",
      roles: ["admin", "manager", "technician"],
    },
  ];

  const userRole = (session?.user as any)?.role as string | undefined;

  const visibleLinks = navLinks.filter(
    (link) => !userRole || link.roles.includes(userRole),
  );

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* App Name */}
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              WorkOrder Pro
            </Link>

            {/* Nav Links */}
            {session && (
              <div className="hidden md:flex items-center gap-1">
                {visibleLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* User Info & Sign Out */}
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">
                    {session.user?.name || session.user?.email}
                  </span>
                  {userRole && (
                    <span className="text-xs text-gray-500 capitalize">
                      {userRole}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Nav Links */}
        {session && (
          <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive(link.href)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
