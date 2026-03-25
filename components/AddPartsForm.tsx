"use client";

import { useState, FormEvent } from "react";

interface AddPartsFormProps {
  workOrderId: string | number;
  onPartAdded?: () => void;
}

interface FormData {
  part_name: string;
  quantity: string;
  unit_cost: string;
}

interface FormErrors {
  part_name?: string;
  quantity?: string;
  unit_cost?: string;
  general?: string;
}

export default function AddPartsForm({
  workOrderId,
  onPartAdded,
}: AddPartsFormProps) {
  const [formData, setFormData] = useState<FormData>({
    part_name: "",
    quantity: "",
    unit_cost: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.part_name.trim()) {
      newErrors.part_name = "Part name is required.";
    }

    const quantity = Number(formData.quantity);
    if (!formData.quantity) {
      newErrors.quantity = "Quantity is required.";
    } else if (!Number.isInteger(quantity) || quantity <= 0) {
      newErrors.quantity = "Quantity must be a positive integer.";
    }

    const unitCost = Number(formData.unit_cost);
    if (!formData.unit_cost) {
      newErrors.unit_cost = "Unit cost is required.";
    } else if (isNaN(unitCost) || unitCost < 0) {
      newErrors.unit_cost = "Unit cost must be a non-negative number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSuccessMessage("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage("");

    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/parts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          part_name: formData.part_name.trim(),
          quantity: Number(formData.quantity),
          unit_cost: Number(formData.unit_cost),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrors({
          general:
            errorData.message ||
            `Failed to add part. Status: ${response.status}`,
        });
        return;
      }

      setFormData({ part_name: "", quantity: "", unit_cost: "" });
      setSuccessMessage("Part added successfully!");
      onPartAdded?.();
    } catch (err) {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Add Part / Cost
      </h2>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          {/* Part Name */}
          <div>
            <label
              htmlFor="part_name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Part Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="part_name"
              name="part_name"
              value={formData.part_name}
              onChange={handleChange}
              placeholder="e.g. Oil Filter"
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.part_name
                  ? "border-red-400 focus:ring-red-400"
                  : "border-gray-300"
              }`}
            />
            {errors.part_name && (
              <p className="mt-1 text-xs text-red-500">{errors.part_name}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="e.g. 2"
              min="1"
              step="1"
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.quantity
                  ? "border-red-400 focus:ring-red-400"
                  : "border-gray-300"
              }`}
            />
            {errors.quantity && (
              <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>
            )}
          </div>

          {/* Unit Cost */}
          <div>
            <label
              htmlFor="unit_cost"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Unit Cost ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="unit_cost"
              name="unit_cost"
              value={formData.unit_cost}
              onChange={handleChange}
              placeholder="e.g. 19.99"
              min="0"
              step="0.01"
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.unit_cost
                  ? "border-red-400 focus:ring-red-400"
                  : "border-gray-300"
              }`}
            />
            {errors.unit_cost && (
              <p className="mt-1 text-xs text-red-500">{errors.unit_cost}</p>
            )}
          </div>

          {/* Total Cost Preview */}
          {formData.quantity && formData.unit_cost && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Total Cost:</span> $
                {(
                  Number(formData.quantity) * Number(formData.unit_cost)
                ).toFixed(2)}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
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
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Adding Part...
              </span>
            ) : (
              "Add Part"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
