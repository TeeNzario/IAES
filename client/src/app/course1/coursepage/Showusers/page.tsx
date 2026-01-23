"use client";

import React from "react";
import Navbar from "@/components/layout/NavBar";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function SimpleShowUsers() {
  const router = useRouter();

  // ข้อมูลตัวอย่าง
  const users = [
    {
      id: 1,
      name: "Thimaporn Phetkaew",
      avatar: "T",
      bgColor: "bg-blue-500",
    },
    {
      id: 2,
      name: "Teerapat Bunchuai",
      avatar: "T",
      bgColor: "bg-gray-400",
    },
    {
      id: 3,
      name: "Thanaphat Chainarong",
      avatar: "T",
      bgColor: "bg-gray-700",
    },
    {
      id: 4,
      name: "Chanasorn Chaochuerssuk",
      avatar: "C",
      bgColor: "bg-orange-300",
    },
  ];

  const totalUsers = 20;

  // ฟังก์ชันกลับไปหน้า Course
  const handleBackToCourse = () => {
    router.push('/course1/coursepage');
  };

  return (
    <Navbar>
      <div className="min-h-screen bg-[#F4EFFF] p-4">
        <div className="max-w-3xl mx-auto">
          
          {/* Back Button */}
          <button
            onClick={handleBackToCourse}
            className="mb-4 flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">กลับไปหน้าคอร์ส</span>
          </button>

          {/* Header Card */}
          <div className="bg-white rounded-lg shadow mb-4">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl text-[#575757] font-medium">
                อาจารย์
              </h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  T
                </div>
                <h2 className="text-lg text-[#575757] font-medium">
                  รศ.ดร.บดินทร์ ประมุขเดช
                </h2>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="bg-white rounded-lg shadow">
            {/* Title */}
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl text-[#575757] font-medium">
                นักศึกษา
              </h3>
              <span className="text-sm text-[#575757]">
                นักศึกษา {totalUsers} คน
              </span>
            </div>

            {/* List */}
            <div>
              {users.map((user, index) => (
                <div
                  key={user.id}
                  className={`px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    index !== users.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 ${user.bgColor} rounded-full flex items-center justify-center text-white font-semibold text-lg`}
                    >
                      {user.avatar}
                    </div>
                    <span className="text-base text-[#575757]">
                      {user.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Navbar>
  );
}