"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/layout/NavBar";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Upload, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useParams } from "next/navigation";
import { Student } from "@/types/student";
import { CourseOffering } from "@/types/course";
import { formatInstructorName } from "@/utils/formatName";

export default function SimpleShowUsers() {
  const [activeTab, setActiveTab] = useState("learn");
  const [activeTopTab, setActiveTopTab] = useState("student");
  const [showAddModal, setShowAddModal] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [offering, setOffering] = useState<CourseOffering | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const router = useRouter();

  const { offeringId } = useParams<{ offeringId: string }>();
  console.log(offering);

  const fetchStudents = async () => {
    if (!offeringId) return;

    const data = await apiFetch<Student[]>(
      `course-offerings/${offeringId}/students`,
    );
    setStudents(data);
    setLoadingStudents(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [offeringId]);

  // ฟังก์ชันกลับไปหน้า Course
  const handleBackToCourse = () => {
    router.back();
  };
  const handleCancelAddStudent = () => {
    setShowAddModal(false);
    setStudentId("");
    setEmail("");
    setFirstName("");
    setLastName("");
  };

  // ฟังก์ชันเพิ่มนักศึกษา
  const handleAddStudent = async () => {
    await apiFetch(`course-offerings/${offeringId}/students`, {
      method: "POST",
      data: {
        student_code: studentId,
        email,
        first_name: firstName,
        last_name: lastName,
      },
    });
    await fetchStudents();
    handleCancelAddStudent();
  };

  //fetch instructors name
  useEffect(() => {
    const fetchOffering = async () => {
      if (!offeringId) return;
      const data = await apiFetch<CourseOffering>(
        `course-offerings/${offeringId}`,
      );
      setOffering(data);
    };
    fetchOffering();
  }, [offeringId]);

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
        <div className="max-w-5xl mx-auto">
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

          {/* Main Flex Container */}
          <div className="flex gap-4 mt-4">
            {/* Left Section - Lists */}
            <div className="flex-1">
              {/* Header Card */}
              <div className="bg-white rounded-lg mb-4">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="text-xl text-[#575757] font-medium">
                    อาจารย์
                  </h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    {offering && (
                      <div className="flex flex-col gap-2">
                        {offering.course_instructors.map((ci) => (
                          <div
                            key={ci.staff_users_id}
                            className="text-sm text-[#575757]"
                          >
                            {formatInstructorName(ci.staff_users)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Users List */}
              <div className="bg-white rounded-lg">
                {/* Title */}
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-4 w-full justify-between">
                    <h3 className="text-xl text-[#575757] font-medium">
                      นักศึกษา
                    </h3>
                    <span className="text-sm text-[#575757]">
                      นักศึกษา {students.length} คน
                    </span>
                  </div>
                </div>

                {/* List */}
                <div>
                  {students.map((student) => (
                    <div
                      key={student.student_code}
                      className={`px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between group`}
                    >
                      <div className="flex items-center gap-3">
                        {student.student_code}
                        <span className="text-base text-[#575757]">
                          {student.first_name} {student.last_name}
                        </span>
                      </div>
                      {/* Delete button - visible on hover */}
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded">
                        <svg
                          className="w-5 h-5 text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex flex-col gap-3">
              {/* Add Student Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-12 h-12 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                title="เพิ่มนักศึกษา"
              >
                <UserPlus className="w-6 h-6 text-[#575757]" />
              </button>

              {/* CSV Upload Button */}
              <label className="cursor-pointer" title="อัพโหลด CSV">
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
            </div>
          </div>
        </div>

        {/* Add Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
              {/* Modal Header */}
              <div className="text-center pt-8 pb-6 px-8">
                <h3 className="text-2xl font-semibold text-gray-900">
                  เพิ่มนักศึกษา
                </h3>
              </div>

              {/* Modal Body */}
              <div className="px-8 pb-8 space-y-6">
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-3">
                    รหัสนักศึกษา
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-base"
                  />
                </div>

                <div>
                  <label className="block text-base font-normal text-gray-900 mb-3">
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-base"
                  />
                </div>

                <div>
                  <label className="block text-base font-normal text-gray-900 mb-3">
                    ชื่อจริง
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-base"
                  />
                </div>

                <div>
                  <label className="block text-base font-normal text-gray-900 mb-3">
                    นามสกุล
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3.5 border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-base"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-8 pb-8 space-y-3">
                <button
                  onClick={handleAddStudent}
                  className="w-full py-4 text-lg font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
                >
                  บันทึก
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-4 text-lg font-medium text-purple-600 bg-white border-2 border-purple-300 hover:bg-purple-50 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Navbar>
  );
}
