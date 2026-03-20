"use client";

import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
  requesterEmail: z.string().email("Please enter a valid email address"),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be under 5000 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    errorMap: () => ({ message: "Please select a valid priority" }),
  }),
});

type FormData = z.infer<typeof formSchema>;
type FormErrors = Partial<Record<keyof FormData, string>>;

interface PageProps {
  params: { orgSlug: string };
}

export default function RequesterPortalPage({ params }: PageProps) {
  const { orgSlug } = params;

  const [formData, setFormData] = useState<FormData>({
    requesterEmail: "",
    title: "",
    description: "",
    priority: "medium",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = (): boolean => {
    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormData;
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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/maintenance-requests/${orgSlug}`, {
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

      setIsSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      requesterEmail: "",
      title: "",
      description: "",
      priority: "medium",
    });
    setErrors({});
    setSubmitError(null);
    setIsSuccess(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            Your maintenance request has been received. We&apos;ll be in touch
            at{" "}
            <span className="font-medium text-gray-900">
              {formData.requesterEmail}
            </span>
            .
          </p>
          <button
            onClick={handleReset}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Maintenance Request
          </h1>
          <p className="mt-2 text-gray-600">
            Submit a maintenance request for{" "}
            <span className="font-medium text-blue-600">{orgSlug}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-6">
              {/* Requester Email */}
              <div>
                <label
                  htmlFor="requesterEmail"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Your Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="requesterEmail"
                  name="requesterEmail"
                  type="email"
                  autoComplete="email"
                  value={formData.requesterEmail}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.requesterEmail
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                  aria-describedby={
                    errors.requesterEmail ? "requesterEmail-error" : undefined
                  }
                  aria-invalid={!!errors.requesterEmail}
                />
                {errors.requesterEmail && (
                  <p
                    id="requesterEmail-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {errors.requesterEmail}
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Request Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Brief description of the issue"
                  className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.title
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                  aria-describedby={errors.title ? "title-error" : undefined}
                  aria-invalid={!!errors.title}
                />
                {errors.title && (
                  <p
                    id="title-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
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
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Please provide details about the issue, including location and any relevant context..."
                  className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-vertical ${
                    errors.description
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                  aria-describedby={
                    errors.description ? "description-error" : undefined
                  }
                  aria-invalid={!!errors.description}
                />
                {errors.description && (
                  <p
                    id="description-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
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
                  className={`w-full px-4 py-3 border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none bg-white ${
                    errors.priority
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  aria-describedby={
                    errors.priority ? "priority-error" : undefined
                  }
                  aria-invalid={!!errors.priority}
                >
                  <option value="low">
                    🟢 Low — Not urgent, can be scheduled
                  </option>
                  <option value="medium">
                    🟡 Medium — Should be addressed soon
                  </option>
                  <option value="high">🟠 High — Needs prompt attention</option>
                  <option value="urgent">
                    🔴 Urgent — Immediate action required
                  </option>
                </select>
                {errors.priority && (
                  <p
                    id="priority-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {errors.priority}
                  </p>
                )}
              </div>

              {/* Submit Error */}
              {submitError && (
                <div
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                  role="alert"
                  aria-live="assertive"
                >
                  <p className="text-sm text-red-700 font-medium">
                    Submission failed
                  </p>
                  <p className="text-sm text-red-600 mt-1">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
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
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your request will be reviewed by the maintenance team.
        </p>
      </div>
    </div>
  );
}
