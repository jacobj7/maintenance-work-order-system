"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Asset {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface FormData {
  title: string;
  description: string;
  priority: string;
  asset_id: string;
  location_id: string;
  due_date: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  priority?: string;
  asset_id?: string;
  location_id?: string;
  due_date?: string;
  general?: string;
}

export default function NewWorkOrderForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    priority: "",
    asset_id: "",
    location_id: "",
    due_date: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await fetch("/api/assets");
        if (response.ok) {
          const data = await response.json();
          setAssets(data.assets || data || []);
        }
      } catch (error) {
        console.error("Failed to fetch assets:", error);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    const fetchLocations = async () => {
      try {
        const response = await fetch("/api/locations");
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || data || []);
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchAssets();
    fetchLocations();
  }, []);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    } else if (formData.title.trim().length > 255) {
      newErrors.title = "Title must be less than 255 characters";
    }

    if (formData.description && formData.description.length > 2000) {
      newErrors.description = "Description must be less than 2000 characters";
    }

    if (!formData.priority) {
      newErrors.priority = "Priority is required";
    }

    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      if (isNaN(dueDate.getTime())) {
        newErrors.due_date = "Invalid date format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload: Record<string, string | undefined> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        asset_id: formData.asset_id || undefined,
        location_id: formData.location_id || undefined,
        due_date: formData.due_date || undefined,
      };

      // Remove undefined values
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      const response = await fetch("/api/work-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push("/work-orders");
        router.refresh();
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 422 && errorData.errors) {
          setErrors(errorData.errors);
        } else {
          setErrors({
            general:
              errorData.message ||
              errorData.error ||
              "Failed to create work order. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      setErrors({
        general: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {errors.general && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{errors.general}</p>
        </div>
      )}

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
          disabled={isSubmitting}
          placeholder="Enter work order title"
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            errors.title
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300"
          }`}
          aria-describedby={errors.title ? "title-error" : undefined}
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p id="title-error" className="mt-1 text-xs text-red-600">
            {errors.title}
          </p>
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
          disabled={isSubmitting}
          placeholder="Describe the work order in detail"
          rows={4}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-vertical ${
            errors.description
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300"
          }`}
          aria-describedby={
            errors.description ? "description-error" : undefined
          }
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p id="description-error" className="mt-1 text-xs text-red-600">
            {errors.description}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {formData.description.length}/2000 characters
        </p>
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
          disabled={isSubmitting}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white ${
            errors.priority
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300"
          }`}
          aria-describedby={errors.priority ? "priority-error" : undefined}
          aria-invalid={!!errors.priority}
        >
          <option value="">Select priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        {errors.priority && (
          <p id="priority-error" className="mt-1 text-xs text-red-600">
            {errors.priority}
          </p>
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
          disabled={isSubmitting || isLoadingAssets}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white ${
            errors.asset_id
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300"
          }`}
          aria-describedby={errors.asset_id ? "asset-error" : undefined}
          aria-invalid={!!errors.asset_id}
        >
          <option value="">
            {isLoadingAssets
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
          <p id="asset-error" className="mt-1 text-xs text-red-600">
            {errors.asset_id}
          </p>
        )}
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
          disabled={isSubmitting || isLoadingLocations}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white ${
            errors.location_id
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300"
          }`}
          aria-describedby={errors.location_id ? "location-error" : undefined}
          aria-invalid={!!errors.location_id}
        >
          <option value="">
            {isLoadingLocations
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
          <p id="location-error" className="mt-1 text-xs text-red-600">
            {errors.location_id}
          </p>
        )}
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
          disabled={isSubmitting}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white ${
            errors.due_date
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300"
          }`}
          aria-describedby={errors.due_date ? "due-date-error" : undefined}
          aria-invalid={!!errors.due_date}
        />
        {errors.due_date && (
          <p id="due-date-error" className="mt-1 text-xs text-red-600">
            {errors.due_date}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.push("/work-orders")}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting && (
            <svg
              className="animate-spin h-4 w-4 text-white"
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
          )}
          {isSubmitting ? "Creating..." : "Create Work Order"}
        </button>
      </div>
    </form>
  );
}
