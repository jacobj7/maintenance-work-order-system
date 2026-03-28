"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const requestSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  requesterName: z.string().min(1, "Your name is required"),
  requesterEmail: z.string().email("Valid email is required"),
  requesterPhone: z.string().optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

export default function RequestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RequestForm>({
    title: "",
    description: "",
    location: "",
    priority: "medium",
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof RequestForm, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): boolean => {
    const result = requestSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RequestForm, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof RequestForm;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof RequestForm]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/work-orders/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Request failed with status ${response.status}`,
        );
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to submit request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
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
            Request Submitted!
          </h2>
          <p className="text-gray-600 mb-6">
            Your repair request has been submitted successfully. Our team will
            review it and get back to you shortly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                title: "",
                description: "",
                location: "",
                priority: "medium",
                requesterName: "",
                requesterEmail: "",
                requesterPhone: "",
              });
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-600 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold">Submit a Repair Request</h1>
            <p className="mt-2 text-blue-100">
              Fill out the form below to report a maintenance issue or request a
              repair.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-8 space-y-6">
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Request Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Brief description of the issue"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              <div className="sm:col-span-2">
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
                  placeholder="Please provide detailed information about the issue..."
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.description}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Building, room, or area"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.location ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                )}
              </div>

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
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.priority ? "border-red-300" : "border-gray-300"
                  }`}
                >
                  <option value="low">Low — Not urgent</option>
                  <option value="medium">Medium — Needs attention soon</option>
                  <option value="high">High — Urgent issue</option>
                  <option value="urgent">Urgent — Safety concern</option>
                </select>
                {errors.priority && (
                  <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="requesterName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="requesterName"
                  name="requesterName"
                  value={formData.requesterName}
                  onChange={handleChange}
                  placeholder="Full name"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.requesterName ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.requesterName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.requesterName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="requesterEmail"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="requesterEmail"
                  name="requesterEmail"
                  value={formData.requesterEmail}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.requesterEmail ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.requesterEmail && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.requesterEmail}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="requesterPhone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone Number{" "}
                  <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="tel"
                  id="requesterPhone"
                  name="requesterPhone"
                  value={formData.requesterPhone}
                  onChange={handleChange}
                  placeholder="(555) 000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
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
                  </span>
                ) : (
                  "Submit Request"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
