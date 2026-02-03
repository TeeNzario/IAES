"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/NavBar";
import { useRouter } from "next/navigation";
import { CourseOffering } from "@/types/course";
import { apiFetch } from "@/lib/api";
import { useParams } from "next/navigation";
import { formatInstructorName } from "@/utils/formatName";

export default function CoursePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("learn");
  const [activeTopTab, setActiveTopTab] = useState("home");

  const [course, setCourse] = useState<CourseOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { offeringId } = useParams<{ offeringId: string }>();

  console.log(offeringId);

  useEffect(() => {
    if (!offeringId) return;

    const fetchCourseOffering = async () => {
      const data = await apiFetch<CourseOffering>(
        `course-offerings/${offeringId}`,
      );
      setCourse(data);
      setLoading(false);
    };

    fetchCourseOffering();
  }, [offeringId]);

  const exam = [
    {
      title: "Database Focus Attention Part I",
      date: "เริ่มวันที่ 28 ธันวาคม 2568",
      type: "video",
    },
    {
      title: "Database Focus Attention Part II",
      date: "เริ่มวันที่ 31 ธันวาคม 2568",
      type: "video",
    },
    {
      title: "MySQL for Beginner",
      date: "เริ่มวันที่ 5 มกราคม 2568",
      type: "video",
    },
  ];

  // ฟังก์ชันสำหรับเปลี่ยนหน้า
  const handleNavigateToStudents = () => {
    router.push(`/course/${offeringId}/members`);
  };

  return (
    <Navbar>
      {/* Main Content */}
      <div className="min-h-screen w-full bg-[#F4EFFF]">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Top Navigation Menu */}
       <div className="border-b border-gray-200/50 px-6 lg:px-8 pt-4">
          <div className="flex items-center gap-6 pb-3">
            <button
              onClick={() => setActiveTopTab("home")}
              className={`font-light text-sm transition-colors cursor-pointer ${
                activeTopTab === "home"
                    ? "text-[#B7A3E3]"
                    : "text-gray-500 hover:text-[#B7A3E3]"
                }`}
              >
                หน้าหลัก
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <button
                onClick={() => {
                  setActiveTopTab("student");
                  handleNavigateToStudents();
                }}
                className={`font-light text-sm transition-colors cursor-pointer ${
                  activeTopTab === "student"
                    ? "text-[#B7A3E3]"
                    : "text-gray-500 hover:text-[#B7A3E3]"
                }`}
              >
                นักเรียน
              </button>
            </div>
          </div>
       <div className="bg-gradient-to-r from-white/90 to-purple-50/90 backdrop-blur-sm rounded-2xl lg:rounded-3xl  mb-6 lg:mb-8 relative overflow-hidden">

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 lg:w-64 lg:h-64 bg-gradient-to-br from-blue-400 to-blue-600 rounded-bl-full opacity-20"></div>
          <div className="absolute top-5 right-5 lg:top-10 lg:right-10 w-16 h-16 lg:w-32 lg:h-32 bg-blue-500 rounded-3xl transform rotate-12 opacity-30"></div>

          {/* Course Info */}
          <div className="relative z-10 p-6 lg:p-7 lg:px-10">
            {loading && <p>Loading...</p>}
            {course && (
              <>
                <div className="inline-block text-[#B7A3E3] py-1 text-lg lg:text-xl font-medium mb-2 lg:mb-3">
                  {course.semester}/{course.academic_year} {course.courses.course_code}
                </div>
                <h2 className="text-2xl lg:text-4xl font-light text-[#575757] mb-3 lg:mb-4">
                  {course.courses.course_name}
                </h2>
                <div className="flex flex-wrap flex-col mt-1">
                  {course.course_instructors.map((ci) => (
                    <span
                      key={ci.staff_users_id}
                      className="text-gray-700 px-2 py-1 rounded-full text-xs"
                    >
                      {formatInstructorName(ci.staff_users)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Layout with sidebar and content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Navigation Boxes */}
          <div className="flex flex-col gap-4 w-full lg:w-48 flex-shrink-0">
            <button
              onClick={() => setActiveTab("learn")}
              className={`px-4 lg:px-6 py-3 lg:py-6 rounded-2xl font-light transition-all duration-200 text-center text-sm lg:text-base cursor-pointer ${
                activeTab === "learn"
                  ? "bg-[#B7A3E3] text-white "
                  : "bg-white text-gray-500 hover:bg-gray-50 border border-purple-200"
              }`}
            >
              เพิ่มการสอบ
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`px-4 lg:px-6 py-3 lg:py-6 rounded-2xl font-light transition-all duration-200 text-center text-sm cursor-pointer lg:text-base ${
                activeTab === "assignments"
                  ? "bg-gradient-to-r from-purple-400 to-purple-500 text-white"
                  : "bg-white text-[#B7A3E3] hover:bg-gray-50 border border-purple-200"
              }`}
            >
              ดูการวิเคราะห์
            </button>

            {/* Test Section - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block bg-white backdrop-blur-sm rounded-2xl  p-6">
              <h3 className="font-semibold text-[#575757] mb-4 flex items-center justify-center text-sm">
                ข้อสอบที่ใกล้เปิด
              </h3>
              <div className="space-y-3">
                <div className="text-xs text-gray-600 p-3 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                  Database Focus Atten...
                </div>
                <div className="text-xs text-gray-600 p-3 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                  MySQL for Beginner
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            {/* Course Cards */}
            {exam.map((course, index) => (
              <div
                key={index}
                className="bg-white rounded-xl lg:rounded-2xl hover:bg-[#E0DFDF] transition-all duration-300 overflow-hidden"
              >
                <div className="p-4 lg:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-[#575757] text-sm lg:text-base mb-2 lg:mb-3">
                        {exam.title}
                      </h3>
                      <div className="inline-flex items-center bg-purple-100 text-purple-600 px-2.5 lg:px-3 py-1 rounded-full text-xs font-medium">
                        {exam.date}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      </div>
    </Navbar>
  );
}
