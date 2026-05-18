"use client";

import NavBar from "@/components/layout/NavBar";
import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  ChevronDown,
  Pencil,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { DEFAULT_FACULTY_CODE, FACULTY_MAP, getFacultyName } from "@/lib/faculty-map";
import { CURRICULUMS, DEFAULT_CURRICULUM_ID, getCurriculumName } from "@/config/curriculums";
import { DEFAULT_TITLE, THAI_TITLES } from "@/config/titles";
import {
  getUsers,
  updateUser as apiUpdateUser,
  checkStudentCodeExists,
  checkStudentEmailExists,
  createStudent as apiCreateStudent,
} from "@/features/student/student.api";
import {
  getStaffs,
  updateStaff as apiUpdateStaff,
  createStaff as apiCreateStaff,
  checkEmailExists,
} from "@/features/staff/staff.api";
import { apiFetch } from "@/lib/api";
import { AuthUser } from "@/lib/auth";
import { FIELD_LIMITS } from "@/config/fieldLimits";

// ============================================================
// VALIDATION CONFIG — Centralized limits and messages
// ============================================================
const USER_VALIDATION_CONFIG = {
  firstName: { min: 1, max: FIELD_LIMITS.firstName },
  lastName: { min: 1, max: FIELD_LIMITS.lastName },
  email: { max: FIELD_LIMITS.email },
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
  title: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: RoleFilter;
  email?: string;
  facultyCode: number;
  curriculumId?: string;
}

interface FormErrors {
  title?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface StudentUserResponse {
  student_code: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  email?: string;
  facultyCode?: number;
  curriculumId?: string;
}

interface StaffUserResponse {
  staff_users_id: string | number;
  title?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  role?: "ADMIN" | "INSTRUCTOR" | "ADMINISTRATOR" | "STUDENT";
  email?: string;
  facultyCode?: number;
  curriculumId?: string;
}

interface StaffUpdatePayload {
  email: string;
  title: string;
  first_name: string;
  last_name: string;
  facultyCode: number;
  curriculumId: string;
  is_active?: boolean;
  password?: string;
}

interface ApiErrorResponse {
  response?: {
    status?: number;
  };
}

function getApiStatus(error: unknown) {
  return (error as ApiErrorResponse)?.response?.status;
}

function mapStudentToUser(student: StudentUserResponse): User {
  return {
    id: student.student_code,
    title: student.title ?? DEFAULT_TITLE,
    first_name: student.first_name ?? "",
    last_name: student.last_name ?? "",
    is_active: !!student.is_active,
    role: "STUDENT",
    email: student.email,
    facultyCode: student.facultyCode ?? DEFAULT_FACULTY_CODE,
    curriculumId: student.curriculumId ?? DEFAULT_CURRICULUM_ID,
  };
}

function mapStaffToUser(staff: StaffUserResponse): User {
  return {
    id: String(staff.staff_users_id),
    title: staff.title ?? DEFAULT_TITLE,
    first_name: staff.first_name ?? "",
    last_name: staff.last_name ?? "",
    is_active: !!staff.is_active,
    role: staff.role === "ADMIN" ? "ADMINISTRATOR" : (staff.role as RoleFilter),
    email: staff.email,
    facultyCode: staff.facultyCode ?? DEFAULT_FACULTY_CODE,
    curriculumId: staff.curriculumId ?? DEFAULT_CURRICULUM_ID,
  };
}

function getStudentCohort(user: User) {
  if (user.role !== "STUDENT") return "";
  return user.id.match(/^\d{2}/)?.[0] ?? "";
}

// Email and Name validation regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[ก-๙\s]+$/;


export default function ManageUserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [curriculumFilter, setCurriculumFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  // Default to STUDENT (no "all" option per requirement)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("STUDENT");
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);

