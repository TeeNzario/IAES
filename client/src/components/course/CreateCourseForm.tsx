"use client";

import React, { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import AlertModal from "@/components/ui/AlertModal";

// ============================================================
// CONFIGURATION CONSTANTS — Adjust limits here
// ============================================================
const COURSE_CODE_MAX_LENGTH = 10;
const COURSE_NAME_MAX_LENGTH = 100;

// ============================================================
// LANGUAGE VALIDATION REGEX
// ============================================================
const THAI_REGEX = /^[\u0E00-\u0E7F0-9\s\.\,\-\(\)\/\u0026\u2013\u2014]+$/;
const ENGLISH_REGEX = /^[A-Za-z0-9\s\.\,\-\(\)\/\u0026\u2013\u2014]+$/;

// ============================================================
// VALIDATION ERROR MESSAGES (Thai)
// ============================================================
const ERROR_MESSAGES = {
  course_code: {
    required: "กรุณากรอกรหัสวิชา",
    maxLength: `รหัสวิชาไม่เกิน ${COURSE_CODE_MAX_LENGTH} ตัวอักษร`,
    duplicate: "รหัสวิชานี้ถูกใช้แล้ว กรุณาใช้รหัสอื่น",
  },
  course_name_th: {
    required: "กรุณากรอกชื่อรายวิชา (ภาษาไทย)",
    maxLength: `ชื่อรายวิชาไม่เกิน ${COURSE_NAME_MAX_LENGTH} ตัวอักษร`,
    duplicate: "ชื่อรายวิชานี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น",
    invalidLanguage: "ชื่อรายวิชาภาษาไทยต้องกรอกเป็นภาษาไทยเท่านั้น",
  },
  course_name_en: {
    required: "กรุณากรอกชื่อรายวิชา (ภาษาอังกฤษ)",
    maxLength: `ชื่อรายวิชาไม่เกิน ${COURSE_NAME_MAX_LENGTH} ตัวอักษร`,
    duplicate: "ชื่อรายวิชานี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น",
    invalidLanguage: "ชื่อรายวิชาภาษาอังกฤษต้องกรอกเป็นภาษาอังกฤษเท่านั้น",
  },
};

// ============================================================
// TYPES
// ============================================================
interface CreateCourseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormErrors {
  course_code?: string;
  course_name_th?: string;
  course_name_en?: string;
}

interface DuplicateCheckResponse {
  exists: boolean;
}

// ============================================================
// COMPONENT
// ============================================================
export default function CreateCourseForm({
  onSuccess,
  onCancel,
}: CreateCourseFormProps) {
  // Form state
  const [formData, setFormData] = useState({
    course_name_th: "",
    course_name_en: "",
    course_code: "",
  });

  // Validation errors state
  const [errors, setErrors] = useState<FormErrors>({});

  // Duplicate check loading states (for UX feedback)
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alert state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "error" | "success" | "warning";
  }>({ isOpen: false, title: "", message: "", variant: "error" });

  // ============================================================
  // VALIDATION HELPERS
  // ============================================================

  /**
   * Validates a single field synchronously (required + max length)
   * Returns error message or undefined if valid
   */
  const validateFieldSync = (
    field: "course_code" | "course_name_th" | "course_name_en",
    value: string,
  ): string | undefined => {
    const trimmedValue = value.trim();
    const maxLength =
      field === "course_code" ? COURSE_CODE_MAX_LENGTH : COURSE_NAME_MAX_LENGTH;

    if (!trimmedValue) {
      return ERROR_MESSAGES[field].required;
    }

    if (trimmedValue.length > maxLength) {
      return ERROR_MESSAGES[field].maxLength;
    }

    // Language-specific validation
    if (field === "course_name_th" && !THAI_REGEX.test(trimmedValue)) {
      return ERROR_MESSAGES.course_name_th.invalidLanguage;
    }

    if (field === "course_name_en" && !ENGLISH_REGEX.test(trimmedValue)) {
      return ERROR_MESSAGES.course_name_en.invalidLanguage;
    }

    return undefined;
  };

  /**
   * Checks if a course code already exists in the database
   */
  const checkCodeDuplicate = useCallback(
    async (code: string): Promise<boolean> => {
      if (!code.trim()) return false;

      try {
        setIsCheckingCode(true);
        const response = await apiFetch<DuplicateCheckResponse>(
          `/courses/check-code?code=${encodeURIComponent(code.trim())}`,
        );
        return response.exists;
      } catch (err) {
        console.error("Failed to check code duplicate:", err);
        return false; // Allow submission if check fails
      } finally {
        setIsCheckingCode(false);
      }
    },
    [],
  );

  /**
   * Checks if a course name already exists in the database
   */
  const checkNameDuplicate = useCallback(
    async (name: string): Promise<boolean> => {
      if (!name.trim()) return false;

      try {
        setIsCheckingName(true);
        const response = await apiFetch<DuplicateCheckResponse>(
          `/courses/check-name?name=${encodeURIComponent(name.trim())}`,
        );
        return response.exists;
      } catch (err) {
        console.error("Failed to check name duplicate:", err);
        return false; // Allow submission if check fails
      } finally {
        setIsCheckingName(false);
      }
    },
    [],
  );

  /**
   * Validates all fields including async duplicate checks
   * Returns true if form is valid
   */
  const validateForm = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    // Sync validation first
    const codeError = validateFieldSync("course_code", formData.course_code);
    const nameThError = validateFieldSync("course_name_th", formData.course_name_th);
    const nameEnError = validateFieldSync("course_name_en", formData.course_name_en);

    if (codeError) newErrors.course_code = codeError;
    if (nameThError) newErrors.course_name_th = nameThError;
    if (nameEnError) newErrors.course_name_en = nameEnError;

    // If sync validation failed, don't check duplicates
    if (codeError || nameThError || nameEnError) {
      setErrors(newErrors);
      return false;
    }

    // Async duplicate checks (run in parallel for speed)
    const [codeExists, nameExists] = await Promise.all([
      checkCodeDuplicate(formData.course_code),
      checkNameDuplicate(formData.course_name_th),
    ]);

    if (codeExists) {
      newErrors.course_code = ERROR_MESSAGES.course_code.duplicate;
    }

    if (nameExists) {
      newErrors.course_name_th = ERROR_MESSAGES.course_name_th.duplicate;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // INPUT HANDLERS
  // ============================================================

  /**
   * Handles input changes and clears errors as user types
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as "course_code" | "course_name_th" | "course_name_en";

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    // Re-validate synchronously to give immediate feedback
    const syncError = validateFieldSync(field, value);

    setErrors((prev) => ({
      ...prev,
      [name]: syncError,
    }));
  };

  // ============================================================
  // FORM ACTIONS
  // ============================================================

  const handleCancel = () => {
    setFormData({
      course_name_th: "",
      course_name_en: "",
      course_code: "",
    });
    setErrors({});
    onCancel?.();
  };

  const handleSubmit = async () => {
    // Validate before submitting
    const isValid = await validateForm();

    if (!isValid) {
      return; // Errors are already set, user will see them
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/courses", {
        method: "POST",
        data: {
          course_name_th: formData.course_name_th.trim(),
          course_name_en: formData.course_name_en.trim(),
          course_code: formData.course_code.trim(),
        },
      });

      // Reset form on success
      setFormData({
        course_name_th: "",
        course_name_en: "",
        course_code: "",
      });
      setErrors({});

      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      setAlertState({
        isOpen: true,
        title: "เกิดข้อผิดพลาด",
        message: err?.message || "ไม่สามารถสร้างรายวิชาได้ กรุณาลองใหม่อีกครั้ง",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  // Disable submit if any required field is empty or has errors
  const hasErrors = Object.values(errors).some((error) => !!error);
  const isFormEmpty =
    !formData.course_code.trim() ||
    !formData.course_name_th.trim() ||
    !formData.course_name_en.trim();
  const isSubmitDisabled =
    hasErrors ||
    isFormEmpty ||
    isSubmitting ||
    isCheckingCode ||
    isCheckingName;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
      <div className="text-center mb-3">
        <div className="inline-flex items-center justify-center bg-opacity-30 rounded-2xl px-6 py-3 mb-2">
          <h1 className="text-3xl font-medium text-[#000000]">สร้างรายวิชา</h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* รหัสวิชา */}
        <div>
          <label className="block text-[#000000] text-sm font-light mb-2">
            รหัสวิชา <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="course_code"
            value={formData.course_code}
            onChange={handleInputChange}
            maxLength={COURSE_CODE_MAX_LENGTH}
            className={`w-full bg-white text-black px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-600 ${
              errors.course_code ? "border-red-500" : "border-[#B7A3E3]"
            }`}
            placeholder=""
          />
          {/* Character count hint */}
          <div className="flex justify-between items-center mt-1">
            {errors.course_code ? (
              <p className="text-red-500 text-xs">{errors.course_code}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">
              {formData.course_code.length}/{COURSE_CODE_MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* ชื่อรายวิชา (ภาษาไทย) */}
        <div>
          <label className="block text-[#000000] text-sm font-light mb-2">
            ชื่อรายวิชา (ภาษาไทย) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="course_name_th"
            value={formData.course_name_th}
            onChange={handleInputChange}
            maxLength={COURSE_NAME_MAX_LENGTH}
            className={`w-full bg-white text-black px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-600 ${
              errors.course_name_th ? "border-red-500" : "border-[#B7A3E3]"
            }`}
            placeholder=""
          />
          {/* Character count hint */}
          <div className="flex justify-between items-center mt-1">
            {errors.course_name_th ? (
              <p className="text-red-500 text-xs">{errors.course_name_th}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">
              {formData.course_name_th.length}/{COURSE_NAME_MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* Course Name (English) */}
        <div>
          <label className="block text-[#000000] text-sm font-light mb-2">
            ชื่อรายวิชา (ภาษาอังกฤษ) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="course_name_en"
            value={formData.course_name_en}
            onChange={handleInputChange}
            maxLength={COURSE_NAME_MAX_LENGTH}
            className={`w-full bg-white text-black px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-600 ${
              errors.course_name_en ? "border-red-500" : "border-[#B7A3E3]"
            }`}
            placeholder=""
          />
          {/* Character count hint */}
          <div className="flex justify-between items-center mt-1">
            {errors.course_name_en ? (
              <p className="text-red-500 text-xs">{errors.course_name_en}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">
              {formData.course_name_en.length}/{COURSE_NAME_MAX_LENGTH}
            </span>
          </div>
        </div>


        {/* Buttons */}
        <div className="flex gap-4 pt-4 pl-25">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 bg-white text-[#B7A3E3] border border-[#B7A3E3] font-medium py-2 rounded-2xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            ย้อนกลับ
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="flex-1 bg-[#9264F5] text-white font-medium py-2 rounded-2xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {(isSubmitting || isCheckingCode || isCheckingName) && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            ยืนยัน
          </button>
        </div>
        </div>
      </div>

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />
    </>
  );
}
