'use client'

import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import NavBar from '@/components/layout/NavBar';
import { apiFetch } from "@/lib/api";

const CreateCourse = () => {
  const [formData, setFormData] = useState({
    course_name: '',
    description: '',
    course_code: '',
    image: null as File | null
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        image: e.target.files![0]
      }));
    }
  };

  const handleCancel = () => {
    setFormData({
      course_name: '',
      description: '',
      course_code: '',
      image: null
    });
  };

  const handleSubmit = async () => {
      try {
          const data = new FormData();
          data.append('course_name', formData.course_name);
          data.append('description', formData.description);
          data.append('course_code', formData.course_code);

          if (formData.image) {
              data.append('image', formData.image);
          }

          console.log(data);

          const result = await apiFetch('/courses', {
              method: 'POST',
              data: data,
          })

          //test
          console.log('Success', result);

          alert('สร้างรายวิชาสำเร็จ');
          handleCancel();

      } catch (err: any) {
          console.error(err);
          alert("ERROR:", err?.message || err);


      }
  };

  return (
    <NavBar>
    <div className="min-h-screen bg-[#F4EFFF] flex  justify-center p-4">
      <div className="bg-[#B7A3E3] rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center bg-opacity-30 rounded-2xl px-6 py-3 mb-2">
            <Upload className="w-6 h-6 text-white mr-3" />
            <h1 className="text-3xl font-bold text-white">สร้างรายวิชา</h1>
          </div>
        </div>

        <div className="space-y-4">
          {/* ชื่อรายวิชา */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              ชื่อรายวิชา
            </label>
            <input
              type="text"
              name="course_name"
              value={formData.course_name}
              onChange={handleInputChange}
              className="w-full bg-white text-black px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder=""
            />
          </div>

          {/* คำอธิบายรายวิชา */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              คำอธิบายรายวิชา
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full bg-white text-black px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
              placeholder=""
            />
          </div>

          {/* รหัสวิชา */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              รหัสวิชา
            </label>
            <input
              type="text"
              name="course_code"
              value={formData.course_code}
              onChange={handleInputChange}
              className="w-full bg-white text-black px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder=""
            />
          </div>


          {/* เพิ่มภาพพื้นหลัง */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              เพิ่มภาพพื้นหลัง
            </label>
            <label className="inline-flex items-center bg-white px-6 py-2 rounded-full cursor-pointer hover:bg-gray-50 transition-colors">
              <span className="text-purple-400 font-medium">อัพโหลด</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {formData.image && (
              <p className="text-white text-sm mt-2">
                {formData.image.name}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleCancel}
              className="flex-1 bg-white text-purple-400 font-medium py-3 rounded-full hover:bg-gray-50 transition-colors"
            >
              ย้อนกลับ
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-purple-600 text-white font-medium py-3 rounded-full hover:bg-purple-700 transition-colors"
            >
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </div>
    </NavBar>
  );
};

export default CreateCourse;