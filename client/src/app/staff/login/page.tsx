"use client";

import { adminLogin } from "@/features/auth/auth.api";
import { setAuth } from "@/lib/auth";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const LoginPage = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [language, setLanguage] = useState<string>("ไทย");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await adminLogin({ email, password });

      // Store token and user info in localStorage
      setAuth({
        access_token: res.access_token,
        user: res.staff, // Map staff to user for the auth service
      });

      console.log("Login successful:", res.staff);
      router.push("/");
    } catch (error) {
      console.error("Login failed:", error);
      setError("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #a78bfa 0%, #e9d5ff 50%, #a78bfa 100%)",
      }}
    >
      <div className="w-full max-w-2xl h-[25rem] bg-white rounded-3xl shadow-2xl p-8 relative flex flex-row items-center">
        <div className="w-1/2">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            {/* <div className="bg-blue-100 rounded-2xl p-3 flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                </div>
                <span className="text-blue-600 font-bold text-xl">IACS</span>
            </div> */}
            <Image src="/IAES_logo.png" alt="Logo" width={100} height={100} />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center mb-5 text-gray-800">
            ลงชื่อเข้าใช้ (ผู้ดูแล)
          </h1>
          <p className="text-center text-gray-500 text-sm mb-6">
            มีปัญหาในการลงชื่อเข้าใช้
            <br />
            โปรดติดต่อผู้ดูแลระบบ
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6 w-1/2">
          {/* Username Field */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              อีเมล
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-black px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              placeholder="อีเมล"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-black px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              placeholder="รหัสผ่าน"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-gradient-to-r from-purple-400 to-purple-500 text-white font-medium rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            เข้าสู่ระบบ
          </button>
          {/* Instructor Login Link */}
          <p className="text-center text-sm text-gray-500">
            เป็นนักเรียนใช่ไหม?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-purple-500 font-medium hover:underline cursor-pointer"
            >
              เข้าสู่ระบบที่นี่
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
