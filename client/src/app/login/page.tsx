"use client"

import { login } from '@/features/auth/auth.api';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuth } from '@/lib/auth';
import Image from 'next/image';


const LoginPage = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [language, setLanguage] = useState<string>('ไทย');

  const router = useRouter();

 const handleSubmit = async () => {
  try {
    const res = await login({ student_code: username, password });

    setAuth({
      access_token: res.access_token,
      user: res.student, // 👈 IMPORTANT
    });

    router.push("/"); // or student home
  } catch (error) {
    console.error("Login failed:", error);
  }
}


  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #a78bfa 0%, #e9d5ff 50%, #a78bfa 100%)'
    }}>
      <div className="w-full max-w-2xl h-[25rem] bg-white rounded-3xl shadow-2xl p-8 relative flex flex-row items-center">
        <div className="w-1/2">
            {/* Logo */}
            <div className="flex justify-center mb-6">
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
            <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            ลงชื่อเข้าใช้
            </h1>
            <p className="text-center text-gray-500 text-sm mb-6">
            มีปัญหาในการลงชื่อเข้าใช้<br />โปรดติดต่อผู้ดูแลระบบ
            </p>
       </div>

        {/* Form Fields */}
        <div className="space-y-6 w-1/2">
          {/* Username Field */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              ชื่อผู้ใช้
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-black px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              placeholder="ชื่อผู้ใช้"
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
        </div>
      </div>
    </div>
  );
};

export default LoginPage;