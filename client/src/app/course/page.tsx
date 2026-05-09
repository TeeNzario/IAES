"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  BookOpen,
  Plus,
} from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import CreateCourseModal from "@/components/course/CreateCourseModal";
import EditCourseModal from "@/components/course/EditCourseModal";
import KnowledgeCategoriesCell from "@/components/course/KnowledgeCategoriesCell";
import KnowledgeCategoriesModal from "@/components/course/KnowledgeCategoriesModal";
import { apiFetch } from "@/lib/api";
import CourseOfferingModal from "@/features/courseOffering/components/CourseOfferingModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AlertModal from "@/components/ui/AlertModal";
import axios from "axios";
import { getThaiCourseName } from "@/utils/formatCourseName";

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
  course_name_th?: string;
  course_name_en?: string;
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

  // Delete state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Alert state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "error" | "success" | "warning";
  }>({ isOpen: false, title: "", message: "", variant: "error" });

  // Knowledge categories modal state
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [knowledgeCourse, setKnowledgeCourse] = useState<{
    courses_id: number;
    name: string;
  } | null>(null);

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
      getThaiCourseName(course)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
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
      setAlertState({
        isOpen: true,
        title: "เกิดข้อผิดพลาด",
        message: "ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง",
        variant: "error",
      });
    }
  };

  // Handle edit click
  const handleEditClick = (course: Course) => {
    setEditingCourse(course);
    setIsEditModalOpen(true);
  };

  // Handle delete click
  const handleDeleteClick = (course: Course) => {
    setDeletingCourse(course);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!deletingCourse) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiFetch(`/courses/${deletingCourse.courses_id}`, {
        method: "DELETE",
      });
      setIsDeleteModalOpen(false);
      setDeletingCourse(null);
      fetchCourses(currentPage);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setDeleteError(
          "ไม่สามารถลบรายวิชานี้ได้ เนื่องจากมีการเปิดสอนรายวิชานี้อยู่",
        );
      } else {
        setDeleteError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setIsDeleting(false);
    }
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
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#7C5BD9]">
                  รายวิชา
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-[#2F2A3A] sm:text-3xl">
                  จัดการรายวิชา
                </h1>
                <p className="mt-2 text-sm font-normal text-[#7A7287]">
                  เพิ่ม แก้ไข จัดหมวดหมู่ความรู้ และเปิดสอบจากรายวิชาที่มีในระบบ
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#A48FD6] cursor-pointer"
              >
                  <Plus size={18} />
                สร้างรายวิชา
              </button>

                <div className="relative">
                <input
                  type="text"
                    placeholder="ค้นหารหัสหรือชื่อวิชา"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl bg-[#FAF8FF] px-4 py-3 pr-10 text-sm font-normal text-[#2F2A3A] placeholder:text-[#B7AFC6] outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3] sm:w-80"
                />
                <Search
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
                  size={20}
                />
              </div>
            </div>
          </div>
          </section>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
            <table className="w-full">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[28%]" />
                <col className="w-[25%]" />
                <col className="w-[35%]" />
              </colgroup>
              <thead className="bg-[#B7A3E3] text-white">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-semibold">
                    รหัสวิชา
                  </th>
                  <th className="px-5 py-4 text-left text-sm font-semibold">
                    ชื่อวิชา
                  </th>
                  <th className="px-5 py-4 text-left text-sm font-semibold">
                    หมวดหมู่ความรู้
                  </th>
                  <th className="px-5 py-4 text-left text-sm font-semibold">
                    แก้ไข
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8FB]">
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
                    <tr key={course.courses_id} className="hover:bg-[#FAF8FF]">
                      <td className="px-5 py-4 text-sm font-semibold text-[#2F2A3A]">
                        {course.course_code}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#2F2A3A]">
                        {getThaiCourseName(course)}
                      </td>
                      <td className="px-5 py-4">
                        <KnowledgeCategoriesCell
                          categories={
                            course.course_knowledge?.map(
                              (ck) => ck.knowledge_categories,
                            ) || []
                          }
                          maxVisible={2}
                        />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-end gap-3">
                          {/* Knowledge Categories Button */}
                          <button
                            onClick={() => {
                              setKnowledgeCourse({
                                courses_id: course.courses_id,
                                name: getThaiCourseName(course),
                              });
                              setIsKnowledgeModalOpen(true);
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9CCF2] text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                            title="จัดการหมวดหมู่ความรู้"
                          >
                            <BookOpen size={18} />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditClick(course)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D9CCF2] text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                          >
                            <Edit2 size={18} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteClick(course)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-500 transition-colors hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 size={18} />
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
                            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-[#2F2A3A] ring-1 ring-[#E7DDF8] transition-colors hover:bg-[#FAF8FF] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B7A3E3]"
                          >
                            <option value="ACTIVE" className="text-[#484848]">
                              เปิดใช้งาน
                            </option>
                            <option value="INACTIVE" className="text-[#484848]">
                              ปิดใช้งาน
                            </option>
                          </select>

                          <button
                            onClick={() => {
                              setSelectedCourse(course);
                              setIsModalOpen(true);
                            }}
                            className="rounded-xl border border-[#D9CCF2] px-5 py-2 text-sm font-semibold text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                          >
                            เปิดสอบ
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
        <CourseOfferingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courseId={String(selectedCourse.courses_id)}
          courseName={getThaiCourseName(selectedCourse)}
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

      {/* Knowledge Categories Modal */}
      {knowledgeCourse && (
        <KnowledgeCategoriesModal
          isOpen={isKnowledgeModalOpen}
          onClose={() => {
            setIsKnowledgeModalOpen(false);
            setKnowledgeCourse(null);
          }}
          course={knowledgeCourse}
          onSuccess={() => fetchCourses(currentPage)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeletingCourse(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title="ลบรายวิชา"
        message={
          deleteError ||
          `คุณแน่ใจหรือไม่ว่าต้องการลบรายวิชา "${deletingCourse ? getThaiCourseName(deletingCourse) : ""}"?`
        }
        confirmText="ลบ"
        cancelText="ยกเลิก"
        isLoading={isDeleting}
        variant={deleteError ? "warning" : "danger"}
      />

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />
    </Navbar>
  );
}
