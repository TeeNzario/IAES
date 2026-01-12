// ...existing code...
"use client";

import NavBar from "@/components/layout/NavBar";
import { useState, useMemo, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import {
  getUsers,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
} from "@/features/student/student.api";
import {
  getStaffs,
  updateStaff as apiUpdateStaff,
  deleteStaff as apiDeleteStaff,
} from "@/features/staff/staff.api";

type RoleFilter = "STUDENT" | "INSTRUCTOR" | "ADMINISTRATOR";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: RoleFilter;
}

function mapStudentToUser(student: any): User {
  return {
    id: student.student_code,
    first_name: student.first_name ?? "",
    last_name: student.last_name ?? "",
    is_active: !!student.is_active,
    role: "STUDENT",
  };
}

function mapStaffToUser(staff: any): User {
  return {
    id: String(staff.staff_users_id),
    first_name: staff.first_name ?? "",
    last_name: staff.last_name ?? "",
    is_active: !!staff.is_active,
    role: staff.role as RoleFilter,
  };
}

// Mock data for academic years and courses
const mockAcademicYears = [
  { id: "2568/2", label: "2568/2" },
  { id: "2568/1", label: "2568/1" },
  { id: "2567/2", label: "2567/2" },
  { id: "2567/1", label: "2567/1" },
  { id: "2566/2", label: "2566/2" },
  { id: "2566/1", label: "2566/1" },
  { id: "2565/2", label: "2565/2" },
  { id: "2565/1", label: "2565/1" },
];

const mockCourses: Record<string, string[]> = {
  "2568/2": ["COE65-412", "COE65-512"],
  "2568/1": ["COE65-122"],
  "2567/2": ["COE65-123", "COE63-413"],
  "2567/1": ["COE65-454", "COE63-567"],
  "2566/2": [],
  "2566/1": [],
  "2565/2": [],
  "2565/1": [],
};

