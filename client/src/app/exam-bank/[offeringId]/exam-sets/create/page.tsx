"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import ExamEditor, { ExamSubmitPayload } from "@/components/exam/ExamEditor";

export default function CreateExamSetPage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const handleSubmit = async (payload: ExamSubmitPayload) => {
    await apiFetch(`/course-offerings/${offeringId}/exams`, {
      method: "POST",
      data: payload,
    });
    router.push(`/exam-bank/${offeringId}/exam-sets`);
  };

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <ExamEditor
          offeringId={offeringId}
          mode="create"
          hideSchedule
          backHref={`/exam-bank/${offeringId}/exam-sets`}
          onSubmit={handleSubmit}
        />
      </div>
    </Navbar>
  );
}
