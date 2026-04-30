"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronLeft,
  ClipboardList,
  Grid3x3,
  List,
  Plus,
  Search,
} from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";

interface ExamListItem {
  course_exams_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  question_count: number;
  status: "UPCOMING" | "ONGOING" | "ENDED";
}

interface QuestionRef {
  question_id: string;
  sequence_index: number;
}

interface ExamDetail extends ExamListItem {
  questions: QuestionRef[];
}

type StatusFilter = "ALL" | ExamListItem["status"];
type SortKey = "newest" | "oldest" | "title" | "questions";
type ViewMode = "grid" | "list";

const PICKER_PAGE_SIZE = 9;

const statusLabel: Record<ExamListItem["status"], string> = {
  UPCOMING: "ยังไม่เริ่ม",
  ONGOING: "กำลังสอบ",
  ENDED: "เสร็จสิ้น",
};

const statusClass = (s: ExamListItem["status"]) =>
  s === "UPCOMING"
    ? "bg-amber-100 text-amber-700"
    : s === "ONGOING"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-gray-200 text-gray-500";

const localToIso = (local: string) => new Date(local).toISOString();

const todayDateString = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Workflow: รายวิชา → สร้างการสอบ → เลือกชุดข้อสอบ → ตั้งเวลาเปิดสอบ.
 * This page is intentionally NOT the same as creating an exam set
 * (which lives under /exam-bank). Here the instructor only schedules
 * an existing set by patching its start/end times.
 */
