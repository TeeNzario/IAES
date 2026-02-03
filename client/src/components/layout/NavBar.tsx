"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Home,
  FileText,
  BookOpen,
  ChevronDown,
  Settings,
  Database,
} from "lucide-react";
import { getUser, AuthUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import Image from "next/image";

interface StaffProfile {
  first_name: string;
  last_name: string;
  role: "INSTRUCTOR" | "ADMIN";
}

interface StudentProfile {
  first_name: string;
  last_name: string;
  student_code: string;
}

type UserProfile = StaffProfile | StudentProfile;

type PageLayoutProps = {
  children: React.ReactNode;
};

interface CourseOffering {
  course_offerings_id: string;
  courses: {
    course_code: string;
    course_name: string;
  };
}

const NavBar = ({ children }: PageLayoutProps) => {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCoursesExpanded, setIsCoursesExpanded] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [courses, setCourses] = useState<CourseOffering[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [userFetch, setUserFetch] = useState<UserProfile | null>(null);

  //fetch current user
  useEffect(() => {
    apiFetch<AuthUser>("/auth/me")
      .then((user) => {
        setUser(user);
      })
      .catch((err) => {
        console.error("Failed to fetch user", err);
      });
  }, []);

  console.log("User:", userFetch);

  // 2️Fetch courses AFTER user is loaded
  useEffect(() => {
    if (!user) return;

    fetchCourses(user);

    async function fetchCourses(user: AuthUser) {
      console.log("Fetch start");
      setLoadingCourses(true);

      try {
        let endpoint = "";
        let user_endpoint = "";

        console.log("User type:", user.userType);

        if (user.userType === "STAFF") {
          endpoint = "/course-offerings";
          user_endpoint = "/staff/me";
          console.log("Hey yo Staff man");
          const me = await apiFetch<StaffProfile>(user_endpoint);
          setUserFetch(me);
        } else if (user.userType === "STUDENT") {
          endpoint = "/students/me/enrollments";
          user_endpoint = "/students/me";
          console.log("Hey yo Student man");
          const me = await apiFetch<StudentProfile>(user_endpoint);
          setUserFetch(me);
        }

        if (!endpoint || !user_endpoint) return;

        // 🔹 2. fetch courses
        const courses = await apiFetch<CourseOffering[]>(endpoint);
        setCourses(courses);
      } catch (err) {
        console.error("[NavBar] Failed to fetch courses:", err);
      } finally {
        setLoadingCourses(false);
      }
    }
  }, [user]);

  const isInstructor =
    user?.userType === "STAFF" &&
    userFetch &&
    "role" in userFetch &&
    userFetch.role === "INSTRUCTOR";

  const getDisplayName = () => {
    if (!userFetch || !user) return "";

    if (user.userType === "STUDENT" && "student_code" in userFetch) {
      return `${userFetch.student_code} ${userFetch.first_name}`;
    }

    if (user.userType === "STAFF" && "last_name" in userFetch) {
      return `${userFetch.first_name} ${userFetch.last_name}`;
    }

    return "";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${isSidebarOpen ? "w-64" : "w-20"} transition-all duration-300 bg-white shadow-lg flex-shrink-0`}
      >
        <div className="p-4">
          {/* Burger Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 mb-4 hover:bg-gray-100 rounded-lg transition-colors w-full flex justify-start"
          >
            <Menu size={24} className="text-gray-700" />
          </button>

          {/* Home Button */}
          <button
            onClick={() => router.push("/")}
            className={`w-full flex items-center gap-3 ${isSidebarOpen ? "px-4 py-3 rounded-full" : "p-3 rounded-lg justify-center"} bg-[#B7A3E3] text-white mb-4 hover:bg-purple-400 transition-colors cursor-pointer`}
          >
            <Home size={20} />
            {isSidebarOpen && <span className="font-medium">หน้าแรก</span>}
          </button>

          {/* Courses Section */}
          <div className="mb-4">
            <button
              onClick={() => setIsCoursesExpanded(!isCoursesExpanded)}
              className={`w-full flex items-center ${isSidebarOpen ? "justify-between px-4" : "justify-center"} py-3 text-[#575757] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer`}
            >
              <div className="flex items-center gap-3">
                <FileText size={20} />
                {isSidebarOpen && <span>รายวิชา</span>}
              </div>
              {isSidebarOpen && (
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isCoursesExpanded ? "rotate-180" : ""} text-[#575757]`}
                />
              )}
            </button>

            {/* Course List */}
            {isCoursesExpanded && isSidebarOpen && (
              <div className="ml-4 mt-2 space-y-1">
                {loadingCourses ? (
                  <div className="px-4 py-2 text-gray-400 text-sm">
                    กำลังโหลด...
                  </div>
                ) : courses.length === 0 ? (
                  <div className="px-4 py-2 text-gray-400 text-sm">
                    ไม่มีรายวิชา
                  </div>
                ) : (
                  courses.map((course) => (
                    <button
                      key={course.course_offerings_id}
                      onClick={() =>
                        router.push(`/course/${course.course_offerings_id}`)
                      }
                      className="w-full text-left px-4 py-2 text-[#575757] hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors text-sm cursor-pointer"
                    >
                      {course.courses.course_code}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Results Section - Available to all */}
          <button
            className={`w-full flex items-center gap-3 ${isSidebarOpen ? "px-4" : "justify-center"} py-3 text-[#575757] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer`}
          >
            <BookOpen size={20} />
            {isSidebarOpen && <span>ผลสรุปการสอบ</span>}
          </button>

          {/* Instructor-only menus */}
          {isInstructor && (
            <>
              {/* <div className="my-4 border-t border-gray-200" /> */}

              <button
                onClick={() => router.push("/course")}
                className={`w-full flex items-center gap-3 ${isSidebarOpen ? "px-4" : "justify-center"} py-3 text-[#575757] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer`}
              >
                <Settings size={20} />
                {isSidebarOpen && <span>จัดการรายวิชา</span>}
              </button>

              <button
                onClick={() => router.push("/")}
                className={`w-full flex items-center gap-3 ${isSidebarOpen ? "px-4" : "justify-center"} py-3 text-[#575757] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer`}
              >
                <Database size={20} />
                {isSidebarOpen && <span>คลังข้อสอบ</span>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between px-10 py-4">
            {/* Left Section - Clickable Logo */}
            <Link
              href="/"
              className="flex items-center gap-4 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Image
                    src="/IAES_logo.png"
                    alt=""
                    width={100}
                    height={100}
                  />
                </div>
                <span className="text-xl font-light text-gray-800">
                  IAES System
                </span>
              </div>
            </Link>

            {/* Right Section - User Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[#484848] font-medium">
                  {getDisplayName()}
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
