"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import ExamEditor, {
  ExamSubmitPayload,
} from "@/components/exam/ExamEditor";

/**
 * Thin wrapper around <ExamEditor /> in "create" mode. POSTs the payload and
 * redirects back to the course landing on success.
 */
export default function CreateExamPage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const handleSubmit = async (payload: ExamSubmitPayload) => {
    await apiFetch(`/course-offerings/${offeringId}/exams`, {
      method: "POST",
      data: payload,
    });
    router.push(`/course/${offeringId}`);
  };

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <ExamEditor
          offeringId={offeringId}
          mode="create"
          onSubmit={handleSubmit}
        />
      </div>
    </Navbar>
  );
}
