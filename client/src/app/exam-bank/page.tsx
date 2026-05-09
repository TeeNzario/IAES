"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Database, Search, UsersRound } from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import { CourseOffering } from "@/types/course";
import {
  getEnglishCourseName,
  getThaiCourseName,
} from "@/utils/formatCourseName";
import { formatInstructorName } from "@/utils/formatName";
import { toBuddhistYear } from "@/utils/academicYear";

export default function ExamBankCoursePickerPage() {
  const [courses, setCourses] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch<CourseOffering[]>("course-offerings")
      .then(setCourses)
      .catch(() => setError("ไม่สามารถโหลดรายวิชาได้"))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? courses.filter(
        (c) =>
          c.courses.course_code.toLowerCase().includes(q) ||
          getThaiCourseName(c.courses).toLowerCase().includes(q) ||
          getEnglishCourseName(c.courses).toLowerCase().includes(q),
      )
    : courses;

  return (
    <NavBar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-[#7C5BD9]">
                  <Database size={18} />
                  คลังข้อสอบ
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-[#2F2A3A] sm:text-3xl">
                  เลือกรายวิชา
                </h1>
                <p className="mt-2 text-sm font-normal text-[#7A7287]">
                  เลือกรายวิชาเพื่อจัดการคลังคำถามและชุดข้อสอบของรายวิชานั้น
                </p>
              </div>

              <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหารายวิชา"
                  className="w-full rounded-xl bg-[#FAF8FF] px-4 py-3 pr-10 text-sm font-normal text-[#2F2A3A] placeholder:text-[#B7AFC6] outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3] sm:w-80"
              />
              <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
              />
            </div>
          </div>
          </section>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-[20rem] rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8]"
                >
                  <div className="h-10 w-10 rounded-xl bg-[#F1EAFF]" />
                  <div className="mt-8 h-4 w-24 rounded bg-[#F1EAFF]" />
                  <div className="mt-4 h-7 w-4/5 rounded bg-[#F1EAFF]" />
                  <div className="mt-3 h-5 w-3/5 rounded bg-[#F1EAFF]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-white p-6 text-sm font-medium text-red-600 ring-1 ring-red-100">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-sm font-medium text-[#7A7287] ring-1 ring-[#E7DDF8]">
              ไม่มีรายวิชา
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => {
                const thaiCourseName = getThaiCourseName(c.courses);
                const englishCourseName = getEnglishCourseName(c.courses);

                return (
                  <Link
                    key={c.course_offerings_id}
                    href={`/exam-bank/${c.course_offerings_id}`}
                    className={`flex min-h-[20rem] flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] transition hover:-translate-y-0.5 hover:shadow-md ${
                      c.is_active ? "" : "opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                        <BookOpen size={20} />
                      </div>
                      <span className="rounded-full bg-[#F4EFFF] px-3 py-1 text-xs font-semibold text-[#7C5BD9]">
                        {c.semester}/{toBuddhistYear(c.academic_year)}
                      </span>
                    </div>

                    <div className="mt-6 min-w-0">
                      <p className="text-sm font-semibold tracking-wide text-[#7C5BD9]">
                        {c.courses.course_code}
                      </p>
                      <div className="mt-3 min-h-[7.75rem]">
                        <h2 className="overflow-hidden text-[1.32rem] font-semibold leading-8 text-[#201A2F] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                          {thaiCourseName}
                        </h2>
                        {englishCourseName && (
                          <p className="mt-2 overflow-hidden text-sm font-medium leading-5 text-[#514667] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                            {englishCourseName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto rounded-xl bg-[#FAF8FF] px-3 py-3">
                      <div className="flex items-start gap-2.5 text-[#575757]">
                        <UsersRound
                          size={16}
                          className="mt-0.5 flex-shrink-0 text-[#B7A3E3]"
                        />
                        <div className="min-w-0 space-y-1">
                          {c.course_instructors.slice(0, 2).map((ci) => (
                            <p
                              key={ci.staff_users_id}
                              className="truncate text-sm leading-5 text-[#514667]"
                            >
                              {formatInstructorName(ci.staff_users)}
                            </p>
                          ))}
                          {c.course_instructors.length > 2 && (
                            <p className="text-xs font-medium text-[#7C5BD9]">
                              +{c.course_instructors.length - 2} คน
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </NavBar>
  );
}
