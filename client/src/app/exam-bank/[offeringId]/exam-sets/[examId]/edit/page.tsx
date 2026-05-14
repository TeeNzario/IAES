"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import ExamEditor, {
  ExamConfigDraft,
  ExamSubmitPayload,
  isoToLocalInput,
} from "@/components/exam/ExamEditor";
import type { Question } from "@/components/questionBank/types";

interface ExamDetail {
  course_exams_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: "UPCOMING" | "ONGOING" | "ENDED";
  questions: (Question & { sequence_index: number })[];
}

export default function EditExamSetPage() {
  const router = useRouter();
  const { offeringId, examId } = useParams<{
    offeringId: string;
    examId: string;
  }>();

  const [initialConfig, setInitialConfig] = useState<ExamConfigDraft | null>(
    null,
  );
  const [initialQuestions, setInitialQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExam = useCallback(async () => {
    if (!offeringId || !examId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ExamDetail>(
        `/course-offerings/${offeringId}/exams/${examId}`,
      );
      const startLocal = isoToLocalInput(data.start_time);
      const endLocal = isoToLocalInput(data.end_time);
      if (!startLocal || !endLocal) {
        throw new Error("ข้อมูลวันที่เริ่ม/สิ้นสุดของชุดข้อสอบไม่ถูกต้อง");
      }
      setInitialConfig({
        title: data.title,
        description: data.description ?? "",
        start_time: startLocal,
        end_time: endLocal,
      });
      setInitialQuestions(data.questions);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "โหลดข้อมูลข้อสอบไม่สำเร็จ";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [offeringId, examId]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  const handleSubmit = async (payload: ExamSubmitPayload) => {
    await apiFetch(`/course-offerings/${offeringId}/exams/${examId}`, {
      method: "PATCH",
      data: payload,
    });
    router.push(`/exam-bank/${offeringId}/exam-sets`);
  };

  const handleDelete = async () => {
    await apiFetch(`/course-offerings/${offeringId}/exams/${examId}`, {
      method: "DELETE",
    });
    router.push(`/exam-bank/${offeringId}/exam-sets`);
  };

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        {loading ? (
          <div className="flex items-center justify-center px-6 py-20">
            <p className="text-sm font-medium text-[#7A7287]">กำลังโหลด...</p>
          </div>
        ) : error ? (
          <div className="mx-auto mt-20 flex max-w-md flex-col items-center gap-4 rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-[#E7DDF8]">
            <p className="text-sm font-medium text-red-500">{error}</p>
            <button
              type="button"
              onClick={loadExam}
              className="inline-flex items-center gap-2 rounded-xl bg-[#B7A3E3] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] cursor-pointer"
            >
              <RefreshCw size={16} />
              ลองใหม่
            </button>
          </div>
        ) : initialConfig ? (
          <ExamEditor
            offeringId={offeringId}
            mode="edit"
            hideSchedule
            backHref={`/exam-bank/${offeringId}/exam-sets`}
            initialConfig={initialConfig}
            initialQuestions={initialQuestions}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
          />
        ) : null}
      </div>
    </Navbar>
  );
}
