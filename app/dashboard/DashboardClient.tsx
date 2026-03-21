"use client";

import { useState } from "react";

interface WorkOrderSummary {
  open: number;
  inProgress: number;
  completed: number;
}

interface PriorityBreakdown {
  priority: string;
  count: number;
  percentage: number;
}

interface TechnicianWorkload {
  name: string;
  assigned: number;
  inProgress: number;
  completed: number;
}

interface DashboardClientProps {
  summary: WorkOrderSummary;
  priorityBreakdown: PriorityBreakdown[];
  technicianWorkload: TechnicianWorkload[];
}

const priorityColors: Record<string, string> = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-green-100 text-green-800",
};

const priorityBarColors: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

export default function DashboardClient({
  summary,
  priorityBreakdown,
  technicianWorkload,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"priority" | "technician">(
    "priority",
  );

  const total = summary.open + summary.inProgress + summary.completed;

  const summaryCards = [
    {
      label: "Open",
      value: summary.open,
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
      valueColor: "text-blue-900",
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
    },
    {
      label: "In Progress",
      value: summary.inProgress,
      color: "bg-amber-50 border-amber-200",
      textColor: "text-amber-700",
      valueColor: "text-amber-900",
      icon: (
        <svg
          className="w-8 h-8 text-amber-500"
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
    },
    {
      label: "Completed",
      value: summary.completed,
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
      valueColor: "text-green-900",
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
    },
    {
      label: "Total",
      value: total,
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-700",
      valueColor: "text-purple-900",
      icon: (
        <svg
          className="w-8 h-8 text-purple-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Work Order Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border-2 p-5 flex items-center gap-4 shadow-sm ${card.color}`}
            >
              <div className="flex-shrink-0">{card.icon}</div>
              <div>
                <p className={`text-sm font-medium ${card.textColor}`}>
                  {card.label}
                </p>
                <p className={`text-3xl font-bold ${card.valueColor}`}>
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Status Distribution
          </h2>
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-100">
            {summary.open > 0 && (
              <div
                className="bg-blue-500 h-full transition-all"
                style={{ width: `${(summary.open / total) * 100}%` }}
                title={`Open: ${summary.open}`}
              />
            )}
            {summary.inProgress > 0 && (
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${(summary.inProgress / total) * 100}%` }}
                title={`In Progress: ${summary.inProgress}`}
              />
            )}
            {summary.completed > 0 && (
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${(summary.completed / total) * 100}%` }}
                title={`Completed: ${summary.completed}`}
              />
            )}
          </div>
          <div className="flex gap-6 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />{" "}
              Open
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />{" "}
              In Progress
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />{" "}
              Completed
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab("priority")}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "priority"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Priority Breakdown
          </button>
          <button
            onClick={() => setActiveTab("technician")}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "technician"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Technician Workload
          </button>
        </div>

        {/* Priority Breakdown Table */}
        {activeTab === "priority" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Distribution
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {priorityBreakdown.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-400 text-sm"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  priorityBreakdown.map((row) => (
                    <tr
                      key={row.priority}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            priorityColors[row.priority] ??
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {row.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full max-w-xs bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              priorityBarColors[row.priority] ?? "bg-gray-400"
                            }`}
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {row.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Technician Workload Table */}
        {activeTab === "technician" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    In Progress
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {technicianWorkload.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-400 text-sm"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  technicianWorkload.map((tech) => {
                    const techTotal =
                      tech.assigned + tech.inProgress + tech.completed;
                    return (
                      <tr
                        key={tech.name}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                              {tech.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {tech.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                            {tech.assigned}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold">
                            {tech.inProgress}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                            {tech.completed}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-800 text-sm font-semibold">
                            {techTotal}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
