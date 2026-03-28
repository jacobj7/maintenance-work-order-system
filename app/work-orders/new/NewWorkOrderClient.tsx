"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const workOrderSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  due_date: z.string().optional(),
  asset_id: z.string().optional(),
  location_id: z.string().optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface Asset {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  asset_id?: string;
  location_id?: string;
  general?: string;
}

export default function NewWorkOrderClient() {
  const router = useRouter();

  const [formData, setFormData] = useState<WorkOrderFormData>({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
    asset_id: "",
    location_id: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch("/api/assets");
        if (res.ok) {
          const data = await res.json();
          setAssets(data.assets || data || []);
        }
      } catch (err) {
        console.error("Failed to fetch assets:", err);
      } finally {
        setLoadingAssets(false);
      }
    };

    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/locations");
        if (res.ok) {
          const data = await res.json();
          setLocations(data.locations || data || []);
        }
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchAssets();
    fetchLocations();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const result = workOrderSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
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

    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload: Record<string, string | undefined> = {
        title: formData.title,
        priority: formData.priority,
      };

      if (formData.description) payload.description = formData.description;
      if (formData.due_date) payload.due_date = formData.due_date;
      if (formData.asset_id) payload.asset_id = formData.asset_id;
      if (formData.location_id) payload.location_id = formData.location_id;

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setErrors({
          general:
            errorData.message ||
            errorData.error ||
            "Failed to create work order. Please try again.",
        });
        return;
      }

      router.push("/work-orders");
    } catch (err) {
      console.error("Submit error:", err);
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Create New Work Order
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the details below to create a new work order.
        </p>
      </div>

      {errors.general && (
        <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{errors.general}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
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
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
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
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.description
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description}</p>
          )}
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
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
              errors.priority
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
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

        {/* Due Date */}
        <div>
          <label
            htmlFor="due_date"
            className="block text-sm font-medium text-gray-700"
          >
            Due Date
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.due_date
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
            }`}
          />
          {errors.due_date && (
            <p className="mt-1 text-xs text-red-600">{errors.due_date}</p>
          )}
        </div>

        {/* Asset */}
        <div>
          <label
            htmlFor="asset_id"
            className="block text-sm font-medium text-gray-700"
          >
            Asset
          </label>
          <select
            id="asset_id"
            name="asset_id"
            value={formData.asset_id}
            onChange={handleChange}
            disabled={loadingAssets}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 ${
              errors.asset_id
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
            }`}
          >
            <option value="">
              {loadingAssets
                ? "Loading assets..."
                : "Select an asset (optional)"}
            </option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
          {errors.asset_id && (
            <p className="mt-1 text-xs text-red-600">{errors.asset_id}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="location_id"
            className="block text-sm font-medium text-gray-700"
          >
            Location
          </label>
          <select
            id="location_id"
            name="location_id"
            value={formData.location_id}
            onChange={handleChange}
            disabled={loadingLocations}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 ${
              errors.location_id
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300"
            }`}
          >
            <option value="">
              {loadingLocations
                ? "Loading locations..."
                : "Select a location (optional)"}
            </option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          {errors.location_id && (
            <p className="mt-1 text-xs text-red-600">{errors.location_id}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/work-orders")}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
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
                Creating...
              </>
            ) : (
              "Create Work Order"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
