"use client";

import { Plus, Edit } from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CourseOffering } from "@/types/course";
import { formatInstructorName } from "@/utils/formatName";
import { User } from "lucide-react";



export default function CourseHomePage() {
  const [courses, setCourses] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchCourseOfferings = async () => {
      try {
        const data = await apiFetch<CourseOffering[]>("course-offerings");
        setCourses(data);
      } catch (error) {
        setError("Failed to fetch courses");
      } finally {
        setLoading(false);
      }
    };
    fetchCourseOfferings();
  }, []);
  
  return (
    <NavBar>
      <div className="min-h-screen bg-[#F1EAFF] p-20">
        <div className="w-full">
          <h1 className="text-3xl font-bold mb-8 text-gray-900"></h1>

          <div className="flex flex-wrap gap-6">
            {courses.map((courseOffering) => (
              <Link
                href={`/course/${courseOffering.course_offerings_id}`}
                key={courseOffering.course_offerings_id}
                className="bg-white rounded-3xl overflow-hidden hover:shadow-lg transition-shadow w-72 h-72 flex flex-col"
              >
                {/* Course Header */}
                <div className="p-6 flex-1 overflow-hidden flex flex-col">
                  <p className="text-sm font-medium" style={{ color: "#b7a3e3" }}>
                    {courseOffering.semester}/{courseOffering.academic_year} {courseOffering.courses.course_code}
                  </p>
                  <h2 className="text-2xl font-light text-[#575757] mb-1">
                    {courseOffering.courses.course_name}
                  </h2>
                  {courseOffering.course_instructors.map((staff) => (
                    <p key={staff.staff_users_id} className="text-sm text-[#575757]">
                      {formatInstructorName(staff.staff_users)}
                    </p>
                  ))}
                </div>

                {/* Instructor Section */}
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <User size={24} className="text-gray-600" />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="p-3 rounded-full hover:opacity-80 transition-colors" style={{ backgroundColor: "#b7a3e3" }}>
                        <Edit size={18} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            <Link
                href={`/course`}
                className="rounded-3xl border border-white border-dashed border-3 overflow-hiddend w-72 h-72 flex flex-col items-center justify-center hover:shadow-lg transition-shadow"
              >
                <Plus size={45} className="text-white" />
              </Link>
          </div>
        </div>
      </div>
    </NavBar>
  );
}