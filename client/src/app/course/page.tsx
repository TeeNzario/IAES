"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
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
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = 20;

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
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
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
  const fetchCourses = useCallback(async (page = 1, search = searchTerm, limit = rowsPerPage) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiFetch<PaginatedResponse>(
        `/courses?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      );
      setCourses(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.total);
      setCurrentPage(response.pagination.page);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลคอร์สได้");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, rowsPerPage]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle explicit search button click
  const handleSearch = () => {
    setSearchTerm(searchInput);
  };

  // Fetch courses on mount or when search changes
  useEffect(() => {
    let isMounted = true;
    fetchCourses(1).then(() => {
      if (isMounted) { /* no-op, cleanup guard only */ }
    });
    return () => { isMounted = false; };
  }, [fetchCourses]);

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

  const firstVisibleItem = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const lastVisibleItem = Math.min(currentPage * rowsPerPage, totalItems);
  const resultSummary =
    totalItems === 0
      ? "ยังไม่มีรายการ"
      : `แสดง ${firstVisibleItem}-${lastVisibleItem} จาก ${totalItems} รายการ`;

  return (
    <Navbar>
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-[560px]">
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

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8F84A3]"
                  />
                  <input
                    type="text"
                    placeholder="ค้นหารหัสหรือชื่อวิชา"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    className="h-11 w-full rounded-xl bg-[#FAF8FF] py-3 pl-11 pr-4 text-sm font-medium text-[#2F2A3A] placeholder:text-[#B7AFC6] outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3] sm:w-[320px] lg:w-[380px]"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#A48FD6] cursor-pointer sm:w-[112px]"
                >
                  <Search size={16} />
                  ค้นหา
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#A48FD6] cursor-pointer sm:w-fit"
                >
                  <Plus size={18} />
                  สร้างรายวิชา
                </button>
              </div>
            </div>
          </section>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
            <div className="flex flex-col gap-3 border-b border-[#EFE8FB] px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold text-[#2F2A3A]">
                  รายการรายวิชา
                </p>
                <p className="mt-1 text-sm font-normal text-[#7A7287]">
                  {isLoading ? "กำลังโหลดข้อมูล..." : resultSummary}
                </p>
              </div>

              <div className="flex w-full items-center justify-between gap-2 rounded-xl bg-[#FAF8FF] px-3 py-2 text-sm font-medium text-[#5F5570] ring-1 ring-[#E7DDF8] sm:w-fit sm:justify-start">
                <span className="font-medium">แสดง</span>
                <div className="relative">
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    disabled={isLoading}
                    className="h-9 appearance-none rounded-lg bg-white pl-3 pr-8 text-sm font-semibold text-[#2F2A3A] outline-none ring-1 ring-[#D9CCF2] transition focus:ring-2 focus:ring-[#B7A3E3] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
                    title="แถวต่อหน้า"
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#7C5BD9]"
                  />
                </div>
                <span>แถวต่อหน้า</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] table-fixed">
                <colgroup>
                  <col className="w-[13%]" />
                  <col className="w-[34%]" />
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className="bg-[#B7A3E3] text-white">
                  <tr>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      รหัสวิชา
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">
                      ชื่อวิชา
                    </th>
                    <th className="px-5 py-4 text-center text-sm font-semibold">
                      หมวดหมู่ความรู้
                    </th>
                    <th className="px-5 py-4 text-center text-sm font-semibold">
                      สถานะ
                    </th>
                    <th className="px-5 py-4 text-center text-sm font-semibold">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8FB]">
                  {/* Loading State */}
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm font-medium text-gray-500">กำลังโหลด...</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Error State */}
                  {!isLoading && error && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm font-medium text-red-500"
                      >
                        {error}
                      </td>
                    </tr>
                  )}

                  {/* Empty State */}
                  {!isLoading && !error && courses.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm font-medium text-gray-500"
                      >
                        ไม่พบคอร์สเรียน
                      </td>
                    </tr>
                  )}

                  {/* Course List */}
                  {!isLoading &&
                    !error &&
                    courses.map((course) => (
                      <tr
                        key={course.courses_id}
                        className="transition-colors hover:bg-[#FAF8FF]"
                      >
                        <td className="px-5 py-4 text-[15px] font-semibold text-[#2F2A3A]">
                          {course.course_code}
                        </td>
                        <td
                          className="px-5 py-4 text-[15px] font-medium text-[#2F2A3A]"
                          title={getThaiCourseName(course)}
                        >
                          <span className="block break-words">
                            {getThaiCourseName(course)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <KnowledgeCategoriesCell
                            categories={
                              course.course_knowledge?.map(
                                (ck) => ck.knowledge_categories,
                              ) || []
                            }
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="relative mx-auto w-[106px]">
                            <select
                              value={course.is_active ? "ACTIVE" : "INACTIVE"}
                              onChange={(e) =>
                                handleStatusChange(
                                  course.courses_id,
                                  e.target.value === "ACTIVE",
                                )
                              }
                              className={`h-9 w-full appearance-none rounded-xl pl-2.5 pr-6 text-sm font-medium outline-none ring-1 transition focus:ring-2 focus:ring-[#B7A3E3] cursor-pointer ${
                                course.is_active
                                  ? "bg-[#F1FFF6] text-[#15803D] ring-[#BCE9C9]"
                                  : "bg-[#FFF7F7] text-[#B42318] ring-red-200"
                              }`}
                            >
                              <option value="ACTIVE" className="text-[#484848]">
                                เปิดใช้งาน
                              </option>
                              <option value="INACTIVE" className="text-[#484848]">
                                ปิดใช้งาน
                              </option>
                            </select>
                            <ChevronDown
                              size={15}
                              className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 ${
                                course.is_active ? "text-[#15803D]" : "text-[#B42318]"
                              }`}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedCourse(course);
                                setIsModalOpen(true);
                              }}
                              className="rounded-xl bg-[#F4EFFF] px-3 py-2 text-sm font-semibold text-[#7C5BD9] ring-1 ring-[#D9CCF2] transition-colors hover:bg-[#EDE3FF] cursor-pointer"
                            >
                              เปิดสอบ
                            </button>

                            <div className="flex items-center rounded-xl border border-[#E7DDF8] bg-[#FAF8FF] p-1">
                              <button
                                onClick={() => {
                                  setKnowledgeCourse({
                                    courses_id: course.courses_id,
                                    name: getThaiCourseName(course),
                                  });
                                  setIsKnowledgeModalOpen(true);
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7C5BD9] transition-colors hover:bg-white cursor-pointer"
                                title="จัดการหมวดหมู่ความรู้"
                                aria-label="จัดการหมวดหมู่ความรู้"
                              >
                                <BookOpen size={18} />
                              </button>

                              <button
                                onClick={() => handleEditClick(course)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7C5BD9] transition-colors hover:bg-white cursor-pointer"
                                title="แก้ไขรายวิชา"
                                aria-label="แก้ไขรายวิชา"
                              >
                                <Edit2 size={18} />
                              </button>

                              <button
                                onClick={() => handleDeleteClick(course)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 cursor-pointer"
                                title="ลบรายวิชา"
                                aria-label="ลบรายวิชา"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {!isLoading && totalPages > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-[#EFE8FB] px-5 py-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B7A3E3] text-white shadow-sm transition-colors hover:bg-[#9264F5] disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={22} strokeWidth={2.5} />
                </button>

                {getPageNumbers().map((page, index) =>
                  typeof page === "string" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1 text-gray-400 select-none"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`h-10 w-10 rounded-xl font-semibold transition-colors cursor-pointer ${
                        currentPage === page
                          ? "bg-[#B7A3E3] text-white shadow-sm"
                          : "bg-white text-[#7C5BD9] ring-1 ring-[#D9CCF2] hover:bg-[#F4EFFF]"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B7A3E3] text-white shadow-sm transition-colors hover:bg-[#9264F5] disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={22} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCourse && (
        <CourseOfferingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courseId={String(selectedCourse.courses_id)}
          courseName={getThaiCourseName(selectedCourse)}
          onSuccess={() => fetchCourses(currentPage)}
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
