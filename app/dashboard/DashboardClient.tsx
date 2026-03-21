"use client";

import React from "react";
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface SummaryCardProps {
  icon: React.ReactNode;
  count: number;
  label: string;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

function SummaryCard({
  icon,
  count,
  label,
  bgColor,
  iconColor,
  borderColor,
}: SummaryCardProps) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border ${borderColor} ${bgColor} p-6 shadow-sm transition-shadow hover:shadow-md`}
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${iconColor}`}
      >
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-bold text-gray-800">{count}</span>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
    </div>
  );
}

interface DashboardClientProps {
  open: number;
  inProgress: number;
  overdue: number;
  completed: number;
}

export default function DashboardClient({
  open,
  inProgress,
  overdue,
  completed,
}: DashboardClientProps) {
  const cards = [
    {
      icon: <ClipboardList className="h-7 w-7 text-blue-600" />,
      count: open,
      label: "Open",
      bgColor: "bg-blue-50",
      iconColor: "bg-blue-100",
      borderColor: "border-blue-200",
    },
    {
      icon: <Clock className="h-7 w-7 text-yellow-600" />,
      count: inProgress,
      label: "In Progress",
      bgColor: "bg-yellow-50",
      iconColor: "bg-yellow-100",
      borderColor: "border-yellow-200",
    },
    {
      icon: <AlertTriangle className="h-7 w-7 text-red-600" />,
      count: overdue,
      label: "Overdue",
      bgColor: "bg-red-50",
      iconColor: "bg-red-100",
      borderColor: "border-red-200",
    },
    {
      icon: <CheckCircle2 className="h-7 w-7 text-green-600" />,
      count: completed,
      label: "Completed",
      bgColor: "bg-green-50",
      iconColor: "bg-green-100",
      borderColor: "border-green-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
