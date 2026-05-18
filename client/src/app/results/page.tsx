"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/layout/NavBar";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { apiFetch } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { formatCourseName } from "@/utils/formatCourseName";
import { CourseOffering } from "@/types/course";
import type { AuthUser } from "@/types/auth";
import { ExamAttemptSummary } from "@/types/examAttempt";
import {
  AlertCircle,
  BarChart3,
  BookOpenCheck,
  Clock3,
  Home,
  LineChart,
  ListChecks,
  Loader2,
  Trophy,
} from "lucide-react";

interface ExamListItem {
  course_exams_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  question_count: number;
  status: "UPCOMING" | "ONGOING" | "ENDED";
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

interface ResultRow {
  offeringId: string;
  courseName: string;
  exam: ExamListItem;
  summary?: ExamAttemptSummary;
}

function getUserType(user: AuthUser | null) {
  return String(user?.type ?? user?.userType ?? "").toUpperCase();
}

function getStaffRole(user: AuthUser | null) {
  return String(user?.staff_role ?? user?.role ?? "").toUpperCase();
}

function scoreNumber(value: string | number | null | undefined) {
  if (value == null) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatThaiDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const statusLabel: Record<ExamListItem["status"], string> = {
  UPCOMING: "ยังไม่เริ่ม",
  ONGOING: "กำลังสอบ",
  ENDED: "เสร็จสิ้น",
};

export default function ResultsPage() {
  const homeRoute = useHomeRoute();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userReady, setUserReady] = useState(false);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userType = getUserType(user);
  const staffRole = getStaffRole(user);
  const isStaffReport =
    userType === "STAFF" && (staffRole === "INSTRUCTOR" || staffRole === "ADMIN");

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [freshUser, courses] = await Promise.all([
        apiFetch<AuthUser>("/auth/me").catch(() => null),
        apiFetch<CourseOffering[]>("/course-offerings"),
      ]);
      if (freshUser) setUser(freshUser);
      const resolvedUser = freshUser ?? getUser<AuthUser>();
      const resolvedUserType = getUserType(resolvedUser);
      const resolvedStaffRole = getStaffRole(resolvedUser);
      const shouldLoadStaffSummary =
        resolvedUserType === "STAFF" &&
        (resolvedStaffRole === "INSTRUCTOR" || resolvedStaffRole === "ADMIN");

      const resultRows = await Promise.all(
        courses.map(async (course) => {
          const offeringId = String(course.course_offerings_id);
          const exams = await apiFetch<ExamListItem[]>(
            `/course-offerings/${offeringId}/exams${
              shouldLoadStaffSummary ? "?draft=true" : ""
            }`,
          ).catch(() => []);
          const courseRows = await Promise.all(
            exams.map(async (exam) => {
              const summary = shouldLoadStaffSummary
                ? await apiFetch<ExamAttemptSummary>(
                    `/course-offerings/${offeringId}/exams/${exam.course_exams_id}/attempts/summary`,
                  ).catch(() => undefined)
                : undefined;
              return {
                offeringId,
                courseName: formatCourseName(course.courses),
                exam,
                summary,
              };
            }),
          );
          return courseRows;
        }),
      );

      setRows(resultRows.flat());
    } catch {
      setRows([]);
      setError("ไม่สามารถโหลดรายงานผลสอบได้");
    } finally {
      setLoading(false);
      setUserReady(true);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const stats = useMemo(() => {
    if (isStaffReport) {
      const summaries = rows.map((row) => row.summary).filter(Boolean);
      const submitted = summaries.reduce(
        (sum, summary) => sum + (summary?.summary.submitted ?? 0),
        0,
      );
      const started = summaries.reduce(
        (sum, summary) => sum + (summary?.summary.attempts_started ?? 0),
        0,
      );
      const scores = summaries
        .map((summary) => summary?.summary.average_score)
        .filter((score): score is number => typeof score === "number");
      return {
        totalExams: rows.length,
        started,
        submitted,
        average:
          scores.length > 0
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : null,
      };
    }

    const submittedRows = rows.filter(
      (row) => row.exam.attempt?.status === "SUBMITTED",
    );
    const viewableRows = submittedRows.filter(
      (row) => row.exam.attempt?.can_view_result,
    );
    const scores = viewableRows
      .map((row) => scoreNumber(row.exam.attempt?.total_score))
      .filter((score): score is number => typeof score === "number");
    return {
      totalExams: rows.length,
      started: rows.filter((row) => row.exam.attempt).length,
      submitted: submittedRows.length,
      average:
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : null,
    };
  }, [isStaffReport, rows]);

  return (
    <NavBar>
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9] sm:h-14 sm:w-14">
                  <BarChart3 size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#7C5BD9]">
                    ผลสรุปการสอบ
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold leading-tight text-[#2F2A3A] sm:text-3xl">
                    {!userReady
                      ? "ผลสรุปการสอบ"
                      : isStaffReport
                        ? "รายงานภาพรวมการสอบ"
                        : "ผลสอบของฉัน"}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm font-normal leading-6 text-[#7A7287] sm:text-base sm:leading-7">
                    {!userReady
                      ? "กำลังโหลด..."
                      : isStaffReport
                        ? "ติดตามจำนวนผู้เข้าสอบ คะแนนเฉลี่ย และพฤติกรรมระหว่างสอบของแต่ละชุดข้อสอบ"
                        : "ดูสถานะการเข้าสอบและผลคะแนนที่เปิดให้ดูแล้วในรายวิชาของคุณ"}
                  </p>
                </div>
              </div>

              <Link
                href={homeRoute.href}
                className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9] sm:text-base"
              >
                <Home size={18} />
                {homeRoute.label}
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <StatCard icon={BookOpenCheck} label="ชุดสอบ" value={stats.totalExams} />
            <StatCard icon={Clock3} label="เริ่มสอบแล้ว" value={stats.started} />
            <StatCard icon={ListChecks} label="ส่งแล้ว" value={stats.submitted} />
            <StatCard
              icon={LineChart}
              label="คะแนนเฉลี่ย"
              value={stats.average == null ? "-" : stats.average.toFixed(2)}
            />
          </section>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[18rem] items-center justify-center rounded-2xl bg-white p-8 text-sm font-medium text-[#7A7287] shadow-sm ring-1 ring-[#E7DDF8]">
              <Loader2 size={18} className="mr-2 animate-spin text-[#7C5BD9]" />
              กำลังโหลดรายงาน...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7DDF8]">
              <Trophy size={30} className="mx-auto text-[#B7A3E3]" />
              <p className="mt-3 text-sm font-medium text-[#7A7287]">
                ยังไม่มีข้อมูลผลสอบ
              </p>
            </div>
          ) : isStaffReport ? (
            <StaffResults rows={rows} />
          ) : (
            <StudentResults rows={rows} />
          )}
        </main>
      </div>
    </NavBar>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number | string;
}) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8]">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
        <Icon size={22} />
      </div>
      <p className="mt-4 text-sm font-semibold text-[#7A7287]">{label}</p>
      <p className="mt-1 text-2xl font-semibold leading-none text-[#2F2A3A]">
        {value}
      </p>
    </article>
  );
}

