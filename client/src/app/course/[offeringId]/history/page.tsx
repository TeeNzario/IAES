"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/NavBar";
import CourseTabs from "@/components/course/CourseTabs";
import { apiFetch } from "@/lib/api";
import { CourseOffering } from "@/types/course";
import { AuthUser } from "@/types/auth";
import { ExamAttemptSummary } from "@/types/examAttempt";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Eye,
  FileClock,
  Loader2,
  UsersRound,
} from "lucide-react";
import {
  getEnglishCourseName,
  getThaiCourseName,
} from "@/utils/formatCourseName";

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

interface HistoryRow {
  exam: ExamListItem;
  summary?: ExamAttemptSummary;
}

type AttemptStatus = NonNullable<ExamListItem["attempt"]>["status"];

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

function attemptLabel(status: AttemptStatus | undefined) {
  if (status === "SUBMITTED") return "ส่งคำตอบแล้ว";
  if (status === "IN_PROGRESS") return "หมดเวลาสอบ";
  if (status === "CANCELLED") return "ยกเลิก";
  return "ไม่ได้เข้าสอบ";
}

export default function CourseExamHistoryPage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [course, setCourse] = useState<CourseOffering | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!offeringId) return;
    let isMounted = true;

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const [freshUser, courseData, exams] = await Promise.all([
          apiFetch<AuthUser>("/auth/me").catch(() => null),
          apiFetch<CourseOffering>(`course-offerings/${offeringId}`),
          apiFetch<ExamListItem[]>(`/course-offerings/${offeringId}/exams`),
        ]);

        const resolvedUserType = getUserType(freshUser);
        const resolvedStaffRole = getStaffRole(freshUser);
        const canLoadSummary =
          resolvedUserType === "STAFF" &&
          (resolvedStaffRole === "INSTRUCTOR" || resolvedStaffRole === "ADMIN");
        const endedExams = exams
          .filter((exam) => exam.status === "ENDED")
          .sort(
            (a, b) =>
              new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
          );
        let summaries: ExamAttemptSummary[] = [];
        if (canLoadSummary && endedExams.length > 0) {
          const examIds = endedExams.map((e) => e.course_exams_id).join(",");
          summaries = await apiFetch<ExamAttemptSummary[]>(
            `/course-offerings/${offeringId}/exams/attempts-summaries?exam_ids=${examIds}`,
          ).catch(() => []);
        }

        const summaryMap = new Map(
          summaries.map((s) => [s.exam.course_exams_id, s]),
        );
        const historyRows = endedExams.map((exam) => ({
          exam,
          summary: summaryMap.get(exam.course_exams_id),
        }));

        if (!isMounted) return;
        setUser(freshUser);
        setCourse(courseData);
        setRows(historyRows);
      } catch {
        if (!isMounted) return;
        setRows([]);
        setError("ไม่สามารถโหลดประวัติการสอบได้");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [offeringId]);

  const userType = getUserType(user);
  const staffRole = getStaffRole(user);
  const isStaffView = useMemo(() => {
    if (userType !== "STAFF") return false;
    if (staffRole === "ADMIN") return true;
    if (!course || !user) return false;
    return (course.course_instructors ?? []).some(
      (ci) => String(ci.staff_users_id) === String(user.id),
    );
  }, [userType, staffRole, course, user]);
  const thaiCourseName = course ? getThaiCourseName(course.courses) : "";
  const englishCourseName = course ? getEnglishCourseName(course.courses) : "";

  const stats = useMemo(() => {
    if (isStaffView) {
      const submitted = rows.reduce(
        (sum, row) => sum + (row.summary?.summary.submitted ?? 0),
        0,
      );
      const started = rows.reduce(
        (sum, row) => sum + (row.summary?.summary.attempts_started ?? 0),
        0,
      );
      const scores = rows
        .map((row) => row.summary?.summary.average_score)
        .filter((score): score is number => typeof score === "number");

      return {
        total: rows.length,
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
    const scores = submittedRows
      .map((row) => scoreNumber(row.exam.attempt?.total_score))
      .filter((score): score is number => typeof score === "number");

    return {
      total: rows.length,
      started: rows.filter((row) => row.exam.attempt).length,
      submitted: submittedRows.length,
      average:
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : null,
    };
  }, [isStaffView, rows]);

  return (
    <Navbar>
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <main className="mx-auto max-w-7xl">
          <CourseTabs offeringId={offeringId} active="history" />

          <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-[#7455C9]">
                  ประวัติการสอบ
                </p>
                <h1 className="mt-2 text-2xl font-semibold leading-tight text-[#2F2A3A] sm:text-[28px]">
                  {thaiCourseName || "ประวัติการสอบรายวิชา"}
                </h1>
                {englishCourseName && (
                  <p className="mt-2 text-[15px] font-normal leading-7 text-[#514667]">
                    {englishCourseName}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <StatCard icon={FileClock} label="สอบเสร็จสิ้น" value={stats.total} />
            <StatCard icon={UsersRound} label="เริ่มสอบแล้ว" value={stats.started} />
            <StatCard icon={CheckCircle2} label="ส่งคำตอบแล้ว" value={stats.submitted} />
            <StatCard
              icon={BarChart3}
              label="คะแนนเฉลี่ย"
              value={stats.average == null ? "-" : stats.average.toFixed(2)}
            />
          </section>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[18rem] items-center justify-center rounded-2xl bg-white p-8 text-sm font-medium text-[#7A7287] shadow-sm ring-1 ring-[#E7DDF8]">
              <Loader2 size={18} className="mr-2 animate-spin text-[#7C5BD9]" />
              กำลังโหลดประวัติการสอบ...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7DDF8]">
              <FileClock size={30} className="mx-auto text-[#B7A3E3]" />
              <p className="mt-3 text-sm font-medium text-[#7A7287]">
                ยังไม่มีประวัติการสอบที่สิ้นสุดแล้ว
              </p>
            </div>
          ) : isStaffView ? (
            <StaffHistory rows={rows} />
          ) : (
            <StudentHistory
              rows={rows}
              onOpenExam={(examId) =>
                router.push(`/course/${offeringId}/exam/${examId}`)
              }
            />
          )}
        </main>
      </div>
    </Navbar>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileClock;
  label: string;
  value: number | string;
}) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7455C9]">
        <Icon size={20} />
      </div>
      <p className="mt-4 text-sm font-medium text-[#7A7287]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold leading-none text-[#2F2A3A]">
        {value}
      </p>
    </article>
  );
}

