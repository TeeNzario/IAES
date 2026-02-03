"use client";

import { login } from "@/features/auth/auth.api";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuth } from "@/lib/auth";
import Image from "next/image";

const LoginPage = () => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      // Clear error when user edits any field
      if (error) setError(null);
    };

  const handleSubmit = async () => {
    // Prevent double submission
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await login({ student_code: username, password });

      setAuth({
        access_token: res.access_token,
        user: res.student,
      });

      router.push("/");
    } catch (error) {
      console.error("Login failed:", error);
      setError("รหัสนักศึกษา หรือ รหัสผ่านไม่ถูกต้อง");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // if (e.key === "Enter") {
    //   handleSubmit();
    // }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #a78bfa 0%, #e9d5ff 50%, #a78bfa 100%)",
      }}
    >
      <div className="w-full max-w-2xl h-[27rem] bg-white rounded-3xl shadow-2xl p-8 relative flex flex-row items-center">
        <div className="w-1/2">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <Image src="/IAES_logo.png" alt="Logo" width={100} height={100} />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            ลงชื่อเข้าใช้
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
              รหัสนักศึกษา
            </label>
            <input
              type="text"
              value={username}
              onChange={handleInputChange(setUsername)}
              onKeyDown={handleKeyDown}
              className="w-full text-black px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              placeholder="รหัสนักศึกษา"
              disabled={isLoading}
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
              onChange={handleInputChange(setPassword)}
              onKeyDown={handleKeyDown}
              className="w-full text-black px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              placeholder="รหัสผ่าน"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-purple-400 to-purple-500 text-white font-medium rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
          <p className="text-center text-sm text-gray-500">
            เป็นอาจารย์ใช่ไหม?{" "}
            <button
              type="button"
              onClick={() => router.push("/staff/login")}
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