function StaffResults({ rows }: { rows: ResultRow[] }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
      <div className="overflow-x-auto">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[minmax(300px,1fr)_130px_130px_130px_150px] bg-[#B7A3E3] px-5 py-4 text-sm font-semibold text-white [&>div:nth-child(n+2)]:text-center">
            <div>ชุดข้อสอบ</div>
            <div>เข้าสอบ</div>
            <div>ส่งแล้ว</div>
            <div>คะแนนเฉลี่ย</div>
            <div>พฤติกรรม</div>
          </div>
          <ul className="divide-y divide-[#EFE8FB]">
            {rows.map((row) => (
              <li
                key={`${row.offeringId}-${row.exam.course_exams_id}`}
                className="grid grid-cols-[minmax(300px,1fr)_130px_130px_130px_150px] items-center px-5 py-4 text-sm font-medium text-[#514667] hover:bg-[#FAF8FF]"
              >
                <div className="min-w-0 pr-5">
                  <p className="line-clamp-2 text-base font-semibold text-[#2F2A3A]">
                    {row.exam.title}
                  </p>
                  <p className="mt-1 truncate text-[13px] font-medium text-[#7A7287]">
                    {row.courseName}
                  </p>
                </div>
                <div className="text-center">
                  {row.summary?.summary.attempts_started ?? 0}/
                  {row.summary?.summary.total_enrolled ?? 0}
                </div>
                <div className="text-center">
                  {row.summary?.summary.submitted ?? 0}
                </div>
                <div className="text-center">
                  {row.summary?.summary.average_score == null
                    ? "-"
                    : row.summary.summary.average_score.toFixed(2)}
                </div>
                <div className="text-center">
                  {row.summary?.summary.behavior_events ?? 0} events
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function StudentResults({ rows }: { rows: ResultRow[] }) {
  return (
    <section className="grid gap-4">
      {rows.map((row) => {
        const attempt = row.exam.attempt;
        const score = scoreNumber(attempt?.total_score);
        return (
          <article
            key={`${row.offeringId}-${row.exam.course_exams_id}`}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#7C5BD9]">
                  {row.courseName}
                </p>
                <h2 className="mt-1 text-lg font-semibold leading-7 text-[#2F2A3A]">
                  {row.exam.title}
                </h2>
                <p className="mt-2 text-sm font-normal leading-6 text-[#7A7287]">
                  {formatThaiDateTime(row.exam.start_time)} -{" "}
                  {formatThaiDateTime(row.exam.end_time)}
                </p>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-[460px]">
                <div className="rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#EFE8FB]">
                  <p className="text-[13px] font-semibold text-[#7A7287]">
                    สถานะสอบ
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#2F2A3A]">
                    {attempt
                      ? attempt.status === "SUBMITTED"
                        ? "ส่งแล้ว"
                        : "กำลังสอบ"
                      : statusLabel[row.exam.status]}
                  </p>
                </div>
                <div className="rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#EFE8FB]">
                  <p className="text-[13px] font-semibold text-[#7A7287]">
                    คะแนน
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#2F2A3A]">
                    {score == null ? "-" : score.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#EFE8FB]">
                  <p className="text-[13px] font-semibold text-[#7A7287]">
                    ผลลัพธ์
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#7C5BD9]">
                    {attempt?.can_view_result
                      ? attempt.passed
                        ? "ผ่าน"
                        : "ไม่ผ่าน"
                      : "รอประกาศ"}
                  </p>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
