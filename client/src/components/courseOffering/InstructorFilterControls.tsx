"use client";

import { ChevronDown } from "lucide-react";
import { CURRICULUMS } from "@/config/curriculums";
import { FACULTY_MAP, getFacultyName } from "@/lib/faculty-map";

interface InstructorFilterControlsProps {
  facultyFilter: string;
  curriculumFilter: string;
  onFacultyFilterChange: (value: string) => void;
  onCurriculumFilterChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const FACULTY_OPTIONS = Object.keys(FACULTY_MAP)
  .map(Number)
  .sort((a, b) => a - b);

export default function InstructorFilterControls({
  facultyFilter,
  curriculumFilter,
  onFacultyFilterChange,
  onCurriculumFilterChange,
  disabled = false,
  className = "",
}: InstructorFilterControlsProps) {
  const curriculumOptions = CURRICULUMS.filter(
    (curriculum) =>
      facultyFilter === "ALL" ||
      curriculum.facultyCode === Number(facultyFilter),
  );
  const hasActiveFilter = facultyFilter !== "ALL" || curriculumFilter !== "ALL";

  return (
    <div
      className={`grid gap-3 rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#EFE8FB] sm:grid-cols-2 ${className}`}
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium leading-5 text-[#6B617A]">
          สำนักวิชา
        </label>
        <div className="relative">
          <select
            value={facultyFilter}
            onChange={(event) => {
              onFacultyFilterChange(event.target.value);
              onCurriculumFilterChange("ALL");
            }}
            disabled={disabled}
            className="h-10 w-full appearance-none rounded-xl border border-[#E7DDF8] bg-white px-3.5 pr-9 text-sm font-normal text-[#2F2A3A] outline-none transition-colors focus:border-[#B7A3E3] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="ALL">ทุกสำนักวิชา</option>
            {FACULTY_OPTIONS.map((facultyCode) => (
              <option key={facultyCode} value={facultyCode}>
                {getFacultyName(facultyCode)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9A90AA]"
            size={16}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium leading-5 text-[#6B617A]">
          หลักสูตร
        </label>
        <div className="relative">
          <select
            value={curriculumFilter}
            onChange={(event) => onCurriculumFilterChange(event.target.value)}
            disabled={disabled || curriculumOptions.length === 0}
            className="h-10 w-full appearance-none rounded-xl border border-[#E7DDF8] bg-white px-3.5 pr-9 text-sm font-normal text-[#2F2A3A] outline-none transition-colors focus:border-[#B7A3E3] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="ALL">ทุกหลักสูตร</option>
            {curriculumOptions.map((curriculum) => (
              <option key={curriculum.id} value={curriculum.id}>
                {curriculum.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9A90AA]"
            size={16}
          />
        </div>
      </div>

      {hasActiveFilter && (
        <button
          type="button"
          onClick={() => {
            onFacultyFilterChange("ALL");
            onCurriculumFilterChange("ALL");
          }}
          disabled={disabled}
          className="h-10 rounded-xl bg-white px-4 text-sm font-medium text-[#7455C9] ring-1 ring-[#D9CCF2] transition-colors hover:bg-[#F4EFFF] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
        >
          ล้างตัวกรอง
        </button>
      )}
    </div>
  );
}
