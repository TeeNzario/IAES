"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/layout/NavBar";
import { useParams, useRouter } from "next/navigation";
import { CourseOffering } from "@/types/course";
import { apiFetch } from "@/lib/api";
import { formatInstructorName } from "@/utils/formatName";
import {
  getEnglishCourseName,
  getThaiCourseName,
} from "@/utils/formatCourseName";
import { toBuddhistYear } from "@/utils/academicYear";
import { AuthUser } from "@/types/auth";
import {
  BarChart3,
  CalendarClock,
  ClipboardPlus,
  FileText,
  Pencil,
  UsersRound,
} from "lucide-react";

interface ExamListItem {
  course_exams_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  question_count: number;
  status: "UPCOMING" | "ONGOING" | "ENDED";
}

export default function CoursePage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [activeTab, setActiveTab] = useState("learn");
  const [activeTopTab, setActiveTopTab] = useState("home");
  const [course, setCourse] = useState<CourseOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [exams, setExams] = useState<ExamListItem[]>([]);

  const userType = String(user?.type ?? user?.userType ?? "").toUpperCase();
  const staffRole = String(user?.staff_role ?? user?.role ?? "").toUpperCase();
  const canManageExams =
    userType === "STAFF" &&
    (staffRole === "INSTRUCTOR" || staffRole === "ADMIN");

  useEffect(() => {
    if (!offeringId) return;

    const fetchCourseOffering = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<CourseOffering>(
          `course-offerings/${offeringId}`,
        );
        setCourse(data);
      } catch {
        setError("ไม่สามารถโหลดข้อมูลรายวิชาได้");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseOffering();
  }, [offeringId]);

  useEffect(() => {
    if (!offeringId) return;
    if (!authLoaded) return;

    if (!canManageExams) {
      setExams([]);
      return;
    }

    let isMounted = true;
    apiFetch<ExamListItem[]>(`/course-offerings/${offeringId}/exams`)
      .then((data) => {
        if (isMounted) setExams(data);
      })
      .catch(() => {
        if (isMounted) setExams([]);
      });

    return () => {
      isMounted = false;
    };
  }, [authLoaded, canManageExams, offeringId]);

  useEffect(() => {
    let isMounted = true;

    apiFetch<AuthUser>("/auth/me")
      .then((user) => {
        if (isMounted) setUser(user);
      })
      .catch((err) => {
        console.error("Failed to fetch user", err);
      })
      .finally(() => {
        if (isMounted) setAuthLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const upcomingExams = exams
    .filter((exam) => exam.status !== "ENDED")
    .slice(0, 3);
  const thaiCourseName = course ? getThaiCourseName(course.courses) : "";
  const englishCourseName = course ? getEnglishCourseName(course.courses) : "";

  const formatExamDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";

    const thYear = d.getFullYear() + 543;
    const months = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ];
    return `เริ่มวันที่ ${d.getDate()} ${months[d.getMonth()]} ${thYear}`;
  };

  const statusLabel = (s: ExamListItem["status"]) =>
    s === "UPCOMING"
      ? "ยังไม่เริ่ม"
      : s === "ONGOING"
        ? "กำลังสอบ"
        : "เสร็จสิ้น";

  const statusClass = (s: ExamListItem["status"]) =>
    s === "UPCOMING"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : s === "ONGOING"
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
        : "bg-gray-100 text-gray-500 ring-1 ring-gray-200";

  const handleNavigateToStudents = () => {
    router.push(`/course/${offeringId}/members`);
  };

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="mb-5 flex items-center gap-5 border-b border-[#DDD1F6] pb-3">
            <button
              onClick={() => setActiveTopTab("home")}
              className={`text-sm font-medium transition-colors cursor-pointer ${
                activeTopTab === "home"
                  ? "text-[#7C5BD9]"
                  : "text-[#7A7287] hover:text-[#7C5BD9]"
              }`}
            >
              หน้าหลัก
            </button>
            <div className="h-4 w-px bg-[#D4C7ED]" />
            <button
              onClick={() => {
                setActiveTopTab("student");
                handleNavigateToStudents();
              }}
              className={`text-sm font-medium transition-colors cursor-pointer ${
                activeTopTab === "student"
                  ? "text-[#7C5BD9]"
                  : "text-[#7A7287] hover:text-[#7C5BD9]"
              }`}
            >
              สมาชิก
            </button>
          </div>

          <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 lg:p-8">
            {loading && (
              <div className="space-y-4">
                <div className="h-6 w-48 rounded bg-[#F1EAFF]" />
                <div className="h-9 w-3/4 rounded bg-[#F1EAFF]" />
                <div className="h-5 w-1/2 rounded bg-[#F1EAFF]" />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            {course && (
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F4EFFF] px-3 py-1 text-sm font-semibold text-[#7C5BD9]">
                      {course.semester}/{toBuddhistYear(course.academic_year)}
                    </span>
                    <span className="text-sm font-semibold tracking-wide text-[#7C5BD9]">
                      {course.courses.course_code}
                    </span>
                  </div>

                  <h1 className="mt-4 max-w-5xl text-2xl font-semibold leading-tight text-[#2F2A3A] sm:text-3xl">
                    {thaiCourseName}
                  </h1>

                  {englishCourseName && (
                    <p className="mt-2 text-base font-medium leading-7 text-[#514667]">
                      {englishCourseName}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {course.course_instructors.map((ci) => (
                      <span
                        key={ci.staff_users_id}
                        className="inline-flex items-center gap-2 rounded-full bg-[#FAF8FF] px-3 py-1.5 text-sm font-medium text-[#514667]"
                      >
                        <UsersRound size={15} className="text-[#B7A3E3]" />
                        {formatInstructorName(ci.staff_users)}
                      </span>
                    ))}
                  </div>
                </div>

                {canManageExams && (
                  <div className="grid w-full grid-cols-2 gap-3 sm:w-80">
                    <div className="rounded-xl bg-[#FAF8FF] px-4 py-3">
                      <p className="text-xs font-medium text-[#7C5BD9]">
                        ข้อสอบทั้งหมด
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-[#2F2A3A]">
                        {exams.length}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF8FF] px-4 py-3">
                      <p className="text-xs font-medium text-[#7C5BD9]">
                        ใกล้เปิด
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-[#2F2A3A]">
                        {upcomingExams.length}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="space-y-4">
              {canManageExams && (
                <button
                  onClick={() => router.push(`/course/${offeringId}/exam/create`)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#A48FD6] cursor-pointer"
                >
                  <ClipboardPlus size={18} />
                  สร้างการสอบ
                </button>
              )}

              {canManageExams && (
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                    activeTab === "analytics"
                      ? "bg-[#F4EFFF] text-[#7C5BD9] ring-1 ring-[#D9CCF2]"
                      : "bg-white text-[#7C5BD9] ring-1 ring-[#E7DDF8] hover:bg-[#FAF8FF]"
                  }`}
                >
                  <BarChart3 size={18} />
                  ดูการวิเคราะห์
                </button>
              )}

              {canManageExams && (
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E7DDF8]">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-[#2F2A3A]">
                    <CalendarClock size={17} className="text-[#B7A3E3]" />
                    ข้อสอบที่ใกล้เปิด
                  </h2>
                  <div className="mt-4 space-y-2">
                    {upcomingExams.length > 0 ? (
                      upcomingExams.map((exam) => (
                        <button
                          key={exam.course_exams_id}
                          type="button"
                          className="w-full rounded-xl bg-[#FAF8FF] px-3 py-2 text-left transition-colors hover:bg-[#F4EFFF]"
                        >
                          <p className="truncate text-sm font-medium text-[#2F2A3A]">
                            {exam.title}
                          </p>
                          <p className="mt-1 text-xs font-normal text-[#7A7287]">
                            {formatExamDate(exam.start_time)}
                          </p>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-xl bg-[#FAF8FF] px-3 py-3 text-sm font-normal text-[#7A7287]">
                        ยังไม่มีข้อสอบที่ใกล้เปิด
                      </p>
                    )}
                  </div>
                </div>
              )}
            </aside>

            {canManageExams && (
              <section className="space-y-4">
                {exams.length === 0 ? (
                  <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7DDF8]">
                    <FileText size={28} className="mx-auto text-[#B7A3E3]" />
                    <p className="mt-3 text-sm font-medium text-[#7A7287]">
                      ยังไม่มีข้อสอบ
                    </p>
                  </div>
                ) : (
                  exams.map((exam) => (
                    <article
                      key={exam.course_exams_id}
                      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] transition hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold leading-6 text-[#2F2A3A] sm:text-lg">
                            {exam.title}
                          </h3>
                          {exam.description && (
                            <p className="mt-1 line-clamp-2 text-sm font-normal leading-6 text-[#7A7287]">
                              {exam.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#F4EFFF] px-3 py-1 text-xs font-semibold text-[#7C5BD9]">
                              {formatExamDate(exam.start_time)}
                            </span>
                            <span className="rounded-full bg-[#FAF8FF] px-3 py-1 text-xs font-medium text-[#514667]">
                              {exam.question_count} ข้อ
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              exam.status,
                            )}`}
                          >
                            {statusLabel(exam.status)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/exam-bank/${offeringId}/exam-sets/${exam.course_exams_id}/edit`,
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9CCF2] text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                            aria-label="แก้ไข"
                            title="แก้ไขชุดข้อสอบ"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </Navbar>
  );
}
