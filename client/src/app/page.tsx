"use client";

import { BookOpen, Edit, Plus, UsersRound } from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CourseOffering } from "@/types/course";
import { formatInstructorName } from "@/utils/formatName";
import EditCourseOfferingModal from "@/components/courseOffering/EditCourseOfferingModal";
import { AuthUser } from "@/types/auth";
import { getUser } from "@/lib/auth";
import { toBuddhistYear } from "@/utils/academicYear";
import {
  getEnglishCourseName,
  getThaiCourseName,
} from "@/utils/formatCourseName";

type NormalizedUserType = "STAFF" | "STUDENT" | null;
type NormalizedStaffRole = "ADMIN" | "INSTRUCTOR" | null;

function getUserType(user: AuthUser | null): NormalizedUserType {
  const type = String(user?.type ?? user?.userType ?? "").toUpperCase();
  if (type === "STAFF" || type === "STUDENT") return type;
  return null;
}

function getStaffRole(user: AuthUser | null): NormalizedStaffRole {
  const role = String(user?.staff_role ?? user?.role ?? "").toUpperCase();
  if (role === "ADMIN" || role === "INSTRUCTOR") return role;
  return null;
}

function getHeaderContent(userType: NormalizedUserType) {
  if (userType === "STUDENT") {
    return {
      eyebrow: "มุมมองนักศึกษา",
      title: "รายวิชาที่ลงทะเบียน",
      description: "เลือกวิชาที่ต้องการเข้าเรียน ดูรายละเอียด หรือเข้าทำข้อสอบ",
      totalLabel: "รายวิชาที่ลงทะเบียน",
      activeLabel: "พร้อมเข้าเรียน",
    };
  }

  if (userType === "STAFF") {
    return {
      eyebrow: "มุมมองอาจารย์",
      title: "รายวิชาที่รับผิดชอบ",
      description: "เลือกวิชาเพื่อจัดการสมาชิก สร้างการสอบ และติดตามข้อมูลรายวิชา",
      totalLabel: "รายวิชาที่รับผิดชอบ",
      activeLabel: "กำลังเปิดสอน",
    };
  }

  return {
    eyebrow: "IAES System",
    title: "รายวิชา",
    description: "กำลังเตรียมรายการรายวิชาสำหรับบัญชีของคุณ",
    totalLabel: "รายวิชาทั้งหมด",
    activeLabel: "กำลังใช้งาน",
  };
}

