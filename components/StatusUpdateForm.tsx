"use client";

import { useState } from "react";
import { z } from "zod";

const statusUpdateSchema = z.object({
  status: z.enum([
    "pending",
    "in_progress",
    "on_hold",
    "completed",
    "cancelled",
  ]),
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional(),
});

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

interface StatusUpdateFormProps {
  workOrderId: string | number;
  currentStatus: string;
  onSuccess?: (updatedData: { status: string; notes?: string }) => void;
}

export default function StatusUpdateForm({
  workOrderId,
  currentStatus,
  onSuccess,
}: StatusUpdateFormProps) {
  const [status, setStatus] = useState<StatusUpdateFormData["status"]>(
    currentStatus as StatusUpdateFormData["status"],
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof StatusUpdateFormData, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validate = (): boolean => {
    const result = statusUpdateSchema.safeParse({
      status,
      notes: notes || undefined,
    });
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof StatusUpdateFormData, string>> =
        {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof StatusUpdateFormData;
        if (field) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload: { status: string; notes?: string } = { status };
      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      const response = await fetch(`/api/work-orders/${workOrderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Failed to update work order status.";
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Use default error message
        }
        setServerError(errorMessage);
        return;
      }

      const updatedData = await response.json();
      setSuccessMessage("Work order status updated successfully.");
      setNotes("");

      if (onSuccess) {
        onSuccess({ status, notes: payload.notes, ...updatedData });
      }
    } catch (err) {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          New Status <span className="text-red-500">*</span>
        </label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusUpdateFormData["status"]);
            setErrors((prev) => ({ ...prev, status: undefined }));
          }}
          disabled={isSubmitting}
          className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
            errors.status
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300"
          }`}
          aria-describedby={errors.status ? "status-error" : undefined}
          aria-invalid={!!errors.status}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.status && (
          <p
            id="status-error"
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {errors.status}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setErrors((prev) => ({ ...prev, notes: undefined }));
          }}
          disabled={isSubmitting}
          rows={4}
          maxLength={1000}
          placeholder="Add any relevant notes about this status update..."
          className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y ${
            errors.notes
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300"
          }`}
          aria-describedby={errors.notes ? "notes-error" : "notes-count"}
          aria-invalid={!!errors.notes}
        />
        <div className="mt-1 flex justify-between items-center">
          {errors.notes ? (
            <p id="notes-error" className="text-sm text-red-600" role="alert">
              {errors.notes}
            </p>
          ) : (
            <span />
          )}
          <p
            id="notes-count"
            className={`text-xs ${
              notes.length > 900 ? "text-orange-500" : "text-gray-400"
            }`}
          >
            {notes.length}/1000
          </p>
        </div>
      </div>

      {serverError && (
        <div
          className="rounded-md bg-red-50 border border-red-200 p-3"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      {successMessage && (
        <div
          className="rounded-md bg-green-50 border border-green-200 p-3"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || status === currentStatus}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Updating...
            </>
          ) : (
            "Update Status"
          )}
        </button>

        {status === currentStatus && !isSubmitting && (
          <p className="text-xs text-gray-500">
            Select a different status to enable update.
          </p>
        )}
      </div>
    </form>
  );
}
