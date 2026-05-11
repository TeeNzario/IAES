"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Home,
  FileText,
  BookOpen,
  ChevronDown,
  Settings,
  Database,
  LogOut,
  Users,
  UserRound,
} from "lucide-react";
import { AuthUser, getUser, clearAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import Image from "next/image";
import { formatCourseName } from "@/utils/formatCourseName";

type PageLayoutProps = {
  children: React.ReactNode;
};

interface CourseOffering {
  course_offerings_id: string;
  courses: {
    course_code: string;
    course_name: string;
    course_name_th?: string;
    course_name_en?: string;
  };
}

const NavBar = ({ children }: PageLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [courses, setCourses] = useState<CourseOffering[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Read user from localStorage on client mount only.
  // Must use useEffect to avoid reading during SSR (window guard).
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getUser<AuthUser>());
  }, []);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const syncSidebar = () => setIsSidebarOpen(!mobileQuery.matches);

    syncSidebar();
    mobileQuery.addEventListener("change", syncSidebar);

    return () => mobileQuery.removeEventListener("change", syncSidebar);
  }, []);

  // Derive active states from pathname
  const isHomeActive = pathname === "/";
  const isCourseManageActive = pathname === "/course";
  const isCourseSectionActive = pathname.startsWith("/course/");
  const isResultsActive = pathname.startsWith("/results");
  const isExamBankActive = pathname.startsWith("/exam-bank");

  // Get active course offering ID from path
  const activeCourseOfferingId = isCourseSectionActive
    ? pathname.split("/")[2]
    : null;

  // Auto-expand courses section when on a course page
  const [isCoursesExpanded, setIsCoursesExpanded] = useState(true);

  // Expand courses section when navigating to a course page
  useEffect(() => {
    if (isCourseSectionActive) {
      setIsCoursesExpanded(true);
    }
  }, [isCourseSectionActive]);

  // Fetch courses for the logged-in user
  useEffect(() => {
    if (!user) return;
    const userType = user.type;

    async function fetchCourses() {
      setLoadingCourses(true);
      try {
        const endpoint =
          userType === "STAFF"
            ? "/course-offerings"
            : "/students/me/enrollments";

        const courses = await apiFetch<CourseOffering[]>(endpoint);
        setCourses(courses);
      } catch (err) {
        console.error("[NavBar] Failed to fetch courses:", err);
      } finally {
        setLoadingCourses(false);
      }
    }

    fetchCourses();
  }, [user, user?.type]);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const closeOnOutsidePointer = (event: MouseEvent | TouchEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsidePointer);
    document.addEventListener("touchstart", closeOnOutsidePointer);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePointer);
      document.removeEventListener("touchstart", closeOnOutsidePointer);
    };
  }, [isUserMenuOpen]);

  const isInstructor = user?.type === "STAFF" && user?.staff_role === "INSTRUCTOR";
  const isAdmin = user?.type === "STAFF" && user?.staff_role === "ADMIN";

  // Derive active state for admin menu
  const isManageUsersActive = pathname === "/admin/manage-users";

  const getDisplayName = () => {
    if (!user) return "เข้าสู่ระบบ";

    if (user.type === "STUDENT") {
      return `${user.student_code ?? ""} ${user.title ?? ""} ${user.first_name ?? ""}`.trim() || "นักศึกษา";
    }

    // STAFF
    return `${user.title ?? ""} ${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "บุคลากร";
  };

  const getProfileSubtitle = () => {
    if (!user) return "IAES";
    if (user.type === "STUDENT") return user.student_code ?? "นักศึกษา";
    if (user.staff_role === "ADMIN") return "ผู้ดูแลระบบ";
    if (user.staff_role === "INSTRUCTOR") return "อาจารย์";
    return user.email ?? "บุคลากร";
  };

  const getProfileInitials = () => {
    if (!user) return "";
    const firstInitial = Array.from(user.first_name?.trim() ?? "")[0] ?? "";
    const lastInitial = Array.from(user.last_name?.trim() ?? "")[0] ?? "";
    const initials = `${firstInitial}${lastInitial}`.trim();

    if (initials) return initials;
    if (user.type === "STUDENT") return (user.student_code ?? "").slice(0, 2);
    return Array.from(getDisplayName().trim())[0] ?? "";
  };

  const profileInitials = getProfileInitials();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  // Style helpers
  const getMenuButtonStyle = (isActive: boolean) => {
    if (isActive) {
      return `w-full flex items-center gap-3 text-sm font-medium ${isSidebarOpen ? "px-4 py-3 rounded-lg" : "p-3 rounded-lg justify-center"} bg-[#B7A3E3] text-white mb-3 hover:bg-[#B7A3E3]/80 transition-colors cursor-pointer`;
    }
    return `w-full flex items-center gap-3 text-sm font-medium ${isSidebarOpen ? "px-4 py-3 rounded-lg" : "p-3 rounded-lg justify-center"} text-[#575757] mb-3 hover:bg-gray-100 transition-colors cursor-pointer`;
  };

  const getSideMenuStyle = (isActive: boolean) => {
    if (isActive) {
      return `w-full flex items-center gap-3 text-sm font-medium ${isSidebarOpen ? "px-4" : "justify-center"} py-3 bg-[#B7A3E3] text-white rounded-lg transition-colors cursor-pointer`;
    }
    return `w-full flex items-center gap-3 text-sm font-medium ${isSidebarOpen ? "px-4" : "justify-center"} py-3 text-[#575757] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer`;
  };

  const getCourseItemStyle = (courseOfferingId: string) => {
    const isActive = activeCourseOfferingId === courseOfferingId;
    if (isActive) {
      return "group w-full text-left px-4 py-2 bg-[#B7A3E3]/80 text-white rounded-lg transition-colors cursor-pointer";
    }
    return "group w-full text-left px-4 py-2 text-[#575757] hover:bg-[#B7A3E3]/80 hover:text-white rounded-lg transition-colors cursor-pointer";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${isSidebarOpen ? "w-64" : "w-16 sm:w-20"} h-screen overflow-y-auto transition-all duration-300 bg-white shadow-lg flex-shrink-0`}
      >
        <div className="p-4">
          {/* Burger Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 mb-4 hover:bg-gray-100 rounded-lg transition-colors w-full flex justify-start"
          >
            <Menu size={24} className="text-gray-700" />
          </button>

          {/* ADMIN-only menu: Show only "จัดการผู้ใช้" */}
          {isAdmin ? (
            <button
              onClick={() => router.push("/admin/manage-users")}
              className={getMenuButtonStyle(isManageUsersActive)}
            >
              <Users size={20} />
              {isSidebarOpen && (
                <span className="font-medium">จัดการผู้ใช้</span>
              )}
            </button>
          ) : (
            /* Non-ADMIN menus */
            <>
              {/* Home Button */}
              <button
                onClick={() => router.push("/")}
                className={getMenuButtonStyle(isHomeActive)}
              >
                <Home size={20} />
                {isSidebarOpen && <span className="font-medium">หน้าแรก</span>}
              </button>

              {/* Courses Section */}
              <div className="mb-3">
                <button
                  onClick={() => setIsCoursesExpanded(!isCoursesExpanded)}
                  className={`w-full flex items-center ${isSidebarOpen ? "justify-between px-4" : "justify-center"} py-3 ${
                    isCourseSectionActive
                      ? "bg-[#B7A3E3]/80 text-white"
                      : "text-[#575757] hover:bg-gray-100"
                  } rounded-lg transition-colors cursor-pointer`}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={20} />
                    {isSidebarOpen && <span className="text-sm font-medium">รายวิชา</span>}
                  </div>
                  {isSidebarOpen && (
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isCoursesExpanded ? "rotate-180" : ""}`}
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
                          className={getCourseItemStyle(
                            course.course_offerings_id,
                          )}
                        >
                          <span className="block text-sm font-semibold">
                            {course.courses.course_code}
                          </span>
                          <span
                            className={`mt-0.5 block truncate text-xs ${
                              activeCourseOfferingId ===
                              course.course_offerings_id
                                ? "text-white/80"
                                : "text-gray-400 group-hover:text-white/80"
                            }`}
                          >
                            {formatCourseName(course.courses)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Instructor-only menus */}
              {isInstructor && (
                <>
                  <button
                    onClick={() => router.push("/course")}
                    className={getSideMenuStyle(isCourseManageActive)}
                  >
                    <Settings size={20} />
                    {isSidebarOpen && <span>จัดการรายวิชา</span>}
                  </button>

                  <button
                    onClick={() => router.push("/exam-bank")}
                    className={getSideMenuStyle(isExamBankActive)}
                  >
                    <Database size={20} />
                    {isSidebarOpen && <span>คลังข้อสอบ</span>}
                  </button>
                </>
              )}

              {/* Results Section - Available to all, kept as the final menu item */}
              <button
                onClick={() => router.push("/results")}
                className={getSideMenuStyle(isResultsActive)}
              >
                <BookOpen size={20} />
                {isSidebarOpen && <span>ผลสรุปการสอบ</span>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-10">
            {/* Left Section - Clickable Logo */}
            <Link
              href="/"
              className="min-w-0 flex items-center gap-3 hover:opacity-80 transition-opacity sm:gap-4"
            >
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 flex-shrink-0 bg-white rounded-full flex items-center justify-center sm:h-10 sm:w-10">
                  <Image src="/IAES_logo.png" alt="" width={100} height={100} />
                </div>
                <span className="truncate text-lg font-bold text-gray-800 sm:text-xl">
                  IAES System
                </span>
              </div>
            </Link>

            {/* Right Section - User Info with Dropdown */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <div
                ref={userMenuRef}
                className="relative"
                onMouseEnter={() => setIsUserMenuOpen(true)}
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(true)}
                  className="flex min-w-0 items-center gap-2 rounded-2xl border border-transparent bg-white px-2 py-1.5 transition-colors cursor-pointer hover:border-[#E7DDF8] hover:bg-[#FAF8FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B7A3E3] sm:gap-3 sm:px-3"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F4EFFF] text-sm font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                    {profileInitials ? (
                      profileInitials
                    ) : (
                      <UserRound size={18} aria-hidden="true" />
                    )}
                  </span>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-44 truncate text-sm font-semibold leading-5 text-[#2F2A3A] lg:max-w-64">
                      {getDisplayName()}
                    </span>
                    <span className="block max-w-44 truncate text-xs font-medium leading-4 text-[#7A7287] lg:max-w-64">
                      {getProfileSubtitle()}
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`flex-shrink-0 text-[#7A7287] transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#E7DDF8] bg-white shadow-xl">
                    <div className="flex items-center gap-3 border-b border-[#EFE8FB] bg-[#FAF8FF] px-4 py-3">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F4EFFF] text-sm font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                        {profileInitials ? (
                          profileInitials
                        ) : (
                          <UserRound size={18} aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#2F2A3A]">
                          {getDisplayName()}
                        </p>
                        <p className="truncate text-xs font-medium text-[#7A7287]">
                          {getProfileSubtitle()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-[#514667] transition-colors cursor-pointer hover:bg-[#F4EFFF] hover:text-[#7C5BD9]"
                      role="menuitem"
                    >
                      <LogOut size={16} />
                      ออกจากระบบ
                    </button>
                  </div>
                )}
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