export default function ManageUserPage() {
  const [users, setUsers] = useState<User[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "STUDENT" | "INSTRUCTOR" | "ADMINISTRATOR"
  >("all");
  const itemsPerPage = 9;

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editId, setEditId] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editActive, setEditActive] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Filter popup states
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string | null>("2568/2");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        if (roleFilter === "STUDENT") {
          const res = await getUsers({ role: "" });
          const data = Array.isArray(res) ? res : res?.data ?? [];
          setUsers(data.map(mapStudentToUser));
          return;
        }

        if (roleFilter === "INSTRUCTOR" || roleFilter === "ADMINISTRATOR") {
          const res = await getStaffs({ role: roleFilter });
          const data = res?.data ?? [];
          setUsers(data.map(mapStaffToUser));
          return;
        }

        // roleFilter === "all": fetch both and merge
        const studentsRes = await getUsers({ role: "" });
        const students = (Array.isArray(studentsRes) ? studentsRes : studentsRes?.data ?? []).map(mapStudentToUser);

        const staffsRes = await getStaffs({ role: "" });
        const staffs = (staffsRes?.data ?? []).map(mapStaffToUser);

        setUsers([...students, ...staffs]);
      } catch (err) {
        console.error("fetch users error:", err);
      }
    }

    fetchUsers();
  }, [roleFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const fullName = `${user.first_name} ${user.last_name}`.trim();
      const matchesSearch =
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage((cp) => Math.min(cp, Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage))));
  }, [filteredUsers.length]);

  function openEdit(user: User) {
    setEditingUser(user);
    setEditId(user.id);
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditActive(user.is_active ? "ACTIVE" : "INACTIVE");
  }

  async function saveEdit() {
    if (!editingUser) return;

    setUsers((prev) =>
      (prev ?? []).map((u) =>
        u.id === editingUser.id
          ? { ...u, first_name: editFirstName, last_name: editLastName, is_active: editActive === "ACTIVE" }
          : u
      )
    );

    try {
      if (editingUser.role === "STUDENT") {
        await apiUpdateUser(editingUser.id, {
          first_name: editFirstName,
          last_name: editLastName,
          is_active: editActive === "ACTIVE",
        });
      } else {
        await apiUpdateStaff(editingUser.id, {
          first_name: editFirstName,
          last_name: editLastName,
          is_active: editActive === "ACTIVE",
        });
      }
    } catch (error) {
      console.error("Error updating user on server:", error);
    } finally {
      setEditingUser(null);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("ยืนยันการลบผู้ใช้นี้หรือไม่?")) return;

    const userToDelete = users.find((u) => u.id === id);
    setUsers((prev) => (prev ?? []).filter((u) => u.id !== id));

    try {
      if (userToDelete?.role === "STUDENT") {
        await apiDeleteUser(id);
      } else {
        await apiDeleteStaff(id);
      }
    } catch (error) {
      console.error("Error deleting user on server:", error);
    }
  }

  function toggleCourseSelection(course: string) {
    setSelectedCourses((prev) =>
      prev.includes(course)
        ? prev.filter((c) => c !== course)
        : [...prev, course]
    );
  }

  function applyFilter() {
    console.log("Applied filters:", { selectedYear, selectedCourses });
    setShowFilterPopup(false);
  }

  function clearFilter() {
    setSelectedYear("2568/2");
    setSelectedCourses([]);
  }

  return (
    <NavBar>
      <div className="p-4 sm:p-8 bg-gray-50 min-h-screen w-full">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800">
          จัดการข้อมูลผู้ใช้
        </h1>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 items-start sm:items-center mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setRoleFilter("STUDENT"); setCurrentPage(1); }}
              className="px-6 py-2 rounded-full font-medium transition-colors bg-white border-2 border-[#B7A3E3] text-[#B7A3E3] hover:bg-purple-50"
            >
              นักเรียน
            </button>

            <button
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setRoleFilter("INSTRUCTOR"); setCurrentPage(1); }}
              className="px-6 py-2 rounded-full font-medium transition-colors bg-white border-2 border-[#B7A3E3] text-[#B7A3E3] hover:bg-purple-50"
            >
              อาจารย์
            </button>

            <button
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setRoleFilter("ADMINISTRATOR"); setCurrentPage(1); }}
              className="px-6 py-2 rounded-full font-medium transition-colors bg-white border-2 border-[#B7A3E3] text-[#B7A3E3] hover:bg-purple-50"
            >
              ผู้ดูแลระบบ
            </button>

            <button 
              onClick={() => setShowFilterPopup(true)}
              className="px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-full hover:bg-gray-50"
            >
              <Filter size={18} />
            </button>
          </div>

          <div className="w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="SEARCH"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-400"
              />
              <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>
        </div>

        {/* Table for desktop */}
        <div className="bg-white rounded-lg shadow overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] hidden sm:table">
              <thead>
                <tr className="bg-[#B7A3E3] text-white">
                  <th className="px-6 py-4 text-left font-semibold">ID</th>
                  <th className="px-6 py-4 text-left font-semibold">NAME</th>
                  <th className="px-6 py-4 text-left font-semibold">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-700">{user.id}</td>
                    <td className="px-6 py-4 text-gray-700">{`${user.first_name} ${user.last_name}`}</td>
                    <td className="px-6 py-4 text-gray-700">
                      <button onClick={() => openEdit(user)} className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          <path d="m15 5 4 4"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <div className="sm:hidden">
              {paginatedUsers.map((user) => (
                <div key={user.id} className="p-4 border-b flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500">ID: {user.id}</div>
                    <div className="font-medium text-gray-800">{`${user.first_name} ${user.last_name}`}</div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button onClick={() => openEdit(user)} className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        <path d="m15 5 4 4"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
          <button className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={18} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
            <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg font-semibold ${currentPage === i + 1 ? "bg-[#B7A3E3] text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-100"}`}>
              {i + 1}
            </button>
          ))}
          <span className="text-gray-500 hidden sm:inline">...</span>
          <button className="w-8 h-8 rounded-lg border border-gray-300 font-semibold hover:bg-gray-100" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
          <button className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Filter Popup - Matching Design */}
        {showFilterPopup && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
              {/* Header with Filter Icon */}
              <div className="p-4 pb-3 border-b border-gray-100">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                  <Filter size={24} className="text-[#B7A3E3]" />
                </div>
              </div>

              {/* Content - Two Column Layout */}
              <div className="p-4">
                <h4 className="font-semibold mb-3 text-gray-800">ปีการศึกษา</h4>
                
                <div className="grid grid-cols-[100px_1fr] gap-4">
                  {/* Left Column - Academic Years */}
                  <div className="space-y-1 pr-3 border-r border-gray-300/70">
                    {mockAcademicYears.map((year) => (
                      <button
                        key={year.id}
                        onClick={() => {
                          setSelectedYear(year.id);
                          setSelectedCourses([]);
                        }}
                        className={`w-full text-center px-3 py-1.5 rounded-md text-sm transition-colors ${
                          selectedYear === year.id
                            ? "bg-[#B7A3E3] text-white font-medium"
                            : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {year.label}
                      </button>
                    ))}
                  </div>

                  {/* Right Column - Courses */}
                  <div>
                    {selectedYear && mockCourses[selectedYear].length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {mockCourses[selectedYear].map((course) => (
                          <button
                            key={course}
                            onClick={() => toggleCourseSelection(course)}
                            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                              selectedCourses.includes(course)
                                ? "bg-[#B7A3E3] text-white font-medium"
                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                            }`}
                          >
                            {course}
                          </button>
                        ))}
                      </div>
                    ) : selectedYear ? (
                      <div className="text-gray-400 text-sm text-center py-4">
                        ไม่มีรายวิชา
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setShowFilterPopup(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal - New Design */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              {/* ID Field */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-black mb-2">ID</label>
                <input
                  type="text"
                  value={editId}
                  disabled
                  className="w-full px-4 py-3 border-2 border-[#9264F5] rounded-2xl bg-gray-50 text-black cursor-not-allowed"
                />
              </div>

              {/* Name Field */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-black mb-2">Name</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#9264F5] rounded-2xl focus:outline-none focus:border-[#B7A3E3] transition-colors text-black"
                />
              </div>

              {/* Surname Field */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-black mb-2">Surname</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#9264F5] rounded-2xl focus:outline-none focus:border-[#B7A3E3] transition-colors text-black"
                />
              </div>

              {/* Status Toggle */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-black mb-3">Status</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditActive("ACTIVE")}
                    className={`flex-1 px-6 py-3 rounded-2xl font-medium transition-all ${
                      editActive === "ACTIVE"
                        ? "bg-[#B7A3E3] text-white shadow-md"
                        : "bg-white text-black border-2 border-[#B7A3E3] hover:border-gray-300"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setEditActive("INACTIVE")}
                    className={`flex-1 px-6 py-3 rounded-2xl font-medium transition-all ${
                      editActive === "INACTIVE"
                        ? "bg-[#B7A3E3] text-white shadow-md"
                        : "bg-white text-black border-2 border-[#B7A3E3] hover:border-gray-300"
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-6 py-3 rounded-2xl font-medium border-2 border-gray-300 text-black hover:bg-gray-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 px-6 py-3 rounded-2xl font-medium bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors shadow-lg"
                >
                  SAVE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </NavBar>
  );
}
// ...existing code...