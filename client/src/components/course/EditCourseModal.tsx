"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

// ============================================================
// CONFIGURATION CONSTANTS — Adjust limits here
// ============================================================
const COURSE_CODE_MAX_LENGTH = 10;
const COURSE_NAME_MAX_LENGTH = 100;

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
  },
  course_name_en: {
    required: "กรุณากรอกชื่อรายวิชา (ภาษาอังกฤษ)",
    maxLength: `ชื่อรายวิชาไม่เกิน ${COURSE_NAME_MAX_LENGTH} ตัวอักษร`,
    duplicate: "ชื่อรายวิชานี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น",
  },
};

// ============================================================
// TYPES
// ============================================================
interface CourseData {
  courses_id: number;
  course_code: string;
  course_name: string;
  course_name_th?: string;
  course_name_en?: string;
}

interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  course: CourseData;
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
export default function EditCourseModal({
  isOpen,
  onClose,
  onSuccess,
  course,
}: EditCourseModalProps) {
  // Form state
  const [formData, setFormData] = useState({
    course_name_th: "",
    course_name_en: "",
    course_code: "",
  });

  // Store original values to detect changes (for edit mode duplicate checks)
  const [originalData, setOriginalData] = useState({
    course_name_th: "",
    course_name_en: "",
    course_code: "",
  });

  // Validation errors state
  const [errors, setErrors] = useState<FormErrors>({});

  // Duplicate check loading states
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================================
  // INITIALIZATION
  // ============================================================

  // Initialize form with course data when modal opens
  useEffect(() => {
    if (course && isOpen) {
      const initialData = {
        course_name_th: course.course_name_th || course.course_name || "",
        course_name_en: course.course_name_en || "",
        course_code: course.course_code,
      };
      setFormData(initialData);
      setOriginalData(initialData);

      // Clear errors and search query
      setErrors({});
    }
  }, [course, isOpen]);

  // ============================================================
  // VALIDATION HELPERS
  // ============================================================

  /**
   * Validates a single field synchronously (required + max length)
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

    return undefined;
  };

  /**
   * Checks if a course code already exists (excluding current course)
   */
  const checkCodeDuplicate = useCallback(
    async (code: string): Promise<boolean> => {
      if (!code.trim()) return false;

      try {
        setIsCheckingCode(true);
        const response = await apiFetch<DuplicateCheckResponse>(
          `/courses/check-code?code=${encodeURIComponent(code.trim())}&excludeId=${course.courses_id}`,
        );
        return response.exists;
      } catch (err) {
        console.error("Failed to check code duplicate:", err);
        return false;
      } finally {
        setIsCheckingCode(false);
      }
    },
    [course.courses_id],
  );

  /**
   * Checks if a course name already exists (excluding current course)
   */
  const checkNameDuplicate = useCallback(
    async (name: string): Promise<boolean> => {
      if (!name.trim()) return false;

      try {
        setIsCheckingName(true);
        const response = await apiFetch<DuplicateCheckResponse>(
          `/courses/check-name?name=${encodeURIComponent(name.trim())}&excludeId=${course.courses_id}`,
        );
        return response.exists;
      } catch (err) {
        console.error("Failed to check name duplicate:", err);
        return false;
      } finally {
        setIsCheckingName(false);
      }
    },
    [course.courses_id],
  );

  /**
   * Validates all fields including async duplicate checks
   * Only checks duplicates for fields that have changed
   */
  const validateForm = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    // Sync validation
    const codeError = validateFieldSync("course_code", formData.course_code);
    const nameError = validateFieldSync("course_name_th", formData.course_name_th);

    if (codeError) newErrors.course_code = codeError;
    if (nameError) newErrors.course_name_th = nameError;

    // If sync validation failed, don't check duplicates
    if (codeError || nameError) {
      setErrors(newErrors);
      return false;
    }

    // Only check duplicates for changed fields (optimization for edit mode)
    const codeChanged =
      formData.course_code.trim() !== originalData.course_code.trim();
    const nameChanged =
      formData.course_name_th.trim() !== originalData.course_name_th.trim();

    const checks: Promise<boolean>[] = [];

    if (codeChanged) {
      checks.push(checkCodeDuplicate(formData.course_code));
    } else {
      checks.push(Promise.resolve(false));
    }

    if (nameChanged) {
      checks.push(checkNameDuplicate(formData.course_name_th));
    } else {
      checks.push(Promise.resolve(false));
    }

    const [codeExists, nameExists] = await Promise.all(checks);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as "course_code" | "course_name_th" | "course_name_en";

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error and re-validate synchronously
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
    setErrors({});
    onClose();
  };

  const handleSubmit = async () => {
    const isValid = await validateForm();

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch(`/courses/${course.courses_id}`, {
        method: "PATCH",
        data: {
          course_name_th: formData.course_name_th.trim(),
          course_code: formData.course_code.trim(),
        },
      });

      setErrors({});
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("ERROR: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  const hasErrors = Object.values(errors).some((error) => !!error);
  const isFormEmpty =
    !formData.course_code.trim() || !formData.course_name_th.trim();
  const isSubmitDisabled =
    hasErrors ||
    isFormEmpty ||
    isSubmitting ||
    isCheckingCode ||
    isCheckingName;

  // ============================================================
  // RENDER
  // ============================================================

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center bg-opacity-30 rounded-2xl px-6 py-3 mb-2">
            <h1 className="text-3xl font-medium text-[#000000]">
              แก้ไขรายวิชา
            </h1>
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
                Course Name (English) <span className="text-red-500">*</span>
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
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="flex-1 bg-[#9264F5] text-white font-medium py-2 rounded-2xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {(isSubmitting || isCheckingCode || isCheckingName) && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
