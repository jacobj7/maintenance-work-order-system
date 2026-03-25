"use client";

import { useState, useEffect } from "react";
import { z } from "zod";

const workOrderSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  asset_id: z.string().optional(),
  location_id: z.string().optional(),
  requestor_email: z.string().email("Please enter a valid email address"),
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
  asset_id?: string;
  location_id?: string;
  requestor_email?: string;
  general?: string;
}

export default function SubmitPage() {
  const [formData, setFormData] = useState<WorkOrderFormData>({
    title: "",
    description: "",
    priority: "medium",
    asset_id: "",
    location_id: "",
    requestor_email: "",
  });

  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successWorkOrderId, setSuccessWorkOrderId] = useState<string | null>(
    null,
  );
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch("/api/assets");
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
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
          setLocations(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const dataToValidate = {
      ...formData,
      asset_id: formData.asset_id || undefined,
      location_id: formData.location_id || undefined,
    };

    const result = workOrderSchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setErrors({
          general:
            errorData.message ||
            "Failed to submit work order. Please try again.",
        });
        return;
      }

      const data = await res.json();
      setSuccessWorkOrderId(data.id || data.work_order_id || "N/A");
    } catch (err) {
      console.error("Submission error:", err);
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      asset_id: "",
      location_id: "",
      requestor_email: "",
    });
    setErrors({});
    setSuccessWorkOrderId(null);
  };

  if (successWorkOrderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Work Order Submitted!
          </h2>
          <p className="text-gray-600 mb-4">
            Your work order has been successfully submitted and is now being
            processed.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Work Order ID</p>
            <p className="text-xl font-mono font-bold text-indigo-600">
              {successWorkOrderId}
            </p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Please save this ID for your records. You will receive updates at
            the email address you provided.
          </p>
          <button
            onClick={handleReset}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Submit Another Work Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Submit Work Order
          </h1>
          <p className="mt-2 text-gray-600">
            Fill out the form below to submit a maintenance or service request.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          {errors.general && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
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

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
                placeholder="Brief description of the issue"
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  errors.title ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
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
                rows={4}
                placeholder="Provide detailed information about the issue, including any relevant context..."
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-vertical ${
                  errors.description
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300"
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description}
                </p>
              )}
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
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors bg-white ${
                  errors.priority
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300"
                }`}
              >
                <option value="low">Low — Non-urgent, can be scheduled</option>
                <option value="medium">
                  Medium — Should be addressed soon
                </option>
                <option value="high">High — Needs prompt attention</option>
                <option value="urgent">
                  Urgent — Immediate action required
                </option>
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
              )}
            </div>

            {/* Asset and Location row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  disabled={loadingAssets}
                  className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.asset_id
                      ? "border-red-400 bg-red-50"
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
                  <p className="mt-1 text-sm text-red-600">{errors.asset_id}</p>
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
                  disabled={loadingLocations}
                  className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.location_id
                      ? "border-red-400 bg-red-50"
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
                  <p className="mt-1 text-sm text-red-600">
                    {errors.location_id}
                  </p>
                )}
              </div>
            </div>

            {/* Requestor Email */}
            <div>
              <label
                htmlFor="requestor_email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Your Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="requestor_email"
                name="requestor_email"
                value={formData.requestor_email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  errors.requestor_email
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300"
                }`}
              />
              {errors.requestor_email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.requestor_email}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                We'll send updates about your work order to this address.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin w-5 h-5"
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
                    Submitting...
                  </>
                ) : (
                  "Submit Work Order"
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Fields marked with <span className="text-red-500">*</span> are
          required.
        </p>
      </div>
    </div>
  );
}
