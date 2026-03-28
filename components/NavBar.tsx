"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href
      ? "text-white font-semibold underline underline-offset-4"
      : "text-blue-100 hover:text-white";

  return (
    <nav className="bg-blue-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-white text-xl font-bold tracking-tight"
            >
              WorkOrder App
            </Link>

            {status === "authenticated" && session && (
              <div className="hidden sm:flex items-center gap-6">
                <Link href="/dashboard" className={isActive("/dashboard")}>
                  Dashboard
                </Link>
                <Link
                  href="/my-work-orders"
                  className={isActive("/my-work-orders")}
                >
                  My Work Orders
                </Link>
                <Link href="/request" className={isActive("/request")}>
                  Request
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {status === "authenticated" && session ? (
              <>
                <span className="text-blue-200 text-sm hidden sm:block">
                  {session.user?.name ?? session.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="bg-white text-blue-700 hover:bg-blue-50 font-medium text-sm px-4 py-2 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : status === "unauthenticated" ? (
              <Link
                href="/login"
                className="bg-white text-blue-700 hover:bg-blue-50 font-medium text-sm px-4 py-2 rounded-md transition-colors"
              >
                Sign In
              </Link>
            ) : null}
          </div>
        </div>

        {status === "authenticated" && session && (
          <div className="sm:hidden flex items-center gap-4 pb-3">
            <Link
              href="/dashboard"
              className={`text-sm ${isActive("/dashboard")}`}
            >
              Dashboard
            </Link>
            <Link
              href="/my-work-orders"
              className={`text-sm ${isActive("/my-work-orders")}`}
            >
              My Work Orders
            </Link>
            <Link href="/request" className={`text-sm ${isActive("/request")}`}>
              Request
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
