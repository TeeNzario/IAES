"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";

// ============================================================
// CONFIGURATION CONSTANTS — Adjust limits here
// ============================================================
const COURSE_CODE_MAX_LENGTH = 10;
const COURSE_NAME_MAX_LENGTH = 100;
const MAX_KNOWLEDGE_LENGTH = 30;

// ============================================================
// VALIDATION ERROR MESSAGES (Thai)
// ============================================================
const ERROR_MESSAGES = {
  course_code: {
    required: "กรุณากรอกรหัสวิชา",
    maxLength: `รหัสวิชาไม่เกิน ${COURSE_CODE_MAX_LENGTH} ตัวอักษร`,
    duplicate: "รหัสวิชานี้ถูกใช้แล้ว กรุณาใช้รหัสอื่น",
  },
  course_name: {
    required: "กรุณากรอกชื่อรายวิชา",
    maxLength: `ชื่อรายวิชาไม่เกิน ${COURSE_NAME_MAX_LENGTH} ตัวอักษร`,
    duplicate: "ชื่อรายวิชานี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น",
  },
};

// ============================================================
// TYPES
// ============================================================
interface KnowledgeCategoryResponse {
  knowledge_category_id: string;
  name: string;
}

interface CourseKnowledge {
  knowledge_categories: KnowledgeCategoryResponse;
}

interface CourseData {
  courses_id: number;
  course_code: string;
  course_name: string;
  course_knowledge?: CourseKnowledge[];
}

interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  course: CourseData;
}

