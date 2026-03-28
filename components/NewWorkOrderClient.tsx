"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Asset {
  id: number;
  name: string;
  asset_tag: string;
  location_id: number;
}

interface Location {
  id: number;
  name: string;
  building: string;
  floor: string;
}

interface FormData {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  asset_id: string;
  location_id: string;
  due_date: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  priority?: string;
  location_id?: string;
  due_date?: string;
  general?: string;
}

export default function NewWorkOrderClient() {
  const router = useRouter();
  const { data: session } = useSession();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    priority: "medium",
    asset_id: "",
    location_id: "",
    due_date: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [assetsRes, locationsRes] = await Promise.all([
          fetch("/api/assets"),
          fetch("/api/locations"),
        ]);

        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          setAssets(assetsData.assets || []);
        }

        if (locationsRes.ok) {
          const locationsData = await locationsRes.json();
          setLocations(locationsData.locations || []);
        }
      } catch (err) {
        console.error("Failed to fetch form data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "asset_id" && value) {
      const selectedAsset = assets.find((a) => a.id === parseInt(value));
      if (selectedAsset && selectedAsset.location_id) {
        setFormData((prev) => ({
          ...prev,
          asset_id: value,
          location_id: String(selectedAsset.location_id),
        }));
        return;
      }
    }

    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    } else if (formData.title.trim().length > 200) {
      newErrors.title = "Title must be 200 characters or fewer";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    if (!formData.priority) {
      newErrors.priority = "Priority is required";
    }

    if (!formData.location_id) {
      newErrors.location_id = "Location is required";
    }

    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        newErrors.due_date = "Due date cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const payload: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        location_id: parseInt(formData.location_id),
      };

      if (formData.asset_id) {
        payload.asset_id = parseInt(formData.asset_id);
      }

      if (formData.due_date) {
        payload.due_date = formData.due_date;
      }

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422 && data.errors) {
          const fieldErrors: FormErrors = {};
          for (const err of data.errors) {
            const field = err.path?.[0];
            if (field) {
              fieldErrors[field as keyof FormErrors] = err.message;
            }
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error || "Failed to create work order" });
        }
        return;
      }

      router.push(`/work-orders/${data.workOrder.id}`);
    } catch (err) {
      console.error("Submit error:", err);
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const priorityOptions: {
    value: FormData["priority"];
    label: string;
    color: string;
  }[] = [
    {
      value: "low",
      label: "Low",
      color: "text-green-700 bg-green-50 border-green-200",
    },
    {
      value: "medium",
      label: "Medium",
      color: "text-yellow-700 bg-yellow-50 border-yellow-200",
    },
    {
      value: "high",
      label: "High",
      color: "text-orange-700 bg-orange-50 border-orange-200",
    },
    {
      value: "critical",
      label: "Critical",
      color: "text-red-700 bg-red-50 border-red-200",
    },
  ];

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Work Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Submit a new maintenance or facilities request
        </p>
      </div>

      {errors.general && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{errors.general}</p>
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
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            placeholder="Brief description of the issue"
            maxLength={200}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title
                ? "border-red-300 bg-red-50"
                : "border-gray-300 bg-white"
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
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide detailed information about the issue, including any relevant context"
            rows={4}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
              errors.description
                ? "border-red-300 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {priorityOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium cursor-pointer transition-all ${
                  formData.priority === option.value
                    ? option.color + " ring-2 ring-offset-1 ring-blue-500"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={option.value}
                  checked={formData.priority === option.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          {errors.priority && (
            <p className="mt-1 text-xs text-red-600">{errors.priority}</p>
          )}
        </div>

        {/* Asset (optional) */}
        <div>
          <label
            htmlFor="asset_id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Asset <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            id="asset_id"
            name="asset_id"
            value={formData.asset_id}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Select an asset —</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
                {asset.asset_tag ? ` (${asset.asset_tag})` : ""}
              </option>
            ))}
          </select>
          {formData.asset_id && (
            <p className="mt-1 text-xs text-gray-500">
              Selecting an asset will auto-fill the location if available.
            </p>
          )}
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="location_id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Location <span className="text-red-500">*</span>
          </label>
          <select
            id="location_id"
            name="location_id"
            value={formData.location_id}
            onChange={handleChange}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.location_id
                ? "border-red-300 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
          >
            <option value="">— Select a location —</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
                {location.building ? ` — ${location.building}` : ""}
                {location.floor ? `, Floor ${location.floor}` : ""}
              </option>
            ))}
          </select>
          {errors.location_id && (
            <p className="mt-1 text-xs text-red-600">{errors.location_id}</p>
          )}
        </div>

        {/* Due Date (optional) */}
        <div>
          <label
            htmlFor="due_date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Due Date{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            value={formData.due_date}
            onChange={handleChange}
            min={new Date().toISOString().split("T")[0]}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.due_date
                ? "border-red-300 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
          />
          {errors.due_date && (
            <p className="mt-1 text-xs text-red-600">{errors.due_date}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
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
