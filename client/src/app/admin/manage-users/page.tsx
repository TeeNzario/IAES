"use client";

import NavBar from "@/components/layout/NavBar";
import { useState, useMemo, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import {
  getUsers,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
} from "@/features/admin/manage-users/manage-users.api";

interface User {
  student_code: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export default function ManageUserPage() {
  const [users, setUsers] = useState<User[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // role filtering removed because `User` interface has no `role`
  const [statusFilter, setStatusFilter] = useState("all"); // active status filter
  const itemsPerPage = 9;

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editActive, setEditActive] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await getUsers({});
        // ensure we always store an array (support both `response` as array or `{ data: array }`)
        console.log(response);
        let data: any[] = [];
        if (Array.isArray(response)) data = response;
        else if (Array.isArray(response?.data)) data = response.data;
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const fullName = `${user.first_name} ${user.last_name}`.trim();
      const matchesSearch =
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.student_code.includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / itemsPerPage)
  );
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    // keep currentPage within bounds when filters/search change
    setCurrentPage((cp) =>
      Math.min(cp, Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage)))
    );
  }, [filteredUsers.length]);

  function openEdit(user: User) {
    setEditingUser(user);
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditActive(user.is_active ? "ACTIVE" : "INACTIVE");
  }

  async function saveEdit() {
    if (!editingUser) return;
    const updatedLocal = (prev: User[] | null) =>
      (prev ?? []).map((u) =>
        u.student_code === editingUser.student_code
          ? {
              ...u,
              first_name: editFirstName,
              last_name: editLastName,
              is_active: editActive === "ACTIVE",
            }
          : u
      );
    // update UI optimistically
    setUsers((prev) => updatedLocal(prev));

    // prepare payload for API (map to backend shape)
    const payload: any = {
      name: `${editFirstName} ${editLastName}`,
      active: editActive === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    };

    try {
      // send fields that backend students PATCH expects
      const apiPayload = {
        first_name: editFirstName,
        last_name: editLastName,
        is_active: editActive === "ACTIVE",
      };
      await apiUpdateUser(editingUser.student_code, {
        first_name: editFirstName,
        last_name: editLastName,
        is_active: editActive === "ACTIVE",
      });
    } catch (error) {
      console.error("Error updating user on server:", error);
    }

    setEditingUser(null);
  }

  async function deleteUser(studentCode: string) {
    if (!confirm("ยืนยันการลบผู้ใช้นี้หรือไม่?")) return;
    // optimistic UI update
    setUsers((prev) => {
      const newArr = (prev ?? []).filter((u) => u.student_code !== studentCode);
      return newArr;
    });

    try {
      await apiDeleteUser(studentCode);
    } catch (error) {
      console.error("Error deleting user on server:", error);
    }
    // adjust page if needed (useEffect above handles)
  }

  return (
    <NavBar>
      <div className="p-4 sm:p-8 bg-gray-50 min-h-screen w-full">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800">
          จัดการข้อมูลผู้ใช้
        </h1>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0 items-start sm:items-center mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full font-semibold transition-colors bg-[#B7A3E3] text-white`}
            >
              ทั้งหมด
            </button>
            {/* role buttons removed (no role in User interface) */}

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="ml-0 sm:ml-2 px-3 py-2 rounded-full border border-purple-300 bg-white text-sm"
            >
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="active">สถานะ: Active</option>
              <option value="inactive">สถานะ: Inactive</option>
            </select>

            <button className="px-3 py-2 border-2 border-purple-300 text-gray-700 rounded-full hover:bg-purple-50">
              <Filter size={18} />
            </button>
          </div>

          <div className="w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="SEARCH"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-400"
              />
              <Search
                className="absolute right-3 top-2.5 text-gray-400"
                size={18}
              />
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
                  <th className="px-6 py-4 text-left font-semibold">ACTIVE</th>
                  <th className="px-6 py-4 text-left font-semibold">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.student_code}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-gray-700">
                      {user.student_code}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{`${user.first_name} ${user.last_name}`}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {user.is_active ? "Active" : "Inactive"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 flex flex-wrap gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="px-3 py-1 bg-[#B7A3E3] text-white rounded-md hover:opacity-90"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => deleteUser(user.student_code)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:opacity-90"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <div className="sm:hidden">
              {paginatedUsers.map((user) => (
                <div
                  key={user.student_code}
                  className="p-4 border-b flex justify-between items-start gap-4"
                >
                  <div className="flex-1">
                    <div className="text-sm text-gray-500">
                      ID: {user.student_code}
                    </div>
                    <div className="font-medium text-gray-800">{`${user.first_name} ${user.last_name}`}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {user.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => openEdit(user)}
                      className="px-3 py-1 bg-[#B7A3E3] text-white rounded-md text-sm"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => deleteUser(user.student_code)}
                      className="px-3 py-1 bg-red-500 text-white rounded-md text-sm"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
          <button
            className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={18} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-8 h-8 rounded-lg font-semibold ${
                currentPage === i + 1
                  ? "bg-[#B7A3E3] text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <span className="text-gray-500 hidden sm:inline">...</span>
          <button
            className="w-8 h-8 rounded-lg border border-gray-300 font-semibold hover:bg-gray-100"
            onClick={() => setCurrentPage(totalPages)}
          >
            {totalPages}
          </button>
          <button
            className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                แก้ไขผู้ใช้ ({editingUser.student_code})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-sm text-gray-600">
                    First name
                  </label>
                  <input
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">
                    Last name
                  </label>
                  <input
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <label className="block text-sm text-gray-600">Status</label>
              <select
                value={editActive}
                onChange={(e) =>
                  setEditActive(e.target.value as "ACTIVE" | "INACTIVE")
                }
                className="w-full px-3 py-2 border rounded mb-4"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <button
                  onClick={() => {
                    if (editingUser) deleteUser(editingUser.student_code);
                    setEditingUser(null);
                  }}
                  className="px-3 py-2 bg-red-500 text-white rounded w-full sm:w-auto"
                >
                  ลบผู้ใช้
                </button>
                <div className="flex justify-end gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border rounded"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-4 py-2 bg-[#7C3AED] text-white rounded"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </NavBar>
  );
}
