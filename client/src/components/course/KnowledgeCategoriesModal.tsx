"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BookOpenText,
  Hash,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
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
  let index = 0;
  let code = formatKnowledgeCode(courseCode, defaultKnowledgeSuffix(index));

  while (used.has(code)) {
    index += 1;
    code = formatKnowledgeCode(courseCode, defaultKnowledgeSuffix(index));
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#140F22]/55 p-4 py-6 backdrop-blur-[2px] sm:p-6">
      <div className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/60">
        {/* Header */}
        <div className="border-b border-[#EFE8FB] bg-gradient-to-br from-white via-[#FBF8FF] to-[#F4EFFF] px-5 py-5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#7A7287] transition-colors hover:bg-[#F4EFFF] hover:text-[#7C5BD9] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
          <div className="flex min-w-0 items-start gap-3 pr-11">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B7A3E3] text-white shadow-sm">
              <BookOpenText size={23} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-7 text-[#221B31]">
                จัดการหมวดหมู่ความรู้
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-medium text-[#7A7287]">
                <span>รายวิชา:</span>
                <span className="rounded-lg bg-white/80 px-2 py-0.5 font-mono text-xs font-bold text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                  {course.course_code}
                </span>
                <span className="break-words font-semibold text-[#7C5BD9]">
                  {course.name}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-14 text-[#7C5BD9]">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-3 text-sm font-semibold text-[#7A7287]">
                กำลังโหลดหมวดหมู่
              </p>
            </div>
          ) : (
            <>
              {/* Category list with sequence numbers */}
              <section className="rounded-2xl border border-[#E7DDF8] bg-[#FCFAFF] p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2F2A3A]">
                      หมวดหมู่ในรายวิชานี้
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-[#7A7287]">
                      {categories.length === 0
                        ? "ยังไม่มีรายการ"
                        : `${categories.length} รายการ`}
                    </p>
                  </div>
                </div>

                {categories.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D9CCF2] bg-white px-4 py-8 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4EFFF] text-[#7C5BD9]">
                      <BookOpenText size={21} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#514667]">
                      ยังไม่มีหมวดหมู่ความรู้
                    </p>
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {categories.map((cat, index) => (
                      <li
                        key={cat.code}
                        className="group grid grid-cols-[34px_minmax(0,1fr)_34px] items-start gap-3 rounded-2xl border border-[#EFE8FB] bg-white px-3.5 py-3 shadow-sm transition-colors hover:border-[#D9CCF2] hover:bg-[#FFFEFF]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B7A3E3] text-sm font-bold text-white shadow-sm">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#D9CCF2] bg-[#F8F5FF] px-2.5 py-1 font-mono text-xs font-bold text-[#7C5BD9]">
                            <Hash size={12} />
                            <span className="truncate">{cat.code}</span>
                          </span>
                          <p className="mt-2 break-words text-sm font-semibold leading-6 text-[#2F2A3A]">
                            {cat.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCategory(cat.code)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#A49AAD] transition-colors hover:bg-rose-50 hover:text-rose-500"
                          aria-label={`ลบ ${cat.name}`}
                          title="ลบ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {/* Add category section */}
              <section className="mt-4 rounded-2xl border border-[#E7DDF8] bg-white p-3 sm:p-4">
                {!showAddInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCodeInput(generateNextCode(categories, course.course_code));
                      setShowAddInput(true);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#B7A3E3] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] cursor-pointer"
                  >
                    <Plus size={16} />
                    เพิ่มหมวดหมู่ความรู้
                  </button>
                ) : (
                  <div className="relative grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-[#2F2A3A]">
                          รหัสหมวดหมู่ความรู้{" "}
                          <span className="text-xs font-normal text-[#8F84A3]">
                            ({codeInput.length}/{MAX_CODE_LENGTH})
                          </span>
                        </span>
                        <div className="relative">
                          <Hash
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8F84A3]"
                          />
                          <input
                            value={codeInput}
                            maxLength={MAX_CODE_LENGTH}
                            onChange={(e) =>
                              setCodeInput(e.target.value.toUpperCase())
                            }
                            className="h-11 w-full rounded-xl border border-[#D9CCF2] bg-[#FAF8FF] pl-9 pr-3 font-mono text-sm font-bold text-[#2F2A3A] shadow-sm transition focus:border-[#B7A3E3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E7DDF8]"
                            placeholder={`เช่น ${formatKnowledgeCode(course.course_code, "K001")}`}
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-[#2F2A3A]">
                          ชื่อหมวดหมู่{" "}
                          <span className="text-xs font-normal text-[#8F84A3]">
                            ({searchQuery.length}/{MAX_KNOWLEDGE_LENGTH})
                          </span>
                        </span>
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
                          className="min-h-11 w-full resize-none rounded-xl border border-[#D9CCF2] bg-[#FAF8FF] px-4 py-2.5 text-sm font-medium leading-6 text-[#2F2A3A] shadow-sm transition focus:border-[#B7A3E3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E7DDF8]"
                          placeholder="พิมพ์ชื่อหมวดหมู่ความรู้"
                        />
                      </label>
                    </div>

                    {showDropdown && suggestions.length > 0 && (
                      <div
                        ref={dropdownRef}
                        className="absolute left-0 right-0 top-full z-10 mt-2 max-h-48 overflow-y-auto rounded-2xl border border-[#D9CCF2] bg-white p-1 shadow-xl"
                      >
                        {suggestions.map((s) => (
                          <button
                            key={s.knowledge_category_id}
                            type="button"
                            onClick={() => handleSuggestionClick(s.name)}
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#2F2A3A] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Buttons */}
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#EFE8FB] bg-white px-5 py-4 sm:flex-row sm:px-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-12 flex-1 items-center justify-center rounded-xl border border-[#D9CCF2] bg-white px-6 text-sm font-bold text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || isLoading}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-6 text-sm font-bold text-white shadow-lg shadow-[#B7A3E3]/30 transition-colors hover:bg-[#9264F5] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save size={17} />
            )}
            บันทึก
          </button>
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
