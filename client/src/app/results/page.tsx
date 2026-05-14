"use client";

import Link from "next/link";
import NavBar from "@/components/layout/NavBar";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import {
  BarChart3,
  Clock3,
  FileSpreadsheet,
  Home,
  LineChart,
  ListChecks,
} from "lucide-react";

const reportCards = [
  {
    title: "ภาพรวมผลสอบ",
    description: "สรุปจำนวนผู้เข้าสอบ คะแนนเฉลี่ย และสถานะการทำข้อสอบ",
    icon: BarChart3,
  },
  {
    title: "วิเคราะห์รายข้อ",
    description: "ตรวจแนวโน้มข้อสอบที่ยากง่าย และดูค่าสถิติสำคัญของข้อสอบ",
    icon: LineChart,
  },
  {
    title: "ส่งออกรายงาน",
    description: "เตรียมข้อมูลสำหรับดาวน์โหลดและใช้งานต่อในรายวิชา",
    icon: FileSpreadsheet,
  },
];

const progressItems = [
  "ออกแบบหน้ารวมผลสอบ",
  "เชื่อมข้อมูลรายวิชาและชุดข้อสอบ",
  "จัดรูปแบบรายงานสำหรับผู้สอนและผู้ดูแลระบบ",
];

export default function ResultsPage() {
  const homeRoute = useHomeRoute();

  return (
    <NavBar>
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9] sm:h-14 sm:w-14">
                  <BarChart3 size={28} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#7C5BD9]">
                    ผลสรุปการสอบ
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold leading-tight text-[#2F2A3A] sm:text-3xl">
                    กำลังเตรียมรายงานผลสอบ
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm font-normal leading-6 text-[#7A7287] sm:text-base sm:leading-7">
                    หน้านี้จะใช้ดูภาพรวมผลสอบ วิเคราะห์คะแนน และติดตามข้อมูลสำคัญ
                    ของแต่ละรายวิชา ขณะนี้อยู่ระหว่างจัดทำให้พร้อมใช้งาน
                  </p>
                </div>
              </div>

              <Link
                href={homeRoute.href}
                className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9] sm:text-base"
              >
                <Home size={18} />
                {homeRoute.label}
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {reportCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                    <Icon size={22} />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold leading-7 text-[#2F2A3A]">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm font-normal leading-6 text-[#7A7287]">
                    {card.description}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                    <Clock3 size={20} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[#2F2A3A]">
                      สถานะการพัฒนา
                    </p>
                    <p className="mt-1 text-sm font-normal leading-6 text-[#7A7287]">
                      เตรียมโครงรายงานและหน้าจอแสดงผลให้เข้ากับระบบหลัก
                    </p>
                  </div>
                </div>
              </div>

              <span className="inline-flex h-9 w-fit items-center rounded-xl bg-[#FAF8FF] px-4 text-sm font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                เร็ว ๆ นี้
              </span>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {progressItems.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-6 text-[#2F2A3A]">
                      {item}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A7287]">
                      <ListChecks size={14} className="text-[#B7A3E3]" />
                      อยู่ระหว่างดำเนินการ
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </NavBar>
  );
}
