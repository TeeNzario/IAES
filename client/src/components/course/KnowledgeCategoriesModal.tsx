"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AlertModal from "@/components/ui/AlertModal";
import { FIELD_LIMITS } from "@/config/fieldLimits";

const MAX_KNOWLEDGE_LENGTH = FIELD_LIMITS.knowledgeCategoryName;

interface KnowledgeCategory {
  knowledge_category_id: string;
  name: string;
}

interface KnowledgeCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: { courses_id: number; name: string };
  onSuccess?: () => void;
}

export default function KnowledgeCategoriesModal({
  isOpen,
  onClose,
  course,
  onSuccess,
}: KnowledgeCategoriesModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Load existing categories when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch<KnowledgeCategory[]>(
          `/courses/${course.courses_id}/knowledge-categories`,
        );
        setCategories(data.map((d) => d.name));
      } catch {
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setShowAddInput(false);
  }, [isOpen, course.courses_id]);

  const addCategory = (name: string) => {
    const trimmed = name.trim();
    if (
      trimmed.length > 0 &&
      trimmed.length <= MAX_KNOWLEDGE_LENGTH &&
      !categories.includes(trimmed)
    ) {
      setCategories((prev) => [...prev, trimmed]);
      setSearchQuery("");
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const removeCategory = (name: string) => {
    setCategories((prev) => prev.filter((cat) => cat !== name));
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
    const finalCategories =
      trimmed.length > 0 &&
      trimmed.length <= MAX_KNOWLEDGE_LENGTH &&
      !categories.includes(trimmed)
        ? [...categories, trimmed]
        : categories;

    setIsSubmitting(true);
    try {
      await apiFetch(`/courses/${course.courses_id}/knowledge-categories`, {
        method: "PUT",
        data: { names: finalCategories },
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
          (cat) => !categories.includes(cat.name),
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
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
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
                      key={cat}
                      className="flex items-center gap-3 rounded-xl bg-[#F4EFFF] px-4 py-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B7A3E3] text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm text-[#2F2A3A] font-medium break-all">
                        {cat}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCategory(cat)}
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                        aria-label={`ลบ ${cat}`}
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
                      setShowAddInput(true);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#B7A3E3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A48FD6] transition-colors cursor-pointer"
                  >
                    <Plus size={16} />
                    เพิ่มหมวดหมู่ความรู้
                  </button>
                ) : (
                  <div className="relative">
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
                      กด Enter เพื่อเพิ่มหมวดหมู่
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
