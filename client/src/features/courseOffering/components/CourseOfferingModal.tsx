"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, ChevronDown, Plus, X, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatInstructorName } from "@/utils/formatName";
import { Instructor } from "@/types/staff";
import { useRouter } from "next/navigation";
import { toBuddhistYear } from "@/utils/academicYear";
import InstructorFilterControls from "@/components/courseOffering/InstructorFilterControls";
import { DEFAULT_FACULTY_CODE } from "@/lib/faculty-map";
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

interface FormError {
  title: string;
  message: string;
}

export default function CourseOfferingModal({
  isOpen,
  onClose,
  courseId,
  courseName,
  onSuccess,
}: CourseOfferingModalProps) {
  // Form state
  const [academicYear, setAcademicYear] = useState(
    String(new Date().getFullYear()),
  );
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
  const [instructorFacultyFilter, setInstructorFacultyFilter] = useState("ALL");
  const [instructorCurriculumFilter, setInstructorCurriculumFilter] =
    useState("ALL");

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<FormError | null>(null);

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
        if (isMounted) {
          setError({
            title: "ไม่สามารถโหลดข้อมูลอาจารย์ได้",
            message: "กรุณาลองเปิดหน้าต่างนี้ใหม่อีกครั้ง",
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Get available instructors for a slot (exclude creator + already selected)
  const getAvailableInstructors = (currentSlotValue: string) => {
    // Already selected IDs (excluding current slot's value)
    const selectedIds = additionalSlots.filter(
      (id) => id !== "" && id !== currentSlotValue,
    );

    // Filter out creator and already selected instructors
    const selectableInstructors = allInstructors.filter(
      (inst) =>
        inst.staff_users_id !== creatorInstructor?.staff_users_id &&
        !selectedIds.includes(inst.staff_users_id),
    );

    const filteredInstructors = selectableInstructors.filter((instructor) => {
      const facultyCode = instructor.facultyCode ?? DEFAULT_FACULTY_CODE;
      const facultyMatches =
        instructorFacultyFilter === "ALL" ||
        facultyCode === Number(instructorFacultyFilter);
      const curriculumMatches =
        instructorCurriculumFilter === "ALL" ||
        instructor.curriculumId === instructorCurriculumFilter;

      return facultyMatches && curriculumMatches;
    });

    const currentInstructor = selectableInstructors.find(
      (instructor) => instructor.staff_users_id === currentSlotValue,
    );

    if (
      currentInstructor &&
      !filteredInstructors.some(
        (instructor) =>
          instructor.staff_users_id === currentInstructor.staff_users_id,
      )
    ) {
      return [currentInstructor, ...filteredInstructors];
    }

    return filteredInstructors;
  };

  const hasAdditionalInstructorOptions = allInstructors.some(
    (instructor) =>
      instructor.staff_users_id !== creatorInstructor?.staff_users_id,
  );

  const renderInstructorOptions = (slotValue: string) => {
    const availableInstructors = getAvailableInstructors(slotValue);

    return (
      <>
        <option value="">
          {availableInstructors.length === 0
            ? "ไม่พบอาจารย์ตามตัวกรอง"
            : "เลือกอาจารย์"}
        </option>
        {availableInstructors.map((instructor) => (
          <option
            key={instructor.staff_users_id}
            value={instructor.staff_users_id}
          >
            {formatInstructorName(instructor)}
          </option>
        ))}
      </>
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
    setInstructorFacultyFilter("ALL");
    setInstructorCurriculumFilter("ALL");
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    if (!courseId) {
      setError({
        title: "ไม่พบรหัสรายวิชา",
        message: "กรุณาปิดหน้าต่างแล้วลองเลือกเปิดวิชาใหม่อีกครั้ง",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Filter out empty/duplicate instructor slots and convert to numbers
      const instructorIds = Array.from(
        new Set(
          additionalSlots.filter(
            (id) => id !== "" && id !== creatorInstructor?.staff_users_id,
          ),
        ),
      ).map((id) => Number(id));

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
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;

      if (status === 409) {
        setError({
          title: "ไม่สามารถเปิดรายวิชาได้",
          message: "เนื่องจากมีการเปิดรายวิชานี้ในภาคเรียนและปีการศึกษานี้แล้ว",
        });
      } else {
        console.error("Failed to create course offering:", err);
        setError({
          title: "ไม่สามารถเปิดรายวิชาได้",
          message: "กรุณาลองใหม่อีกครั้ง",
        });
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
      <div className="relative max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        {/* Course Name */}
        <h2 className="mb-5 text-xl font-bold leading-7 text-gray-900">
          {courseName}
        </h2>

        {/* Academic Year Dropdown */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold leading-5 text-gray-800">
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
          <label className="mb-1.5 block text-sm font-semibold leading-5 text-gray-800">
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
          <label className="mb-1.5 block text-sm font-semibold leading-5 text-gray-800">
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
                  name="create-offering-status"
                  value={stat}
                  checked={status === stat}
                  onChange={() => setStatus(stat)}
                  className="h-4 w-4 cursor-pointer accent-[#B7A3E3]"
                />
                <span className="text-sm leading-5 text-gray-700">{stat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Instructor Selection */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-semibold leading-5 text-gray-800">
            อาจารย์ผู้สอน
          </label>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-[#B7A3E3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {hasAdditionalInstructorOptions && (
                <InstructorFilterControls
                  facultyFilter={instructorFacultyFilter}
                  curriculumFilter={instructorCurriculumFilter}
                  onFacultyFilterChange={setInstructorFacultyFilter}
                  onCurriculumFilterChange={setInstructorCurriculumFilter}
                  disabled={isSubmitting}
                  className="mb-3"
                />
              )}

              <div className="max-h-52 space-y-3 overflow-y-auto pr-1">
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
                        {renderInstructorOptions(slotValue)}
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
            </>
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
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border-2 border-gray-300 px-5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#9264F5] disabled:opacity-50"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            เปิดวิชา
          </button>
        </div>
      </div>

      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 px-4 backdrop-blur-[1px]">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="course-offering-error-title"
            aria-describedby="course-offering-error-message"
            className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl sm:p-7"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF5B8] text-[#E39A00]">
              <AlertTriangle size={30} strokeWidth={2.2} />
            </div>
            <h3
              id="course-offering-error-title"
              className="mt-5 text-lg font-bold leading-7 text-[#1F2937]"
            >
              {error.title}
            </h3>
            <p
              id="course-offering-error-message"
              className="mx-auto mt-2 max-w-sm text-sm font-normal leading-6 text-[#6B7280]"
            >
              {error.message}
            </p>
            <div className="mx-auto mt-6 w-full max-w-48">
              <button
                type="button"
                onClick={() => setError(null)}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#E39500] px-5 text-sm font-bold text-white shadow-lg shadow-[#E39500]/20 transition-colors hover:bg-[#D48800] cursor-pointer"
              >
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
