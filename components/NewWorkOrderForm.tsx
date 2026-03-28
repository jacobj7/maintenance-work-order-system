"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const workOrderSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  asset_id: z.string().optional(),
  location_id: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  estimated_cost: z.string().optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface SelectOption {
  id: string;
  name: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function NewWorkOrderForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [assets, setAssets] = useState<SelectOption[]>([]);
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [technicians, setTechnicians] = useState<SelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [formData, setFormData] = useState<WorkOrderFormData>({
    title: "",
    description: "",
    priority: "medium",
    asset_id: "",
    location_id: "",
    assigned_to: "",
    due_date: "",
    estimated_cost: "",
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [assetsRes, locationsRes, techniciansRes] = await Promise.all([
          fetch("/api/assets"),
          fetch("/api/locations"),
          fetch("/api/technicians"),
        ]);

        if (assetsRes.ok) {
          const data = await assetsRes.json();
          setAssets(data.assets || data || []);
        }
        if (locationsRes.ok) {
          const data = await locationsRes.json();
          setLocations(data.locations || data || []);
        }
        if (techniciansRes.ok) {
          const data = await techniciansRes.json();
          setTechnicians(data.technicians || data || []);
        }
      } catch (err) {
        console.error("Failed to fetch form options:", err);
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
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const validateForm = (): boolean => {
    try {
      workOrderSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: FormErrors = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0].toString()] = error.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        priority: formData.priority,
      };

      if (formData.description) payload.description = formData.description;
      if (formData.asset_id) payload.asset_id = formData.asset_id;
      if (formData.location_id) payload.location_id = formData.location_id;
      if (formData.assigned_to) payload.assigned_to = formData.assigned_to;
      if (formData.due_date) payload.due_date = formData.due_date;
      if (formData.estimated_cost) {
        const cost = parseFloat(formData.estimated_cost);
        if (!isNaN(cost)) payload.estimated_cost = cost;
      }

      const response = await fetch("/api/work-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Failed to create work order",
        );
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Create New Work Order
      </h2>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
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
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.title ? "border-red-500" : "border-gray-300"
            }`}
          />
          {formErrors.title && (
            <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Describe the work order in detail"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
          />
        </div>

        {/* Priority */}
        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Priority <span className="text-red-500">*</span>
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
              formErrors.priority ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {formErrors.priority && (
            <p className="mt-1 text-sm text-red-600">{formErrors.priority}</p>
          )}
        </div>

        {/* Asset */}
        <div>
          <label
            htmlFor="asset_id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Asset
          </label>
          <select
            id="asset_id"
            name="asset_id"
            value={formData.asset_id}
            onChange={handleChange}
            disabled={loadingOptions}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            htmlFor="location_id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Location
          </label>
          <select
            id="location_id"
            name="location_id"
            value={formData.location_id}
            onChange={handleChange}
            disabled={loadingOptions}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            htmlFor="assigned_to"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Assigned Technician
          </label>
          <select
            id="assigned_to"
            name="assigned_to"
            value={formData.assigned_to}
            onChange={handleChange}
            disabled={loadingOptions}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {loadingOptions
                ? "Loading technicians..."
                : "Select a technician (optional)"}
            </option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        </div>

        {/* Due Date */}
        <div>
          <label
            htmlFor="due_date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Due Date
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Estimated Cost */}
        <div>
          <label
            htmlFor="estimated_cost"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Estimated Cost ($)
          </label>
          <input
            type="number"
            id="estimated_cost"
            name="estimated_cost"
            value={formData.estimated_cost}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
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
              </span>
            ) : (
              "Create Work Order"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
