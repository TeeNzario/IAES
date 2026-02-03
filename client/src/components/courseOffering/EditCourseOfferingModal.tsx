"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Plus, X, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatInstructorName } from "@/utils/formatName";
import { Instructor } from "@/types/staff";
import { CourseOffering } from "@/types/course";

interface EditCourseOfferingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseOffering: CourseOffering;
  onSuccess?: () => void;
}

// Generate academic years: current year ±1 (Buddhist year)
const getCurrentBuddhistYear = () => new Date().getFullYear() + 543;

export default function EditCourseOfferingModal({
  isOpen,
  onClose,
  courseOffering,
  onSuccess,
}: EditCourseOfferingModalProps) {
  const currentYear = getCurrentBuddhistYear();
  const academicYears = [
    String(currentYear - 1),
    String(currentYear),
    String(currentYear + 1),
  ];
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

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [me, instructors] = await Promise.all([
          apiFetch<Instructor>("/staff/me"),
          apiFetch<Instructor[]>("/staff/instructors"),
        ]);
        setCreatorInstructor(me);
        setAllInstructors(instructors);
      } catch (err) {
        console.error("Failed to fetch instructors:", err);
        setError("ไม่สามารถโหลดข้อมูลอาจารย์ได้");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Course Name */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          แก้ไขรายวิชา
        </h2>
        <p className="text-center text-gray-500 mb-6">
          {/* {courseOffering.courses.course_code} -{" "} */}
          {courseOffering.courses.course_name}
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Academic Year Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ปีการศึกษา
          </label>
          <div className="relative">
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 appearance-none cursor-pointer"
            >
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-2.5 text-gray-400 pointer-events-none"
              size={20}
            />
          </div>
        </div>

        {/* Semester Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ภาคการศึกษา
          </label>
          <div className="relative">
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 appearance-none cursor-pointer"
            >
              {semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-2.5 text-gray-400 pointer-events-none"
              size={20}
            />
          </div>
        </div>

        {/* Status Toggle Buttons */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            สถานะ
          </label>
          <div className="flex gap-3">
            {statuses.map((stat) => (
              <button
                key={stat}
                type="button"
                onClick={() => setStatus(stat)}
                className={`px-8 py-2 rounded-2xl font-medium transition-colors ${
                  status === stat
                    ? "bg-purple-400 text-white"
                    : "border-2 border-purple-300 text-gray-700 bg-white hover:bg-purple-50"
                }`}
              >
                {stat === "Active" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              </button>
            ))}
          </div>
        </div>

        {/* Instructor Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            อาจารย์ผู้สอน
          </label>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
              {/* Slot 0: Creator (LOCKED) */}
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    disabled
                    value={creatorInstructor?.staff_users_id || ""}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl bg-gray-100 text-gray-600 appearance-none cursor-not-allowed"
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
                      className="w-full px-4 py-3 border-2 border-purple-400 rounded-2xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 appearance-none cursor-pointer"
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
                      {/* Keep current selection visible even if it would be filtered */}
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
                      size={20}
                    />
                  </div>
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add instructor button */}
          {!isLoading && (
            <button
              type="button"
              onClick={handleAddSlot}
              className="w-full mt-3 py-3 border-2 border-purple-400 rounded-2xl bg-white text-purple-500 hover:bg-purple-50 transition-colors flex items-center justify-center gap-1"
            >
              <Plus size={20} />
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-8 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="px-8 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
