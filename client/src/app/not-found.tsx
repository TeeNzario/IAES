"use client";

import Link from "next/link";
import NavBar from "@/components/layout/NavBar";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  Map,
  SearchX,
} from "lucide-react";

export default function NotFoundPage() {
  const homeRoute = useHomeRoute();

  return (
    <NavBar>
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center">
          <section className="w-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9] sm:h-14 sm:w-14">
                    <SearchX size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#7C5BD9]">
                      Error 404
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold leading-tight text-[#2F2A3A] sm:text-3xl">
                      ไม่พบหน้าที่ต้องการ
                    </h1>
                  </div>
                </div>

                <p className="mt-4 max-w-3xl text-sm font-normal leading-6 text-[#7A7287] sm:text-base sm:leading-7">
                  เส้นทางที่พิมพ์อาจไม่ถูกต้อง หน้านี้อาจถูกย้าย
                  หรือไม่มีอยู่ในระบบ IAES แล้ว คุณสามารถกลับไปยังหน้าหลักตามสิทธิ์ของบัญชีได้ทันที
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={homeRoute.href}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9] sm:text-base"
                  >
                    <Home size={18} />
                    {homeRoute.label}
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#7C5BD9] shadow-sm ring-1 ring-[#D9CCF2] transition-colors hover:bg-[#F4EFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9] sm:text-base"
                  >
                    <ArrowLeft size={18} />
                    กลับหน้าก่อนหน้า
                  </button>
                </div>
              </div>

              <aside className="rounded-2xl bg-[#FAF8FF] p-5 ring-1 ring-[#EFE8FB]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[#2F2A3A]">
                      ตรวจสอบเส้นทางอีกครั้ง
                    </p>
                    <p className="mt-1 text-sm font-normal leading-6 text-[#7A7287]">
                      ลองเช็กชื่อหน้า รหัสรายวิชา หรือเลือกเมนูจากแถบด้านซ้าย
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-white p-4 ring-1 ring-[#E7DDF8]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#7C5BD9]">
                    <Map size={16} />
                    ทางลัดที่แนะนำ
                  </div>
                  <p className="mt-2 text-sm font-normal leading-6 text-[#514667]">
                    ใช้ปุ่มกลับหน้าหลักเพื่อไปยังพื้นที่ที่บัญชีของคุณเข้าถึงได้
                    หรือเลือกเมนูที่มีอยู่ในระบบเพื่อเริ่มใหม่อย่างถูกต้อง
                  </p>
                </div>
              </aside>
            </div>
          </section>
        </main>
      </div>
    </NavBar>
  );
}
