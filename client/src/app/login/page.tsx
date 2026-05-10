"use client";

import { login } from "@/features/auth/auth.api";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuth } from "@/lib/auth";
import type { LoginDto } from "@/types/auth";
import Image from "next/image";
import { AlertCircle, Loader2 } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (error) setError(null);
    };

  const handleSubmit = async () => {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-6"
      style={{
        background:
          "linear-gradient(135deg, #a78bfa 0%, #e9d5ff 52%, #a78bfa 100%)",
      }}
    >
      <section className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:min-h-[30rem] md:flex-row">
        <div className="flex flex-col items-center justify-center bg-white px-8 py-8 text-center md:w-[45%] md:px-10">
          <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white p-2 shadow-sm ring-1 ring-[#E7DDF8]">
            <Image
              src="/IAES_logo.png"
              alt="IAES System"
              width={104}
              height={104}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <h1 className="mt-5 text-3xl font-semibold text-gray-800">
            ลงชื่อเข้าใช้
          </h1>
          <p className="mt-3 max-w-xs text-sm font-normal leading-6 text-gray-500">
            หากมีปัญหาในการลงชื่อเข้าใช้ โปรดติดต่อผู้ดูแลระบบ
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 pb-8 pt-2 sm:px-8 md:px-10 md:py-10">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                รหัสนักศึกษา หรือ อีเมลบุคลากร
              </span>
              <input
                type="text"
                value={identifier}
                onChange={handleInputChange(setIdentifier)}
                onKeyDown={handleKeyDown}
                className="h-[3.25rem] w-full rounded-xl border border-gray-200 bg-gray-50 px-4 font-sans text-base font-normal leading-5 text-black outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-400"
                placeholder="65123456 หรือ example@university.ac.th"
                disabled={isLoading}
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                รหัสผ่าน
              </span>
              <input
                type="password"
                value={password}
                onChange={handleInputChange(setPassword)}
                onKeyDown={handleKeyDown}
                className="h-[3.25rem] w-full rounded-xl border border-gray-200 bg-gray-50 px-4 font-sans text-base font-normal leading-5 text-black outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-400"
                placeholder="Password123"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-normal leading-6 text-red-600">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex h-[3.25rem] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-400 to-purple-500 text-base font-medium text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:from-purple-500 hover:to-purple-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
