"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";

interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  created_at: string;
}

const locationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().min(1, "Address is required").max(500),
  city: z.string().min(1, "City is required").max(255),
  state: z.string().min(1, "State is required").max(100),
  zip: z.string().min(1, "ZIP code is required").max(20),
});

type LocationFormData = z.infer<typeof locationSchema>;

export default function LocationsClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof LocationFormData, string>>
  >({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<LocationFormData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchLocations();
    }
  }, [status, router]);

  async function fetchLocations() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch locations");
      }
      const data = await res.json();
      setLocations(data.locations || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof LocationFormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function resetForm() {
    setFormData({ name: "", address: "", city: "", state: "", zip: "" });
    setFormErrors({});
    setSuccessMessage(null);
  }

  function handleCancel() {
    resetForm();
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccessMessage(null);
    setError(null);

    const parseResult = locationSchema.safeParse(formData);
    if (!parseResult.success) {
      const fieldErrors: Partial<Record<keyof LocationFormData, string>> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as keyof LocationFormData;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setFormErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseResult.data),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create location");
      }

      const data = await res.json();
      setLocations((prev) => [data.location, ...prev]);
      setSuccessMessage("Location created successfully.");
      resetForm();
      setShowForm(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500 text-sm">Loading locations...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setSuccessMessage(null);
              setError(null);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            + Add Location
          </button>
        )}
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-8 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Add New Location
          </h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Main Campus Building A"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. 123 Main Street"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.address ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {formErrors.address && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.address}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. Springfield"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.city ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {formErrors.city && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.city}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="e.g. IL"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.state ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {formErrors.state && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.state}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="zip"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="zip"
                  name="zip"
                  type="text"
                  value={formData.zip}
                  onChange={handleInputChange}
                  placeholder="e.g. 62701"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.zip ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {formErrors.zip && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.zip}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Saving..." : "Save Location"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {locations.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500 text-sm">No locations found.</p>
          <p className="text-gray-400 text-xs mt-1">
            Add a location to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ZIP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locations.map((location) => (
                <tr
                  key={location.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {location.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {location.address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {location.city}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {location.state}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {location.zip}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
