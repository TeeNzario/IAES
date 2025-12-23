"use client";

import React, { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import CourseModal from "@/features/course/CourseModal";

interface Course {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
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
  const [courses] = useState<Course[]>([
    { id: "CO654-012", name: "Computer Programing", status: "ACTIVE" },
    { id: "CO654-012", name: "Computer Programing I", status: "ACTIVE" },
    { id: "CO654-012", name: "Computer Programing III", status: "ACTIVE" },
    { id: "CO654-012", name: "Computer Programing IV", status: "ACTIVE" },
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  return (
    <Navbar>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            จัดการคอร์สเรียน
          </h1>

          <div className="flex flex-row justify-between items-center gap-4">
            {/* Controls */}
            <div className="flex gap-3 mb-4">
              <button className="px-4 py-2 bg-[#B7A3E3] text-white rounded-lg hover:bg-purple-500 transition-colors">
                ทั้งหมด
              </button>
              <button className="px-4 py-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Filter size={18} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <Search
                  className="absolute right-3 top-2.5 text-gray-400"
                  size={20}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#B7A3E3] text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    NAME
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    ACTIVE
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {courses.map((course, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {course.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {course.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-700">
                        {course.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCourse(course);
                            setIsModalOpen(true);
                          }}
                          className="px-4 py-1 text-sm text-purple-400 border border-purple-400 rounded hover:bg-purple-50 transition-colors"
                        >
                          OPEN
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center text-purple-400 hover:bg-purple-50 rounded transition-colors">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M2 8h12M8 2v12"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-center items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
              <ChevronLeft size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-[#B7A3E3] text-white rounded">
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
              2
            </button>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
              3
            </button>
            <span className="px-2">...</span>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
              10
            </button>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedCourse && (
        <CourseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courseName={selectedCourse.name}
          onSave={(data) => {
            console.log("Open course offering:", {
              courseId: selectedCourse.id,
              academicYear: data.academicYear,
              semester: data.semester,
              status: data.status,
            });
          }}
        />
      )}
    </Navbar>
  );
}
