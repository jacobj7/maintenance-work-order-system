"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();

  const role = session?.user?.role as string | undefined;

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white hover:text-gray-300 transition-colors"
        >
          WorkOrder Pro
        </Link>

        {session && (
          <div className="flex items-center gap-4">
            {role === "manager" && (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            )}
            {role === "technician" && (
              <Link
                href="/my-work-orders"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                My Work Orders
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {session ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {session.user?.name || session.user?.email}
              {role && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-700 text-xs text-gray-300 capitalize">
                  {role}
                </span>
              )}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm font-medium bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
