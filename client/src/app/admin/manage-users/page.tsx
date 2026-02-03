// ...existing code...
"use client";

import NavBar from "@/components/layout/NavBar";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import {
  getUsers,
  updateUser as apiUpdateUser,
  checkStudentCodeExists,
} from "@/features/student/student.api";
import {
  getStaffs,
  updateStaff as apiUpdateStaff,
  createStaff as apiCreateStaff,
  checkEmailExists,
} from "@/features/staff/staff.api";
import { apiFetch } from "@/lib/api";
import { AuthUser } from "@/lib/auth";

// ============================================================
// VALIDATION CONFIG — Centralized limits and messages
// ============================================================
const USER_VALIDATION_CONFIG = {
  firstName: { min: 1, max: 50 },
  lastName: { min: 1, max: 50 },
  email: { max: 100 },
  password: { min: 8 },
};

const ERROR_MESSAGES = {
  firstName: {
    required: "กรุณากรอกชื่อ",
    maxLength: `ชื่อต้องไม่เกิน ${USER_VALIDATION_CONFIG.firstName.max} ตัวอักษร`,
  },
  lastName: {
    required: "กรุณากรอกนามสกุล",
    maxLength: `นามสกุลต้องไม่เกิน ${USER_VALIDATION_CONFIG.lastName.max} ตัวอักษร`,
  },
  email: {
    required: "กรุณากรอกอีเมล",
    maxLength: `อีเมลต้องไม่เกิน ${USER_VALIDATION_CONFIG.email.max} ตัวอักษร`,
    invalid: "รูปแบบอีเมลไม่ถูกต้อง",
    duplicate: "อีเมลนี้ถูกใช้งานแล้ว",
  },
  password: {
    required: "กรุณากรอกรหัสผ่าน",
    minLength: `รหัสผ่านต้องมีอย่างน้อย ${USER_VALIDATION_CONFIG.password.min} ตัวอักษร`,
    mismatch: "รหัสผ่านไม่ตรงกัน",
  },
};

type RoleFilter = "STUDENT" | "INSTRUCTOR" | "ADMINISTRATOR";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: RoleFilter;
  email?: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function mapStudentToUser(student: any): User {
  return {
    id: student.student_code,
    first_name: student.first_name ?? "",
    last_name: student.last_name ?? "",
    is_active: !!student.is_active,
    role: "STUDENT",
    email: student.email,
  };
}