export default function CourseHomePage() {
  const [courses, setCourses] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOffering, setSelectedOffering] = useState<CourseOffering | null>(
    null,
  );
  const [user, setUser] = useState<AuthUser | null>(null);

  const fetchCourseOfferings = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<CourseOffering[]>("/course-offerings");
      setCourses(data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลรายวิชาได้");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchCourseOfferings().finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [fetchCourseOfferings]);

  useEffect(() => {
    let isMounted = true;
    const storedUser = getUser<AuthUser>();
    if (storedUser) {
      setUser(storedUser);
    }

    apiFetch<AuthUser>("/auth/me")
      .then((fetchedUser) => {
        if (isMounted) setUser(fetchedUser);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      });

    return () => { isMounted = false; };
  }, []);

  const userType = getUserType(user);
  const canManageOfferings =
    userType === "STAFF" && getStaffRole(user) === "INSTRUCTOR";
  const activeCourseCount = courses.filter((course) => course.is_active).length;
  const headerContent = getHeaderContent(userType);

  const handleEditClick = (
    courseOffering: CourseOffering,
  ) => {
    setSelectedOffering(courseOffering);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchCourseOfferings();
  };

  return (
    <NavBar>
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 lg:flex lg:items-end lg:justify-between lg:gap-8">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#7C5BD9]">
                {headerContent.eyebrow}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-[#2F2A3A] sm:text-3xl">
                {headerContent.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#575757] sm:text-base">
                {headerContent.description}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-sm lg:mt-0 lg:w-80">
              <div className="rounded-xl bg-[#F7F3FF] px-4 py-3">
                <p className="text-sm font-semibold text-[#7C5BD9]">
                  {headerContent.totalLabel}
                </p>
                <p className="mt-1 text-2xl font-semibold leading-none text-[#2F2A3A]">
                  {loading ? "-" : courses.length}
                </p>
              </div>
              <div className="rounded-xl bg-[#F7F3FF] px-4 py-3">
                <p className="text-sm font-semibold text-[#7C5BD9]">
                  {headerContent.activeLabel}
                </p>
                <p className="mt-1 text-2xl font-semibold leading-none text-[#2F2A3A]">
                  {loading ? "-" : activeCourseCount}
                </p>
              </div>
            </div>
          </section>

          {error && (
            <div role="alert" className="rounded-xl border border-red-100 bg-white px-5 py-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="กำลังโหลดรายวิชา">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-[20rem] rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8]"
                >
                  <div className="h-8 w-8 rounded-lg bg-[#F1EAFF]" />
                  <div className="mt-6 h-4 w-24 rounded bg-[#F1EAFF]" />
                  <div className="mt-4 h-6 w-4/5 rounded bg-[#F1EAFF]" />
                  <div className="mt-3 h-6 w-3/5 rounded bg-[#F1EAFF]" />
                  <div className="mt-8 h-px bg-[#F1EAFF]" />
                  <div className="mt-4 h-4 w-32 rounded bg-[#F1EAFF]" />
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[#CDBDF0] bg-white/70 p-8 text-center">
              <BookOpen size={36} className="text-[#B7A3E3]" />
              <h2 className="mt-4 text-lg font-semibold text-[#2F2A3A]">
                ยังไม่มีรายวิชา
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#575757]">
                {canManageOfferings
                  ? "เริ่มจากการสร้างรายวิชาที่เปิดสอน เพื่อให้นักศึกษาเข้าถึงการสอบได้"
                  : "รายวิชาที่ลงทะเบียนจะแสดงในหน้านี้เมื่อมีการเปิดใช้งานแล้ว"}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((courseOffering) => {
                const instructors = courseOffering.course_instructors ?? [];
                const thaiCourseName = getThaiCourseName(
                  courseOffering.courses,
                );
                const englishCourseName = getEnglishCourseName(
                  courseOffering.courses,
                );

                return (
                  <article
                    key={courseOffering.course_offerings_id}
                    className={`relative flex min-h-[20rem] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8] transition hover:-translate-y-0.5 hover:shadow-md ${
                      courseOffering.is_active ? "" : "opacity-70"
                    }`}
                  >
                    <Link
                      href={`/course/${courseOffering.course_offerings_id}`}
                      className="flex flex-1 flex-col p-5 pb-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                          <BookOpen size={20} />
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                          <p className="rounded-full bg-[#F4EFFF] px-3 py-1 text-xs font-semibold text-[#7C5BD9]">
                            {courseOffering.semester}/
                            {toBuddhistYear(courseOffering.academic_year)}
                          </p>
                          {!courseOffering.is_active && (
                            <span className="mt-1 inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                              ปิดใช้งาน
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 min-w-0">
                        <p className="text-sm font-semibold tracking-wide text-[#7C5BD9]">
                          {courseOffering.courses.course_code}
                        </p>
                        <div className="mt-3 min-h-[7.75rem]">
                          {thaiCourseName && (
                            <h2
                              className={`overflow-hidden text-[1.32rem] font-semibold leading-8 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
                                courseOffering.is_active
                                  ? "text-[#201A2F]"
                                  : "text-gray-500"
                              }`}
                            >
                              {thaiCourseName}
                            </h2>
                          )}
                          {englishCourseName && (
                            <p
                              className={`mt-2 overflow-hidden text-sm font-medium leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
                                courseOffering.is_active
                                  ? "text-[#514667]"
                                  : "text-gray-400"
                              }`}
                            >
                              {englishCourseName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className={`mt-auto rounded-xl bg-[#FAF8FF] px-3 py-3 ${
                          canManageOfferings ? "pr-14" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2.5 text-[#575757]">
                          <UsersRound
                            size={16}
                            className="mt-0.5 flex-shrink-0 text-[#B7A3E3]"
                          />
                          <div className="min-w-0 space-y-1">
                            {instructors.length > 0 ? (
                              instructors.slice(0, 2).map((staff) => (
                                <p
                                  key={staff.staff_users_id}
                                  className="truncate text-sm leading-5"
                                >
                                  {formatInstructorName(staff.staff_users)}
                                </p>
                              ))
                            ) : (
                              <p className="text-sm leading-5 text-gray-400">
                                ยังไม่มีอาจารย์ผู้สอน
                              </p>
                            )}
                            {instructors.length > 2 && (
                              <p
                                className="text-xs font-medium text-[#7C5BD9] cursor-help"
                                title={instructors
                                  .slice(2)
                                  .map((s) => formatInstructorName(s.staff_users))
                                  .join(", ")}
                              >
                                +{instructors.length - 2} คน
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>

                    {canManageOfferings && (
                      <button
                        type="button"
                        onClick={() => handleEditClick(courseOffering)}
                        className="absolute bottom-5 right-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-[#B7A3E3] text-white shadow-sm transition-colors hover:bg-[#A48FD6]"
                        aria-label="แก้ไขรายวิชา"
                        title="แก้ไขรายวิชา"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </article>
                );
              })}

              {canManageOfferings && (
                <Link
                  href="/course"
                  className="flex min-h-[20rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CDBDF0] bg-white/40 p-6 text-center text-[#7C5BD9] transition hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-sm"
                  aria-label="สร้างรายวิชา"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#7C5BD9] shadow-sm">
                    <Plus size={26} />
                  </span>
                  <span className="mt-4 text-sm font-semibold">
                    สร้างรายวิชา
                  </span>
                </Link>
              )}
            </div>
          )}
        </main>
      </div>

      {selectedOffering && (
        <EditCourseOfferingModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedOffering(null);
          }}
          courseOffering={selectedOffering}
          onSuccess={handleEditSuccess}
        />
      )}
    </NavBar>
  );
}
