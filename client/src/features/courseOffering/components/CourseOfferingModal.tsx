"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Plus, X, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatInstructorName } from "@/utils/formatName";
import { Instructor } from "@/types/staff";
import { useRouter } from "next/navigation";
import { toBuddhistYear } from "@/utils/academicYear";
import {
  AcademicSettings,
  buildAcademicYearOptions,
  getCurrentAcademicSettings,
} from "@/features/academicSettings/academicSettings.api";

interface CourseOfferingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  onSuccess?: () => void;
}

export default function CourseOfferingModal({
  isOpen,
  onClose,
  courseId,
  courseName,
  onSuccess,
}: CourseOfferingModalProps) {
  // Form state
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [semester, setSemester] = useState("1");
  const [status, setStatus] = useState("เปิดใช้งาน");
  const [academicSettings, setAcademicSettings] =
    useState<AcademicSettings | null>(null);

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

  const academicYears = buildAcademicYearOptions(
    academicSettings?.academic_year,
    Number(academicYear),
  );
  const semesters = ["1", "2", "3"];
  const statuses = ["เปิดใช้งาน", "ปิดใช้งาน"];

  const router = useRouter();

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
          setAcademicYear(String(settings.academic_year));
          setSemester(String(settings.semester));
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
    // Already selected IDs (excluding current slot's value)
    const selectedIds = additionalSlots.filter(
      (id) => id !== "" && id !== currentSlotValue,
    );

    // Filter out creator and already selected instructors
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

  // Reset form state
  const resetForm = () => {
    setAcademicYear(
      String(academicSettings?.academic_year ?? new Date().getFullYear()),
    );
    setSemester(String(academicSettings?.semester ?? 1));
    setStatus("เปิดใช้งาน");
    setAdditionalSlots([]);
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    if (!courseId) {
      setError("ไม่พบรหัสรายวิชา");
      setIsSubmitting(false);
      return;
    }

    try {
      // Filter out empty slots and convert to numbers
      const instructorIds = additionalSlots
        .filter((id) => id !== "")
        .map((id) => Number(id));

      await apiFetch("/course-offerings", {
        method: "POST",
        data: {
          courses_id: String(courseId),
          academic_year: Number(academicYear),
          semester: Number(semester),
          is_active: status === "เปิดใช้งาน",
          instructor_ids: instructorIds, // Backend prepends creator
        },
      });

      resetForm();
      onSuccess?.();
      onClose();
      router.push("/");
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError(
          "ไม่สามารถเปิดคอร์สได้ เนื่องจากมีการเปิดคอร์สนี้ในภาคเรียนและปีการศึกษานี้แล้ว",
        );
      } else {
        console.error("Failed to create course offering:", err);
        setError("ไม่สามารถเปิดคอร์สได้ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-start justify-center overflow-y-auto p-4 py-6 sm:p-6">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
        {/* Course Name */}
        <h2 className="text-xl font-bold text-gray-900 mb-5">
          {courseName}
        </h2>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Academic Year Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            ปีการศึกษา
          </label>
          <div className="relative">
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border-2 border-[#9264F5] px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none focus:border-[#B7A3E3] appearance-none bg-white pr-10 cursor-pointer"
            >
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {toBuddhistYear(Number(year))}
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
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            ภาคการศึกษา
          </label>
          <div className="relative">
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full rounded-xl border-2 border-[#9264F5] px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none focus:border-[#B7A3E3] appearance-none bg-white pr-10 cursor-pointer"
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
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            สถานะ
          </label>
          <div className="flex gap-6">
            {statuses.map((stat) => (
              <label
                key={stat}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="create-offering-status"
                  value={stat}
                  checked={status === stat}
                  onChange={() => setStatus(stat)}
                  className="w-4 h-4 accent-[#B7A3E3] cursor-pointer"
                />
                <span className="text-sm text-gray-700">{stat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Instructor Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            อาจารย์ผู้สอน
          </label>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-[#B7A3E3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
              {/* Slot 0: Creator (LOCKED) */}
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    disabled
                    value={creatorInstructor?.staff_users_id || ""}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 appearance-none cursor-not-allowed text-[15px]"
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
                      className="w-full rounded-xl border-2 border-[#9264F5] px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none focus:border-[#B7A3E3] appearance-none bg-white pr-10 cursor-pointer"
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
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              className="w-full mt-3 py-2.5 border-2 border-dashed border-[#B7A3E3] rounded-xl bg-white text-[#7C5BD9] hover:bg-[#F4EFFF] transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-2.5 font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-6 py-2.5 font-semibold text-white shadow-lg transition-colors hover:bg-[#9264F5] disabled:opacity-50"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            เปิดวิชา
          </button>
        </div>
      </div>
    </div>
  );
}
