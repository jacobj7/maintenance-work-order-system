"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Property {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  name: string;
  property_id: string;
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    property_id: "",
    asset_id: "",
    requestor_name: "",
    requestor_email: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [propertiesRes, assetsRes] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/assets"),
        ]);
        if (propertiesRes.ok) {
          const data = await propertiesRes.json();
          setProperties(data.properties || data || []);
        }
        if (assetsRes.ok) {
          const data = await assetsRes.json();
          setAssets(data.assets || data || []);
        }
      } catch {
        // silently fail - dropdowns will just be empty
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.property_id) {
      setFilteredAssets(
        assets.filter((a) => a.property_id === formData.property_id),
      );
    } else {
      setFilteredAssets(assets);
    }
    setFormData((prev) => ({ ...prev, asset_id: "" }));
  }, [formData.property_id, assets]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, string> = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        requestor_name: formData.requestor_name,
        requestor_email: formData.requestor_email,
      };
      if (formData.property_id) payload.property_id = formData.property_id;
      if (formData.asset_id) payload.asset_id = formData.asset_id;

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ||
            data.message ||
            `Request failed with status ${res.status}`,
        );
      }

      router.push("/work-orders");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
          >
            <svg
              className="w-4 h-4"
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
            Fill in the details below to submit a new work order request.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <svg
                    className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5"
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
                  <p className="text-sm text-red-700">{error}</p>
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
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="Brief description of the issue"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
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
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide additional details about the work needed..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
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
                required
                value={formData.priority}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Property */}
            <div>
              <label
                htmlFor="property_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Property
              </label>
              <select
                id="property_id"
                name="property_id"
                value={formData.property_id}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a property (optional)</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">Select an asset (optional)</option>
                {filteredAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 pt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Requestor Information
              </h2>

              {/* Requestor Name */}
              <div className="mb-4">
                <label
                  htmlFor="requestor_name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="requestor_name"
                  name="requestor_name"
                  required
                  value={formData.requestor_name}
                  onChange={handleChange}
                  placeholder="Full name"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
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
                  required
                  value={formData.requestor_email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && (
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {isSubmitting ? "Submitting..." : "Create Work Order"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