export default function CreateExamSchedulePage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [pickerView, setPickerView] = useState<ViewMode>("grid");
  const [pickerPage, setPickerPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("11:00");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!offeringId) return;
    apiFetch<ExamListItem[]>(`/course-offerings/${offeringId}/exams`)
      .then(setExams)
      .catch(() => setExams([]))
      .finally(() => setLoadingList(false));
  }, [offeringId]);

  useEffect(() => setPickerPage(1), [search, statusFilter, sortKey]);

  const examCounts = useMemo(() => {
    const c = { ALL: exams.length, UPCOMING: 0, ONGOING: 0, ENDED: 0 };
    for (const e of exams) c[e.status] += 1;
    return c;
  }, [exams]);

  const processedExams = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = exams.filter(
      (e) =>
        (statusFilter === "ALL" || e.status === statusFilter) &&
        (!q ||
          e.title.toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q)),
    );
    arr = [...arr].sort((a, b) => {
      switch (sortKey) {
        case "newest":
          return (
            new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
          );
        case "oldest":
          return (
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );
        case "title":
          return a.title.localeCompare(b.title, "th");
        case "questions":
          return b.question_count - a.question_count;
      }
    });
    return arr;
  }, [exams, search, statusFilter, sortKey]);

  const pickerTotalPages = Math.max(
    1,
    Math.ceil(processedExams.length / PICKER_PAGE_SIZE),
  );
  const pickerItems = processedExams.slice(
    (pickerPage - 1) * PICKER_PAGE_SIZE,
    pickerPage * PICKER_PAGE_SIZE,
  );

  const filtered = processedExams;

  const errors = useMemo(() => {
    const out: {
      exam?: string;
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
    } = {};
    if (!selectedId) out.exam = "กรุณาเลือกชุดข้อสอบ";
    if (!startDate) out.startDate = "กรุณาเลือกวันเปิดสอบ";
    if (!startTime) out.startTime = "กรุณาเลือกเวลาเปิดสอบ";
    if (!endDate) out.endDate = "กรุณาเลือกวันปิดสอบ";
    if (!endTime) out.endTime = "กรุณาเลือกเวลาปิดสอบ";

    if (startDate && startTime) {
      const start = new Date(`${startDate}T${startTime}`);
      if (Number.isNaN(start.getTime())) {
        out.startDate = "รูปแบบวันที่/เวลาไม่ถูกต้อง";
      } else if (start.getTime() < Date.now() - 60_000) {
        out.startDate = "วันเปิดสอบต้องไม่ใช่เวลาในอดีต";
      }
    }

    if (startDate && startTime && endDate && endTime && !out.startDate) {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      if (Number.isNaN(end.getTime())) {
        out.endDate = "รูปแบบวันที่/เวลาไม่ถูกต้อง";
      } else if (end <= start) {
        out.endDate = "วันปิดสอบต้องอยู่หลังวันเปิดสอบ";
      }
    }
    return out;
  }, [selectedId, startDate, startTime, endDate, endTime]);

  const isValid = Object.keys(errors).length === 0;
  const selected = exams.find((e) => e.course_exams_id === selectedId) ?? null;

  const handleSubmit = async () => {
    if (!isValid || !selectedId) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const detail = await apiFetch<ExamDetail>(
        `/course-offerings/${offeringId}/exams/${selectedId}`,
      );
      await apiFetch(`/course-offerings/${offeringId}/exams/${selectedId}`, {
        method: "PATCH",
        data: {
          title: detail.title,
          description: detail.description ?? "",
          start_time: localToIso(`${startDate}T${startTime}`),
          end_time: localToIso(`${endDate}T${endTime}`),
          question_ids: [...detail.questions]
            .sort((a, b) => a.sequence_index - b.sequence_index)
            .map((q) => q.question_id),
        },
      });
      router.push(`/course/${offeringId}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? "บันทึกไม่สำเร็จ";
      setSubmitError(Array.isArray(msg) ? msg.join("; ") : msg);
    } finally {
      setSaving(false);
    }
  };

  const minDate = todayDateString();

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/course/${offeringId}`)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#575757] hover:bg-white cursor-pointer"
                aria-label="กลับ"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-light text-[#575757]">
                  <CalendarClock size={24} />
                  สร้างการสอบ
                </h1>
                <p className="mt-0.5 text-xs font-light text-gray-500">
                  เลือกชุดข้อสอบที่มีอยู่แล้ว และตั้งวัน-เวลาเปิด/ปิดสอบ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || saving}
              aria-disabled={!isValid || saving}
              title={!isValid ? "กรุณากรอกข้อมูลให้ครบและถูกต้อง" : undefined}
              className={`rounded-md px-6 py-2 text-sm text-white shadow-sm transition-colors ${
                isValid && !saving
                  ? "bg-[#B7A3E3] hover:bg-[#A48FD6] cursor-pointer"
                  : "bg-[#B7A3E3] opacity-50 cursor-not-allowed"
              }`}
            >
              {saving ? "กำลังบันทึก..." : "เปิดการสอบ"}
            </button>
          </div>

          {submitError && (
            <p className="mb-4 flex items-center gap-2 rounded-md bg-rose-100 px-4 py-2 text-sm text-rose-700">
              <AlertCircle size={14} />
              {submitError}
            </p>
          )}

          {/* Step 1 — pick an exam set */}
          <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-medium text-[#575757]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#B7A3E3] text-xs font-medium text-white">
                    1
                  </span>
                  เลือกชุดข้อสอบ
                  <span className="ml-1 rounded-full bg-[#F4EFFF] px-2 py-0.5 text-xs font-medium text-[#7C5BD9]">
                    {exams.length}
                  </span>
                </h2>
                <p className="mt-1 text-xs font-light text-gray-500">
                  เลือกชุดข้อสอบที่สร้างไว้แล้วจากคลังข้อสอบ
                </p>
              </div>
              <Link
                href={`/exam-bank/${offeringId}/exam-sets/create`}
                className="flex items-center gap-1 rounded-full border border-[#B7A3E3] bg-white px-3 py-1.5 text-xs font-light text-[#B7A3E3] hover:bg-[#F4EFFF]"
              >
                <Plus size={12} />
                สร้างชุดข้อสอบใหม่
              </Link>
            </div>

            {/* Picker toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["ALL", "ทั้งหมด"],
                    ["UPCOMING", statusLabel.UPCOMING],
                    ["ONGOING", statusLabel.ONGOING],
                    ["ENDED", statusLabel.ENDED],
                  ] as [StatusFilter, string][]
                ).map(([key, label]) => {
                  const active = statusFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key)}
                      className={`rounded-full px-3 py-1 text-xs cursor-pointer transition-colors ${
                        active
                          ? "bg-[#B7A3E3] text-white"
                          : "bg-[#F4EFFF] text-[#575757] hover:bg-[#E9E0FA]"
                      }`}
                    >
                      {label}
                      <span
                        className={`ml-1.5 ${
                          active ? "opacity-90" : "text-gray-400"
                        }`}
                      >
                        {examCounts[key]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-light text-gray-500">
                  เรียง:
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="rounded-md bg-[#F4EFFF] px-2 py-1 text-xs text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3] cursor-pointer"
                  >
                    <option value="newest">ใหม่สุด</option>
                    <option value="oldest">เก่าสุด</option>
                    <option value="title">ชื่อ A→Z</option>
                    <option value="questions">จำนวนข้อมาก→น้อย</option>
                  </select>
                </label>

                <div className="flex overflow-hidden rounded-md border border-[#E9E0FA]">
                  <button
                    type="button"
                    onClick={() => setPickerView("grid")}
                    className={`flex h-7 w-7 items-center justify-center cursor-pointer ${
                      pickerView === "grid"
                        ? "bg-[#B7A3E3] text-white"
                        : "text-[#575757] hover:bg-[#F4EFFF]"
                    }`}
                    aria-label="มุมมองตาราง"
                    title="มุมมองตาราง"
                  >
                    <Grid3x3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerView("list")}
                    className={`flex h-7 w-7 items-center justify-center cursor-pointer ${
                      pickerView === "list"
                        ? "bg-[#B7A3E3] text-white"
                        : "text-[#575757] hover:bg-[#F4EFFF]"
                    }`}
                    aria-label="มุมมองรายการ"
                    title="มุมมองรายการ"
                  >
                    <List size={14} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชุดข้อสอบ"
                    className="w-56 rounded-full bg-[#F4EFFF] px-4 py-1.5 pr-9 text-sm font-light text-[#575757] placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#B7A3E3]"
                  />
                  <Search
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>
            </div>

            {loadingList ? (
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl bg-[#F4EFFF] p-8 text-center">
                <p className="text-sm font-light text-gray-500">
                  {exams.length === 0
                    ? "ยังไม่มีชุดข้อสอบในรายวิชานี้"
                    : "ไม่พบชุดข้อสอบที่ตรงกับเงื่อนไข"}
                </p>
                {exams.length === 0 && (
                  <Link
                    href={`/exam-bank/${offeringId}/exam-sets/create`}
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#B7A3E3] px-4 py-1.5 text-xs font-light text-white hover:bg-[#A48FD6]"
                  >
                    <Plus size={12} />
                    สร้างชุดข้อสอบแรก
                  </Link>
                )}
              </div>
            ) : pickerView === "grid" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pickerItems.map((e) => {
                  const isSelected = selectedId === e.course_exams_id;
                  return (
                    <button
                      key={e.course_exams_id}
                      type="button"
                      onClick={() =>
                        setSelectedId(isSelected ? null : e.course_exams_id)
                      }
                      className={`relative flex h-full flex-col rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#B7A3E3] bg-[#F4EFFF] shadow-md"
                          : "border-transparent bg-[#FBF8FF] hover:border-[#D9CCF2]"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#B7A3E3] text-white">
                          <Check size={12} />
                        </span>
                      )}
                      <div className="mb-2 flex items-center justify-between">
                        <ClipboardList size={20} className="text-[#B7A3E3]" />
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${statusClass(
                            e.status,
                          )}`}
                        >
                          {statusLabel[e.status]}
                        </span>
                      </div>
                      <h3 className="mb-1 pr-6 font-medium text-[#575757] line-clamp-2">
                        {e.title}
                      </h3>
                      {e.description && (
                        <p className="mb-2 text-xs font-light text-gray-500 line-clamp-2">
                          {e.description}
                        </p>
                      )}
                      <p className="mt-auto text-xs text-gray-400">
                        {e.question_count} ข้อ
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <ul className="divide-y divide-[#F4EFFF] overflow-hidden rounded-xl border border-[#F4EFFF]">
                {pickerItems.map((e) => {
                  const isSelected = selectedId === e.course_exams_id;
                  return (
                    <li key={e.course_exams_id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedId(isSelected ? null : e.course_exams_id)
                        }
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#F4EFFF]"
                            : "bg-white hover:bg-[#FBF8FF]"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            isSelected
                              ? "border-[#B7A3E3] bg-[#B7A3E3] text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#575757]">
                            {e.title}
                          </p>
                          {e.description && (
                            <p className="truncate text-xs font-light text-gray-500">
                              {e.description}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-gray-400">
                          {e.question_count} ข้อ
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${statusClass(
                            e.status,
                          )}`}
                        >
                          {statusLabel[e.status]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Picker pagination */}
            {filtered.length > 0 && pickerTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs font-light text-[#575757]">
                <span>
                  แสดง {(pickerPage - 1) * PICKER_PAGE_SIZE + 1}–
                  {Math.min(pickerPage * PICKER_PAGE_SIZE, filtered.length)} จาก{" "}
                  {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setPickerPage((p) => Math.max(1, p - 1))
                    }
                    disabled={pickerPage === 1}
                    className="rounded-md bg-[#F4EFFF] px-3 py-1 disabled:opacity-40 hover:bg-[#E9E0FA] cursor-pointer"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="px-2">
                    {pickerPage} / {pickerTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPickerPage((p) => Math.min(pickerTotalPages, p + 1))
                    }
                    disabled={pickerPage === pickerTotalPages}
                    className="rounded-md bg-[#F4EFFF] px-3 py-1 disabled:opacity-40 hover:bg-[#E9E0FA] cursor-pointer"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}

            {errors.exam && (
              <p className="mt-3 flex items-center gap-1 text-xs text-rose-500">
                <AlertCircle size={12} />
                {errors.exam}
              </p>
            )}
          </section>

          {/* Step 2 — schedule */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="flex items-center gap-2 text-base font-medium text-[#575757]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#B7A3E3] text-xs font-medium text-white">
                  2
                </span>
                ตั้งเวลาเปิด-ปิดสอบ
              </h2>
              <p className="mt-1 text-xs font-light text-gray-500">
                กำหนดช่วงเวลาที่นักศึกษาสามารถเข้าทำข้อสอบได้
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Open */}
              <div className="rounded-xl bg-[#FBF8FF] p-5">
                <h3 className="mb-3 text-sm font-medium text-[#7C5BD9]">
                  เปิดสอบ
                </h3>
                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-light text-[#575757]">
                    วันเปิดสอบ
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    min={minDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full rounded-md bg-white px-3 py-2 text-sm font-light text-[#575757] outline-none focus:ring-2 ${
                      errors.startDate
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {errors.startDate && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                      <AlertCircle size={11} />
                      {errors.startDate}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-light text-[#575757]">
                    เวลาเปิดสอบ
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`w-full rounded-md bg-white px-3 py-2 text-sm font-light text-[#575757] outline-none focus:ring-2 ${
                      errors.startTime
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {errors.startTime && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                      <AlertCircle size={11} />
                      {errors.startTime}
                    </p>
                  )}
                </label>
              </div>

              {/* Close */}
              <div className="rounded-xl bg-[#FBF8FF] p-5">
                <h3 className="mb-3 text-sm font-medium text-[#7C5BD9]">
                  ปิดสอบ
                </h3>
                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-light text-[#575757]">
                    วันปิดสอบ
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || minDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full rounded-md bg-white px-3 py-2 text-sm font-light text-[#575757] outline-none focus:ring-2 ${
                      errors.endDate
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {errors.endDate && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                      <AlertCircle size={11} />
                      {errors.endDate}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-light text-[#575757]">
                    เวลาปิดสอบ
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`w-full rounded-md bg-white px-3 py-2 text-sm font-light text-[#575757] outline-none focus:ring-2 ${
                      errors.endTime
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {errors.endTime && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                      <AlertCircle size={11} />
                      {errors.endTime}
                    </p>
                  )}
                </label>
              </div>
            </div>

            {/* Summary */}
            {selected && isValid && (
              <div className="mt-5 rounded-xl border border-[#D9CCF2] bg-[#F4EFFF] p-4">
                <p className="text-xs font-medium text-[#7C5BD9]">
                  สรุปการเปิดสอบ
                </p>
                <p className="mt-1 text-sm font-medium text-[#575757]">
                  {selected.title}
                </p>
                <p className="mt-1 text-xs font-light text-[#575757]">
                  เปิดสอบ {startDate} เวลา {startTime} น. → ปิดสอบ {endDate}{" "}
                  เวลา {endTime} น.
                </p>
                <p className="mt-1 text-xs font-light text-gray-500">
                  จำนวนข้อ {selected.question_count} ข้อ
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </Navbar>
  );
}
