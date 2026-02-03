"use client";

import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";

// Configuration constants
const MAX_KNOWLEDGE_LENGTH = 30;

interface CreateCourseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface KnowledgeCategory {
  knowledge_category_id: string;
  name: string;
}

export default function CreateCourseForm({
  onSuccess,
  onCancel,
}: CreateCourseFormProps) {
  const [formData, setFormData] = useState({
    course_name: "",
    course_code: "",
  });
  const [knowledgeCategories, setKnowledgeCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<KnowledgeCategory[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        // Filter out already added categories
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

  const handleCancel = () => {
    setFormData({
      course_name: "",
      course_code: "",
    });
    setKnowledgeCategories([]);
    setSearchQuery("");
    onCancel?.();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiFetch("/courses", {
        method: "POST",
        data: {
          course_name: formData.course_name,
          course_code: formData.course_code,
          knowledge_categories: knowledgeCategories,
        },
      });

      // Reset form
      setFormData({
        course_name: "",
        course_code: "",
      });
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

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
      <div className="text-center mb-3">
        <div className="inline-flex items-center justify-center bg-opacity-30 rounded-2xl px-6 py-3 mb-2">
          <h1 className="text-3xl font-medium text-[#000000]">สร้างรายวิชา</h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* ชื่อรายวิชา */}
        <div>
 
        {/* รหัสวิชา */}
        <div>
          <label className="block text-[#000000] text-sm font-light mb-">
            รหัสวิชา
          </label>
          <input
            type="text"
            name="course_code"
            value={formData.course_code}
            onChange={handleInputChange}
            className="w-full bg-white text-black px-4 py-3 rounded-xl border-1 mb-5 border-[#B7A3E3] focus:outline-none focus:ring-2 focus:ring-purple-600"
            placeholder=""
          />
        </div>
         <label className="block text-[#000000] text-sm font-light mb-2">
            ชื่อรายวิชา
          </label>
          <input
            type="text"
            name="course_name"
            value={formData.course_name}
            onChange={handleInputChange}
            className="w-full bg-white text-black px-4 py-3 rounded-xl border-1 border-[#B7A3E3] focus:outline-none focus:ring-2 focus:ring-purple-600 "
            placeholder=""
          />
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
            className="w-full bg-white text-black px-4 py-3 rounded-xl border-1 border-[#B7A3E3] focus:outline-none focus:ring-2 focus:ring-purple-600"
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
            className="flex-1 bg-white text-[#B7A3E3] border-1 border-[#B7A3E3] font-medium py-2 rounded-2xl hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            ย้อนกลับ
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-[#9264F5] text-white font-medium py-2 rounded-2xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}
