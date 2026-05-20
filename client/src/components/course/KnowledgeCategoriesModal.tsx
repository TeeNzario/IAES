"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AlertModal from "@/components/ui/AlertModal";
import { FIELD_LIMITS } from "@/config/fieldLimits";

const MAX_KNOWLEDGE_LENGTH = FIELD_LIMITS.knowledgeCategoryName;
const MAX_CODE_LENGTH = FIELD_LIMITS.knowledgeCategoryCode;
const KNOWLEDGE_SUFFIX_PATTERN = /^K\d{3,}$/;

interface KnowledgeCategory {
  knowledge_category_id: string;
  name: string;
  code?: string;
}

interface DraftKnowledgeCategory {
  knowledge_category_id?: string;
  name: string;
  code: string;
}

interface KnowledgeCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: { courses_id: number; course_code: string; name: string };
  onSuccess?: () => void;
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function defaultKnowledgeSuffix(index: number) {
  return `K${String(index + 1).padStart(3, "0")}`;
}

function codePrefix(courseCode: string) {
  return `${normalizeCode(courseCode)}-`;
}

function formatKnowledgeCode(courseCode: string, suffix: string) {
  return `${codePrefix(courseCode)}${normalizeCode(suffix)}`;
}

function getKnowledgeSuffix(code: string, courseCode: string) {
  const normalizedCode = normalizeCode(code);
  const prefix = codePrefix(courseCode);
  return normalizedCode.startsWith(prefix)
    ? normalizedCode.slice(prefix.length)
    : normalizedCode;
}

function normalizeKnowledgeCode(
  code: string,
  courseCode: string,
  fallbackSuffix: string,
) {
  const normalizedCode = normalizeCode(code);
  const suffix = normalizedCode
    ? getKnowledgeSuffix(normalizedCode, courseCode)
    : fallbackSuffix;

  return formatKnowledgeCode(courseCode, suffix);
}

function generateNextCode(
  categories: DraftKnowledgeCategory[],
  courseCode: string,
) {
  const used = new Set(
    categories.map((category) =>
      normalizeKnowledgeCode(category.code, courseCode, "K001"),
    ),
  );
  let index = categories.length + 1;
  let code = formatKnowledgeCode(courseCode, defaultKnowledgeSuffix(index - 1));

  while (used.has(code)) {
    index += 1;
    code = formatKnowledgeCode(courseCode, defaultKnowledgeSuffix(index - 1));
  }

  return code;
}

