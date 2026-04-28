"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import ExamEditor, {
  ExamConfigDraft,
  ExamSubmitPayload,
  isoToLocalInput,
} from "@/components/exam/ExamEditor";
import type { Question } from "@/components/questionBank/types";

/**
 * Server response for GET /course-offerings/:offeringId/exams/:examId.
 * Mirrors the shape produced by `CourseExamsService.getById`.
 */
interface ExamDetail {
  course_exams_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  show_results_immediately: boolean;
  status: "UPCOMING" | "ONGOING" | "ENDED";
  questions: (Question & { sequence_index: number })[];
}

export default function EditExamPage() {
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

  useEffect(() => {
    if (!offeringId || !examId) return;
    let alive = true;
    (async () => {
      try {
        const data = await apiFetch<ExamDetail>(
          `/course-offerings/${offeringId}/exams/${examId}`,
        );
        if (!alive) return;
        setInitialConfig({
          title: data.title,
          description: data.description ?? "",
          start_time: isoToLocalInput(data.start_time),
          end_time: isoToLocalInput(data.end_time),
          show_results_immediately: data.show_results_immediately,
        });
        // Server already returns ordered by sequence_index ascending.
        setInitialQuestions(data.questions);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "โหลดข้อมูลข้อสอบไม่สำเร็จ";
        if (alive) setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [offeringId, examId]);

  const handleSubmit = async (payload: ExamSubmitPayload) => {
    await apiFetch(`/course-offerings/${offeringId}/exams/${examId}`, {
      method: "PATCH",
      data: payload,
    });
    router.push(`/course/${offeringId}`);
  };

  const handleDelete = async () => {
    await apiFetch(`/course-offerings/${offeringId}/exams/${examId}`, {
      method: "DELETE",
    });
    router.push(`/course/${offeringId}`);
  };

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        {loading ? (
          <p className="px-6 py-10 text-sm text-gray-400">กำลังโหลด...</p>
        ) : error ? (
          <p className="px-6 py-10 text-sm text-red-500">{error}</p>
        ) : initialConfig ? (
          <ExamEditor
            offeringId={offeringId}
            mode="edit"
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
