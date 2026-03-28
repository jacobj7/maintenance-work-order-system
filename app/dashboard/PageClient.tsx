"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

export interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  status: "Open" | "In Progress" | "On Hold" | "Completed";
  priority: "Low" | "Medium" | "High" | "Critical";
  assignedTo: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PageClientProps {
  workOrders?: WorkOrder[];
}

const STATUSES: WorkOrder["status"][] = [
  "Open",
  "In Progress",
  "On Hold",
  "Completed",
];

const STATUS_COLORS: Record<WorkOrder["status"], string> = {
  Open: "bg-blue-50 border-blue-200",
  "In Progress": "bg-yellow-50 border-yellow-200",
  "On Hold": "bg-orange-50 border-orange-200",
  Completed: "bg-green-50 border-green-200",
};

const STATUS_HEADER_COLORS: Record<WorkOrder["status"], string> = {
  Open: "bg-blue-500",
  "In Progress": "bg-yellow-500",
  "On Hold": "bg-orange-500",
  Completed: "bg-green-500",
};

const PRIORITY_COLORS: Record<WorkOrder["priority"], string> = {
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

function isOverdue(
  dueDate: string | null,
  status: WorkOrder["status"],
): boolean {
  if (!dueDate || status === "Completed") return false;
  const due = parseISO(dueDate);
  return due < new Date();
}

function WorkOrderCard({ workOrder }: { workOrder: WorkOrder }) {
  const overdue = isOverdue(workOrder.dueDate, workOrder.status);

  return (
    <Link href={`/work-orders/${workOrder.id}`}>
      <div
        className={`rounded-lg border p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow bg-white ${
          overdue ? "border-red-400 ring-1 ring-red-300" : "border-gray-200"
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
            {workOrder.title}
          </h3>
          {overdue && (
            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Overdue
            </span>
          )}
        </div>

        {workOrder.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">
            {workOrder.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              PRIORITY_COLORS[workOrder.priority]
            }`}
          >
            {workOrder.priority}
          </span>
        </div>

        <div className="space-y-1">
          {workOrder.assignedTo && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
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
              <span className="truncate">{workOrder.assignedTo}</span>
            </div>
          )}

          {workOrder.dueDate && (
            <div
              className={`flex items-center gap-1.5 text-xs ${
                overdue ? "text-red-600 font-medium" : "text-gray-500"
              }`}
            >
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
              <span>{format(parseISO(workOrder.dueDate), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            #{workOrder.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>
    </Link>
  );
}

function KanbanColumn({
  status,
  workOrders,
}: {
  status: WorkOrder["status"];
  workOrders: WorkOrder[];
}) {
  const overdueCount = workOrders.filter((wo) =>
    isOverdue(wo.dueDate, wo.status),
  ).length;

  return (
    <div
      className={`flex flex-col rounded-xl border ${STATUS_COLORS[status]} min-h-[500px]`}
    >
      <div
        className={`${STATUS_HEADER_COLORS[status]} rounded-t-xl px-4 py-3 flex items-center justify-between`}
      >
        <h2 className="text-sm font-bold text-white">{status}</h2>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
              {overdueCount}
            </span>
          )}
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white bg-opacity-30 text-white text-xs font-bold">
            {workOrders.length}
          </span>
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {workOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <svg
              className="w-8 h-8 mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-xs">No work orders</p>
          </div>
        ) : (
          workOrders.map((wo) => <WorkOrderCard key={wo.id} workOrder={wo} />)
        )}
      </div>
    </div>
  );
}

export default function PageClient({ workOrders }: PageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<
    WorkOrder["priority"] | "All"
  >("All");

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch =
      searchQuery === "" ||
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.description &&
        wo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (wo.assignedTo &&
        wo.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority =
      priorityFilter === "All" || wo.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const totalOverdue = workOrders.filter((wo) =>
    isOverdue(wo.dueDate, wo.status),
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {workOrders.length} total
                {totalOverdue > 0 && (
                  <span className="ml-2 text-red-600 font-medium">
                    · {totalOverdue} overdue
                  </span>
                )}
              </p>
            </div>
            <Link
              href="/work-orders/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1 max-w-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search work orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(
                  e.target.value as WorkOrder["priority"] | "All",
                )
              }
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              workOrders={filteredWorkOrders.filter(
                (wo) => wo.status === status,
              )}
            />
          ))}
        </div>

        {filteredWorkOrders.length === 0 && workOrders.length > 0 && (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-gray-500 text-sm">
              No work orders match your filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setPriorityFilter("All");
              }}
              className="mt-2 text-blue-600 text-sm hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {workOrders.length === 0 && (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 mb-1">
              No work orders yet
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Get started by creating your first work order.
            </p>
            <Link
              href="/work-orders/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
              Create Work Order
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
