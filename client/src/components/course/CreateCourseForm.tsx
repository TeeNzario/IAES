"use client";

import React, { useState } from "react";
import { Upload } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CreateCourseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateCourseForm({
  onSuccess,
  onCancel,
}: CreateCourseFormProps) {
  const [formData, setFormData] = useState({
    course_name: "",
    description: "",
    course_code: "",
    image: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({
        ...prev,
        image: e.target.files![0],
      }));
    }
  };

  const handleCancel = () => {
    setFormData({
      course_name: "",
      description: "",
      course_code: "",
      image: null,
    });
    onCancel?.();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append("course_name", formData.course_name);
      data.append("description", formData.description);
      data.append("course_code", formData.course_code);

      if (formData.image) {
        data.append("image", formData.image);
      }

      await apiFetch("/courses", {
        method: "POST",
        data: data,
      });

      // Reset form
      setFormData({
        course_name: "",
        description: "",
        course_code: "",
        image: null,
      });

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

        {/* คำอธิบายรายวิชา */}
        <div>
          <label className="block text-[#000000] text-sm font-light mb-2">
            คำอธิบายรายวิชา
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full bg-white text-black px-4 py-3 rounded-xl border-1 border-[#B7A3E3] focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
            placeholder=""
          />
        </div>

        {/* รหัสวิชา */}
        <div>
          <label className="block text-[#000000] text-sm font-light mb-2">
            รหัสวิชา
          </label>
          <input
            type="text"
            name="course_code"
            value={formData.course_code}
            onChange={handleInputChange}
            className="w-full bg-white text-black px-4 py-3 rounded-xl border-1 border-[#B7A3E3] focus:outline-none focus:ring-2 focus:ring-purple-600"
            placeholder=""
          />
        </div>

        {/* เพิ่มภาพพื้นหลัง */}
        <div>
          <label className="block text-[#000000] text-sm font-light mb-2">
            เพิ่มภาพพื้นหลัง
          </label>
          <label className="inline-flex items-center bg-[#B7A3E3] px-6 py-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
            <span className="text-white font-medium">อัพโหลด</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {formData.image && (
            <p className="text-white text-sm mt-2">{formData.image.name}</p>
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