  // Edit modal states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editId, setEditId] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTitle, setEditTitle] = useState(DEFAULT_TITLE);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editFacultyCode, setEditFacultyCode] = useState<number>(DEFAULT_FACULTY_CODE);
  const [editCurriculumId, setEditCurriculumId] = useState<string>(DEFAULT_CURRICULUM_ID);
  const [editActive, setEditActive] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
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
  const [createFacultyCode, setCreateFacultyCode] = useState<number>(DEFAULT_FACULTY_CODE);
  const [createCurriculumId, setCreateCurriculumId] = useState<string>(DEFAULT_CURRICULUM_ID);
  const [createTitle, setCreateTitle] = useState("อาจารย์");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  // Create student modal states
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentTitle, setStudentTitle] = useState(DEFAULT_TITLE);
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentFacultyCode, setStudentFacultyCode] = useState<number>(DEFAULT_FACULTY_CODE);
  const [studentCurriculumId, setStudentCurriculumId] = useState<string>(DEFAULT_CURRICULUM_ID);
  const [studentErrors, setStudentErrors] = useState<FormErrors & { student_code?: string; facultyCode?: string }>({});
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const [fetching, setFetching] = useState(false);

  const [, setAuthError] = useState(false);

  // Fetch current user on mount
  useEffect(() => {
    apiFetch<AuthUser>("/auth/me")
      .then((user) => setCurrentUser(user))
      .catch(() => setAuthError(true));
  }, []);

  // Fetch users based on role filter
  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      setFetching(true);
      try {
        if (roleFilter === "STUDENT") {
          const res = await getUsers({ role: "" });
          if (cancelled) return;
          const data = (Array.isArray(res) ? res : (res?.data ?? [])) as StudentUserResponse[];
          setUsers(data.map(mapStudentToUser));
          return;
        }

        if (roleFilter === "INSTRUCTOR" || roleFilter === "ADMINISTRATOR") {
          const apiRole = roleFilter === "ADMINISTRATOR" ? "ADMIN" : roleFilter;
          const res = await getStaffs({ role: apiRole });
          if (cancelled) return;
          const data = res?.data ?? [];
          setUsers(data.map(mapStaffToUser));
          return;
        }
      } catch (err) {
        if (cancelled) return;
        console.error("fetch users error:", err);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [roleFilter, refreshKey]);

  // Filter out current user from list
  const filteredUsers = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const list = users.filter((user) => {
      // Exclude current logged-in user
      if (currentUser) {
        const currentId =
          currentUser.type === "STUDENT"
            ? currentUser.student_code
            : String(currentUser.id);
        if (user.id === currentId) return false;
      }

      const fullName = `${user.title} ${user.first_name} ${user.last_name}`.trim();
      const matchesSearch =
        !normalizedSearchTerm ||
        fullName.toLowerCase().includes(normalizedSearchTerm) ||
        user.id.toLowerCase().includes(normalizedSearchTerm) ||
        Boolean(user.email?.toLowerCase().includes(normalizedSearchTerm));

      const matchesFaculty =
        facultyFilter === "all" || String(user.facultyCode) === facultyFilter;
      const matchesCurriculum =
        curriculumFilter === "all" ||
        (user.curriculumId ?? DEFAULT_CURRICULUM_ID) === curriculumFilter;
      const matchesCohort =
        cohortFilter === "all" || getStudentCohort(user) === cohortFilter;

      return matchesSearch && matchesFaculty && matchesCurriculum && matchesCohort;
    });

    const collator = new Intl.Collator(["th", "en"], {
      sensitivity: "base",
      numeric: true,
    });

    list.sort((a, b) => {
      const aName = `${a.first_name} ${a.last_name}`.trim();
      const bName = `${b.first_name} ${b.last_name}`.trim();

      const nameCmp = collator.compare(aName, bName);
      if (nameCmp !== 0) return nameCmp;

      return collator.compare(a.id, b.id);
    });

    return list;
  }, [
    users,
    searchTerm,
    facultyFilter,
    curriculumFilter,
    cohortFilter,
    currentUser,
  ]);

  const facultyFilterOptions = useMemo(() => {
    const collator = new Intl.Collator(["th", "en"], {
      sensitivity: "base",
      numeric: true,
    });

    return Object.entries(FACULTY_MAP)
      .map(([code, name]) => ({
        code: Number(code),
        name,
      }))
      .sort((a, b) => collator.compare(a.name, b.name));
  }, []);

  const curriculumFilterOptions = useMemo(() => {
    const collator = new Intl.Collator(["th", "en"], {
      sensitivity: "base",
      numeric: true,
    });

    return CURRICULUMS.map((curriculum) => ({
      id: curriculum.id,
      name: getCurriculumName(curriculum.id),
    })).sort((a, b) => collator.compare(a.name, b.name));
  }, []);

  const cohortFilterOptions = useMemo(() => {
    const collator = new Intl.Collator(["th", "en"], {
      sensitivity: "base",
      numeric: true,
    });

    return Array.from(new Set(users.map(getStudentCohort).filter(Boolean))).sort(
      (a, b) => collator.compare(a, b),
    );
  }, [users]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / itemsPerPage),
  );
  const firstVisibleUser =
    filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastVisibleUser = Math.min(
    currentPage * itemsPerPage,
    filteredUsers.length,
  );
  const resultSummary =
    filteredUsers.length === 0
      ? "ยังไม่มีรายการ"
      : `แสดง ${firstVisibleUser}–${lastVisibleUser} จาก ${filteredUsers.length}`;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage((cp) =>
      Math.min(cp, Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage))),
    );
  }, [filteredUsers.length, itemsPerPage]);

  // ============================================================
  // EDIT MODAL FUNCTIONS
  // ============================================================
  function openEdit(user: User) {
    setEditingUser(user);
    setEditId(user.id);
    setEditEmail(user.email ?? "");
    setEditTitle(user.title || DEFAULT_TITLE);
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditFacultyCode(user.facultyCode ?? DEFAULT_FACULTY_CODE);
    setEditCurriculumId(user.curriculumId ?? DEFAULT_CURRICULUM_ID);
    setEditActive(user.is_active ? "ACTIVE" : "INACTIVE");
    setEditPassword("");
    setEditConfirmPassword("");
    setEditErrors({});
  }

  async function validateEditForm(): Promise<boolean> {
    const errors: FormErrors = {};
    const normalizedEmail = editEmail.trim();

    if (!editTitle.trim()) {
      errors.title = "กรุณาเลือกคำนำหน้า";
    }

    if (!normalizedEmail) {
      errors.email = ERROR_MESSAGES.email.required;
    } else if (normalizedEmail.length > USER_VALIDATION_CONFIG.email.max) {
      errors.email = ERROR_MESSAGES.email.maxLength;
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      errors.email = ERROR_MESSAGES.email.invalid;
    }

    if (!editFirstName.trim()) {
      errors.first_name = ERROR_MESSAGES.firstName.required;
    } else if (editFirstName.length > USER_VALIDATION_CONFIG.firstName.max) {
      errors.first_name = ERROR_MESSAGES.firstName.maxLength;
    } else if (!NAME_REGEX.test(editFirstName.trim())) {
      errors.first_name = "ชื่อต้องเป็นภาษาไทยเท่านั้น";
    }

    if (!editLastName.trim()) {
      errors.last_name = ERROR_MESSAGES.lastName.required;
    } else if (editLastName.length > USER_VALIDATION_CONFIG.lastName.max) {
      errors.last_name = ERROR_MESSAGES.lastName.maxLength;
    } else if (!NAME_REGEX.test(editLastName.trim())) {
      errors.last_name = "นามสกุลต้องเป็นภาษาไทยเท่านั้น";
    }

    const isChangingPassword = editPassword.length > 0 || editConfirmPassword.length > 0;
    if (isChangingPassword) {
      if (!editPassword) {
        errors.password = ERROR_MESSAGES.password.required;
      } else if (editPassword.length < USER_VALIDATION_CONFIG.password.min) {
        errors.password = ERROR_MESSAGES.password.minLength;
      }

      if (editPassword !== editConfirmPassword) {
        errors.confirmPassword = ERROR_MESSAGES.password.mismatch;
      }
    }


    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return false;

    const emailChanged = normalizedEmail !== (editingUser?.email ?? "");
    if (editingUser && emailChanged) {
      const emailExists =
        editingUser.role === "STUDENT"
          ? await checkStudentEmailExists(normalizedEmail, editingUser.id)
          : await checkEmailExists(normalizedEmail, editingUser.id);

      if (emailExists) {
        setEditErrors((p) => ({ ...p, email: ERROR_MESSAGES.email.duplicate }));
        return false;
      }
    }

    return true;
  }

  async function saveEdit() {
    if (!editingUser || !(await validateEditForm())) return;

    setIsSaving(true);

    // Check if user is ADMIN (cannot change is_active)
    const isAdminUser = editingUser.role === "ADMINISTRATOR";
    const normalizedEmail = editEmail.trim();
    const passwordToUpdate = editPassword;

    const updatedUser: User = {
      ...editingUser,
      email: normalizedEmail,
      title: editTitle,
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      facultyCode: editFacultyCode,
      curriculumId: editCurriculumId,
      // Don't update is_active for ADMIN
      is_active: isAdminUser ? editingUser.is_active : editActive === "ACTIVE",
    };

    try {
      if (editingUser.role === "STUDENT") {
        const updatePayload = {
          email: normalizedEmail,
          title: editTitle,
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          facultyCode: editFacultyCode,
          curriculumId: editCurriculumId,
          is_active: editActive === "ACTIVE",
          ...(passwordToUpdate ? { password: passwordToUpdate } : {}),
        };
        await apiUpdateUser(editingUser.id, updatePayload);
      } else {
        // For staff, include facultyCode; only include is_active if NOT ADMIN
        const updatePayload: StaffUpdatePayload = {
          email: normalizedEmail,
          title: editTitle,
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          facultyCode: editFacultyCode,
          curriculumId: editCurriculumId,
        };
        if (!isAdminUser) {
          updatePayload.is_active = editActive === "ACTIVE";
        }
        if (passwordToUpdate) {
          updatePayload.password = passwordToUpdate;
        }
        await apiUpdateStaff(editingUser.id, updatePayload);
      }
      setUsers((prev) =>
        (prev ?? []).map((u) => (u.id === editingUser.id ? updatedUser : u)),
      );
      setEditingUser(null);
    } catch (error: unknown) {
      if (getApiStatus(error) === 409) {
        setEditErrors((p) => ({ ...p, email: ERROR_MESSAGES.email.duplicate }));
      }
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
    setCreateFacultyCode(DEFAULT_FACULTY_CODE);
    setCreateCurriculumId(DEFAULT_CURRICULUM_ID);
    setCreateTitle("อาจารย์");
    setCreateFirstName("");
    setCreateLastName("");
    setCreateErrors({});
    setShowCreateModal(true);
  }

  async function validateCreateForm(): Promise<boolean> {
    const errors: FormErrors = {};

    if (!createTitle.trim()) {
      errors.title = "กรุณาเลือกคำนำหน้า";
    }

    // First name
    if (!createFirstName.trim()) {
      errors.first_name = ERROR_MESSAGES.firstName.required;
    } else if (createFirstName.length > USER_VALIDATION_CONFIG.firstName.max) {
      errors.first_name = ERROR_MESSAGES.firstName.maxLength;
    } else if (!NAME_REGEX.test(createFirstName.trim())) {
      errors.first_name = "ชื่อต้องเป็นภาษาไทยเท่านั้น";
    }

    // Last name
    if (!createLastName.trim()) {
      errors.last_name = ERROR_MESSAGES.lastName.required;
    } else if (createLastName.length > USER_VALIDATION_CONFIG.lastName.max) {
      errors.last_name = ERROR_MESSAGES.lastName.maxLength;
    } else if (!NAME_REGEX.test(createLastName.trim())) {
      errors.last_name = "นามสกุลต้องเป็นภาษาไทยเท่านั้น";
    }


    // Email
    if (!createEmail.trim()) {
      errors.email = ERROR_MESSAGES.email.required;
    } else if (createEmail.length > USER_VALIDATION_CONFIG.email.max) {
      errors.email = ERROR_MESSAGES.email.maxLength;
    } else if (!EMAIL_REGEX.test(createEmail.trim())) {
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
      const emailExists = await checkEmailExists(createEmail.trim());
      if (emailExists) {
        setCreateErrors((p) => ({ ...p, email: ERROR_MESSAGES.email.duplicate }));
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
        email: createEmail.trim(),
        password: createPassword,
        facultyCode: createFacultyCode,
        curriculumId: createCurriculumId,
        title: createTitle,
        first_name: createFirstName.trim(),
        last_name: createLastName.trim(),
        role: createRole,
        is_active: true,
      });

      setShowCreateModal(false);
      const apiRole = createRole === "ADMIN" ? "ADMINISTRATOR" : createRole;
      if (roleFilter === apiRole) {
        setRefreshKey((k) => k + 1);
      } else {
        setRoleFilter(apiRole as RoleFilter);
      }
    } catch (error: unknown) {
      if (getApiStatus(error) === 409) {
        setCreateErrors((p) => ({ ...p, email: ERROR_MESSAGES.email.duplicate }));
      } else {
        console.error("Error creating staff:", error);
      }
    } finally {
      setIsCreating(false);
    }
  }

  // ============================================================
  // CREATE STUDENT MODAL FUNCTIONS
  // ============================================================
  function openCreateStudentModal() {
    setStudentCode("");
    setStudentEmail("");
    setStudentTitle(DEFAULT_TITLE);
    setStudentFirstName("");
    setStudentLastName("");
    setStudentFacultyCode(DEFAULT_FACULTY_CODE);
    setStudentCurriculumId(DEFAULT_CURRICULUM_ID);
    setStudentErrors({});
    setShowCreateStudentModal(true);
  }

  async function validateCreateStudentForm(): Promise<boolean> {
    const errors: FormErrors & { student_code?: string; facultyCode?: string } =
      {};

    if (!studentCode.trim()) {
      errors.student_code = "กรุณาระบุรหัสนักศึกษา";
    } else if (!/^\d{8}$/.test(studentCode.trim())) {
      errors.student_code = "รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก";
    }

    if (!studentTitle.trim()) {
      errors.title = "กรุณาเลือกคำนำหน้า";
    }

    if (!studentFirstName.trim()) {
      errors.first_name = ERROR_MESSAGES.firstName.required;
    } else if (
      studentFirstName.length > USER_VALIDATION_CONFIG.firstName.max
    ) {
      errors.first_name = ERROR_MESSAGES.firstName.maxLength;
    } else if (!NAME_REGEX.test(studentFirstName.trim())) {
      errors.first_name = "ชื่อต้องเป็นภาษาไทยเท่านั้น";
    }

    if (!studentLastName.trim()) {
      errors.last_name = ERROR_MESSAGES.lastName.required;
    } else if (studentLastName.length > USER_VALIDATION_CONFIG.lastName.max) {
      errors.last_name = ERROR_MESSAGES.lastName.maxLength;
    } else if (!NAME_REGEX.test(studentLastName.trim())) {
      errors.last_name = "นามสกุลต้องเป็นภาษาไทยเท่านั้น";
    }

    if (!studentEmail.trim()) {
      errors.email = ERROR_MESSAGES.email.required;
    } else if (studentEmail.length > USER_VALIDATION_CONFIG.email.max) {
      errors.email = ERROR_MESSAGES.email.maxLength;
    } else if (!EMAIL_REGEX.test(studentEmail.trim())) {
      errors.email = ERROR_MESSAGES.email.invalid;
    }

    setStudentErrors(errors);

    if (Object.keys(errors).length === 0) {
      const codeExists = await checkStudentCodeExists(studentCode);
      if (codeExists) {
        setStudentErrors((p) => ({ ...p, student_code: "รหัสนักศึกษานี้ถูกใช้งานแล้ว" }));
        return false;
      }

      const emailExists = await checkStudentEmailExists(studentEmail.trim());
      if (emailExists) {
        setStudentErrors((p) => ({ ...p, email: ERROR_MESSAGES.email.duplicate }));
        return false;
      }
    }

    return Object.keys(errors).length === 0;
  }

  async function handleCreateStudent() {
    const isValid = await validateCreateStudentForm();
    if (!isValid) return;

    setIsCreatingStudent(true);

    try {
      await apiCreateStudent({
        student_code: studentCode.trim(),
        email: studentEmail.trim(),
        facultyCode: studentFacultyCode,
        curriculumId: studentCurriculumId,
        title: studentTitle,
        first_name: studentFirstName.trim(),
        last_name: studentLastName.trim(),
      });

      setShowCreateStudentModal(false);
      if (roleFilter === "STUDENT") {
        setRefreshKey((k) => k + 1);
      } else {
        setRoleFilter("STUDENT");
      }
    } catch (error: unknown) {
      if (getApiStatus(error) === 409) {
        const errData = (error as { response?: { data?: { message?: string } } }).response?.data;
        const msg = errData?.message ?? "";
        if (msg.includes("email")) {
          setStudentErrors((p) => ({ ...p, email: ERROR_MESSAGES.email.duplicate }));
        } else {
          setStudentErrors((p) => ({ ...p, student_code: "รหัสนักศึกษานี้ถูกใช้งานแล้ว" }));
        }
      } else {
        console.error("Error creating student:", error);
      }
    } finally {
      setIsCreatingStudent(false);
    }
  }

  const showSequenceColumn = roleFilter !== "STUDENT";
  const activeFilterCount = [
    facultyFilter !== "all",
    curriculumFilter !== "all",
    roleFilter === "STUDENT" && cohortFilter !== "all",
  ].filter(Boolean).length;
  const currentRoleLabel =
    roleFilter === "STUDENT"
      ? "นักศึกษา"
      : roleFilter === "INSTRUCTOR"
        ? "อาจารย์"
        : "ผู้ดูแลระบบ";
  const statusLabel = (isActive: boolean) =>
    isActive ? "เปิดใช้งานสิทธิ์" : "ระงับสิทธิ์";
  const modalBackdropClass =
    "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-6 sm:p-6";
  const modalPanelClass =
    "relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6 max-h-[calc(100vh-3rem)] overflow-y-auto";
  const fieldGroupClass = "mb-4";
  const labelClass = "block text-sm font-semibold text-gray-800 mb-1.5";
  const baseFieldClass =
    "w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none";
  const validFieldClass = "border-[#9264F5] focus:border-[#B7A3E3]";
  const errorFieldClass = "border-red-500 focus:border-red-500";
  const selectFieldClass = `${baseFieldClass} appearance-none bg-white pr-10`;
  const dropdownIconClass =
    "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none";
  const selectControlClass =
    "h-10 w-full rounded-xl border border-[#E7DDF8] bg-white px-4 pr-10 text-sm font-medium text-[#2F2A3A] shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#B7A3E3]";

  function resetListFilters() {
    setSearchTerm("");
    setFacultyFilter("all");
    setCurriculumFilter("all");
    setCohortFilter("all");
    setCurrentPage(1);
  }

  function selectRole(nextRole: RoleFilter) {
    resetListFilters();
    setRoleFilter(nextRole);
  }

  return (
    <NavBar>
      <div className="min-h-screen w-full bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#7C5BD9]">
                ผู้ดูแลระบบ
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-[#2F2A3A] sm:text-3xl">
                จัดการข้อมูลผู้ใช้
              </h1>
              <p className="mt-2 text-sm font-normal text-[#7A7287]">
                เพิ่ม แก้ไข และจัดการสิทธิ์ของนักศึกษา อาจารย์ และผู้ดูแลระบบ
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-[20rem]">
              <div className="rounded-xl bg-[#FAF8FF] px-4 py-3">
                <p className="text-sm font-semibold text-[#7C5BD9]">จำนวนรายการ</p>
                <p className="mt-1 text-2xl font-semibold text-[#2F2A3A]">
                  {filteredUsers.length}
                </p>
              </div>
              <div className="rounded-xl bg-[#FAF8FF] px-4 py-3">
                <p className="text-sm font-semibold text-[#7C5BD9]">ประเภท</p>
                <p className="mt-2 truncate text-lg font-semibold text-[#2F2A3A]">
                  {currentRoleLabel}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Filter and Search */}
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E7DDF8] sm:p-5">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap 2xl:shrink-0">
            <button
              onClick={() => {
                selectRole("STUDENT");
              }}
              className={`h-10 min-w-28 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9264F5] focus-visible:ring-offset-2 ${roleFilter === "STUDENT"
                ? "bg-[#B7A3E3] text-white"
                : "bg-[#F4EFFF] text-[#7C5BD9] hover:bg-[#E9E0FA]"
                }`}
            >
              นักศึกษา
            </button>

            <button
              onClick={() => {
                selectRole("INSTRUCTOR");
              }}
              className={`h-10 min-w-28 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9264F5] focus-visible:ring-offset-2 ${roleFilter === "INSTRUCTOR"
                ? "bg-[#B7A3E3] text-white"
                : "bg-[#F4EFFF] text-[#7C5BD9] hover:bg-[#E9E0FA]"
                }`}
            >
              อาจารย์
            </button>

            <button
              onClick={() => {
                selectRole("ADMINISTRATOR");
              }}
              className={`h-10 min-w-28 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9264F5] focus-visible:ring-offset-2 ${roleFilter === "ADMINISTRATOR"
                ? "bg-[#B7A3E3] text-white"
                : "bg-[#F4EFFF] text-[#7C5BD9] hover:bg-[#E9E0FA]"
                }`}
            >
              ผู้ดูแลระบบ
            </button>

            {/* Add button for STUDENT */}
            {roleFilter === "STUDENT" && (
              <button
                onClick={openCreateStudentModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#B7A3E3] text-white transition-colors hover:bg-[#9264F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9264F5] focus-visible:ring-offset-2"
                title="เพิ่มนักศึกษา"
              >
                <Plus size={18} />
              </button>
            )}

            {/* Add button for staff sections */}
            {(roleFilter === "INSTRUCTOR" ||
              roleFilter === "ADMINISTRATOR") && (
                <button
                  onClick={() =>
                    openCreateModal(
                      roleFilter === "ADMINISTRATOR" ? "ADMIN" : "INSTRUCTOR",
                    )
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#B7A3E3] text-white transition-colors hover:bg-[#9264F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9264F5] focus-visible:ring-offset-2"
                  title={`เพิ่ม${roleFilter === "INSTRUCTOR" ? "อาจารย์" : "ผู้ดูแลระบบ"}`}
                >
                  <Plus size={18} />
                </button>
              )}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center 2xl:min-w-0 2xl:flex-1 2xl:justify-end">
            <button
              onClick={() => setShowFilters((visible) => !visible)}
              className={`relative flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold shadow-sm transition-colors sm:w-auto sm:min-w-28 ${
                showFilters || activeFilterCount > 0
                  ? "bg-[#B7A3E3] text-white hover:bg-[#9264F5]"
                  : "bg-[#F4EFFF] text-[#7C5BD9] hover:bg-[#E9E0FA]"
              }`}
              aria-expanded={showFilters}
              aria-controls="manage-users-filters"
            >
              <SlidersHorizontal size={18} />
              ตัวกรอง
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-[#9264F5]">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="relative w-full sm:w-80 2xl:min-w-64 2xl:max-w-80 2xl:flex-1">
              <input
                type="text"
                placeholder="ค้นหา"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 w-full rounded-xl bg-[#FAF8FF] px-4 pr-11 text-sm font-medium text-[#2F2A3A] shadow-sm ring-1 ring-[#E7DDF8] placeholder:text-[#B7AFC6] focus:outline-none focus:ring-2 focus:ring-[#B7A3E3]"
                aria-label="ค้นหาผู้ใช้"
              />
              <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
                size={20}
              />
            </div>
          </div>
        </div>
        </div>

        {showFilters && (
          <div
            id="manage-users-filters"
            className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E7DDF8] sm:p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#2F2A3A]">เพิ่มตัวกรอง</h2>
                <p className="text-sm text-[#7A7287]">
                  เลือกจากข้อมูล{currentRoleLabel}ที่มีอยู่ในระบบ
                </p>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                title="ปิดตัวกรอง"
                aria-label="ปิดตัวกรอง"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
                roleFilter === "STUDENT" ? "lg:grid-cols-3" : ""
              }`}
            >
              {roleFilter === "STUDENT" && (
                <div>
                  <label className={labelClass}>รุ่น</label>
                  <div className="relative">
                    <select
                      value={cohortFilter}
                      onChange={(e) => {
                        setCohortFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={selectControlClass}
                    >
                      <option value="all">ทั้งหมด</option>
                      {cohortFilterOptions.map((cohort) => (
                        <option key={cohort} value={cohort}>
                          {cohort}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={dropdownIconClass} size={18} />
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>สำนักวิชา</label>
                <div className="relative">
                  <select
                    value={facultyFilter}
                    onChange={(e) => {
                      setFacultyFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={selectControlClass}
                  >
                    <option value="all">ทั้งหมด</option>
                    {facultyFilterOptions.map((faculty) => (
                      <option key={faculty.code} value={faculty.code}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
              </div>

              <div>
                <label className={labelClass}>หลักสูตร</label>
                <div className="relative">
                  <select
                    value={curriculumFilter}
                    onChange={(e) => {
                      setCurriculumFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={selectControlClass}
                  >
                    <option value="all">ทั้งหมด</option>
                    {curriculumFilterOptions.map((curriculum) => (
                      <option key={curriculum.id} value={curriculum.id}>
                        {curriculum.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={resetListFilters}
                disabled={activeFilterCount === 0 && searchTerm.trim() === ""}
                className="h-11 rounded-xl bg-[#F4EFFF] px-5 text-sm font-semibold text-[#7C5BD9] transition-colors hover:bg-[#E9E0FA] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        )}

        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex h-10 w-fit items-center rounded-xl bg-white px-4 text-sm font-medium text-[#514667] shadow-sm ring-1 ring-[#E7DDF8]">
            {fetching ? "กำลังโหลดข้อมูล..." : resultSummary}
          </span>

          <label className="relative block w-full sm:w-44">
            <span className="sr-only">จำนวนคนต่อหน้า</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={selectControlClass}
              title="จำนวนต่อหน้า"
            >
              <option value={25}>แสดง 25 คน</option>
              <option value={50}>แสดง 50 คน</option>
              <option value={100}>แสดง 100 คน</option>
              <option value={200}>แสดง 200 คน</option>
              <option value={500}>แสดง 500 คน</option>
            </select>
            <ChevronDown className={dropdownIconClass} size={17} />
          </label>
        </div>

        {/* Table area: loading / empty / data */}
        <div className="w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
          {fetching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-[#B7A3E3]" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-[#7A7287]">
                {searchTerm.trim() ||
                facultyFilter !== "all" ||
                curriculumFilter !== "all" ||
                (roleFilter === "STUDENT" && cohortFilter !== "all")
                  ? "ไม่พบผลลัพธ์ที่ตรงกับการค้นหา"
                  : `ยังไม่มีข้อมูล${currentRoleLabel}`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] hidden table-fixed sm:table">
                <colgroup>
                  <col className={showSequenceColumn ? "w-[7%]" : "w-[13%]"} />
                  <col className={showSequenceColumn ? "w-[24%]" : "w-[22%]"} />
                  <col className={showSequenceColumn ? "w-[24%]" : "w-[24%]"} />
                  <col className={showSequenceColumn ? "w-[20%]" : "w-[21%]"} />
                  <col className="w-[10rem]" />
                  <col className="w-[5rem]" />
                </colgroup>
                <thead>
                  <tr className="bg-[#B7A3E3] text-white">
                    <th className="px-5 py-4 text-left text-[15px] font-semibold">
                      {showSequenceColumn ? "ลำดับ" : "รหัสนักศึกษา"}
                    </th>
                    <th className="px-5 py-4 text-left text-[15px] font-semibold">ชื่อ-นามสกุล</th>
                    <th className="px-5 py-4 text-left text-[15px] font-semibold">สำนักวิชา</th>
                    <th className="px-5 py-4 text-left text-[15px] font-semibold">หลักสูตร</th>
                    <th className="px-3 py-4 text-center text-[15px] font-semibold">สถานะ</th>
                    <th className="px-3 py-4 text-center text-[15px] font-semibold">แก้ไข</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8FB]">
                  {paginatedUsers.map((user, index) => (
                    <tr key={user.id} className="text-[15px] hover:bg-[#FAF8FF]">
                      <td className="px-5 py-4 font-normal text-[#2F2A3A]">
                        {showSequenceColumn ? (currentPage - 1) * itemsPerPage + index + 1 : user.id}
                      </td>
                      <td className="px-5 py-4 font-normal text-[#2F2A3A]">{`${user.title} ${user.first_name} ${user.last_name}`}</td>
                      <td className="px-5 py-4 font-normal text-[#514667]">{getFacultyName(user.facultyCode ?? DEFAULT_FACULTY_CODE)}</td>
                      <td className="px-5 py-4 font-normal text-[#514667]">{getCurriculumName(user.curriculumId)}</td>
                      <td className="px-3 py-4 text-center">
                        <span
                          className={`inline-flex min-w-28 justify-center rounded-full px-3 py-1 text-[15px] font-normal ${user.is_active
                            ? "bg-[#B7A3E3] text-white"
                            : "border border-[#D9CCF2] bg-white text-[#7C5BD9]"
                            }`}
                        >
                          {statusLabel(user.is_active)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <button
                          onClick={() => openEdit(user)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D9CCF2] text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF]"
                          title="แก้ไขข้อมูล"
                          aria-label="แก้ไขข้อมูล"
                        >
                          <Pencil size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <div className="sm:hidden">
                {paginatedUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex items-start justify-between gap-4 border-b border-[#EFE8FB] p-4"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-normal text-[#7A7287]">
                        {user.role === "STUDENT"
                          ? `รหัสนักศึกษา: ${user.id}`
                          : `ลำดับ: ${(currentPage - 1) * itemsPerPage + index + 1}`}
                      </div>
                      <div className="text-[15px] font-normal text-[#2F2A3A]">{`${user.title} ${user.first_name} ${user.last_name}`}</div>
                      <span
                        className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[15px] font-normal ${user.is_active
                          ? "bg-[#B7A3E3] text-white"
                          : "border border-[#D9CCF2] bg-white text-[#7C5BD9]"
                          }`}
                      >
                        {statusLabel(user.is_active)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <button
                        onClick={() => openEdit(user)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D9CCF2] text-[#7C5BD9] hover:bg-[#F4EFFF]"
                        title="แก้ไขข้อมูล"
                        aria-label="แก้ไขข้อมูล"
                      >
                        <Pencil size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredUsers.length > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="flex items-center gap-1.5">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] shadow-sm transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-80"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="หน้าก่อนหน้า"
                aria-label="หน้าก่อนหน้า"
              >
                <ChevronLeft size={18} strokeWidth={2.4} />
              </button>
              <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#B7A3E3] px-3 text-sm font-semibold text-white shadow-sm">
                {currentPage}
              </span>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] shadow-sm transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-80"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="หน้าถัดไป"
                aria-label="หน้าถัดไป"
              >
                <ChevronRight size={18} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingUser && (
          <div className={modalBackdropClass}>
            <div className={modalPanelClass}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={isSaving}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="ปิดหน้าต่างแก้ไข"
                title="ปิด"
              >
                <X size={18} />
              </button>

              <div className="mb-5 pr-10">
                <h2 className="text-xl font-bold text-gray-900">
                  แก้ไขข้อมูล{currentRoleLabel}
                </h2>
              </div>

              {editingUser.role === "STUDENT" && (
                <div className={fieldGroupClass}>
                  <label className={labelClass}>รหัสนักศึกษา</label>
                  <input
                    type="text"
                    value={editId}
                    disabled
                    className={`${baseFieldClass} cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500`}
                  />
                </div>
              )}

              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  อีเมล <span className="text-red-500">*</span>{" "}
                  <span className="text-xs font-medium text-gray-500">
                    ({editEmail.length}/{USER_VALIDATION_CONFIG.email.max})
                  </span>
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => {
                    setEditEmail(e.target.value);
                    if (editErrors.email)
                      setEditErrors((p) => ({ ...p, email: undefined }));
                  }}
                  maxLength={USER_VALIDATION_CONFIG.email.max}
                  className={`${baseFieldClass} ${
                    editErrors.email ? errorFieldClass : validFieldClass
                  }`}
                />
                {editErrors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {editErrors.email}
                  </p>
                )}
              </div>

              {/* Title Field */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  คำนำหน้า <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value);
                      if (editErrors.title)
                        setEditErrors((p) => ({ ...p, title: undefined }));
                    }}
                    className={`${selectFieldClass} ${
                      editErrors.title
                        ? errorFieldClass
                        : validFieldClass
                    }`}
                  >
                    {THAI_TITLES.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
                {editErrors.title && (
                  <p className="text-red-500 text-xs mt-1">{editErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {/* First Name Field */}
                <div className={fieldGroupClass}>
                  <label className={labelClass}>
                    ชื่อ <span className="text-red-500">*</span>{" "}
                    <span className="text-xs font-medium text-gray-500">
                      ({editFirstName.length}/
                      {USER_VALIDATION_CONFIG.firstName.max})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^ก-๙\s]/g, "");
                      setEditFirstName(value);
                      if (editErrors.first_name)
                        setEditErrors((p) => ({ ...p, first_name: undefined }));
                    }}
                    maxLength={USER_VALIDATION_CONFIG.firstName.max}
                    className={`${baseFieldClass} ${editErrors.first_name
                      ? errorFieldClass
                      : validFieldClass
                      }`}
                  />
                  {editErrors.first_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {editErrors.first_name}
                    </p>
                  )}
                </div>

                {/* Last Name Field */}
                <div className={fieldGroupClass}>
                  <label className={labelClass}>
                    นามสกุล <span className="text-red-500">*</span>{" "}
                    <span className="text-xs font-medium text-gray-500">
                      ({editLastName.length}/{USER_VALIDATION_CONFIG.lastName.max})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^ก-๙\s]/g, "");
                      setEditLastName(value);
                      if (editErrors.last_name)
                        setEditErrors((p) => ({ ...p, last_name: undefined }));
                    }}
                    maxLength={USER_VALIDATION_CONFIG.lastName.max}
                    className={`${baseFieldClass} ${editErrors.last_name
                      ? errorFieldClass
                      : validFieldClass
                      }`}
                  />
                  {editErrors.last_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {editErrors.last_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Faculty Dropdown */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  สำนักวิชา
                </label>
                <div className="relative">
                  <select
                    value={editFacultyCode}
                    onChange={(e) => setEditFacultyCode(Number(e.target.value))}
                    className={`${selectFieldClass} ${validFieldClass}`}
                  >
                    {Object.entries(FACULTY_MAP).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
              </div>

              {/* Curriculum Dropdown */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  หลักสูตร
                </label>
                <div className="relative">
                  <select
                    value={editCurriculumId}
                    onChange={(e) => setEditCurriculumId(e.target.value)}
                    className={`${selectFieldClass} ${validFieldClass}`}
                  >
                    {CURRICULUMS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCurriculumName(c.id)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <div className={fieldGroupClass}>
                  <label className={labelClass}>รหัสผ่านใหม่</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => {
                      setEditPassword(e.target.value);
                      if (editErrors.password || editErrors.confirmPassword)
                        setEditErrors((p) => ({
                          ...p,
                          password: undefined,
                          confirmPassword: undefined,
                        }));
                    }}
                    className={`${baseFieldClass} ${
                      editErrors.password ? errorFieldClass : validFieldClass
                    }`}
                  />
                  {editErrors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {editErrors.password}
                    </p>
                  )}
                </div>

                <div className={fieldGroupClass}>
                  <label className={labelClass}>
                    ยืนยันรหัสผ่านใหม่
                  </label>
                  <input
                    type="password"
                    value={editConfirmPassword}
                    onChange={(e) => {
                      setEditConfirmPassword(e.target.value);
                      if (editErrors.confirmPassword)
                        setEditErrors((p) => ({
                          ...p,
                          confirmPassword: undefined,
                        }));
                    }}
                    className={`${baseFieldClass} ${
                      editErrors.confirmPassword
                        ? errorFieldClass
                        : validFieldClass
                    }`}
                  />
                  {editErrors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {editErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Toggle - Hidden for ADMIN users */}
              {editingUser.role !== "ADMINISTRATOR" && (
                <div className="mb-6">
                  <label className={labelClass}>
                    สถานะ
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
                      <input
                        type="radio"
                        name="edit-user-status"
                        value="ACTIVE"
                        checked={editActive === "ACTIVE"}
                        onChange={() => setEditActive("ACTIVE")}
                        className="w-4 h-4 accent-[#B7A3E3] cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        เปิดใช้งานสิทธิ์
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
                      <input
                        type="radio"
                        name="edit-user-status"
                        value="INACTIVE"
                        checked={editActive === "INACTIVE"}
                        onChange={() => setEditActive("INACTIVE")}
                        className="w-4 h-4 accent-[#B7A3E3] cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-gray-900">ระงับสิทธิ์</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Info message for ADMIN users */}
              {editingUser.role === "ADMINISTRATOR" && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center">
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
                  className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-2.5 font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-6 py-2.5 font-semibold text-white shadow-lg transition-colors hover:bg-[#9264F5] disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={18} className="animate-spin" />}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Student Modal */}
        {showCreateStudentModal && (
          <div className={modalBackdropClass}>
            <div className={modalPanelClass}>
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                เพิ่มนักศึกษา
              </h2>

              {/* Student Code Field */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  รหัสนักศึกษา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={studentCode}
                  onChange={(e) => {
                    setStudentCode(e.target.value.replace(/\D/g, "").slice(0, 8));
                    if (studentErrors.student_code)
                      setStudentErrors((p) => ({ ...p, student_code: undefined }));
                  }}
                  maxLength={8}
                  className={`${baseFieldClass} ${
                    studentErrors.student_code
                      ? errorFieldClass
                      : validFieldClass
                  }`}
                />
                {studentErrors.student_code && (
                  <p className="text-red-500 text-xs mt-1">
                    {studentErrors.student_code}
                  </p>
                )}
              </div>

              {/* Title Field */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  คำนำหน้า <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={studentTitle}
                    onChange={(e) => {
                      setStudentTitle(e.target.value);
                      if (studentErrors.title)
                        setStudentErrors((p) => ({ ...p, title: undefined }));
                    }}
                    className={`${selectFieldClass} ${
                      studentErrors.title
                        ? errorFieldClass
                        : validFieldClass
                    }`}
                  >
                    {THAI_TITLES.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
                {studentErrors.title && (
                  <p className="text-red-500 text-xs mt-1">{studentErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {/* First Name Field */}
                <div className={fieldGroupClass}>
                  <label className={labelClass}>ชื่อ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={studentFirstName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^ก-๙\s]/g, "");
                      setStudentFirstName(value);
                      if (studentErrors.first_name)
                        setStudentErrors((p) => ({ ...p, first_name: undefined }));
                    }}
                    maxLength={USER_VALIDATION_CONFIG.firstName.max}
                    className={`${baseFieldClass} ${
                      studentErrors.first_name
                        ? errorFieldClass
                        : validFieldClass
                    }`}
                  />
                  {studentErrors.first_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {studentErrors.first_name}
                    </p>
                  )}
                </div>

                {/* Last Name Field */}
                <div className={fieldGroupClass}>
                  <label className={labelClass}>นามสกุล <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={studentLastName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^ก-๙\s]/g, "");
                      setStudentLastName(value);
                      if (studentErrors.last_name)
                        setStudentErrors((p) => ({ ...p, last_name: undefined }));
                    }}
                    maxLength={USER_VALIDATION_CONFIG.lastName.max}
                    className={`${baseFieldClass} ${
                      studentErrors.last_name
                        ? errorFieldClass
                        : validFieldClass
                    }`}
                  />
                  {studentErrors.last_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {studentErrors.last_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Faculty Dropdown */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  สำนักวิชา <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={studentFacultyCode}
                    onChange={(e) => setStudentFacultyCode(Number(e.target.value))}
                    className={`${selectFieldClass} ${validFieldClass}`}
                  >
                    {Object.entries(FACULTY_MAP).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
              </div>

              {/* Curriculum Dropdown */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  หลักสูตร
                </label>
                <div className="relative">
                  <select
                    value={studentCurriculumId}
                    onChange={(e) => setStudentCurriculumId(e.target.value)}
                    className={`${selectFieldClass} ${validFieldClass}`}
                  >
                    {CURRICULUMS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCurriculumName(c.id)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
              </div>

              {/* Email Field */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  อีเมล <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => {
                    setStudentEmail(e.target.value);
                    if (studentErrors.email)
                      setStudentErrors((p) => ({ ...p, email: undefined }));
                  }}
                  maxLength={USER_VALIDATION_CONFIG.email.max}
                  className={`${baseFieldClass} ${
                    studentErrors.email
                      ? errorFieldClass
                      : validFieldClass
                  }`}
                />
                {studentErrors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {studentErrors.email}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateStudentModal(false)}
                  disabled={isCreatingStudent}
                  className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-2.5 font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleCreateStudent}
                  disabled={isCreatingStudent}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-6 py-2.5 font-semibold text-white shadow-lg transition-colors hover:bg-[#9264F5] disabled:opacity-50"
                >
                  {isCreatingStudent && <Loader2 size={18} className="animate-spin" />}
                  สร้าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Staff Modal */}
        {showCreateModal && (
          <div className={modalBackdropClass}>
            <div className={modalPanelClass}>
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                เพิ่ม{createRole === "INSTRUCTOR" ? "อาจารย์" : "ผู้ดูแลระบบ"}
              </h2>

              {/* Email Field */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  อีเมล <span className="text-red-500">*</span>{" "}
                  <span className="text-xs font-medium text-gray-500">
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
                  className={`${baseFieldClass} ${createErrors.email
                    ? errorFieldClass
                    : validFieldClass
                    }`}
                />
                {createErrors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {createErrors.email}
                  </p>
                )}
              </div>

              {/* Title Field */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  คำนำหน้า <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    className={`${selectFieldClass} ${
                      createErrors.title
                        ? errorFieldClass
                        : validFieldClass
                    }`}
                  >
                    {THAI_TITLES.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
                {createErrors.title && (
                  <p className="text-red-500 text-xs mt-1">{createErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {/* First Name Field */}
                <div className={fieldGroupClass}>
                  <label className={labelClass}>
                    ชื่อ <span className="text-red-500">*</span>{" "}
                    <span className="text-xs font-medium text-gray-500">
                      ({createFirstName.length}/
                      {USER_VALIDATION_CONFIG.firstName.max})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={createFirstName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^ก-๙\s]/g, "");
                      setCreateFirstName(value);
                      if (createErrors.first_name)
                        setCreateErrors((p) => ({ ...p, first_name: undefined }));
                    }}
                    maxLength={USER_VALIDATION_CONFIG.firstName.max}
                    className={`${baseFieldClass} ${createErrors.first_name
                      ? errorFieldClass
                      : validFieldClass
                      }`}
                  />
                  {createErrors.first_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {createErrors.first_name}
                    </p>
                  )}
                </div>

                {/* Last Name Field */}
                <div className={fieldGroupClass}>
                  <label className={labelClass}>
                    นามสกุล <span className="text-red-500">*</span>{" "}
                    <span className="text-xs font-medium text-gray-500">
                      ({createLastName.length}/
                      {USER_VALIDATION_CONFIG.lastName.max})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={createLastName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^ก-๙\s]/g, "");
                      setCreateLastName(value);
                      if (createErrors.last_name)
                        setCreateErrors((p) => ({ ...p, last_name: undefined }));
                    }}
                    maxLength={USER_VALIDATION_CONFIG.lastName.max}
                    className={`${baseFieldClass} ${createErrors.last_name
                      ? errorFieldClass
                      : validFieldClass
                      }`}
                  />
                  {createErrors.last_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {createErrors.last_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Faculty Dropdown */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  สำนักวิชา
                </label>
                <div className="relative">
                  <select
                    value={createFacultyCode}
                    onChange={(e) => setCreateFacultyCode(Number(e.target.value))}
                    className={`${selectFieldClass} ${validFieldClass}`}
                  >
                    {Object.entries(FACULTY_MAP).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
              </div>

              {/* Curriculum Dropdown */}
              <div className={fieldGroupClass}>
                <label className={labelClass}>
                  หลักสูตร
                </label>
                <div className="relative">
                  <select
                    value={createCurriculumId}
                    onChange={(e) => setCreateCurriculumId(e.target.value)}
                    className={`${selectFieldClass} ${validFieldClass}`}
                  >
                    {CURRICULUMS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCurriculumName(c.id)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={dropdownIconClass} size={18} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {/* Password Field */}
                <div className={fieldGroupClass}>
                  <label className={labelClass}>
                    รหัสผ่าน <span className="text-red-500">*</span>{" "}
                    <span className="text-xs font-medium text-gray-500">
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
                    className={`${baseFieldClass} ${createErrors.password
                      ? errorFieldClass
                      : validFieldClass
                      }`}
                  />
                  {createErrors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {createErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className={fieldGroupClass}>
                  <label className={labelClass}>
                    ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
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
                    className={`${baseFieldClass} ${createErrors.confirmPassword
                      ? errorFieldClass
                      : validFieldClass
                      }`}
                  />
                  {createErrors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {createErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-2.5 font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleCreateStaff}
                  disabled={isCreating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-6 py-2.5 font-semibold text-white shadow-lg transition-colors hover:bg-[#9264F5] disabled:opacity-50"
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
