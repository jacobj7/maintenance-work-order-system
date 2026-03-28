"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const workOrderSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be less than 255 characters"),
  description: z.string().min(1, "Description is required"),
  assetId: z.string().optional(),
  locationId: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  category: z.enum(["Electrical", "Plumbing", "HVAC", "Structural", "Other"]),
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
  assetId?: string;
  locationId?: string;
  priority?: string;
  category?: string;
  general?: string;
}

export default function NewWorkOrderClient() {
  const router = useRouter();

  const [formData, setFormData] = useState<WorkOrderFormData>({
    title: "",
    description: "",
    assetId: "",
    locationId: "",
    priority: "Medium",
    category: "Other",
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
        const response = await fetch("/api/assets");
        if (response.ok) {
          const data = await response.json();
          setAssets(data.assets || []);
        }
      } catch (error) {
        console.error("Failed to fetch assets:", error);
      } finally {
        setLoadingAssets(false);
      }
    };

    const fetchLocations = async () => {
      try {
        const response = await fetch("/api/locations");
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
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

  const validateForm = (): boolean => {
    try {
      workOrderSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as keyof FormErrors;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        ...formData,
        assetId: formData.assetId || null,
        locationId: formData.locationId || null,
      };

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
          errorData.message || `Server error: ${response.status}`,
        );
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create work order:", error);
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Failed to create work order. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions: Array<{
    value: WorkOrderFormData["priority"];
    label: string;
    color: string;
  }> = [
    { value: "Low", label: "Low", color: "text-green-600" },
    { value: "Medium", label: "Medium", color: "text-yellow-600" },
    { value: "High", label: "High", color: "text-orange-600" },
    { value: "Critical", label: "Critical", color: "text-red-600" },
  ];

  const categoryOptions: Array<{
    value: WorkOrderFormData["category"];
    label: string;
  }> = [
    { value: "Electrical", label: "Electrical" },
    { value: "Plumbing", label: "Plumbing" },
    { value: "HVAC", label: "HVAC" },
    { value: "Structural", label: "Structural" },
    { value: "Other", label: "Other" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Create New Work Order
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the details below to create a new work order.
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.general && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-700">{errors.general}</p>
                </div>
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
                placeholder="Enter work order title"
                className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.title
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white"
                }`}
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the work that needs to be done..."
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical ${
                  errors.description
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white"
                }`}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Priority and Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                    errors.priority ? "border-red-300" : "border-gray-300"
                  }`}
                  disabled={isSubmitting}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.priority && (
                  <p className="mt-1 text-xs text-red-600">{errors.priority}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                    errors.category ? "border-red-300" : "border-gray-300"
                  }`}
                  disabled={isSubmitting}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-xs text-red-600">{errors.category}</p>
                )}
              </div>
            </div>

            {/* Asset Selector */}
            <div>
              <label
                htmlFor="assetId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Asset{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                id="assetId"
                name="assetId"
                value={formData.assetId}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.assetId ? "border-red-300" : "border-gray-300"
                }`}
                disabled={isSubmitting || loadingAssets}
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
              {errors.assetId && (
                <p className="mt-1 text-xs text-red-600">{errors.assetId}</p>
              )}
              {!loadingAssets && assets.length === 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  No assets available
                </p>
              )}
            </div>

            {/* Location Selector */}
            <div>
              <label
                htmlFor="locationId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Location{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                id="locationId"
                name="locationId"
                value={formData.locationId}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
                  errors.locationId ? "border-red-300" : "border-gray-300"
                }`}
                disabled={isSubmitting || loadingLocations}
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
              {errors.locationId && (
                <p className="mt-1 text-xs text-red-600">{errors.locationId}</p>
              )}
              {!loadingLocations && locations.length === 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  No locations available
                </p>
              )}
            </div>

            {/* Priority Badge Preview */}
            <div className="rounded-md bg-gray-50 border border-gray-200 p-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Summary
              </h3>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    formData.priority === "Critical"
                      ? "bg-red-100 text-red-800"
                      : formData.priority === "High"
                        ? "bg-orange-100 text-orange-800"
                        : formData.priority === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                  }`}
                >
                  {formData.priority} Priority
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {formData.category}
                </span>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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
      </div>
    </div>
  );
}
