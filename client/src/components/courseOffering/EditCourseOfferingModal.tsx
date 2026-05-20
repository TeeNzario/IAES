"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Plus, X, Lock, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatInstructorName } from "@/utils/formatName";
import { formatCourseName } from "@/utils/formatCourseName";
import { Instructor } from "@/types/staff";
import { CourseOffering } from "@/types/course";
import ConfirmModal from "@/components/ui/ConfirmModal";
import axios from "axios";
import { toBuddhistYear } from "@/utils/academicYear";
import {
  AcademicSettings,
  buildAcademicYearOptions,
  getCurrentAcademicSettings,
} from "@/features/academicSettings/academicSettings.api";

interface EditCourseOfferingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseOffering: CourseOffering;
  onSuccess?: () => void;
}

function getApiErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;

  const responseData = error.response?.data as
    | { message?: unknown }
    | undefined;
  const { message } = responseData ?? {};

  if (Array.isArray(message) && typeof message[0] === "string") {
    return message[0];
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return null;
}

export default function EditCourseOfferingModal({
  isOpen,
  onClose,
  courseOffering,
  onSuccess,
}: EditCourseOfferingModalProps) {
  const [academicSettings, setAcademicSettings] =
    useState<AcademicSettings | null>(null);
  const academicYears = buildAcademicYearOptions(
    academicSettings?.academic_year,
    courseOffering.academic_year,
  );
  const semesters = ["1", "2", "3"];
  const statuses = ["Active", "Inactive"];

  // Form state
  const [academicYear, setAcademicYear] = useState(
    String(courseOffering.academic_year),
  );
  const [semester, setSemester] = useState(String(courseOffering.semester));
  const [status, setStatus] = useState(
    courseOffering.is_active ? "Active" : "Inactive",
  );

  // Instructor state
  const [creatorInstructor, setCreatorInstructor] = useState<Instructor | null>(
    null,
  );
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [additionalSlots, setAdditionalSlots] = useState<string[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const hasCourseExams = (courseOffering._count?.course_exams ?? 0) > 0;
  const examDeleteBlockedMessage =
    "รอบเปิดสอบนี้มีชุดข้อสอบหรือประวัติการจัดสอบแล้ว เพื่อรักษาข้อมูลการสอบ ระบบจึงไม่อนุญาตให้ลบ";

  // Reset form when course offering changes
  useEffect(() => {
    if (isOpen && courseOffering) {
      setAcademicYear(String(courseOffering.academic_year));
      setSemester(String(courseOffering.semester));
      setStatus(courseOffering.is_active ? "Active" : "Inactive");

      // Set additional instructors (exclude the first one which is the creator)
      if (courseOffering.course_instructors.length > 1) {
        const additionalIds = courseOffering.course_instructors
          .slice(1)
          .map((ci) => ci.staff_users_id);
        setAdditionalSlots(additionalIds);
      } else {
        setAdditionalSlots([]);
      }
    }
  }, [isOpen, courseOffering]);

  // Fetch creator (me) and all instructors on mount
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [me, instructors, settings] = await Promise.all([
          apiFetch<Instructor>("/staff/me"),
          apiFetch<Instructor[]>("/staff/instructors"),
          getCurrentAcademicSettings(),
        ]);
        if (isMounted) {
          setCreatorInstructor(me);
          setAllInstructors(instructors);
          setAcademicSettings(settings);
        }
      } catch {
        if (isMounted) setError("ไม่สามารถโหลดข้อมูลอาจารย์ได้");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [isOpen]);

  // Get available instructors for a slot (exclude creator + already selected)
  const getAvailableInstructors = (currentSlotValue: string) => {
    const selectedIds = additionalSlots.filter(
      (id) => id !== "" && id !== currentSlotValue,
    );

    return allInstructors.filter(
      (inst) =>
        inst.staff_users_id !== creatorInstructor?.staff_users_id &&
        !selectedIds.includes(inst.staff_users_id),
    );
  };

  // Handle instructor selection change
  const handleInstructorChange = (slotIndex: number, instructorId: string) => {
    const newSlots = [...additionalSlots];
    newSlots[slotIndex] = instructorId;
    setAdditionalSlots(newSlots);
  };

  // Add new instructor slot
  const handleAddSlot = () => {
    setAdditionalSlots([...additionalSlots, ""]);
  };

  // Remove instructor slot
  const handleRemoveSlot = (slotIndex: number) => {
    setAdditionalSlots(
      additionalSlots.filter((_, index) => index !== slotIndex),
    );
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Filter out empty slots and convert to numbers
      const instructorIds = additionalSlots
        .filter((id) => id !== "")
        .map((id) => Number(id));

      await apiFetch(
        `/course-offerings/${courseOffering.course_offerings_id}`,
        {
          method: "PATCH",
          data: {
            academic_year: Number(academicYear),
            semester: Number(semester),
            is_active: status === "Active",
            instructor_ids: instructorIds,
          },
        },
      );

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to update course offering:", err);
      setError("ไม่สามารถอัปเดตได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (hasCourseExams) {
      setDeleteError(examDeleteBlockedMessage);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiFetch(
        `/course-offerings/${courseOffering.course_offerings_id}`,
        { method: "DELETE" },
      );
      setShowDeleteConfirm(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setDeleteError(getApiErrorMessage(err) ?? examDeleteBlockedMessage);
      } else {
        setDeleteError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/45 z-50 flex items-start justify-center overflow-y-auto p-4 py-6 sm:p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="relative max-h-[calc(100vh-3rem)] w-full max-w-[34rem] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Course Name */}
        <h2 className="mb-1 text-lg font-bold leading-7 text-gray-900 sm:text-xl">
          แก้ไขรายวิชา
        </h2>
        <p className="mb-5 text-sm leading-6 text-gray-500">
          {formatCourseName(courseOffering.courses)}
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Academic Year Dropdown */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-semibold leading-5 text-gray-800">
            ปีการศึกษา
          </label>
          <div className="relative">
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="h-11 w-full cursor-pointer appearance-none rounded-xl border-2 border-[#9264F5] bg-white px-3.5 pr-10 text-sm text-gray-900 shadow-sm transition-colors focus:border-[#B7A3E3] focus:outline-none"
            >
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {toBuddhistYear(year)}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={18}
            />
          </div>
        </div>

        {/* Semester Dropdown */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-semibold leading-5 text-gray-800">
            ภาคการศึกษา
          </label>
          <div className="relative">
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="h-11 w-full cursor-pointer appearance-none rounded-xl border-2 border-[#9264F5] bg-white px-3.5 pr-10 text-sm text-gray-900 shadow-sm transition-colors focus:border-[#B7A3E3] focus:outline-none"
            >
              {semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={18}
            />
          </div>
        </div>

        {/* Status Toggle Buttons */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[13px] font-semibold leading-5 text-gray-800">
            สถานะ
          </label>
          <div className="flex gap-6">
            {statuses.map((stat) => (
              <label
                key={stat}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="edit-offering-status"
                  value={stat}
                  checked={status === stat}
                  onChange={() => setStatus(stat)}
                  className="h-4 w-4 cursor-pointer accent-[#B7A3E3]"
                />
                <span className="text-sm leading-5 text-gray-700">
                  {stat === "Active" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Instructor Selection */}
        <div className="mb-6">
          <label className="mb-1.5 block text-[13px] font-semibold leading-5 text-gray-800">
            อาจารย์ผู้สอน
          </label>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#B7A3E3] border-t-transparent" />
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
              {/* Slot 0: Creator (LOCKED) */}
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    disabled
                    value={creatorInstructor?.staff_users_id || ""}
                    className="h-11 w-full cursor-not-allowed appearance-none rounded-xl border-2 border-gray-200 bg-gray-50 px-3.5 pr-10 text-sm text-gray-500"
                  >
                    <option value={creatorInstructor?.staff_users_id || ""}>
                      {creatorInstructor
                        ? formatInstructorName(creatorInstructor)
                        : ""}{" "}
                      (คุณ)
                    </option>
                  </select>
                  <Lock
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                </div>
              </div>

              {/* Additional instructor slots (editable) */}
              {additionalSlots.map((slotValue, index) => (
                <div key={index} className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={slotValue}
                      onChange={(e) =>
                        handleInstructorChange(index, e.target.value)
                      }
                      className="h-11 w-full cursor-pointer appearance-none rounded-xl border-2 border-[#9264F5] bg-white px-3.5 pr-10 text-sm text-gray-900 shadow-sm transition-colors focus:border-[#B7A3E3] focus:outline-none"
                    >
                      <option value="">เลือกอาจารย์</option>
                      {getAvailableInstructors(slotValue).map((instructor) => (
                        <option
                          key={instructor.staff_users_id}
                          value={instructor.staff_users_id}
                        >
                          {formatInstructorName(instructor)}
                        </option>
                      ))}
                      {slotValue &&
                        !getAvailableInstructors(slotValue).find(
                          (i) => i.staff_users_id === slotValue,
                        ) && (
                          <option value={slotValue}>
                            {formatInstructorName(
                              allInstructors.find(
                                (i) => i.staff_users_id === slotValue,
                              )!,
                            )}
                          </option>
                        )}
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={18}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                    className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isLoading && (
            <button
              type="button"
              onClick={handleAddSlot}
              className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#B7A3E3] bg-white text-sm font-medium text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF]"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
            className="h-11 flex-1 rounded-xl border-2 border-gray-300 px-5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => {
              setDeleteError(hasCourseExams ? examDeleteBlockedMessage : null);
              setShowDeleteConfirm(true);
            }}
            disabled={isSubmitting || isDeleting || isLoading}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            <Trash2 size={16} />
            ลบ
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading || isDeleting}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#9264F5] disabled:opacity-50"
          >
            {isSubmitting && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            บันทึก
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteConfirm(false);
            setDeleteError(null);
          }
        }}
        onConfirm={
          deleteError
            ? () => {
                setShowDeleteConfirm(false);
                setDeleteError(null);
              }
            : handleDelete
        }
        title={deleteError ? "ไม่สามารถลบรอบเปิดสอบได้" : "ลบรายวิชาที่เปิดสอบ"}
        message={
          deleteError || `คุณแน่ใจหรือไม่ว่าต้องการลบรายวิชาที่เปิดสอบนี้?`
        }
        confirmText={deleteError ? "รับทราบ" : "ลบ"}
        cancelText="ยกเลิก"
        isLoading={isDeleting}
        variant={deleteError ? "warning" : "danger"}
        acknowledgeOnly={Boolean(deleteError)}
      />
    </div>
  );
}
