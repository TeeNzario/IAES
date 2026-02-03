"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";

// ============================================================
// CONFIGURATION CONSTANTS — Adjust limits here
// ============================================================
const COURSE_CODE_MAX_LENGTH = 10;
const COURSE_NAME_MAX_LENGTH = 100;
const MAX_KNOWLEDGE_LENGTH = 25;

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
interface CreateCourseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface KnowledgeCategory {
  knowledge_category_id: string;
  name: string;
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
export default function CreateCourseForm({
  onSuccess,
  onCancel,
}: CreateCourseFormProps) {
  // Form state
  const [formData, setFormData] = useState({
    course_name: "",
    course_code: "",
  });

  // Validation errors state
  const [errors, setErrors] = useState<FormErrors>({});

  // Duplicate check loading states (for UX feedback)
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);

  // Knowledge categories state
  const [knowledgeCategories, setKnowledgeCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<KnowledgeCategory[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // VALIDATION HELPERS
  // ============================================================

  /**
   * Validates a single field synchronously (required + max length)
   * Returns error message or undefined if valid
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
    const nameError = validateFieldSync("course_name", formData.course_name);

    if (codeError) newErrors.course_code = codeError;
    if (nameError) newErrors.course_name = nameError;

    // If sync validation failed, don't check duplicates
    if (codeError || nameError) {
      setErrors(newErrors);
      return false;
    }

    // Async duplicate checks (run in parallel for speed)
    const [codeExists, nameExists] = await Promise.all([
      checkCodeDuplicate(formData.course_code),
      checkNameDuplicate(formData.course_name),
    ]);

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

  /**
   * Handles input changes and clears errors as user types
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as "course_code" | "course_name";

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
    setFormData({
      course_name: "",
      course_code: "",
    });
    setErrors({});
    setKnowledgeCategories([]);
    setSearchQuery("");
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
          course_name: formData.course_name.trim(),
          course_code: formData.course_code.trim(),
          knowledge_categories: knowledgeCategories,
        },
      });

      // Reset form on success
      setFormData({
        course_name: "",
        course_code: "",
      });
      setErrors({});
      setKnowledgeCategories([]);
      setSearchQuery("");

      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      alert("ERROR: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================

  // Fetch suggestions when search query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length === 0) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      try {
        const results = await apiFetch<KnowledgeCategory[]>(
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

  // Disable submit if any required field is empty or has errors
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

  return (
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
          {/* Character count hint */}
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
  );
}
