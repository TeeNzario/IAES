"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AlertModal from "@/components/ui/AlertModal";

const MAX_KNOWLEDGE_LENGTH = 100;

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

  // Alert state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "error" | "success" | "warning";
  }>({ isOpen: false, title: "", message: "", variant: "error" });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing categories when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch<any[]>(
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCategory(searchQuery);
    }
  };

  const handleSuggestionClick = (name: string) => {
    addCategory(name);
    inputRef.current?.focus();
  };

  const handleSave = async () => {
    // If there's text in the input that hasn't been added yet, add it
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
    } catch (err: any) {
      console.error(err);
      setAlertState({
        isOpen: true,
        title: "เกิดข้อผิดพลาด",
        message: err?.message || "ไม่สามารถบันทึกหมวดหมู่ความรู้ได้ กรุณาลองใหม่อีกครั้ง",
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg">
        <div className="text-center mb-3">
          <h2 className="text-2xl font-light text-gray-800">
            หมวดหมู่ความรู้ — {course.name}
          </h2>
        </div>

        <div className="space-y-4">
          {/* Tags display */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-[#B7A3E3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {categories.length === 0 ? (
                <p className="rounded-xl bg-[#F8F5FF] px-4 py-3 text-sm text-gray-500">
                  ยังไม่มีหมวดหมู่ความรู้
                </p>
              ) : (
                <ul className="space-y-2">
                  {categories.map((cat) => (
                    <li
                      key={cat}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#F4EFFF] px-4 py-2.5 text-sm text-[#575757]"
                    >
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={() => removeCategory(cat)}
                        className="text-gray-400 hover:text-rose-500 transition-colors"
                        aria-label={`ลบ ${cat}`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-2">
                {!showAddInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddInput(true);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#B7A3E3] px-4 py-2 text-sm font-medium text-white hover:bg-[#A48FD6]"
                  >
                    <Plus size={16} /> เพิ่มหมวดหมู่ความรู้
                  </button>
                ) : (
                  <div className="relative">
                    <input
                      ref={inputRef}
                      value={searchQuery}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_KNOWLEDGE_LENGTH) {
                          setSearchQuery(e.target.value);
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-white text-black px-4 py-3 rounded-xl border border-[#B7A3E3] focus:outline-none focus:ring-2 focus:ring-purple-600"
                      placeholder="พิมพ์ชื่อหมวดหมู่ความรู้"
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
                            className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors text-black first:rounded-t-xl last:rounded-b-xl"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                สูงสุด {MAX_KNOWLEDGE_LENGTH} ตัวอักษรต่อหมวดหมู่
              </p>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 bg-white text-[#B7A3E3] border border-[#B7A3E3] font-medium py-2 rounded-2xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex-1 bg-[#9264F5] text-white font-medium py-2 rounded-2xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