interface FormErrors {
  course_code?: string;
  course_name?: string;
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
    course_name: "",
    course_code: "",
  });

  // Store original values to detect changes (for edit mode duplicate checks)
  const [originalData, setOriginalData] = useState({
    course_name: "",
    course_code: "",
  });

  // Validation errors state
  const [errors, setErrors] = useState<FormErrors>({});

  // Duplicate check loading states
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);

  // Knowledge categories state
  const [knowledgeCategories, setKnowledgeCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<KnowledgeCategoryResponse[]>(
    [],
  );
  const [showDropdown, setShowDropdown] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // INITIALIZATION
  // ============================================================

  // Initialize form with course data when modal opens
  useEffect(() => {
    if (course && isOpen) {
      const initialData = {
        course_name: course.course_name,
        course_code: course.course_code,
      };
      setFormData(initialData);
      setOriginalData(initialData); // Store original for comparison

      // Extract knowledge category names
      const categoryNames =
        course.course_knowledge?.map((ck) => ck.knowledge_categories.name) ||
        [];
      setKnowledgeCategories(categoryNames);

      // Clear errors when opening
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
    field: "course_code" | "course_name",
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
    const nameError = validateFieldSync("course_name", formData.course_name);

    if (codeError) newErrors.course_code = codeError;
    if (nameError) newErrors.course_name = nameError;

    // If sync validation failed, don't check duplicates
    if (codeError || nameError) {
      setErrors(newErrors);
      return false;
    }

    // Only check duplicates for changed fields (optimization for edit mode)
    const codeChanged =
      formData.course_code.trim() !== originalData.course_code.trim();
    const nameChanged =
      formData.course_name.trim() !== originalData.course_name.trim();

    const checks: Promise<boolean>[] = [];

    if (codeChanged) {
      checks.push(checkCodeDuplicate(formData.course_code));
    } else {
      checks.push(Promise.resolve(false));
    }

    if (nameChanged) {
      checks.push(checkNameDuplicate(formData.course_name));
    } else {
      checks.push(Promise.resolve(false));
    }

    const [codeExists, nameExists] = await Promise.all(checks);

    if (codeExists) {
      newErrors.course_code = ERROR_MESSAGES.course_code.duplicate;
    }

    if (nameExists) {
      newErrors.course_name = ERROR_MESSAGES.course_name.duplicate;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // INPUT HANDLERS
  // ============================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as "course_code" | "course_name";

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

  const handleKnowledgeInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    if (value.length <= MAX_KNOWLEDGE_LENGTH) {
      setSearchQuery(value);
    }
  };

  // ============================================================
  // KNOWLEDGE CATEGORIES HANDLERS
  // ============================================================

  const addKnowledgeCategory = (name: string) => {
    const trimmedName = name.trim();
    if (
      trimmedName.length > 0 &&
      trimmedName.length <= MAX_KNOWLEDGE_LENGTH &&
      !knowledgeCategories.includes(trimmedName)
    ) {
      setKnowledgeCategories((prev) => [...prev, trimmedName]);
      setSearchQuery("");
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const removeKnowledgeCategory = (name: string) => {
    setKnowledgeCategories((prev) => prev.filter((cat) => cat !== name));
  };

  const handleKnowledgeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKnowledgeCategory(searchQuery);
    }
  };

  const handleSuggestionClick = (name: string) => {
    addKnowledgeCategory(name);
    inputRef.current?.focus();
  };

  // ============================================================
  // FORM ACTIONS
  // ============================================================

  const handleCancel = () => {
    setSearchQuery("");
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
          course_name: formData.course_name.trim(),
          course_code: formData.course_code.trim(),
          knowledge_categories: knowledgeCategories,
        },
      });

      setSearchQuery("");
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
  // EFFECTS
  // ============================================================

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length === 0) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      try {
        const results = await apiFetch<KnowledgeCategoryResponse[]>(
          `/knowledge-categories?search=${encodeURIComponent(searchQuery)}`,
        );
        const filtered = results.filter(
          (cat) => !knowledgeCategories.includes(cat.name),
        );
        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
        setSuggestions([]);
        setShowDropdown(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, knowledgeCategories]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  const hasErrors = Object.values(errors).some((error) => !!error);
  const isFormEmpty =
    !formData.course_code.trim() || !formData.course_name.trim();
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

          {/* ชื่อรายวิชา */}
          <div>
            <label className="block text-[#000000] text-sm font-light mb-2">
              ชื่อรายวิชา <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="course_name"
              value={formData.course_name}
              onChange={handleInputChange}
              maxLength={COURSE_NAME_MAX_LENGTH}
              className={`w-full bg-white text-black px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                errors.course_name ? "border-red-500" : "border-[#B7A3E3]"
              }`}
              placeholder=""
            />
            <div className="flex justify-between items-center mt-1">
              {errors.course_name ? (
                <p className="text-red-500 text-xs">{errors.course_name}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">
                {formData.course_name.length}/{COURSE_NAME_MAX_LENGTH}
              </span>
            </div>
          </div>

          {/* หมวดหมู่ความรู้ */}
          <div className="relative">
            <label className="block text-[#000000] text-sm font-light mb-2">
              หมวดหมู่ความรู้
            </label>

            {/* Tags display */}
            {knowledgeCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {knowledgeCategories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center bg-[#B7A3E3] text-white px-3 py-1 rounded-lg text-sm"
                  >
                    {category}
                    <button
                      type="button"
                      onClick={() => removeKnowledgeCategory(category)}
                      className="ml-2 hover:text-red-200 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleKnowledgeInputChange}
              onKeyDown={handleKnowledgeKeyDown}
              className="w-full bg-white text-black px-4 py-3 rounded-xl border border-[#B7A3E3] focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="พิมพ์แล้วกด Enter เพื่อเพิ่ม"
            />
            <p className="text-xs text-gray-500 mt-1">
              สูงสุด {MAX_KNOWLEDGE_LENGTH} ตัวอักษรต่อหมวดหมู่
            </p>

            {/* Suggestions dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-10 w-full mt-1 bg-white border border-[#B7A3E3] rounded-xl shadow-lg max-h-48 overflow-y-auto"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.knowledge_category_id}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion.name)}
                    className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors text-black first:rounded-t-xl last:rounded-b-xl"
                  >
                    {suggestion.name}
                  </button>
                ))}
              </div>
            )}
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
