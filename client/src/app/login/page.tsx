"use client";

import { login } from "@/features/auth/auth.api";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuth } from "@/lib/auth";
import type { LoginDto } from "@/types/auth";
import Image from "next/image";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  UserRound,
} from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_ID_REGEX = /^\d{8}$/;

function isValidIdentifier(identifier: string): boolean {
  const value = identifier.trim();
  return EMAIL_REGEX.test(value) || STUDENT_ID_REGEX.test(value);
}

function resolvePreferredRedirectPath(user: {
  type?: string;
  userType?: string;
  role?: string;
  staff_role?: string;
}): string {
  const userType = String(user.type ?? user.userType ?? "").toLowerCase();
  const role = String(user.role ?? user.staff_role ?? "").toLowerCase();

  if (userType === "staff" && role === "admin") {
    return "/admin/manage-users";
  }
  if (userType === "staff") {
    return "/staff";
  }
  if (userType === "student") {
    return "/student";
  }
  return "/";
}

function resolveSafeRedirectPath(path: string): string {
  if (path === "/staff" || path === "/student") {
    return "/";
  }
  return path;
}

function getLoginErrorMessage(error: unknown): string {
  const apiError = error as {
    response?: { status?: number; data?: { message?: string | string[] } };
  };

  if (apiError.response?.status === 400) {
    return "รูปแบบบัญชีไม่ถูกต้อง กรุณาใช้รหัสนักศึกษา 8 หลัก หรืออีเมลบุคลากร";
  }

  if (apiError.response?.status === 401) {
    return "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง";
  }

  const message = apiError.response?.data?.message;
  if (Array.isArray(message) && message.length > 0) {
    return message[0];
  }
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง";
}

const LoginPage = () => {
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (error) setError(null);
    };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (isLoading) return;

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password.trim()) {
      setError("กรุณากรอกบัญชีผู้ใช้และรหัสผ่าน");
      return;
    }

    if (!isValidIdentifier(trimmedIdentifier)) {
      setError("กรุณาใช้รหัสนักศึกษา 8 หลัก หรืออีเมลบุคลากร");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: LoginDto = {
        identifier: trimmedIdentifier,
        password,
      };
      const res = await login(payload);

      setAuth(res);

      const preferredRedirect = resolvePreferredRedirectPath(res.user);
      const safeRedirect = resolveSafeRedirectPath(preferredRedirect);
      router.push(safeRedirect);
    } catch (error) {
      console.error("Login failed:", error);
      setError(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-6 text-[#2F2A3A]"
      style={{
        background:
          "linear-gradient(135deg, #a78bfa 0%, #e9d5ff 52%, #a78bfa 100%)",
      }}
    >
      <section className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-white/70 sm:min-h-[30rem] md:flex-row">
        <div className="flex flex-col justify-center bg-[#FAF8FF] px-8 py-8 text-center md:w-[45%] md:px-10">
          <div>
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-white p-2 shadow-sm ring-1 ring-[#E7DDF8]">
              <Image
                src="/IAES_logo.png"
                alt="IAES System"
                width={104}
                height={104}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            <p className="mt-6 text-sm font-semibold text-[#7C5BD9]">
              IAES System
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#2F2A3A]">
              ลงชื่อเข้าใช้
            </h1>
          </div>

          <p className="mx-auto mt-6 max-w-xs border-t border-[#E7DDF8] pt-5 text-sm leading-6 text-[#6A6276]">
            หากมีปัญหาในการลงชื่อเข้าใช้
            <span className="block">โปรดติดต่อผู้ดูแลระบบ</span>
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 pb-8 pt-2 sm:px-8 md:px-10 md:py-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#514667]">
                รหัสนักศึกษา หรือ อีเมลบุคลากร
              </span>
              <div className="relative">
                <UserRound
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#B7A3E3]"
                />
                <input
                  type="text"
                  value={identifier}
                  onChange={handleInputChange(setIdentifier)}
                  className="h-[3.35rem] w-full rounded-2xl border border-[#E7DDF8] bg-white/90 px-12 font-sans text-base font-normal leading-5 text-[#201A2F] outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-[#9C94AA] focus:border-[#B7A3E3] focus:bg-white focus:ring-4 focus:ring-[#B7A3E3]/20 disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="65123456 หรือ example@mail.wu.ac.th"
                  disabled={isLoading}
                  autoComplete="username"
                  autoFocus
                  spellCheck={false}
                  aria-invalid={Boolean(error)}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#514667]">
                รหัสผ่าน
              </span>
              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#B7A3E3]"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handleInputChange(setPassword)}
                  className="h-[3.35rem] w-full rounded-2xl border border-[#E7DDF8] bg-white/90 px-12 font-sans text-base font-normal leading-5 text-[#201A2F] outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-[#9C94AA] focus:border-[#B7A3E3] focus:bg-white focus:ring-4 focus:ring-[#B7A3E3]/20 disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="กรอกรหัสผ่าน"
                  disabled={isLoading}
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && (
              <div
                className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-normal leading-6 text-red-600"
                role="alert"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-[3.35rem] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#9264F5] text-base font-medium text-white shadow-[0_14px_28px_rgba(146,100,245,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7C5BD9] hover:shadow-[0_18px_34px_rgba(124,91,217,0.32)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <LogIn size={19} />
                  เข้าสู่ระบบ
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
