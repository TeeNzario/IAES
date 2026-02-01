"use client";

import { Plus, Edit } from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import { Instructor } from "@/types/staff";
import Link from "next/link";
import { CourseOffering } from "@/types/course";



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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="w-full">
          <h1 className="text-3xl font-bold mb-8 text-gray-900"></h1>

          <div className="flex flex-wrap gap-6">
            {courses.map((courseOffering) => (
              <Link
                href={`/course/${courseOffering.course_offerings_id}`}
                key={courseOffering.course_offerings_id}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow w-72 h-72 flex flex-col"
              >
                {/* Course Header */}
                <div className="p-6 flex-1 overflow-hidden flex flex-col">
                  <p className="text-sm font-medium" style={{ color: "#b7a3e3" }}>
                    {courseOffering.courses.course_code}
                  </p>
                  <h2 className="text-lg font-bold text-gray-900 mt-2">
                    {courseOffering.courses.course_name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 flex-1">
                    {courseOffering.courses.course_code}
                  </p>
                </div>

                {/* Instructor Section */}
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
                        <Image
                          src={'/instructor1.jpg'}
                          alt={courseOffering.courses.course_name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {courseOffering.courses.course_code}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="p-2 rounded-full hover:opacity-80 transition-colors" style={{ backgroundColor: "#b7a3e3" }}>
                        <Plus size={18} className="text-white" />
                      </button>
                      <button className="p-2 rounded-full hover:opacity-80 transition-colors" style={{ backgroundColor: "#b7a3e3" }}>
                        <Edit size={18} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </NavBar>
  );
}