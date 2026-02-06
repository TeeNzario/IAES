"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Edit2 } from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import CourseModal from "@/features/courseOffering/components/CourseOfferingModal";
import CreateCourseModal from "@/components/course/CreateCourseModal";
import EditCourseModal from "@/components/course/EditCourseModal";
import KnowledgeCategoriesCell from "@/components/course/KnowledgeCategoriesCell";
import { apiFetch } from "@/lib/api";

// Configuration
const ITEMS_PER_PAGE = 3;

// Interfaces
interface KnowledgeCategory {
  knowledge_category_id: string;
  name: string;
}

interface CourseKnowledge {
  knowledge_categories: KnowledgeCategory;
}

interface Course {
  courses_id: number;
  course_code: string;
  course_name: string;
  is_active: boolean;
  created_at?: string;
  course_knowledge?: CourseKnowledge[];
}

interface PaginatedResponse {
  data: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Fetch courses with pagination
  const fetchCourses = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiFetch<PaginatedResponse>(
        `/courses?page=${page}&limit=${ITEMS_PER_PAGE}`,
      );
      setCourses(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.total);
      setCurrentPage(response.pagination.page);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setError("ไม่สามารถโหลดข้อมูลคอร์สได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses(1);
  }, [fetchCourses]);

  // Filter courses by search term
  const filteredCourses = courses.filter(
    (course) =>
      course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Handle status change
  const handleStatusChange = async (courseId: number, isActive: boolean) => {
    try {
      await apiFetch(`/courses/${courseId}/status`, {
        method: "PATCH",
        data: { is_active: isActive },
      });
      // Update local state
      setCourses((prev) =>
        prev.map((course) =>
          course.courses_id === courseId
            ? { ...course, is_active: isActive }
            : course,
        ),
      );
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("ไม่สามารถอัปเดตสถานะได้");
    }
  };

  // Handle edit click
  const handleEditClick = (course: Course) => {
    setEditingCourse(course);
    setIsEditModalOpen(true);
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchCourses(page);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <Navbar>
      <div className="min-h-screen bg-[#FAF8FF] p-15">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <h1 className="text-3xl font-bold text-[#484848] mb-12">
            จัดการรายวิชา
          </h1>

          <div className="flex flex-row justify-between items-center gap-4">
            {/* Controls */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-12 py-2 bg-[#B7A3E3] border-1 border-[#B7A3E3] text-white text-lg font-bold rounded-xl hover:bg-gray-50 hover:text-[#B7A3E3] hover:border-[#B7A3E3] hover:border-1 transition-colors cursor-pointer"
              >
                สร้างรายวิชา
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex gap-3 mb-4">
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
                <col className="w-[12%]" />
                <col className="w-[28%]" />
                <col className="w-[25%]" />
                <col className="w-[35%]" />
              </colgroup>
              <thead className="bg-[#B7A3E3] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-md font-light">
                    รหัสวิชา
                  </th>
                  <th className="px-4 py-3 text-left text-md font-light">
                    ชื่อวิชา
                  </th>
                  <th className="px-4 py-3 text-left text-md font-light">
                    หมวดหมู่ความรู้
                  </th>
                  <th className="px-4 py-3 text-left text-md font-light">
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
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {course.course_code}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {course.course_name}
                      </td>
                      <td className="px-4 py-4">
                        <KnowledgeCategoriesCell
                          categories={
                            course.course_knowledge?.map(
                              (ck) => ck.knowledge_categories,
                            ) || []
                          }
                          maxVisible={2}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-end items-center gap-3">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditClick(course)}
                            className="w-10 h-10 flex items-center justify-center text-[#B492FF] border border-[#B492FF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 size={18} />
                          </button>

                          {/* Status Dropdown */}
                          <select
                            value={course.is_active ? "ACTIVE" : "INACTIVE"}
                            onChange={(e) =>
                              handleStatusChange(
                                course.courses_id,
                                e.target.value === "ACTIVE",
                              )
                            }
                            className="px-2 py-2 text-sm font-medium bg-white text-[#484848] hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B7A3E3] rounded"
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
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                แสดง {filteredCourses.length} จาก {totalItems} รายการ
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} className="text-[#D2D2D2]" />
                </button>

                {getPageNumbers().map((page, index) =>
                  typeof page === "string" ? (
                    <span key={`ellipsis-${index}`} className="px-2">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded ${
                        currentPage === page
                          ? "bg-[#B7A3E3] text-white"
                          : "text-[#D2D2D2] border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} className="text-[#D2D2D2]" />
                </button>
              </div>
            </div>
          )}
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
          }}
        />
      )}

      {/* Create Course Modal */}
      <CreateCourseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchCourses(currentPage)}
      />

      {/* Edit Course Modal */}
      {editingCourse && (
        <EditCourseModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingCourse(null);
          }}
          onSuccess={() => fetchCourses(currentPage)}
          course={editingCourse}
        />
      )}
    </Navbar>
  );
}