function mapStaffToUser(staff: any): User {
  return {
    id: String(staff.staff_users_id),
    first_name: staff.first_name ?? "",
    last_name: staff.last_name ?? "",
    is_active: !!staff.is_active,
    role: staff.role === "ADMIN" ? "ADMINISTRATOR" : (staff.role as RoleFilter),
    email: staff.email,
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ManageUserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  // Default to STUDENT (no "all" option per requirement)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("STUDENT");
  const itemsPerPage = 9;

  // Edit modal states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editId, setEditId] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editActive, setEditActive] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Create staff modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createRole, setCreateRole] = useState<"INSTRUCTOR" | "ADMIN">(
    "INSTRUCTOR",
  );
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  // Fetch current user on mount
  useEffect(() => {
    apiFetch<AuthUser>("/auth/me")
      .then((user) => setCurrentUser(user))
      .catch((err) => console.error("Failed to fetch current user", err));
  }, []);

  // Fetch users based on role filter
  useEffect(() => {
    async function fetchUsers() {
      try {
        if (roleFilter === "STUDENT") {
          const res = await getUsers({ role: "" });
          const data = Array.isArray(res) ? res : (res?.data ?? []);
          setUsers(data.map(mapStudentToUser));
          return;
        }

        if (roleFilter === "INSTRUCTOR" || roleFilter === "ADMINISTRATOR") {
          const apiRole = roleFilter === "ADMINISTRATOR" ? "ADMIN" : roleFilter;
          const res = await getStaffs({ role: apiRole });
          const data = res?.data ?? [];
          setUsers(data.map(mapStaffToUser));
          return;
        }
      } catch (err) {
        console.error("fetch users error:", err);
      }
    }

    fetchUsers();
  }, [roleFilter]);

  // Filter out current user from list
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Exclude current logged-in user
      if (currentUser) {
        const currentId =
          currentUser.type === "STUDENT"
            ? currentUser.student_code
            : String(currentUser.id);
        if (user.id === currentId) return false;
      }

      const fullName = `${user.first_name} ${user.last_name}`.trim();
      const matchesSearch =
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter, currentUser]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / itemsPerPage),
  );
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage((cp) =>
      Math.min(cp, Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage))),
    );
  }, [filteredUsers.length]);

  // ============================================================
  // EDIT MODAL FUNCTIONS
  // ============================================================
  function openEdit(user: User) {
    setEditingUser(user);
    setEditId(user.id);
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditActive(user.is_active ? "ACTIVE" : "INACTIVE");
    setEditErrors({});
  }

  function validateEditForm(): boolean {
    const errors: FormErrors = {};

    if (!editFirstName.trim()) {
      errors.first_name = ERROR_MESSAGES.firstName.required;
    } else if (editFirstName.length > USER_VALIDATION_CONFIG.firstName.max) {
      errors.first_name = ERROR_MESSAGES.firstName.maxLength;
    }

    if (!editLastName.trim()) {
      errors.last_name = ERROR_MESSAGES.lastName.required;
    } else if (editLastName.length > USER_VALIDATION_CONFIG.lastName.max) {
      errors.last_name = ERROR_MESSAGES.lastName.maxLength;
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveEdit() {
    if (!editingUser || !validateEditForm()) return;

    setIsSaving(true);

    // Check if user is ADMIN (cannot change is_active)
    const isAdminUser = editingUser.role === "ADMINISTRATOR";

    // Optimistic update
    setUsers((prev) =>
      (prev ?? []).map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              first_name: editFirstName,
              last_name: editLastName,
              // Don't update is_active for ADMIN
              is_active: isAdminUser ? u.is_active : editActive === "ACTIVE",
            }
          : u,
      ),
    );

    try {
      if (editingUser.role === "STUDENT") {
        await apiUpdateUser(editingUser.id, {
          first_name: editFirstName,
          last_name: editLastName,
          is_active: editActive === "ACTIVE",
        });
      } else {
        // For staff, only include is_active if NOT ADMIN
        const updatePayload: any = {
          first_name: editFirstName,
          last_name: editLastName,
        };
        if (!isAdminUser) {
          updatePayload.is_active = editActive === "ACTIVE";
        }
        await apiUpdateStaff(editingUser.id, updatePayload);
      }
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user on server:", error);
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================================
  // CREATE STAFF MODAL FUNCTIONS
  // ============================================================
  function openCreateModal(role: "INSTRUCTOR" | "ADMIN") {
    setCreateRole(role);
    setCreateEmail("");
    setCreatePassword("");
    setCreateConfirmPassword("");
    setCreateFirstName("");
    setCreateLastName("");
    setCreateErrors({});
    setShowCreateModal(true);
  }

  async function validateCreateForm(): Promise<boolean> {
    const errors: FormErrors = {};

    // First name
    if (!createFirstName.trim()) {
      errors.first_name = ERROR_MESSAGES.firstName.required;
    } else if (createFirstName.length > USER_VALIDATION_CONFIG.firstName.max) {
      errors.first_name = ERROR_MESSAGES.firstName.maxLength;
    }

    // Last name
    if (!createLastName.trim()) {
      errors.last_name = ERROR_MESSAGES.lastName.required;
    } else if (createLastName.length > USER_VALIDATION_CONFIG.lastName.max) {
      errors.last_name = ERROR_MESSAGES.lastName.maxLength;
    }

    // Email
    if (!createEmail.trim()) {
      errors.email = ERROR_MESSAGES.email.required;
    } else if (createEmail.length > USER_VALIDATION_CONFIG.email.max) {
      errors.email = ERROR_MESSAGES.email.maxLength;
    } else if (!EMAIL_REGEX.test(createEmail)) {
      errors.email = ERROR_MESSAGES.email.invalid;
    }

    // Password
    if (!createPassword) {
      errors.password = ERROR_MESSAGES.password.required;
    } else if (createPassword.length < USER_VALIDATION_CONFIG.password.min) {
      errors.password = ERROR_MESSAGES.password.minLength;
    }

    // Confirm password
    if (createPassword !== createConfirmPassword) {
      errors.confirmPassword = ERROR_MESSAGES.password.mismatch;
    }

    setCreateErrors(errors);

    // If basic validation passes, check email duplicate
    if (Object.keys(errors).length === 0) {
      const emailExists = await checkEmailExists(createEmail);
      if (emailExists) {
        setCreateErrors({ email: ERROR_MESSAGES.email.duplicate });
        return false;
      }
    }

    return Object.keys(errors).length === 0;
  }

  async function handleCreateStaff() {
    const isValid = await validateCreateForm();
    if (!isValid) return;

    setIsCreating(true);

    try {
      await apiCreateStaff({
        email: createEmail,
        password: createPassword,
        first_name: createFirstName,
        last_name: createLastName,
        role: createRole,
        is_active: true,
      });

      // Refresh list
      const apiRole = createRole === "ADMIN" ? "ADMINISTRATOR" : createRole;
      setRoleFilter(apiRole as RoleFilter);
      setShowCreateModal(false);

      // Re-fetch
      const res = await getStaffs({ role: createRole });
      const data = res?.data ?? [];
      setUsers(data.map(mapStaffToUser));
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setCreateErrors({ email: ERROR_MESSAGES.email.duplicate });
      } else {
        console.error("Error creating staff:", error);
      }
    } finally {
      setIsCreating(false);
    }
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
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setRoleFilter("STUDENT");
                setCurrentPage(1);
              }}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                roleFilter === "STUDENT"
                  ? "bg-[#B7A3E3] text-white"
                  : "bg-white border-2 border-[#B7A3E3] text-[#B7A3E3] hover:bg-purple-50"
              }`}
            >
              นักเรียน
            </button>

            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setRoleFilter("INSTRUCTOR");
                setCurrentPage(1);
              }}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                roleFilter === "INSTRUCTOR"
                  ? "bg-[#B7A3E3] text-white"
                  : "bg-white border-2 border-[#B7A3E3] text-[#B7A3E3] hover:bg-purple-50"
              }`}
            >
              อาจารย์
            </button>

            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setRoleFilter("ADMINISTRATOR");
                setCurrentPage(1);
              }}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${
                roleFilter === "ADMINISTRATOR"
                  ? "bg-[#B7A3E3] text-white"
                  : "bg-white border-2 border-[#B7A3E3] text-[#B7A3E3] hover:bg-purple-50"
              }`}
            >
              ผู้ดูแลระบบ
            </button>

            {/* Add button for staff sections */}
            {(roleFilter === "INSTRUCTOR" ||
              roleFilter === "ADMINISTRATOR") && (
              <button
                onClick={() =>
                  openCreateModal(
                    roleFilter === "ADMINISTRATOR" ? "ADMIN" : "INSTRUCTOR",
                  )
                }
                className="p-2 bg-[#7C3AED] text-white rounded-full hover:bg-[#6D28D9] transition-colors"
                title={`เพิ่ม${roleFilter === "INSTRUCTOR" ? "อาจารย์" : "ผู้ดูแลระบบ"}`}
              >
                <Plus size={20} />
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="ค้นหา"
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
                  <th className="px-6 py-4 text-left font-light">ID</th>
                  <th className="px-6 py-4 text-left font-light">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4 text-left font-light">สถานะ</th>
                  <th className="px-6 py-4 text-left font-light">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-700">{user.id}</td>
                    <td className="px-6 py-4 text-gray-700">{`${user.first_name} ${user.last_name}`}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.is_active
                            ? "bg-[#B7A3E3] text-white"
                            : "bg-white text-[#B7A3E3]"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
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
                <div
                  key={user.id}
                  className="p-4 border-b flex justify-between items-start gap-4"
                >
                  <div className="flex-1">
                    <div className="text-sm text-gray-500">ID: {user.id}</div>
                    <div className="font-medium text-gray-800">{`${user.first_name} ${user.last_name}`}</div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-md"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
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
              className={`w-8 h-8 rounded-lg font-semibold ${currentPage === i + 1 ? "bg-[#B7A3E3] text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-100"}`}
            >
              {i + 1}
            </button>
          ))}
          {totalPages > 5 && (
            <span className="text-gray-500 hidden sm:inline">...</span>
          )}
          {totalPages > 5 && (
            <button
              className="w-8 h-8 rounded-lg border border-gray-300 font-semibold hover:bg-gray-100"
              onClick={() => setCurrentPage(totalPages)}
            >
              {totalPages}
            </button>
          )}
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
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              {/* ID Field */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-black mb-2">
                  ID
                </label>
                <input
                  type="text"
                  value={editId}
                  disabled
                  className="w-full px-4 py-3 border-2 border-[#9264F5] rounded-2xl bg-gray-50 text-black cursor-not-allowed"
                />
              </div>

              {/* First Name Field */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-black mb-2">
                  ชื่อ{" "}
                  <span className="text-xs text-gray-400">
                    ({editFirstName.length}/
                    {USER_VALIDATION_CONFIG.firstName.max})
                  </span>
                </label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => {
                    setEditFirstName(e.target.value);
                    if (editErrors.first_name)
                      setEditErrors((p) => ({ ...p, first_name: undefined }));
                  }}
                  maxLength={USER_VALIDATION_CONFIG.firstName.max}
                  className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none transition-colors text-black ${
                    editErrors.first_name
                      ? "border-red-500"
                      : "border-[#9264F5] focus:border-[#B7A3E3]"
                  }`}
                />
                {editErrors.first_name && (
                  <p className="text-red-500 text-xs mt-1">
                    {editErrors.first_name}
                  </p>
                )}
              </div>

              {/* Last Name Field */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-black mb-2">
                  นามสกุล{" "}
                  <span className="text-xs text-gray-400">
                    ({editLastName.length}/{USER_VALIDATION_CONFIG.lastName.max}
                    )
                  </span>
                </label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => {
                    setEditLastName(e.target.value);
                    if (editErrors.last_name)
                      setEditErrors((p) => ({ ...p, last_name: undefined }));
                  }}
                  maxLength={USER_VALIDATION_CONFIG.lastName.max}
                  className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none transition-colors text-black ${
                    editErrors.last_name
                      ? "border-red-500"
                      : "border-[#9264F5] focus:border-[#B7A3E3]"
                  }`}
                />
                {editErrors.last_name && (
                  <p className="text-red-500 text-xs mt-1">
                    {editErrors.last_name}
                  </p>
                )}
              </div>

              {/* Status Toggle - Hidden for ADMIN users */}
              {editingUser.role !== "ADMINISTRATOR" && (
                <div className="mb-8">
                  <label className="block text-sm font-medium text-black mb-3">
                    สถานะ
                  </label>
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
              )}

              {/* Info message for ADMIN users */}
              {editingUser.role === "ADMINISTRATOR" && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center">
                  <p className="text-sm text-amber-700">
                    ผู้ดูแลระบบไม่สามารถเปลี่ยนสถานะได้
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingUser(null)}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 rounded-2xl font-medium border-2 border-gray-300 text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 rounded-2xl font-medium bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 size={18} className="animate-spin" />}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Staff Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                เพิ่ม{createRole === "INSTRUCTOR" ? "อาจารย์" : "ผู้ดูแลระบบ"}
              </h2>

              {/* Email Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-black mb-2">
                  อีเมล{" "}
                  <span className="text-xs text-gray-400">
                    ({createEmail.length}/{USER_VALIDATION_CONFIG.email.max})
                  </span>
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => {
                    setCreateEmail(e.target.value);
                    if (createErrors.email)
                      setCreateErrors((p) => ({ ...p, email: undefined }));
                  }}
                  maxLength={USER_VALIDATION_CONFIG.email.max}
                  className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none transition-colors text-black ${
                    createErrors.email
                      ? "border-red-500"
                      : "border-[#9264F5] focus:border-[#B7A3E3]"
                  }`}
                />
                {createErrors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {createErrors.email}
                  </p>
                )}
              </div>

              {/* First Name Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-black mb-2">
                  ชื่อ{" "}
                  <span className="text-xs text-gray-400">
                    ({createFirstName.length}/
                    {USER_VALIDATION_CONFIG.firstName.max})
                  </span>
                </label>
                <input
                  type="text"
                  value={createFirstName}
                  onChange={(e) => {
                    setCreateFirstName(e.target.value);
                    if (createErrors.first_name)
                      setCreateErrors((p) => ({ ...p, first_name: undefined }));
                  }}
                  maxLength={USER_VALIDATION_CONFIG.firstName.max}
                  className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none transition-colors text-black ${
                    createErrors.first_name
                      ? "border-red-500"
                      : "border-[#9264F5] focus:border-[#B7A3E3]"
                  }`}
                />
                {createErrors.first_name && (
                  <p className="text-red-500 text-xs mt-1">
                    {createErrors.first_name}
                  </p>
                )}
              </div>

              {/* Last Name Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-black mb-2">
                  นามสกุล{" "}
                  <span className="text-xs text-gray-400">
                    ({createLastName.length}/
                    {USER_VALIDATION_CONFIG.lastName.max})
                  </span>
                </label>
                <input
                  type="text"
                  value={createLastName}
                  onChange={(e) => {
                    setCreateLastName(e.target.value);
                    if (createErrors.last_name)
                      setCreateErrors((p) => ({ ...p, last_name: undefined }));
                  }}
                  maxLength={USER_VALIDATION_CONFIG.lastName.max}
                  className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none transition-colors text-black ${
                    createErrors.last_name
                      ? "border-red-500"
                      : "border-[#9264F5] focus:border-[#B7A3E3]"
                  }`}
                />
                {createErrors.last_name && (
                  <p className="text-red-500 text-xs mt-1">
                    {createErrors.last_name}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-black mb-2">
                  รหัสผ่าน{" "}
                  <span className="text-xs text-gray-400">
                    (อย่างน้อย {USER_VALIDATION_CONFIG.password.min} ตัวอักษร)
                  </span>
                </label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => {
                    setCreatePassword(e.target.value);
                    if (createErrors.password)
                      setCreateErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none transition-colors text-black ${
                    createErrors.password
                      ? "border-red-500"
                      : "border-[#9264F5] focus:border-[#B7A3E3]"
                  }`}
                />
                {createErrors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {createErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-black mb-2">
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  type="password"
                  value={createConfirmPassword}
                  onChange={(e) => {
                    setCreateConfirmPassword(e.target.value);
                    if (createErrors.confirmPassword)
                      setCreateErrors((p) => ({
                        ...p,
                        confirmPassword: undefined,
                      }));
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-2xl focus:outline-none transition-colors text-black ${
                    createErrors.confirmPassword
                      ? "border-red-500"
                      : "border-[#9264F5] focus:border-[#B7A3E3]"
                  }`}
                />
                {createErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {createErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 rounded-2xl font-medium border-2 border-gray-300 text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleCreateStaff}
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 rounded-2xl font-medium bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating && <Loader2 size={18} className="animate-spin" />}
                  สร้าง
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
