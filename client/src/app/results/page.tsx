"use client";

import NavBar from "@/components/layout/NavBar";
import { BarChart3, Clock3 } from "lucide-react";

export default function ResultsPage() {
  return (
    <NavBar>
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center justify-center">
          <section className="w-full max-w-2xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7DDF8] sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4EFFF] text-[#7C5BD9]">
              <BarChart3 size={28} />
            </div>
            <p className="mt-6 text-sm font-semibold text-[#7C5BD9]">
              ผลสรุปการสอบ
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#2F2A3A] sm:text-3xl">
              กำลังพัฒนา
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm font-normal leading-6 text-[#7A7287]">
              หน้านี้จะใช้สำหรับดูภาพรวมผลสอบและสรุปการทำข้อสอบของรายวิชา
              ขณะนี้ยังอยู่ระหว่างการพัฒนา
            </p>
            <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-[#FAF8FF] px-4 py-2 text-sm font-medium text-[#514667]">
              <Clock3 size={16} className="text-[#B7A3E3]" />
              เร็ว ๆ นี้
            </div>
          </section>
        </main>
      </div>
    </NavBar>
  );
}
