"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const workOrderSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  assetId: z.string().optional(),
  locationId: z.string().optional(),
  assignedTo: z.string().optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface SelectOption {
  id: string;
  name: string;
}

export default function NewWorkOrderClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof WorkOrderFormData, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [assets, setAssets] = useState<SelectOption[]>([]);
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [formData, setFormData] = useState<WorkOrderFormData>({
    title: "",
    description: "",
    priority: "medium",
    assetId: "",
    locationId: "",
    assignedTo: "",
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [assetsRes, locationsRes, usersRes] = await Promise.allSettled([
          fetch("/api/assets"),
          fetch("/api/locations"),
          fetch("/api/users"),
        ]);

        if (assetsRes.status === "fulfilled" && assetsRes.value.ok) {
          const data = await assetsRes.value.json();
          setAssets(data.assets || data || []);
        }
        if (locationsRes.status === "fulfilled" && locationsRes.value.ok) {
          const data = await locationsRes.value.json();
          setLocations(data.locations || data || []);
        }
        if (usersRes.status === "fulfilled" && usersRes.value.ok) {
          const data = await usersRes.value.json();
          setUsers(data.users || data || []);
        }
      } catch (err) {
        console.error("Failed to load form options:", err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof WorkOrderFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const cleanedData = {
      ...formData,
      assetId: formData.assetId || undefined,
      locationId: formData.locationId || undefined,
      assignedTo: formData.assignedTo || undefined,
      description: formData.description || undefined,
    };

    const result = workOrderSchema.safeParse(cleanedData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof WorkOrderFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof WorkOrderFormData;
        if (field) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Failed to create work order",
        );
      }

      const data = await response.json();
      const workOrderId = data.workOrder?.id || data.id;

      if (workOrderId) {
        router.push(`/dashboard/work-orders/${workOrderId}`);
      } else {
        router.push("/dashboard/work-orders");
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Create New Work Order
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Fill in the details below to create a new work order.
        </p>
      </div>

      {serverError && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{serverError}</p>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white shadow rounded-lg p-6"
      >
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter work order title"
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500"
            }`}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-600">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Describe the work to be done..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Priority */}
        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-gray-700"
          >
            Priority <span className="text-red-500">*</span>
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.priority
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500"
            }`}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {errors.priority && (
            <p className="mt-1 text-xs text-red-600">{errors.priority}</p>
          )}
        </div>

        {/* Asset */}
        <div>
          <label
            htmlFor="assetId"
            className="block text-sm font-medium text-gray-700"
          >
            Asset
          </label>
          <select
            id="assetId"
            name="assetId"
            value={formData.assetId}
            onChange={handleChange}
            disabled={loadingOptions}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="">
              {loadingOptions
                ? "Loading assets..."
                : "Select an asset (optional)"}
            </option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="locationId"
            className="block text-sm font-medium text-gray-700"
          >
            Location
          </label>
          <select
            id="locationId"
            name="locationId"
            value={formData.locationId}
            onChange={handleChange}
            disabled={loadingOptions}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="">
              {loadingOptions
                ? "Loading locations..."
                : "Select a location (optional)"}
            </option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned To */}
        <div>
          <label
            htmlFor="assignedTo"
            className="block text-sm font-medium text-gray-700"
          >
            Assigned To
          </label>
          <select
            id="assignedTo"
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleChange}
            disabled={loadingOptions}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="">
              {loadingOptions ? "Loading users..." : "Select a user (optional)"}
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && (
              <svg
                className="animate-spin h-4 w-4 text-white"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {isSubmitting ? "Creating..." : "Create Work Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
