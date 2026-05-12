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

const SIDEBAR_STORAGE_KEY = "iaes-sidebar-open";
let cachedSidebarOpen: boolean | null = null;

function readStoredSidebarOpen() {
  try {
    const savedSidebarState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return savedSidebarState === null ? true : savedSidebarState === "true";
  } catch {
    return true;
  }
}

function persistSidebarOpen(isOpen: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen));
  } catch {
    // The in-memory cache still keeps navigation stable when storage is blocked.
  }
}

const NavBar = ({ children }: PageLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(cachedSidebarOpen ?? true);
  const [isSidebarReady, setIsSidebarReady] = useState(cachedSidebarOpen !== null);
  const [courses, setCourses] = useState<CourseOffering[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState(false);
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
    const syncSidebar = () => {
      if (mobileQuery.matches) {
        cachedSidebarOpen = false;
        setIsSidebarOpen(false);
        return;
      }

      const nextSidebarOpen = readStoredSidebarOpen();
      cachedSidebarOpen = nextSidebarOpen;
      setIsSidebarOpen(nextSidebarOpen);
    };

    syncSidebar();
    setIsSidebarReady(true);
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
      setCoursesError(false);
      try {
        const endpoint =
          userType === "STAFF"
            ? "/course-offerings"
            : "/students/me/enrollments";

        const courses = await apiFetch<CourseOffering[]>(endpoint);
        setCourses(courses);
      } catch (err) {
        console.error("[NavBar] Failed to fetch courses:", err);
        setCoursesError(true);
      } finally {
        setLoadingCourses(false);
      }
    }

    fetchCourses();
  }, [user]);

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

  const handleToggleSidebar = () => {
    setIsSidebarOpen((current) => {
      const next = !current;
      cachedSidebarOpen = next;
      persistSidebarOpen(next);
      return next;
    });
  };

  // Style helpers
  const getMenuButtonStyle = (isActive: boolean) => {
    const sizeClass = isSidebarOpen
      ? "px-4 py-3.5 rounded-xl"
      : "h-12 justify-center rounded-xl p-0";

    if (isActive) {
      return `w-full flex items-center gap-3 text-base font-medium ${sizeClass} bg-[#B7A3E3] text-white mb-3 hover:bg-[#B7A3E3]/80 transition-colors cursor-pointer`;
    }
    return `w-full flex items-center gap-3 text-base font-medium ${sizeClass} text-[#575757] mb-3 hover:bg-gray-100 transition-colors cursor-pointer`;
  };

  const getSideMenuStyle = (isActive: boolean) => {
    const sizeClass = isSidebarOpen
      ? "px-4 py-3.5"
      : "h-12 justify-center p-0";

    if (isActive) {
      return `w-full flex items-center gap-3 text-base font-medium ${sizeClass} bg-[#B7A3E3] text-white rounded-xl transition-colors cursor-pointer`;
    }
    return `w-full flex items-center gap-3 text-base font-medium ${sizeClass} text-[#575757] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer`;
  };

  const getCourseItemStyle = (courseOfferingId: string) => {
    const isActive = activeCourseOfferingId === courseOfferingId;
    if (isActive) {
      return "group w-full text-left px-4 py-3 bg-[#B7A3E3]/80 text-white rounded-xl transition-colors cursor-pointer";
    }
    return "group w-full text-left px-4 py-3 text-[#575757] hover:bg-[#B7A3E3]/80 hover:text-white rounded-xl transition-colors cursor-pointer";
  };

  return (
    <div
      className="flex h-screen bg-gray-50"
      style={{ visibility: isSidebarReady ? "visible" : "hidden" }}
    >
      {/* Sidebar */}
      <div
        className={`${isSidebarOpen ? "w-72" : "w-20 sm:w-24"} h-screen overflow-y-auto bg-white shadow-lg flex-shrink-0 ${
          isSidebarReady ? "transition-all duration-300" : ""
        }`}
      >
        <div className={isSidebarOpen ? "p-5" : "p-3"}>
          {/* Burger Button */}
          <button
            onClick={handleToggleSidebar}
            className={`mb-4 flex w-full rounded-xl transition-colors hover:bg-gray-100 ${
              isSidebarOpen ? "justify-start p-2.5" : "h-12 items-center justify-center p-0"
            }`}
            aria-label={isSidebarOpen ? "ปิดแถบเมนู" : "เปิดแถบเมนู"}
          >
            <Menu size={28} className="text-gray-700" />
          </button>

          {/* ADMIN-only menu: Show only "จัดการผู้ใช้" */}
          {isAdmin ? (
            <button
              onClick={() => router.push("/admin/manage-users")}
              className={getMenuButtonStyle(isManageUsersActive)}
              aria-label="จัดการผู้ใช้"
            >
              <Users size={22} />
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
                aria-label="หน้าแรก"
              >
                <Home size={22} />
                {isSidebarOpen && <span className="font-medium">หน้าแรก</span>}
              </button>

              {/* Courses Section */}
              <div className="mb-3">
                <button
                  onClick={() => setIsCoursesExpanded(!isCoursesExpanded)}
                  className={`w-full flex items-center text-base font-medium ${
                    isSidebarOpen
                      ? "justify-between px-4 py-3.5"
                      : "h-12 justify-center p-0"
                  } ${
                    isCourseSectionActive
                      ? "bg-[#B7A3E3]/80 text-white"
                      : "text-[#575757] hover:bg-gray-100"
                  } rounded-xl transition-colors cursor-pointer`}
                  aria-label="รายวิชา"
                  aria-expanded={isCoursesExpanded}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={22} />
                    {isSidebarOpen && <span>รายวิชา</span>}
                  </div>
                  {isSidebarOpen && (
                    <ChevronDown
                      size={18}
                      className={`transition-transform ${isCoursesExpanded ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {/* Course List */}
                {isCoursesExpanded && isSidebarOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    {loadingCourses ? (
                      <div className="px-4 py-2 text-sm font-medium text-gray-400">
                        กำลังโหลด...
                      </div>
                    ) : coursesError ? (
                      <div className="px-4 py-2 text-sm font-medium text-red-500">
                        โหลดรายวิชาไม่สำเร็จ
                      </div>
                    ) : courses.length === 0 ? (
                      <div className="px-4 py-2 text-sm font-medium text-gray-400">
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
                          <span className="block text-base font-semibold">
                            {course.courses.course_code}
                          </span>
                          <span
                            className={`mt-1 block truncate text-sm font-medium ${
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
                    aria-label="จัดการรายวิชา"
                  >
                    <Settings size={22} />
                    {isSidebarOpen && <span>จัดการรายวิชา</span>}
                  </button>

                  <button
                    onClick={() => router.push("/exam-bank")}
                    className={getSideMenuStyle(isExamBankActive)}
                    aria-label="คลังข้อสอบ"
                  >
                    <Database size={22} />
                    {isSidebarOpen && <span>คลังข้อสอบ</span>}
                  </button>
                </>
              )}

              {/* Results Section - Available to all, kept as the final menu item */}
              <button
                onClick={() => router.push("/results")}
                className={getSideMenuStyle(isResultsActive)}
                aria-label="ผลสรุปการสอบ"
              >
                <BookOpen size={22} />
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
                  className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-transparent bg-white px-2.5 py-2 transition-colors cursor-pointer hover:border-[#E7DDF8] hover:bg-[#FAF8FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B7A3E3] sm:gap-3.5 sm:px-3.5"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#F4EFFF] text-base font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                    {profileInitials ? (
                      profileInitials
                    ) : (
                      <UserRound size={20} aria-hidden="true" />
                    )}
                  </span>
                  <span className="hidden min-w-0 text-left sm:block">
                    <span className="block max-w-48 truncate text-base font-semibold leading-6 text-[#2F2A3A] lg:max-w-72">
                      {getDisplayName()}
                    </span>
                    <span className="block max-w-48 truncate text-sm font-medium leading-5 text-[#7A7287] lg:max-w-72">
                      {getProfileSubtitle()}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 text-[#7A7287] transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-[#E7DDF8] bg-white shadow-xl">
                    <div className="flex items-center gap-3.5 border-b border-[#EFE8FB] bg-[#FAF8FF] px-4 py-3.5">
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#F4EFFF] text-base font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                        {profileInitials ? (
                          profileInitials
                        ) : (
                          <UserRound size={20} aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-[#2F2A3A]">
                          {getDisplayName()}
                        </p>
                        <p className="truncate text-sm font-medium text-[#7A7287]">
                          {getProfileSubtitle()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-3.5 text-base font-medium text-[#514667] transition-colors cursor-pointer hover:bg-[#F4EFFF] hover:text-[#7C5BD9]"
                      role="menuitem"
                    >
                      <LogOut size={18} />
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
