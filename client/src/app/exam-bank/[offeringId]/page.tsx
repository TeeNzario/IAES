"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ClipboardList, Database, Inbox } from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import { CourseOffering } from "@/types/course";
import {
  getEnglishCourseName,
  getThaiCourseName,
} from "@/utils/formatCourseName";
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

  const thaiCourseName = course ? getThaiCourseName(course.courses) : "";
  const englishCourseName = course ? getEnglishCourseName(course.courses) : "";

  return (
    <NavBar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/exam-bank")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#514667] transition-colors hover:bg-white cursor-pointer"
              aria-label="กลับ"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="flex items-center gap-2 text-lg font-semibold text-[#2F2A3A] sm:text-xl">
              <Database size={22} className="text-[#7C5BD9]" />
              คลังข้อสอบ
              {course && (
                <span className="text-sm font-medium text-[#B7A3E3]">
                  / {course.courses.course_code}
                </span>
              )}
            </h1>
          </div>

          {course && (
            <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F4EFFF] px-3 py-1 text-sm font-semibold text-[#7C5BD9]">
                  {course.semester}/{toBuddhistYear(course.academic_year)}
                </span>
                <span className="text-sm font-semibold tracking-wide text-[#7C5BD9]">
                  {course.courses.course_code}
                </span>
              </div>
              <h2 className="mt-4 max-w-5xl text-2xl font-semibold leading-tight text-[#2F2A3A] sm:text-3xl">
                {thaiCourseName}
              </h2>
              {englishCourseName && (
                <p className="mt-2 text-base font-medium leading-7 text-[#514667]">
                  {englishCourseName}
                </p>
              )}
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link
              href={`/exam-bank/${offeringId}/questions`}
              className="group flex min-h-64 flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E7DDF8] transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B7A3E3] text-white shadow-sm">
                <Inbox size={30} strokeWidth={1.8} />
              </div>
              <div className="mt-7">
                <h3 className="text-2xl font-semibold text-[#2F2A3A] group-hover:text-[#7C5BD9]">
                  คลังคำถาม
                </h3>
                <p className="mt-3 max-w-xl text-sm font-normal leading-6 text-[#7A7287]">
                  เพิ่ม แก้ไข ค้นหาและจัดการคำถามทั้งหมด
                  พร้อมหมวดหมู่ความรู้และระดับความยาก
                </p>
              </div>
              <span className="mt-auto pt-6 text-sm font-semibold text-[#7C5BD9]">
                เปิด →
              </span>
            </Link>

            <Link
              href={`/exam-bank/${offeringId}/exam-sets`}
              className="group flex min-h-64 flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E7DDF8] transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B7A3E3] text-white shadow-sm">
                <ClipboardList size={30} strokeWidth={1.8} />
              </div>
              <div className="mt-7">
                <h3 className="text-2xl font-semibold text-[#2F2A3A] group-hover:text-[#7C5BD9]">
                  ชุดข้อสอบ
                </h3>
                <p className="mt-3 max-w-xl text-sm font-normal leading-6 text-[#7A7287]">
                  สร้าง แก้ไข และจัดการชุดข้อสอบที่พร้อมใช้งานในรายวิชานี้
                </p>
              </div>
              <span className="mt-auto pt-6 text-sm font-semibold text-[#7C5BD9]">
                เปิด →
              </span>
            </Link>
          </div>
        </main>
      </div>
    </NavBar>
  );
}
