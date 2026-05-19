"use client";

import React, { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/layout/NavBar";
import { useParams, useRouter } from "next/navigation";
import { CourseOffering } from "@/types/course";
import { apiFetch } from "@/lib/api";
import CourseTabs from "@/components/course/CourseTabs";
import { formatInstructorName } from "@/utils/formatName";
import {
  getEnglishCourseName,
  getThaiCourseName,
} from "@/utils/formatCourseName";
import { toBuddhistYear } from "@/utils/academicYear";
import { AuthUser } from "@/types/auth";
import {
  AlertCircle,
  CalendarClock,
  ClipboardPlus,
  Eye,
  FileText,
  Pencil,
  PlayCircle,
  UsersRound,
  X,
} from "lucide-react";

interface ExamListItem {
  course_exams_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  question_count: number;
  status: "UPCOMING" | "ONGOING" | "ENDED";
  is_published: boolean;
  show_results_immediately: boolean;
  attempt_count?: number;
  attempt: {
    attempt_id: string;
    status: "IN_PROGRESS" | "SUBMITTED" | "CANCELLED";
    submitted_at: string | null;
    can_view_result: boolean;
    total_score: string | number | null;
    passed: boolean | null;
  } | null;
}

const EXAM_STATUS_LABELS: Record<ExamListItem["status"], string> = {
  UPCOMING: "รอเปิดสอบ",
  ONGOING: "อยู่ระหว่างการสอบ",
  ENDED: "สิ้นสุดการสอบ",
};

export default function CoursePage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [course, setCourse] = useState<CourseOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [examFetchError, setExamFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ExamListItem["status"]>("ALL");

  const userType = String(user?.type ?? user?.userType ?? "").toUpperCase();
  const staffRole = String(user?.staff_role ?? user?.role ?? "").toUpperCase();
  const canManageExams =
    userType === "STAFF" &&
    (staffRole === "INSTRUCTOR" || staffRole === "ADMIN");
  const isStudent = userType === "STUDENT";

  useEffect(() => {
    if (!offeringId) return;
    let isMounted = true;

    const fetchCourseOffering = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<CourseOffering>(
          `course-offerings/${offeringId}`,
        );
        if (isMounted) setCourse(data);
      } catch {
        if (isMounted) setError("ไม่สามารถโหลดข้อมูลรายวิชาได้");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCourseOffering();
    return () => { isMounted = false; };
  }, [offeringId]);

  useEffect(() => {
    if (!offeringId) return;
    if (!authLoaded) return;

    let isMounted = true;
    apiFetch<ExamListItem[]>(`/course-offerings/${offeringId}/exams`)
      .then((data) => {
        if (isMounted) setExams(data);
      })
      .catch(() => {
        if (isMounted) {
          setExams([]);
          setExamFetchError("ไม่สามารถโหลดรายการข้อสอบได้");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authLoaded, offeringId]);

  useEffect(() => {
    let isMounted = true;

    apiFetch<AuthUser>("/auth/me")
      .then((user) => {
        if (isMounted) setUser(user);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setAuthLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedExams = useMemo(() => {
    const priority: Record<string, number> = { ONGOING: 0, UPCOMING: 1, ENDED: 2 };
    return [...exams].sort((a, b) => {
      const p = priority[a.status] - priority[b.status];
      if (p !== 0) return p;
      if (a.status === "ENDED") {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      }
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
  }, [exams]);

  const upcomingExams = sortedExams
    .filter((exam) => exam.status === "UPCOMING")
    .slice(0, 3);
  const filteredExams =
    statusFilter === "ALL"
      ? sortedExams
      : sortedExams.filter((exam) => exam.status === statusFilter);
  const statusCounts = useMemo(
    () => ({
      ALL: exams.length,
      UPCOMING: exams.filter((exam) => exam.status === "UPCOMING").length,
      ONGOING: exams.filter((exam) => exam.status === "ONGOING").length,
      ENDED: exams.filter((exam) => exam.status === "ENDED").length,
    }),
    [exams],
  );
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
    const time = d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return `เริ่มวันที่ ${d.getDate()} ${months[d.getMonth()]} ${thYear} เวลา ${time} น.`;
  };

  const statusLabel = (s: ExamListItem["status"]) => EXAM_STATUS_LABELS[s];

  const statusClass = (s: ExamListItem["status"]) =>
    s === "UPCOMING"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : s === "ONGOING"
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
        : "bg-gray-200 text-gray-600 ring-1 ring-gray-300";

  const statusFilterOptions = [
    { value: "ALL" as const, label: "ทั้งหมด", count: statusCounts.ALL },
    { value: "UPCOMING" as const, label: EXAM_STATUS_LABELS.UPCOMING, count: statusCounts.UPCOMING },
    { value: "ONGOING" as const, label: EXAM_STATUS_LABELS.ONGOING, count: statusCounts.ONGOING },
    { value: "ENDED" as const, label: EXAM_STATUS_LABELS.ENDED, count: statusCounts.ENDED },
  ];

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <CourseTabs offeringId={offeringId} active="home" />

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
              <div className="flex flex-col gap-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F4EFFF] px-3 py-1 text-[15px] font-medium text-[#7455C9]">
                      {course.semester}/{toBuddhistYear(course.academic_year)}
                    </span>
                    <span className="text-[15px] font-medium tracking-wide text-[#7455C9]">
                      {course.courses.course_code}
                    </span>
                  </div>

                  <h1 className="mt-4 max-w-5xl text-2xl font-semibold leading-tight text-[#2F2A3A] sm:text-[28px]">
                    {thaiCourseName}
                  </h1>

                  {englishCourseName && (
                    <p className="mt-2 text-[15px] font-normal leading-7 text-[#514667]">
                      {englishCourseName}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {(course.course_instructors ?? []).slice(0, 3).map((ci) => (
                      <span
                        key={ci.staff_users_id}
                        className="inline-flex items-center gap-2 rounded-full bg-[#FAF8FF] px-3 py-1.5 text-[15px] font-normal text-[#514667]"
                      >
                        <UsersRound size={15} className="text-[#B7A3E3]" />
                        {ci.staff_users ? formatInstructorName(ci.staff_users) : "—"}
                      </span>
                    ))}
                    {(course.course_instructors ?? []).length > 3 && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F4EFFF] px-3 py-1.5 text-[15px] font-medium text-[#7455C9] cursor-help"
                        title={(course.course_instructors ?? [])
                          .slice(3)
                          .map((ci) => ci.staff_users ? formatInstructorName(ci.staff_users) : "—")
                          .join(", ")}
                      >
                        <UsersRound size={15} className="text-[#B7A3E3]" />
                        +{(course.course_instructors ?? []).length - 3} คน
                      </span>
                    )}
                  </div>
                </div>

              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="space-y-4">
              {canManageExams && (
                <button
                  onClick={() => router.push(`/course/${offeringId}/exam/create`)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#A48FD6] cursor-pointer"
                >
                  <ClipboardPlus size={18} />
                  สร้างการสอบ
                </button>
              )}


              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E7DDF8]">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[#2F2A3A]">
                  <CalendarClock size={18} className="text-[#B7A3E3]" />
                  กำหนดการสอบถัดไป
                </h2>
                <div className="mt-4 space-y-2">
                  {upcomingExams.length > 0 ? (
                    upcomingExams.map((exam) => (
                      <button
                        key={exam.course_exams_id}
                        type="button"
                        className="w-full rounded-xl bg-[#FAF8FF] px-3 py-2 text-left transition-colors hover:bg-[#F4EFFF]"
                      >
                        <p className="truncate text-sm font-semibold leading-6 text-[#2F2A3A]">
                          {exam.title}
                        </p>
                        <p className="mt-1 text-sm font-normal leading-5 text-[#7A7287]">
                          {formatExamDate(exam.start_time)}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-xl bg-[#FAF8FF] px-3 py-3 text-sm font-normal text-[#7A7287]">
                      ยังไม่มีกำหนดการสอบที่รอเปิด
                    </p>
                  )}
                </div>
              </div>
            </aside>

            <section className="space-y-4">
              {examFetchError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
                  <AlertCircle size={14} />
                  {examFetchError}
                </div>
              )}
              {exams.length > 0 && (
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#E7DDF8]">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {statusFilterOptions.map((option) => {
                      const isActive = statusFilter === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setStatusFilter(option.value)}
                          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[15px] font-medium leading-5 transition-colors ${
                            isActive
                              ? "bg-[#EEE8FA] text-[#6F52BA] shadow-sm ring-1 ring-[#D9CCF2]"
                              : "bg-[#FAF8FF] text-[#514667] ring-1 ring-[#EFE8FB] hover:bg-[#F4EFFF] hover:text-[#7455C9]"
                          }`}
                        >
                          <span className="text-center">{option.label}</span>
                          <span
                            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[13px] font-semibold ${
                              isActive
                                ? "bg-white text-[#6F52BA] ring-1 ring-[#D9CCF2]"
                                : "bg-white text-[#7455C9] ring-1 ring-[#D9CCF2]"
                            }`}
                          >
                            {option.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {exams.length === 0 && !examFetchError ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7DDF8]">
                  <FileText size={28} className="mx-auto text-[#B7A3E3]" />
                  <p className="mt-3 text-sm font-medium text-[#7A7287]">
                    ยังไม่มีข้อสอบ
                  </p>
                </div>
              ) : filteredExams.length === 0 && !examFetchError ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7DDF8]">
                  <FileText size={28} className="mx-auto text-[#B7A3E3]" />
                  <p className="mt-3 text-sm font-medium text-[#7A7287]">
                    ไม่มีชุดข้อสอบในสถานะนี้
                  </p>
                </div>
              ) : (
                filteredExams.map((exam) => (
                  <article
                    key={exam.course_exams_id}
                    className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] transition hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold leading-6 text-[#2F2A3A]">
                          {exam.title}
                        </h3>
                        <ExamDescriptionPreview
                          title={exam.title}
                          description={exam.description}
                        />

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#F4EFFF] px-3.5 py-1.5 text-[15px] font-medium text-[#7455C9]">
                            {formatExamDate(exam.start_time)}
                          </span>
                          <span className="rounded-full bg-[#FAF8FF] px-3.5 py-1.5 text-[15px] font-medium text-[#514667]">
                            {exam.question_count} ข้อ
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-4 py-1.5 text-[15px] font-semibold ${statusClass(
                            exam.status,
                          )}`}
                        >
                          {statusLabel(exam.status)}
                        </span>
                        {isStudent && (
                          <ExamStudentActionButton
                            exam={exam}
                            onNavigate={() =>
                              router.push(
                                `/course/${offeringId}/exam/${exam.course_exams_id}`,
                              )
                            }
                          />
                        )}
                        {canManageExams && (
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
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        </main>
      </div>
    </Navbar>
  );
}

function ExamStudentActionButton({
  exam,
  onNavigate,
}: {
  exam: ExamListItem;
  onNavigate: () => void;
}) {
  const attempt = exam.attempt;
  const score =
    attempt?.total_score == null ? null : Number(attempt.total_score);

  if (attempt?.status === "CANCELLED") {
    return (
      <span className="inline-flex h-9 items-center justify-center rounded-xl bg-rose-50 px-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
        ยกเลิกแล้ว
      </span>
    );
  }

  if (attempt?.status === "SUBMITTED") {
    if (attempt.can_view_result) {
      return (
        <button
          type="button"
          onClick={onNavigate}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#B7A3E3] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9]"
        >
          <Eye size={15} />
          ดูผล{score !== null && Number.isFinite(score) ? ` ${score.toFixed(0)}%` : ""}
        </button>
      );
    }

    return (
      <span className="inline-flex h-9 items-center justify-center rounded-xl bg-[#FAF8FF] px-3 text-sm font-semibold text-[#7A7287] ring-1 ring-[#E7DDF8]">
        ส่งแล้ว
      </span>
    );
  }

  if (attempt?.status === "IN_PROGRESS" && exam.status === "ENDED") {
    return (
      <button
        type="button"
        onClick={onNavigate}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#B7A3E3] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9]"
      >
        <Eye size={15} />
        สรุปผล
      </button>
    );
  }

  if (exam.status === "ONGOING") {
    return (
      <button
        type="button"
        onClick={onNavigate}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#B7A3E3] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9]"
      >
        <PlayCircle size={15} />
        {attempt?.status === "IN_PROGRESS" ? "ทำต่อ" : "เริ่มสอบ"}
      </button>
    );
  }

  if (exam.status === "ENDED") {
    return (
      <span className="inline-flex h-9 items-center justify-center rounded-xl bg-gray-100 px-3 text-sm font-semibold text-gray-500 ring-1 ring-gray-200">
        ไม่ได้เข้าสอบ
      </span>
    );
  }

  return null;
}

function ExamDescriptionPreview({
  title,
  description,
}: {
  title: string;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);
  const text = description?.trim() ?? "";
  const shouldTruncate = text.length > 110 || text.split(/\r?\n/).length > 2;

  if (!text) return null;

  return (
    <div className="mt-2 max-w-4xl rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#EFE8FB]">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#7C5BD9]">
          คำอธิบาย
        </span>
        {shouldTruncate && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-sm font-semibold text-[#7C5BD9] shadow-sm ring-1 ring-[#D9CCF2] transition-colors hover:bg-[#F4EFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9]"
            aria-haspopup="dialog"
          >
            อ่านเพิ่มเติม
          </button>
        )}
      </div>

      <p
        className={`break-words text-[13px] font-normal leading-5 text-[#6B617A] sm:text-sm sm:leading-6 ${
          shouldTruncate ? "line-clamp-2" : "whitespace-pre-line"
        }`}
        title={text}
      >
        {text}
      </p>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F2A3A]/35 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-exam-description-dialog-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-left shadow-xl ring-1 ring-[#D9CCF2]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EFE8FB] px-5 py-4">
              <div className="min-w-0">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                  <FileText size={19} />
                </div>
                <h4
                  id="course-exam-description-dialog-title"
                  className="line-clamp-2 break-words text-lg font-semibold leading-7 text-[#2F2A3A]"
                >
                  {title}
                </h4>
                <p className="mt-1 text-sm font-medium leading-6 text-[#7A7287] sm:text-[15px]">
                  คำอธิบายชุดข้อสอบ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF8FF] text-[#7A7287] ring-1 ring-[#E7DDF8] transition-colors hover:bg-[#F4EFFF] hover:text-[#7C5BD9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9]"
                aria-label="ปิดหน้าต่างคำอธิบายชุดข้อสอบ"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-line break-words rounded-xl bg-[#FAF8FF] p-4 text-sm font-normal leading-7 text-[#514667] ring-1 ring-[#EFE8FB]">
                {text}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
