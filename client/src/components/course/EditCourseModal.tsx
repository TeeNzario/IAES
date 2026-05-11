"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import AlertModal from "@/components/ui/AlertModal";
import { FIELD_LIMITS } from "@/config/fieldLimits";

// ============================================================
// CONFIGURATION CONSTANTS — Adjust limits here
// ============================================================
const COURSE_CODE_MAX_LENGTH = FIELD_LIMITS.courseCode;
const COURSE_NAME_MAX_LENGTH = FIELD_LIMITS.courseName;

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

  // Alert state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "error" | "success" | "warning";
  }>({ isOpen: false, title: "", message: "", variant: "error" });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    } catch (err: unknown) {
      console.error(err);
      setAlertState({
        isOpen: true,
        title: "เกิดข้อผิดพลาด",
        message:
          err instanceof Error
            ? err.message
            : "ไม่สามารถบันทึกรายวิชาได้ กรุณาลองใหม่อีกครั้ง",
        variant: "error",
      });
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

  /**
   * Returns Tailwind color classes for the character counter based on
   * how close the current length is to the max limit.
   */
  const getCounterColor = (current: number, max: number) => {
    if (current >= max) return "text-red-500 font-semibold";
    if (current >= max * 0.9) return "text-amber-500 font-semibold";
    return "text-gray-500";
  };

  /**
   * Returns a warning message when at the character limit.
   */
  const getLimitWarning = (current: number, max: number) => {
    if (current >= max) return "ถึงจำนวนอักษรสูงสุดแล้ว";
    return null;
  };

  const hasErrors = Object.values(errors).some((error) => !!error);
  const isFormEmpty =
    !formData.course_code.trim() || !formData.course_name_th.trim() || !formData.course_name_en.trim();
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
      className="fixed inset-0 bg-black/45 z-50 flex items-start justify-center overflow-y-auto p-4 py-6 sm:p-6"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">แก้ไขรายวิชา</h2>
        </div>

        <div>
          {/* รหัสวิชา */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              รหัสวิชา <span className="text-red-500">*</span>{" "}
              <span
                className={`text-xs font-medium ${getCounterColor(formData.course_code.length, COURSE_CODE_MAX_LENGTH)}`}
              >
                ({formData.course_code.length}/{COURSE_CODE_MAX_LENGTH})
              </span>
            </label>
            <input
              type="text"
              name="course_code"
              value={formData.course_code}
              onChange={handleInputChange}
              maxLength={COURSE_CODE_MAX_LENGTH}
              className={`w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none ${
                errors.course_code ? "border-red-500 focus:border-red-500" : "border-[#9264F5] focus:border-[#B7A3E3]"
              }`}
              placeholder=""
            />
            {errors.course_code && (
              <p className="text-red-500 text-xs mt-1">{errors.course_code}</p>
            )}
          </div>

          {/* ชื่อรายวิชา (ภาษาไทย) */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              ชื่อรายวิชา (ภาษาไทย) <span className="text-red-500">*</span>{" "}
              <span
                className={`text-xs font-medium ${getCounterColor(formData.course_name_th.length, COURSE_NAME_MAX_LENGTH)}`}
              >
                ({formData.course_name_th.length}/{COURSE_NAME_MAX_LENGTH})
              </span>
            </label>
            <textarea
              name="course_name_th"
              value={formData.course_name_th}
              onChange={handleInputChange}
              maxLength={COURSE_NAME_MAX_LENGTH}
              rows={3}
              className={`w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none resize-none ${
                errors.course_name_th ? "border-red-500 focus:border-red-500" : "border-[#9264F5] focus:border-[#B7A3E3]"
              }`}
              placeholder=""
            />
            {errors.course_name_th ? (
              <p className="text-red-500 text-xs mt-1">{errors.course_name_th}</p>
            ) : (
              getLimitWarning(formData.course_name_th.length, COURSE_NAME_MAX_LENGTH) && (
                <p className="text-amber-500 text-xs mt-1">
                  {getLimitWarning(formData.course_name_th.length, COURSE_NAME_MAX_LENGTH)}
                </p>
              )
            )}
          </div>

          {/* Course Name (English) */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              ชื่อรายวิชา (ภาษาอังกฤษ) <span className="text-red-500">*</span>{" "}
              <span
                className={`text-xs font-medium ${getCounterColor(formData.course_name_en.length, COURSE_NAME_MAX_LENGTH)}`}
              >
                ({formData.course_name_en.length}/{COURSE_NAME_MAX_LENGTH})
              </span>
            </label>
            <textarea
              name="course_name_en"
              value={formData.course_name_en}
              onChange={handleInputChange}
              maxLength={COURSE_NAME_MAX_LENGTH}
              rows={3}
              className={`w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none resize-none ${
                errors.course_name_en ? "border-red-500 focus:border-red-500" : "border-[#9264F5] focus:border-[#B7A3E3]"
              }`}
              placeholder=""
            />
            {errors.course_name_en ? (
              <p className="text-red-500 text-xs mt-1">{errors.course_name_en}</p>
            ) : (
              getLimitWarning(formData.course_name_en.length, COURSE_NAME_MAX_LENGTH) && (
                <p className="text-amber-500 text-xs mt-1">
                  {getLimitWarning(formData.course_name_en.length, COURSE_NAME_MAX_LENGTH)}
                </p>
              )
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-2.5 font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-6 py-2.5 font-semibold text-white shadow-lg transition-colors hover:bg-[#9264F5] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {(isSubmitting || isCheckingCode || isCheckingName) && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              บันทึก
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
    </div>
  );
}
