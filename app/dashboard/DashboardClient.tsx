"use client";

import Link from "next/link";

interface StatusCounts {
  open: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

interface OverdueAlert {
  id: number;
  title: string;
  due_date: string;
  assigned_to: string | null;
  priority: string;
}

interface DashboardClientProps {
  statusCounts: StatusCounts;
  overdueAlerts: OverdueAlert[];
}

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export default function DashboardClient({
  statusCounts,
  overdueAlerts,
}: DashboardClientProps) {
  const statCards = [
    {
      label: "Open",
      count: statusCounts.open,
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
      countColor: "text-blue-900",
      icon: (
        <svg
          className="w-8 h-8 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      href: "/work-orders?status=open",
    },
    {
      label: "In Progress",
      count: statusCounts.in_progress,
      color: "bg-yellow-50 border-yellow-200",
      textColor: "text-yellow-700",
      countColor: "text-yellow-900",
      icon: (
        <svg
          className="w-8 h-8 text-yellow-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      href: "/work-orders?status=in_progress",
    },
    {
      label: "Completed",
      count: statusCounts.completed,
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
      countColor: "text-green-900",
      icon: (
        <svg
          className="w-8 h-8 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      href: "/work-orders?status=completed",
    },
    {
      label: "Overdue",
      count: statusCounts.overdue,
      color: "bg-red-50 border-red-200",
      textColor: "text-red-700",
      countColor: "text-red-900",
      icon: (
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      href: "/work-orders?overdue=true",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Work order management overview
            </p>
          </div>
          <Link
            href="/work-orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Work Order
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`relative overflow-hidden rounded-xl border-2 ${card.color} p-6 shadow-sm hover:shadow-md transition-shadow group`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${card.textColor}`}>
                    {card.label}
                  </p>
                  <p className={`mt-2 text-4xl font-bold ${card.countColor}`}>
                    {card.count}
                  </p>
                </div>
                <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                  {card.icon}
                </div>
              </div>
              <div className="mt-4">
                <span
                  className={`text-xs font-medium ${card.textColor} flex items-center gap-1`}
                >
                  View all
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Overdue Alerts Section */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">
                Overdue Alerts
              </h2>
              {overdueAlerts.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                  {overdueAlerts.length}
                </span>
              )}
            </div>
            <Link
              href="/work-orders?overdue=true"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              View all overdue
            </Link>
          </div>

          {overdueAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="w-12 h-12 text-green-400 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-900">
                No overdue work orders
              </p>
              <p className="text-sm text-gray-500 mt-1">
                All work orders are on track!
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {overdueAlerts.map((alert) => {
                const dueDate = new Date(alert.due_date);
                const now = new Date();
                const daysOverdue = Math.floor(
                  (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
                );

                return (
                  <li
                    key={alert.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/work-orders/${alert.id}`}
                            className="text-sm font-semibold text-gray-900 hover:text-indigo-600 truncate transition-colors"
                          >
                            {alert.title}
                          </Link>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              priorityColors[alert.priority] ??
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {alert.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Due: {dueDate.toLocaleDateString()}
                          </span>
                          {alert.assigned_to && (
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              {alert.assigned_to}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          {daysOverdue === 0
                            ? "Due today"
                            : daysOverdue === 1
                              ? "1 day overdue"
                              : `${daysOverdue} days overdue`}
                        </span>
                        <Link
                          href={`/work-orders/${alert.id}`}
                          className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/work-orders"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
              <svg
                className="w-5 h-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                All Work Orders
              </p>
              <p className="text-xs text-gray-500">Browse and manage orders</p>
            </div>
          </Link>

          <Link
            href="/work-orders/new"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Create Work Order
              </p>
              <p className="text-xs text-gray-500">Add a new work order</p>
            </div>
          </Link>

          <Link
            href="/reports"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Reports</p>
              <p className="text-xs text-gray-500">View analytics & insights</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
