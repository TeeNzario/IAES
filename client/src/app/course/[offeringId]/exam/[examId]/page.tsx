"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock3,
  FileText,
  ListChecks,
  Loader2,
  Send,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { apiFetch } from "@/lib/api";
import { ExamAttemptState } from "@/types/examAttempt";

function formatSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

function formatThaiDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function scoreNumber(value: string | number | null) {
  if (value == null) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export default function ExamAttemptPage() {
  const router = useRouter();
  const { offeringId, examId } = useParams<{
    offeringId: string;
    examId: string;
  }>();

  const [attempt, setAttempt] = useState<ExamAttemptState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const attemptRef = useRef<ExamAttemptState | null>(null);
  const lastSavedChoiceRef = useRef<string | null>(null);
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  const currentItem = attempt?.current_item ?? null;
  const score = scoreNumber(attempt?.total_score ?? null);

  const sendEvent = useCallback(
    (eventType: string, metadata?: Record<string, unknown>) => {
      const currentAttempt = attemptRef.current;
      if (!currentAttempt || !offeringId || !examId) return;

      apiFetch(`/course-offerings/${offeringId}/exams/${examId}/attempt/events`, {
        method: "POST",
        data: {
          event_type: eventType,
          question_id: currentAttempt.current_item?.question_id,
          attempt_items_id: currentAttempt.current_item?.attempt_items_id,
          metadata: metadata ?? {},
        },
      }).catch(() => {});
    },
    [examId, offeringId],
  );

  const loadAttempt = useCallback(async () => {
    if (!offeringId || !examId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ExamAttemptState>(
        `/course-offerings/${offeringId}/exams/${examId}/attempt/start`,
        { method: "POST" },
      );
      setAttempt(data);
      setRemainingSeconds(data.progress.remaining_seconds);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? "ไม่สามารถเริ่มการสอบได้";
      setError(Array.isArray(message) ? message.join("; ") : message);
    } finally {
      setLoading(false);
    }
  }, [examId, offeringId]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  useEffect(() => {
    const nextSelected = currentItem?.selected_choice_id ?? null;
    setSelectedChoiceId(nextSelected);
    lastSavedChoiceRef.current = nextSelected;
  }, [currentItem?.attempt_items_id, currentItem?.selected_choice_id]);

  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;
    setRemainingSeconds(attempt.progress.remaining_seconds);
  }, [attempt]);

  const submitAttempt = useCallback(
    async (auto = false) => {
      if (!offeringId || !examId || submitting) return;
      setSubmitting(true);
      setError(null);
      sendEvent(auto ? "auto_submit" : "submit_click", {
        answered_count: attemptRef.current?.progress.answered_count ?? 0,
      });
      try {
        const data = await apiFetch<ExamAttemptState>(
          `/course-offerings/${offeringId}/exams/${examId}/attempt/submit`,
          { method: "POST" },
        );
        setAttempt(data);
        setConfirmSubmitOpen(false);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string | string[] } } })
            ?.response?.data?.message ?? "ส่งข้อสอบไม่สำเร็จ";
        setError(Array.isArray(message) ? message.join("; ") : message);
      } finally {
        setSubmitting(false);
      }
    },
    [examId, offeringId, sendEvent, submitting],
  );

  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            submitAttempt(true);
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [attempt?.status, submitAttempt]);

  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;
    const heartbeat = window.setInterval(() => {
      sendEvent("heartbeat", {
        remaining_seconds: remainingSeconds,
        answered_count: attemptRef.current?.progress.answered_count ?? 0,
      });
    }, 30000);

    return () => window.clearInterval(heartbeat);
  }, [attempt?.status, remainingSeconds, sendEvent]);

  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;

    const onVisibilityChange = () => {
      sendEvent(document.hidden ? "visibility_hidden" : "visibility_visible");
    };
    const onBlur = () => sendEvent("window_blur");
    const onFocus = () => sendEvent("window_focus");
    const onCopy = () => sendEvent("copy");
    const onPaste = () => sendEvent("paste");
    const onFullscreen = () => {
      if (!document.fullscreenElement) sendEvent("fullscreen_exit");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [attempt?.status, sendEvent]);

  useEffect(() => {
    if (!currentItem) return;
    sendEvent("question_view", {
      sequence_index: currentItem.sequence_index,
    });
  }, [currentItem?.attempt_items_id, currentItem?.sequence_index, sendEvent]);

  useEffect(() => {
    if (
      !attempt ||
      attempt.status !== "IN_PROGRESS" ||
      !currentItem ||
      !selectedChoiceId ||
      selectedChoiceId === lastSavedChoiceRef.current
    ) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSavingAnswer(true);
      setError(null);
      try {
        const data = await apiFetch<ExamAttemptState>(
          `/course-offerings/${offeringId}/exams/${examId}/attempt/items/${currentItem.attempt_items_id}/answer`,
          {
            method: "PATCH",
            data: { selected_choice_id: selectedChoiceId },
          },
        );
        lastSavedChoiceRef.current = selectedChoiceId;
        setAttempt(data);
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string | string[] } } })
            ?.response?.data?.message ?? "บันทึกคำตอบไม่สำเร็จ";
        setError(Array.isArray(message) ? message.join("; ") : message);
      } finally {
        setSavingAnswer(false);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [
    attempt,
    currentItem,
    examId,
    offeringId,
    selectedChoiceId,
  ]);

  const progressPercent = useMemo(() => {
    if (!attempt || attempt.progress.total_questions === 0) return 0;
    return Math.round(
      (attempt.progress.answered_count / attempt.progress.total_questions) * 100,
    );
  }, [attempt]);

  return (
    <NavBar>
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/course/${offeringId}`)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#514667] transition-colors hover:bg-[#FAF8FF] hover:text-[#7C5BD9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9]"
                  aria-label="กลับไปรายวิชา"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#7C5BD9]">
                    Online Examination
                  </p>
                  <h1 className="mt-1 line-clamp-2 text-xl font-semibold leading-8 text-[#2F2A3A] sm:text-2xl">
                    {attempt?.exam.title ?? "กำลังเตรียมข้อสอบ"}
                  </h1>
                  {attempt?.exam.description && (
                    <p className="mt-1 line-clamp-2 text-sm font-normal leading-6 text-[#7A7287]">
                      {attempt.exam.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[420px]">
                <div className="rounded-xl bg-[#FAF8FF] px-4 py-3 ring-1 ring-[#EFE8FB]">
                  <p className="text-[13px] font-semibold text-[#7A7287]">
                    เวลาเหลือ
                  </p>
                  <p className="mt-1 text-xl font-semibold leading-none text-[#2F2A3A]">
                    {formatSeconds(remainingSeconds)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#FAF8FF] px-4 py-3 ring-1 ring-[#EFE8FB]">
                  <p className="text-[13px] font-semibold text-[#7A7287]">
                    ทำแล้ว
                  </p>
                  <p className="mt-1 text-xl font-semibold leading-none text-[#2F2A3A]">
                    {attempt
                      ? `${attempt.progress.answered_count}/${attempt.progress.total_questions}`
                      : "-"}
                  </p>
                </div>
                <div className="col-span-2 rounded-xl bg-[#FAF8FF] px-4 py-3 ring-1 ring-[#EFE8FB] sm:col-span-1">
                  <p className="text-[13px] font-semibold text-[#7A7287]">
                    สถานะ
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#7C5BD9]">
                    {attempt?.status === "SUBMITTED" ? "ส่งแล้ว" : "กำลังสอบ"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[20rem] items-center justify-center rounded-2xl bg-white p-8 text-sm font-medium text-[#7A7287] shadow-sm ring-1 ring-[#E7DDF8]">
              <Loader2 size={18} className="mr-2 animate-spin text-[#7C5BD9]" />
              กำลังโหลดข้อสอบ...
            </div>
          ) : !attempt ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7DDF8]">
              <ShieldAlert size={32} className="mx-auto text-rose-500" />
              <p className="mt-3 text-sm font-semibold text-[#2F2A3A]">
                ไม่พบข้อมูลการสอบ
              </p>
            </div>
          ) : attempt.status === "SUBMITTED" ? (
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                    <Trophy size={24} />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-[#2F2A3A]">
                    ส่งข้อสอบเรียบร้อย
                  </h2>
                  <p className="mt-2 text-sm font-normal leading-6 text-[#7A7287]">
                    ส่งเมื่อ {attempt.submitted_at ? formatThaiDateTime(attempt.submitted_at) : "-"}
                  </p>
                </div>

                {attempt.can_view_result && score !== null ? (
                  <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-[520px]">
                    <div className="rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB]">
                      <p className="text-sm font-semibold text-[#7A7287]">
                        คะแนน
                      </p>
                      <p className="mt-1 text-3xl font-semibold text-[#2F2A3A]">
                        {score.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB]">
                      <p className="text-sm font-semibold text-[#7A7287]">
                        ผลลัพธ์
                      </p>
                      <p
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                          attempt.passed
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                        }`}
                      >
                        {attempt.passed ? "ผ่าน" : "ไม่ผ่าน"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB]">
                      <p className="text-sm font-semibold text-[#7A7287]">
                        เวลาที่ใช้
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-[#2F2A3A]">
                        {formatSeconds(attempt.time_per_exam ?? 0)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-xl bg-[#FAF8FF] p-4 text-sm font-medium leading-6 text-[#7A7287] ring-1 ring-[#EFE8FB] lg:w-[520px]">
                    ผลสอบจะเปิดให้ดูหลังสิ้นสุดช่วงเวลาสอบ
                  </div>
                )}
              </div>
            </section>
          ) : (
            <>
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-[#2F2A3A]">
                      <ListChecks size={18} className="text-[#7C5BD9]" />
                      ความคืบหน้า
                    </h2>
                    <p className="mt-1 text-sm font-normal text-[#7A7287]">
                      ระบบจะบันทึกคำตอบอัตโนมัติหลังเลือกตัวเลือก
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmSubmitOpen(true)}
                    disabled={submitting || attempt.progress.answered_count === 0}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={16} />
                    ส่งข้อสอบ
                  </button>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[#F4EFFF] ring-1 ring-[#E7DDF8]">
                  <div
                    className="h-full rounded-full bg-[#9C7AE6] transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </section>

              {currentItem ? (
                <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE8FB] pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4EFFF] text-base font-semibold text-[#7C5BD9]">
                        {attempt.progress.answered_count + 1}
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-[#7A7287]">
                          ข้อที่กำลังทำ
                        </p>
                        <p className="text-sm font-semibold text-[#7C5BD9]">
                          Adaptive level {attempt.total_level.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#FAF8FF] px-3 py-2 text-sm font-semibold text-[#514667] ring-1 ring-[#EFE8FB]">
                      <Clock3 size={15} className="text-[#7C5BD9]" />
                      {savingAnswer ? "กำลังบันทึก..." : "บันทึกอัตโนมัติ"}
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB]">
                    <p className="whitespace-pre-line break-words text-base font-semibold leading-8 text-[#2F2A3A]">
                      {currentItem.question.question_text}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {currentItem.question.choices.map((choice, index) => {
                      const checked = selectedChoiceId === choice.choice_id;
                      return (
                        <button
                          key={choice.choice_id}
                          type="button"
                          onClick={() => {
                            setSelectedChoiceId(choice.choice_id);
                            sendEvent("choice_select", {
                              choice_id: choice.choice_id,
                            });
                          }}
                          className={`flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9] ${
                            checked
                              ? "bg-[#F4EFFF] text-[#2F2A3A] ring-[#B7A3E3]"
                              : "bg-white text-[#514667] ring-[#E7DDF8] hover:bg-[#FAF8FF]"
                          }`}
                        >
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                            {checked ? (
                              <CheckCircle2 size={17} />
                            ) : (
                              <Circle size={16} />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-semibold leading-6 sm:text-[15px]">
                            <span className="mr-2 text-[#7C5BD9]">
                              {index + 1}.
                            </span>
                            {choice.choice_text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7DDF8]">
                  <FileText size={30} className="mx-auto text-[#7C5BD9]" />
                  <h2 className="mt-3 text-lg font-semibold text-[#2F2A3A]">
                    ทำครบทุกข้อแล้ว
                  </h2>
                  <p className="mt-2 text-sm font-normal text-[#7A7287]">
                    ตรวจสอบความคืบหน้าแล้วกดส่งข้อสอบเพื่อจบการสอบ
                  </p>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <ConfirmModal
        isOpen={confirmSubmitOpen}
        onClose={() => {
          if (!submitting) setConfirmSubmitOpen(false);
        }}
        onConfirm={() => submitAttempt(false)}
        title="ส่งข้อสอบ"
        message="เมื่่อส่งข้อสอบแล้วจะไม่สามารถแก้ไขคำตอบได้"
        confirmText="ส่งข้อสอบ"
        cancelText="กลับไปทำต่อ"
        isLoading={submitting}
        variant="warning"
      />
    </NavBar>
  );
}
