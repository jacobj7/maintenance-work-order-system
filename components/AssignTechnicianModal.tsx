"use client";

import { useState, useEffect } from "react";
import { z } from "zod";

const TechnicianSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  specialty: z.string().optional(),
  available: z.boolean().optional(),
});

const TechniciansResponseSchema = z.array(TechnicianSchema);

type Technician = z.infer<typeof TechnicianSchema>;

interface AssignTechnicianModalProps {
  workOrderId: string;
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignTechnicianModal({
  workOrderId,
  onClose,
  onAssigned,
}: AssignTechnicianModalProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicians = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/technicians");
        if (!res.ok) {
          throw new Error(`Failed to fetch technicians: ${res.statusText}`);
        }
        const data = await res.json();
        const parsed = TechniciansResponseSchema.safeParse(data);
        if (!parsed.success) {
          throw new Error("Invalid technicians data received from server");
        }
        setTechnicians(parsed.data);
      } catch (err) {
        setFetchError(
          err instanceof Error ? err.message : "Unknown error occurred",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  }, []);

  const handleAssign = async () => {
    if (!selectedTechnicianId) {
      setSubmitError("Please select a technician");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ technicianId: selectedTechnicianId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Assignment failed: ${res.statusText}`,
        );
      }

      onAssigned();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Unknown error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-technician-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="assign-technician-title"
            className="text-xl font-semibold text-gray-900"
          >
            Assign Technician
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-2">
          <p className="text-sm text-gray-500">
            Work Order ID:{" "}
            <span className="font-medium text-gray-700">{workOrderId}</span>
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600">Loading technicians...</span>
          </div>
        )}

        {fetchError && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-sm text-red-700">{fetchError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 underline hover:text-red-800"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !fetchError && (
          <>
            {technicians.length === 0 ? (
              <div className="py-6 text-center text-gray-500">
                No technicians available at this time.
              </div>
            ) : (
              <div className="mb-4">
                <label
                  htmlFor="technician-select"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Select Technician
                </label>
                <select
                  id="technician-select"
                  value={selectedTechnicianId}
                  onChange={(e) => {
                    setSelectedTechnicianId(e.target.value);
                    setSubmitError(null);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select a technician --</option>
                  {technicians.map((tech) => (
                    <option
                      key={tech.id}
                      value={tech.id}
                      disabled={tech.available === false}
                    >
                      {tech.name}
                      {tech.specialty ? ` — ${tech.specialty}` : ""}
                      {tech.available === false ? " (Unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedTechnicianId && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                {(() => {
                  const tech = technicians.find(
                    (t) => t.id === selectedTechnicianId,
                  );
                  if (!tech) return null;
                  return (
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">{tech.name}</p>
                      <p className="text-blue-600">{tech.email}</p>
                      {tech.specialty && (
                        <p className="text-blue-600">
                          Specialty: {tech.specialty}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {submitError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={
                  submitting ||
                  !selectedTechnicianId ||
                  technicians.length === 0
                }
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
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
                    Assigning...
                  </span>
                ) : (
                  "Assign Technician"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
