"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ClipboardList, Database, Inbox } from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import { CourseOffering } from "@/types/course";
import { formatCourseName } from "@/utils/formatCourseName";
import { toBuddhistYear } from "@/utils/academicYear";

export default function ExamBankHubPage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();
  const [course, setCourse] = useState<CourseOffering | null>(null);

  useEffect(() => {
    if (!offeringId) return;
    apiFetch<CourseOffering>(`course-offerings/${offeringId}`)
      .then(setCourse)
      .catch(() => {});
  }, [offeringId]);

  return (
    <NavBar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/exam-bank")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#575757] hover:bg-white cursor-pointer"
              aria-label="กลับ"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="flex items-center gap-2 text-xl font-light text-[#575757]">
              <Database size={22} />
              คลังข้อสอบ
              {course && (
                <span className="text-sm font-light text-gray-400">
                  / {course.courses.course_code}
                </span>
              )}
            </h1>
          </div>

          {course && (
            <div className="mb-8 rounded-2xl bg-gradient-to-r from-white to-purple-50 p-6 lg:p-8">
              <p className="text-sm font-medium text-[#B7A3E3]">
                {course.semester}/{toBuddhistYear(course.academic_year)}{" "}
                {course.courses.course_code}
              </p>
              <h2 className="mt-1 text-2xl lg:text-3xl font-light text-[#575757]">
                {formatCourseName(course.courses)}
              </h2>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link
              href={`/exam-bank/${offeringId}/exam-sets`}
              className="group flex flex-col gap-4 rounded-3xl bg-white p-8 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B7A3E3] text-white">
                <ClipboardList size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-2xl font-light text-[#575757] group-hover:text-[#B7A3E3]">
                  ชุดข้อสอบ
                </h3>
                <p className="mt-2 text-sm font-light text-gray-500">
                  สร้าง แก้ไข และจัดการชุดข้อสอบที่พร้อมใช้งานในรายวิชานี้
                </p>
              </div>
              <span className="text-sm font-light text-[#B7A3E3]">
                เปิด →
              </span>
            </Link>

            <Link
              href={`/exam-bank/${offeringId}/questions`}
              className="group flex flex-col gap-4 rounded-3xl bg-white p-8 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B7A3E3] text-white">
                <Inbox size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-2xl font-light text-[#575757] group-hover:text-[#B7A3E3]">
                  คลังคำถาม
                </h3>
                <p className="mt-2 text-sm font-light text-gray-500">
                  เพิ่ม แก้ไข ค้นหาและจัดการคำถามทั้งหมด
                  พร้อมหมวดหมู่ความรู้และระดับความยาก
                </p>
              </div>
              <span className="text-sm font-light text-[#B7A3E3]">
                เปิด →
              </span>
            </Link>
          </div>
        </main>
      </div>
    </NavBar>
  );
}
