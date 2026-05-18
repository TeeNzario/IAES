"use client";

import NavBar from "@/components/layout/NavBar";
import {
  AcademicSettings,
  buildAcademicYearOptions,
  formatAcademicTerm,
  getCurrentAcademicSettings,
  updateCurrentAcademicSettings,
} from "@/features/academicSettings/academicSettings.api";
import { toBuddhistYear } from "@/utils/academicYear";
import { CalendarDays, ChevronDown, Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function AcademicSettingsPage() {
  const [settings, setSettings] = useState<AcademicSettings | null>(null);
  const [academicYear, setAcademicYear] = useState(
    String(new Date().getFullYear()),
  );
  const [semester, setSemester] = useState("1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const yearOptions = useMemo(
    () => buildAcademicYearOptions(settings?.academic_year, Number(academicYear)),
    [academicYear, settings?.academic_year],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setError(null);
      try {
        const current = await getCurrentAcademicSettings();
        if (cancelled) return;
        setSettings(current);
        setAcademicYear(String(current.academic_year));
        setSemester(String(current.semester));
      } catch {
        if (!cancelled) {
          setError("ไม่สามารถโหลดการตั้งค่าปีการศึกษาได้");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    const nextYear = Number(academicYear);
    const nextSemester = Number(semester);

    if (!Number.isInteger(nextYear) || nextYear < 2000 || nextYear > 2200) {
      setError("กรุณาเลือกปีการศึกษาที่ถูกต้อง");
      return;
    }

    if (![1, 2, 3].includes(nextSemester)) {
      setError("กรุณาเลือกภาคการศึกษาที่ถูกต้อง");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateCurrentAcademicSettings({
        academic_year: nextYear,
        semester: nextSemester,
      });
      setSettings(updated);
      setAcademicYear(String(updated.academic_year));
      setSemester(String(updated.semester));
      setSuccess("บันทึกการตั้งค่าปีการศึกษาเรียบร้อยแล้ว");
    } catch {
      setError("ไม่สามารถบันทึกการตั้งค่าปีการศึกษาได้");
    } finally {
      setSaving(false);
    }
  }

  const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
  const selectFieldClass =
    "h-12 w-full appearance-none rounded-xl border border-[#E7DDF8] bg-white px-4 pr-10 text-base font-semibold text-[#2F2A3A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#B7A3E3]";
  const dropdownIconClass =
    "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none";

  return (
    <NavBar>
      <div className="min-h-screen w-full bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-6 text-[#7C5BD9]">
                  ผู้ดูแลระบบ
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-[#2F2A3A] sm:text-3xl">
                  กำหนดปีและเทอม
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-normal leading-6 text-[#7A7287]">
                  กำหนดปีการศึกษาและภาคการศึกษาปัจจุบันที่ระบบใช้ร่วมกัน
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:w-48">
                <div className="rounded-xl bg-[#FAF8FF] px-4 py-3">
                  <p className="text-sm font-semibold text-[#7C5BD9]">
                    ค่าปัจจุบัน
                  </p>
                  <p className="mt-2 truncate text-lg font-semibold text-[#2F2A3A]">
                    {loading ? "-" : formatAcademicTerm(settings)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="mb-6 flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                <CalendarDays size={22} />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-[#2F2A3A]">
                  ปีการศึกษาปัจจุบัน
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#7A7287]">
                  ค่านี้จะถูกใช้เป็นค่าเริ่มต้นในการเปิดรายวิชาและสร้างชุดคำถามใหม่
                </p>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {success}
              </p>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin text-[#B7A3E3]" />
              </div>
            ) : (
              <div className="rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#E7DDF8]">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,14rem)_minmax(0,14rem)_auto] md:items-end md:justify-center">
                  <div>
                    <label className={labelClass}>ปีการศึกษา</label>
                    <div className="relative">
                      <select
                        value={academicYear}
                        onChange={(event) => {
                          setAcademicYear(event.target.value);
                          setSuccess(null);
                        }}
                        className={selectFieldClass}
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {toBuddhistYear(year)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className={dropdownIconClass} size={18} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>ภาคการศึกษา</label>
                    <div className="relative">
                      <select
                        value={semester}
                        onChange={(event) => {
                          setSemester(event.target.value);
                          setSuccess(null);
                        }}
                        className={selectFieldClass}
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                      <ChevronDown className={dropdownIconClass} size={18} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#9264F5] disabled:cursor-not-allowed disabled:opacity-60 md:w-32"
                  >
                    {saving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    บันทึก
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </NavBar>
  );
}
