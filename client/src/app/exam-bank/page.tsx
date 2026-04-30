"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, Search } from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import { CourseOffering } from "@/types/course";
import { formatCourseName } from "@/utils/formatCourseName";
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
          c.courses.course_name.toLowerCase().includes(q),
      )
    : courses;

  return (
    <NavBar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-xl font-light text-[#575757]">
              <Database size={22} />
              คลังข้อสอบ
              <span className="text-sm font-light text-gray-400">
                / เลือกรายวิชา
              </span>
            </h1>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหารายวิชา"
                className="w-64 rounded-full bg-white px-4 py-2 pr-9 text-sm font-light text-[#575757] placeholder-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-[#B7A3E3]"
              />
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">กำลังโหลด...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400">ไม่มีรายวิชา</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <Link
                  key={c.course_offerings_id}
                  href={`/exam-bank/${c.course_offerings_id}`}
                  className={`flex h-56 flex-col justify-between rounded-3xl bg-white p-6 transition-shadow hover:shadow-lg ${
                    c.is_active ? "" : "opacity-60"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-[#B7A3E3]">
                      {c.semester}/{toBuddhistYear(c.academic_year)}{" "}
                      {c.courses.course_code}
                    </p>
                    <h2 className="mt-1 text-2xl font-light text-[#575757] line-clamp-2">
                      {formatCourseName(c.courses)}
                    </h2>
                  </div>
                  <div className="text-xs text-gray-500">
                    {c.course_instructors
                      .map((ci) => formatInstructorName(ci.staff_users))
                      .join(", ")}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </NavBar>
  );
}
