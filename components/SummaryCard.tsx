import React from "react";

interface SummaryCardProps {
  label: string;
  value: string | number;
  accent?: "blue" | "red" | "green" | "yellow" | "purple" | "gray";
  icon?: React.ReactNode;
  subtext?: string;
}

const accentStyles: Record<
  NonNullable<SummaryCardProps["accent"]>,
  {
    border: string;
    badge: string;
    icon: string;
    text: string;
  }
> = {
  blue: {
    border: "border-l-blue-500",
    badge: "bg-blue-50 text-blue-700",
    icon: "bg-blue-100 text-blue-600",
    text: "text-blue-600",
  },
  red: {
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700",
    icon: "bg-red-100 text-red-600",
    text: "text-red-600",
  },
  green: {
    border: "border-l-green-500",
    badge: "bg-green-50 text-green-700",
    icon: "bg-green-100 text-green-600",
    text: "text-green-600",
  },
  yellow: {
    border: "border-l-yellow-500",
    badge: "bg-yellow-50 text-yellow-700",
    icon: "bg-yellow-100 text-yellow-600",
    text: "text-yellow-600",
  },
  purple: {
    border: "border-l-purple-500",
    badge: "bg-purple-50 text-purple-700",
    icon: "bg-purple-100 text-purple-600",
    text: "text-purple-600",
  },
  gray: {
    border: "border-l-gray-400",
    badge: "bg-gray-50 text-gray-700",
    icon: "bg-gray-100 text-gray-600",
    text: "text-gray-600",
  },
};

export default function SummaryCard({
  label,
  value,
  accent = "blue",
  icon,
  subtext,
}: SummaryCardProps) {
  const styles = accentStyles[accent];

  return (
    <div
      className={`
        relative bg-white rounded-xl shadow-sm border border-gray-100
        border-l-4 ${styles.border}
        p-5 flex flex-col gap-3
        hover:shadow-md transition-shadow duration-200
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 truncate">
            {label}
          </span>
          <span
            className={`text-3xl font-bold leading-tight ${styles.text} tabular-nums`}
            aria-label={`${label}: ${value}`}
          >
            {value}
          </span>
        </div>

        {icon && (
          <div
            className={`
              flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
              ${styles.icon}
            `}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-gray-400 leading-snug mt-auto">{subtext}</p>
      )}
    </div>
  );
}
