"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Edit2,
} from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import CourseModal from "@/features/courseOffering/components/CourseOfferingModal";
import CreateCourseModal from "@/components/course/CreateCourseModal";
import { apiFetch } from "@/lib/api";

// Interface matching backend response
interface Course {
  courses_id: number;
  course_code: string;
  course_name: string;
  status: "ACTIVE" | "INACTIVE";
  created_at?: string;
}

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName: string;
  onSave: (data: {
    academicYear: string;
    semester: string;
    status: string;
  }) => void;
}

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [courseStatus, setCourseStatus] = useState("ACTIVE");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch courses function (extracted for reuse)
  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<Course[]>("/courses");
      setCourses(data);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setError("ไม่สามารถโหลดข้อมูลคอร์สได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Filter courses by search term
  const filteredCourses = courses.filter(
    (course) =>
      course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Navbar>
      <div className="min-h-screen bg-[#FAF8FF] p-15">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <h1 className="text-3xl font-bold text-[#484848] mb-12">
            จัดการคอร์สเรียน
          </h1>

          <div className="flex flex-row justify-between items-center gap-4">
            {/* Controls */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-12 py-2 bg-[#B7A3E3] border-1 border-[#B7A3E3] text-white text-lg font-bold rounded-xl hover:bg-gray-50 hover:text-[#B7A3E3] hover:border-[#B7A3E3] hover:border-1 transition-colors cursor-pointer"
              >
                สร้างคอร์ส
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex gap-3 mb-4">
              <button className="px-15 py-1 bg-white border border-[#B7A3E3] text-[#B7A3E3] text-lg font-bold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                ทั้งหมด
              </button>
              <button className="px-4 py-2 border border-[#B7A3E3] text-[#B7A3E3] bg-white rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer">
                <Filter size={18} />
              </button>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white px-3 py-2 pr-40 text-[#DEDEDE] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <Search
                  className="absolute right-3 top-2.5 text-[#525252]"
                  size={20}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <colgroup>
                <col className="w-1/6" />
                <col className="w-3/6" />
                <col className="w-2/6" />
              </colgroup>
              <thead className="bg-[#B7A3E3] text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-md font-light">
                    รหัสวิชา
                  </th>
                  <th className="px-6 py-3 text-left text-md font-light">
                    ชื่อวิชา
                  </th>
                  <th className="px-6 py-3 text-left text-md font-light">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Loading State */}
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500">กำลังโหลด...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Error State */}
                {!isLoading && error && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-red-500"
                    >
                      {error}
                    </td>
                  </tr>
                )}

                {/* Empty State */}
                {!isLoading && !error && filteredCourses.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      ไม่พบคอร์สเรียน
                    </td>
                  </tr>
                )}

                {/* Course List */}
                {!isLoading &&
                  !error &&
                  filteredCourses.map((course) => (
                    <tr key={course.courses_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {course.course_code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {course.course_name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-end items-center gap-5">
                          {/* Edit Button */}
                          <button className="w-10 h-10 flex items-center justify-center text-[#B492FF] border border-[#B492FF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer">
                            <Edit2 size={18} />
                          </button>

                          {/* ACTIVE Dropdown */}
                          <select
                            value={courseStatus}
                            onChange={(e) => setCourseStatus(e.target.value)}
                            className="px-1 py-2 text-sm font-medium  bg-white text-[#484848] hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B7A3E3]"
                          >
                            <option value="ACTIVE" className="text-[#484848]">
                              ACTIVE
                            </option>
                            <option value="INACTIVE" className="text-[#484848]">
                              INACTIVE
                            </option>
                          </select>

                          <button
                            onClick={() => {
                              setSelectedCourse(course);
                              setIsModalOpen(true);
                            }}
                            className="px-5 py-2 text-sm text-[#B7A3E3] border border-[#B7A3E3] rounded-xl hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            เปิดรายวิชา
                          </button>
                          <button className="w-8 h-8 flex items-center justify-center text-[#B7A3E3] hover:bg-purple-50 rounded transition-colors cursor-pointer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-end items-center gap-2">
            <button className="w-8 h-8 flex text-[#D2D2D2] items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
              <ChevronLeft size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-[#B7A3E3] text-white rounded">
              1
            </button>
            <button className="w-8 h-8 flex text-[#D2D2D2] items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
              2
            </button>
            <button className="w-8 h-8 flex text-[#D2D2D2] items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
              3
            </button>
            <span className="px-2">...</span>
            <button className="w-8 h-8 flex text-[#D2D2D2] items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
              10
            </button>
            <button className="w-8 h-8 flex text-[#D2D2D2] items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedCourse && (
        <CourseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courseId={String(selectedCourse.courses_id)}
          courseName={selectedCourse.course_name}
          onSuccess={() => {
            console.log("Course offering created successfully");
            // Optionally refresh courses here
          }}
        />
      )}

      {/* Create Course Modal */}
      <CreateCourseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchCourses}
      />
    </Navbar>
  );
}
