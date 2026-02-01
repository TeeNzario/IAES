"use client";

import React, { useState } from "react";
import Navbar from "@/components/layout/NavBar";
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Upload, X } from 'lucide-react';

export default function SimpleShowUsers() {
  const [activeTab, setActiveTab] = useState("learn");
  const [activeTopTab, setActiveTopTab] = useState("student");
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
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
    router.back();
  };

  // ฟังก์ชันเพิ่มนักศึกษา
  const handleAddStudent = () => {
    console.log("Add student:", { studentId, studentName });
    // Add your logic here to save the student
    setShowAddModal(false);
    setStudentId("");
    setStudentName("");
  };

  // ฟังก์ชันอัพโหลด CSV
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Uploaded file:", file.name);
      // Add your CSV processing logic here
    }
  };

  return (
    <Navbar>
      <div className="min-h-screen bg-[#F4EFFF] p-4">
        <div className="flex flex-row">
          {/* Floating Action Buttons */}
          <div className="flex flex-col gap-3 z-10">
            {/* CSV Upload Button */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-12 h-12 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Upload className="w-6 h-6 text-[#575757]" />
              </div>
            </label>
            
            {/* Add Student Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="w-12 h-12 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <UserPlus className="w-6 h-6 text-[#575757]" />
            </button>
          </div>
        <div className="max-w-3xl mx-auto relative">          
          <div className="border-b border-gray-200/50 px-6 lg:px-8 pt-4">
            <div className="flex items-center gap-6 pb-3">
              <button
                onClick={() => {
                  setActiveTopTab("home");
                  handleBackToCourse();
                }}
                className={`font-medium text-sm transition-colors ${
                  activeTopTab === "home"
                    ? "text-purple-600"
                    : "text-gray-500 hover:text-purple-600"
                }`}
              >
                หน้าหลัก
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <button
                onClick={() => {
                  setActiveTopTab("student");
                }}
                className={`font-medium text-sm transition-colors ${
                  activeTopTab === "student"
                    ? "text-purple-600"
                    : "text-gray-500 hover:text-purple-600"
                }`}
              >
                นักเรียน
              </button>
            </div>
          </div>

          {/* Header Card */}
          <div className="bg-white rounded-lg mb-4">
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
          <div className="bg-white rounded-lg">
            {/* Title with Add Button */}
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-xl text-[#575757] font-medium">
                  นักศึกษา
                </h3>
                <span className="text-sm text-[#575757]">
                  นักศึกษา {totalUsers} คน
                </span>
              </div>
            </div>

            {/* List */}
            <div>
              {users.map((user, index) => (
                <div
                  key={user.id}
                  className={`px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between group`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base text-[#575757]">
                      {user.name}
                    </span>
                  </div>
                  {/* Delete button - visible on hover */}
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-[#575757]">
                  เพิ่มนักศึกษา
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#575757] mb-2">
                    รหัสนักศึกษา
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="66131319"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#575757] mb-2">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="ธีรภัทร จงจิตร"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddStudent}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  เพิ่มนักศึกษา
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </Navbar>
  );
}