function StaffHistory({ rows }: { rows: HistoryRow[] }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
      <div className="overflow-x-auto">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[minmax(320px,1fr)_150px_130px_130px_150px] bg-[#F7F3FF] px-5 py-4 text-[15px] font-medium text-[#5B4A73] [&>div:nth-child(n+2)]:text-center">
            <div>ชุดข้อสอบ</div>
            <div>ช่วงเวลาสอบ</div>
            <div>เข้าสอบ</div>
            <div>ส่งคำตอบ</div>
            <div>คะแนนเฉลี่ย</div>
          </div>
          <ul className="divide-y divide-[#EFE8FB]">
            {rows.map((row) => (
              <li
                key={row.exam.course_exams_id}
                className="grid grid-cols-[minmax(320px,1fr)_150px_130px_130px_150px] items-center px-5 py-4 text-[15px] font-normal text-[#514667] hover:bg-[#FAF8FF]"
              >
                <div className="min-w-0 pr-5">
                  <p className="line-clamp-2 text-base font-semibold text-[#2F2A3A]">
                    {row.exam.title}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#7A7287]">
                    {row.exam.question_count} ข้อ
                  </p>
                </div>
                <div className="text-center text-sm leading-5">
                  {formatThaiDateTime(row.exam.start_time)}
                  <br />
                  {formatThaiDateTime(row.exam.end_time)}
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
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function StudentHistory({
  rows,
  onOpenExam,
}: {
  rows: HistoryRow[];
  onOpenExam: (examId: string) => void;
}) {
  return (
    <section className="grid gap-4">
      {rows.map((row) => {
        const attempt = row.exam.attempt;
        const score = scoreNumber(attempt?.total_score);

        return (
          <article
            key={row.exam.course_exams_id}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-7 text-[#2F2A3A]">
                  {row.exam.title}
                </h2>
                <p className="mt-2 text-sm font-normal leading-6 text-[#7A7287]">
                  {formatThaiDateTime(row.exam.start_time)} -{" "}
                  {formatThaiDateTime(row.exam.end_time)}
                </p>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-4 lg:w-[620px]">
                <MiniMetric label="สถานะ" value={attemptLabel(attempt?.status)} />
                <MiniMetric
                  label="คะแนน"
                  value={attempt?.can_view_result && score !== null ? score.toFixed(2) : "-"}
                />
                <MiniMetric
                  label="ผลลัพธ์"
                  value={
                    attempt?.can_view_result
                      ? attempt.passed
                        ? "ผ่าน"
                        : "ไม่ผ่าน"
                      : "รอประกาศ"
                  }
                />
                <MiniMetric
                  label="ส่งเมื่อ"
                  value={attempt?.submitted_at ? formatThaiDateTime(attempt.submitted_at) : "-"}
                />
              </div>
            </div>

            {attempt && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenExam(row.exam.course_exams_id)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-4 text-sm font-medium text-white transition-colors hover:bg-[#A48FD6]"
                >
                  <Eye size={16} />
                  ดูรายละเอียด
                </button>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#EFE8FB]">
      <p className="text-sm font-medium text-[#7A7287]">{label}</p>
      <p className="mt-1 break-words text-[15px] font-semibold leading-5 text-[#2F2A3A]">{value}</p>
    </div>
  );
}