export default function KnowledgeCategoriesModal({
  isOpen,
  onClose,
  course,
  onSuccess,
}: KnowledgeCategoriesModalProps) {
  const [categories, setCategories] = useState<DraftKnowledgeCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [codeInput, setCodeInput] = useState(() =>
    formatKnowledgeCode(course.course_code, "K001"),
  );
  const [suggestions, setSuggestions] = useState<KnowledgeCategory[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "error" | "success" | "warning";
  }>({ isOpen: false, title: "", message: "", variant: "error" });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const showValidationAlert = (message: string) => {
    setAlertState({
      isOpen: true,
      title: "ตรวจสอบข้อมูล",
      message,
      variant: "warning",
    });
  };

  const buildCategory = (
    name: string,
    code: string,
    existingCategories = categories,
  ): DraftKnowledgeCategory | null => {
    const trimmedName = name.trim();
    const normalizedCode = normalizeKnowledgeCode(
      code,
      course.course_code,
      defaultKnowledgeSuffix(existingCategories.length),
    );
    const suffix = getKnowledgeSuffix(normalizedCode, course.course_code);

    if (!trimmedName) {
      showValidationAlert("กรุณากรอกชื่อหมวดหมู่ความรู้");
      return null;
    }

    if (trimmedName.length > MAX_KNOWLEDGE_LENGTH) {
      showValidationAlert(
        `ชื่อหมวดหมู่ความรู้ไม่เกิน ${MAX_KNOWLEDGE_LENGTH} ตัวอักษร`,
      );
      return null;
    }

    if (!suffix) {
      showValidationAlert("กรุณากรอกรหัสหมวดหมู่ความรู้");
      return null;
    }

    if (normalizedCode.length > MAX_CODE_LENGTH) {
      showValidationAlert(
        `รหัสหมวดหมู่ความรู้ไม่เกิน ${MAX_CODE_LENGTH} ตัวอักษร`,
      );
      return null;
    }

    if (!KNOWLEDGE_SUFFIX_PATTERN.test(suffix)) {
      showValidationAlert(
        `รหัสหมวดหมู่ความรู้ต้องอยู่ในรูปแบบ ${formatKnowledgeCode(course.course_code, "K001")}`,
      );
      return null;
    }

    if (
      existingCategories.some(
        (category) => category.code.toUpperCase() === normalizedCode,
      )
    ) {
      showValidationAlert(`รหัส ${normalizedCode} ซ้ำในรายวิชานี้`);
      return null;
    }

    if (
      existingCategories.some(
        (category) =>
          category.name.trim().toLocaleLowerCase("th-TH") ===
          trimmedName.toLocaleLowerCase("th-TH"),
      )
    ) {
      showValidationAlert(`ชื่อหมวดหมู่ "${trimmedName}" ซ้ำในรายวิชานี้`);
      return null;
    }

    return {
      code: normalizedCode,
      name: trimmedName,
    };
  };

  // Load existing categories when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch<KnowledgeCategory[]>(
          `/courses/${course.courses_id}/knowledge-categories`,
        );
        const loaded = data.map((category, index) => ({
          knowledge_category_id: category.knowledge_category_id,
          name: category.name,
          code: normalizeKnowledgeCode(
            category.code || defaultKnowledgeSuffix(index),
            course.course_code,
            defaultKnowledgeSuffix(index),
          ),
        }));
        setCategories(loaded);
        setCodeInput(generateNextCode(loaded, course.course_code));
      } catch {
        setCategories([]);
        setCodeInput(formatKnowledgeCode(course.course_code, "K001"));
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setShowAddInput(false);
  }, [isOpen, course.courses_id, course.course_code]);

  const addCategory = (name: string) => {
    const category = buildCategory(name, codeInput);
    if (!category) return;

    const nextCategories = [...categories, category];
    setCategories(nextCategories);
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setCodeInput(generateNextCode(nextCategories, course.course_code));
  };

  const removeCategory = (code: string) => {
    const nextCategories = categories.filter((category) => category.code !== code);
    setCategories(nextCategories);
    setCodeInput(generateNextCode(nextCategories, course.course_code));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addCategory(searchQuery);
    }
  };

  const handleSuggestionClick = (name: string) => {
    addCategory(name);
    inputRef.current?.focus();
  };

  const handleSave = async () => {
    const trimmed = searchQuery.trim();
    const pendingCategory = trimmed
      ? buildCategory(trimmed, codeInput, categories)
      : null;

    if (trimmed && !pendingCategory) return;

    const finalCategories = pendingCategory
      ? [...categories, pendingCategory]
      : categories;

    setIsSubmitting(true);
    try {
      await apiFetch(`/courses/${course.courses_id}/knowledge-categories`, {
        method: "PUT",
        data: {
          categories: finalCategories.map((category) => ({
            code: category.code,
            name: category.name,
          })),
        },
      });
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
            : "ไม่สามารถบันทึกหมวดหมู่ความรู้ได้ กรุณาลองใหม่อีกครั้ง",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch suggestions
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
          (cat) =>
            !categories.some(
              (category) =>
                category.name.trim().toLocaleLowerCase("th-TH") ===
                cat.name.trim().toLocaleLowerCase("th-TH"),
            ),
        );
        setSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, categories]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-start justify-center overflow-y-auto p-4 py-6 sm:p-6">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            จัดการหมวดหมู่ความรู้
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            รายวิชา: <span className="font-semibold text-[#7C5BD9]">{course.name}</span>
          </p>
        </div>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-[#B7A3E3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Category list with sequence numbers */}
              {categories.length === 0 ? (
                <div className="rounded-xl bg-[#F8F5FF] px-4 py-6 text-center text-sm text-gray-500">
                  ยังไม่มีหมวดหมู่ความรู้ — เพิ่มหมวดหมู่แรกด้านล่าง
                </div>
              ) : (
                <ul className="space-y-2 mb-4">
                  {categories.map((cat, index) => (
                    <li
                      key={cat.code}
                      className="flex items-start gap-3 rounded-xl bg-[#F4EFFF] px-4 py-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B7A3E3] text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="mt-0.5 shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-[#7C5BD9] ring-1 ring-[#D9CCF2]">
                        {cat.code}
                      </span>
                      <span className="flex-1 text-sm text-[#2F2A3A] font-medium break-words">
                        {cat.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCategory(cat.code)}
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                        aria-label={`ลบ ${cat.name}`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add category section */}
              <div className="border-t border-[#EFE8FB] pt-4 space-y-3">
                {!showAddInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCodeInput(generateNextCode(categories, course.course_code));
                      setShowAddInput(true);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#B7A3E3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A48FD6] transition-colors cursor-pointer"
                  >
                    <Plus size={16} />
                    เพิ่มหมวดหมู่ความรู้
                  </button>
                ) : (
                  <div className="relative space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                        รหัสหมวดหมู่ความรู้{" "}
                        <span className="text-xs font-normal text-gray-500">
                          ({codeInput.length}/{MAX_CODE_LENGTH})
                        </span>
                      </label>
                      <input
                        value={codeInput}
                        maxLength={MAX_CODE_LENGTH}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        className="h-11 w-full rounded-xl border-2 border-[#9264F5] px-4 text-[15px] font-semibold text-gray-900 shadow-sm transition-colors focus:outline-none focus:border-[#B7A3E3]"
                        placeholder={`เช่น ${formatKnowledgeCode(course.course_code, "K001")}`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                        ชื่อหมวดหมู่{" "}
                        <span className="text-xs font-normal text-gray-500">
                          ({searchQuery.length}/{MAX_KNOWLEDGE_LENGTH})
                        </span>
                      </label>
                      <textarea
                        ref={inputRef}
                        value={searchQuery}
                        maxLength={MAX_KNOWLEDGE_LENGTH}
                        onChange={(e) => {
                          if (e.target.value.length <= MAX_KNOWLEDGE_LENGTH) {
                            setSearchQuery(e.target.value);
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        className="w-full rounded-xl border-2 border-[#9264F5] px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none focus:border-[#B7A3E3] resize-none"
                        placeholder="พิมพ์ชื่อหมวดหมู่ความรู้ แล้วกด Enter เพื่อเพิ่ม"
                      />
                    </div>

                    {showDropdown && suggestions.length > 0 && (
                      <div
                        ref={dropdownRef}
                        className="absolute z-10 w-full mt-1 bg-white border border-[#B7A3E3] rounded-xl shadow-lg max-h-48 overflow-y-auto"
                      >
                        {suggestions.map((s) => (
                          <button
                            key={s.knowledge_category_id}
                            type="button"
                            onClick={() => handleSuggestionClick(s.name)}
                            className="w-full text-left px-4 py-2.5 hover:bg-purple-50 transition-colors text-sm text-[#2F2A3A] first:rounded-t-xl last:rounded-b-xl cursor-pointer"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">
                      กด Enter เพื่อเพิ่มหมวดหมู่ รหัสจะใช้ในไฟล์ CSV นำเข้าข้อสอบ
                    </p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-2.5 font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-6 py-2.5 font-semibold text-white shadow-lg transition-colors hover:bg-[#9264F5] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  บันทึก
                </button>
              </div>
            </>
          )}
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
