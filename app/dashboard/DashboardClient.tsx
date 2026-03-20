"use client";

import React from "react";

interface KPIData {
  totalTickets: number;
  openTickets: number;
  resolvedToday: number;
  avgResolutionTime: string;
}

interface TechnicianWorkload {
  id: string;
  name: string;
  assignedTickets: number;
  resolvedTickets: number;
  pendingTickets: number;
}

interface DashboardClientProps {
  kpiData: KPIData;
  technicianWorkload: TechnicianWorkload[];
}

function KPICard({
  title,
  value,
  icon,
  bgColor,
  textColor,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}) {
  return (
    <div
      className={`rounded-2xl p-6 shadow-md flex items-center gap-4 ${bgColor}`}
    >
      <div className={`text-4xl ${textColor}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
      </div>
    </div>
  );
}

function TicketIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6" />
    </svg>
  );
}

function ResolvedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export default function DashboardClient({
  kpiData,
  technicianWorkload,
}: DashboardClientProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Support Dashboard
        </h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <KPICard
            title="Total Tickets"
            value={kpiData.totalTickets}
            icon={<TicketIcon />}
            bgColor="bg-blue-50"
            textColor="text-blue-600"
          />
          <KPICard
            title="Open Tickets"
            value={kpiData.openTickets}
            icon={<OpenIcon />}
            bgColor="bg-yellow-50"
            textColor="text-yellow-600"
          />
          <KPICard
            title="Resolved Today"
            value={kpiData.resolvedToday}
            icon={<ResolvedIcon />}
            bgColor="bg-green-50"
            textColor="text-green-600"
          />
          <KPICard
            title="Avg Resolution Time"
            value={kpiData.avgResolutionTime}
            icon={<ClockIcon />}
            bgColor="bg-purple-50"
            textColor="text-purple-600"
          />
        </div>

        {/* Technician Workload Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-700">
              Technician Workload
            </h2>
          </div>
          {technicianWorkload.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400">
              No technician data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Technician</th>
                    <th className="px-6 py-3 text-center">Assigned</th>
                    <th className="px-6 py-3 text-center">Resolved</th>
                    <th className="px-6 py-3 text-center">Pending</th>
                    <th className="px-6 py-3 text-center">Workload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {technicianWorkload.map((tech) => {
                    const workloadPercent =
                      tech.assignedTickets > 0
                        ? Math.round(
                            (tech.pendingTickets / tech.assignedTickets) * 100,
                          )
                        : 0;

                    const barColor =
                      workloadPercent >= 75
                        ? "bg-red-500"
                        : workloadPercent >= 40
                          ? "bg-yellow-400"
                          : "bg-green-500";

                    return (
                      <tr
                        key={tech.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm uppercase">
                              {tech.name.charAt(0)}
                            </div>
                            {tech.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600">
                          {tech.assignedTickets}
                        </td>
                        <td className="px-6 py-4 text-center text-green-600 font-medium">
                          {tech.resolvedTickets}
                        </td>
                        <td className="px-6 py-4 text-center text-yellow-600 font-medium">
                          {tech.pendingTickets}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${workloadPercent}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-10 text-right">
                              {workloadPercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
