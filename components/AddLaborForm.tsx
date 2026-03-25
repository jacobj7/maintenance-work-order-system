"use client";

import { useState, FormEvent } from "react";
import { useSession } from "next-auth/react";

interface AddLaborFormProps {
  workOrderId: string | number;
  onSuccess?: () => void;
}

export default function AddLaborForm({
  workOrderId,
  onSuccess,
}: AddLaborFormProps) {
  const { data: session } = useSession();
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      setError("Please enter a valid number of hours greater than 0.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (!session?.user) {
      setError("You must be logged in to log labor.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/labor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hours: parsedHours,
          description: description.trim(),
          technician_id:
            (session.user as { id?: string; technician_id?: string })
              .technician_id ?? (session.user as { id?: string }).id,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data?.error ?? `Request failed with status ${response.status}`,
        );
      }

      setHours("");
      setDescription("");
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Log Labor Entry</h2>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Labor entry logged successfully.
        </div>
      )}

      <div>
        <label
          htmlFor="labor-hours"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Hours <span className="text-red-500">*</span>
        </label>
        <input
          id="labor-hours"
          type="number"
          min="0.01"
          step="0.01"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="e.g. 2.5"
          required
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label
          htmlFor="labor-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="labor-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the work performed..."
          rows={3}
          required
          disabled={isSubmitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Submitting...
          </>
        ) : (
          "Log Labor"
        )}
      </button>
    </form>
  );
}
