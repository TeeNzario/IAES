import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName?: string;
  initialAcademicYear?: string;
  initialSemester?: string;
  initialStatus?: string;
  onSave?: (data: { academicYear: string; semester: string; status: string }) => void;
}

export default function CourseModal({
  isOpen,
  onClose,
  courseName = 'Computer Programing I',
  initialAcademicYear = '2025',
  initialSemester = '1',
  initialStatus = 'Active',
  onSave
}: CourseModalProps){
  const [academicYear, setAcademicYear] = useState(initialAcademicYear);
  const [semester, setSemester] = useState(initialSemester);
  const [status, setStatus] = useState(initialStatus);

  const academicYears = ['2023', '2024', '2025', '2026', '2027'];
  const semesters = ['1', '2', '3'];
  const statuses = ['Active', 'Inactive'];

  const handleOpen = () => {
    if (onSave) {
      onSave({ academicYear, semester, status });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
        {/* Course Name */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {courseName}
        </h2>

        {/* Academic Year Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Academic year
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
            <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
          </div>
        </div>

        {/* Semester Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Semester
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
            <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 appearance-none cursor-pointer"
            >
              {statuses.map((stat) => (
                <option key={stat} value={stat}>
                  {stat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-8 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            CANCEL
          </button>
          <button
            onClick={handleOpen}
            className="px-8 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            OPEN
          </button>
        </div>
      </div>
    </div>
  );
};

