"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Navbar from "@/components/layout/NavBar";
import {
  UserPlus,
  Upload,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  UsersRound,
  Lock,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useParams } from "next/navigation";
import { Student } from "@/types/student";
import { CourseOffering } from "@/types/course";
import { Instructor } from "@/types/staff";
import { formatInstructorName } from "@/utils/formatName";
import BulkUploadModal from "@/features/courseOffering/components/BulkUploadStudent";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AlertModal from "@/components/ui/AlertModal";
import CourseTabs from "@/components/course/CourseTabs";
import { AuthUser } from "@/types/auth";
import { DEFAULT_FACULTY_CODE, FACULTY_MAP, getFacultyName } from "@/lib/faculty-map";
import { CURRICULUMS, DEFAULT_CURRICULUM_ID, getCurriculumName } from "@/config/curriculums";
import { FIELD_LIMITS } from "@/config/fieldLimits";

// ============================================================
// CONFIGURATION CONSTANTS — Adjust limits here
// ============================================================
const STUDENT_CODE_LENGTH = 8;
const STUDENT_CODE_REGEX = /^\d{8}$/;
const EMAIL_MAX_LENGTH = FIELD_LIMITS.email;
const FIRST_NAME_MAX_LENGTH = FIELD_LIMITS.firstName;
const LAST_NAME_MAX_LENGTH = FIELD_LIMITS.lastName;
const PASSWORD_MIN_LENGTH = 8;

// Email and Name validation regex pattern
const EMAIL_REGEX = /^[^\s@]+@mail\.wu\.ac\.th$/;
const NAME_REGEX = /^[ก-๙\s]+$/;
const STUDENT_TITLES = ["นาย", "นางสาว", "นาง"] as const;
const DEFAULT_STUDENT_TITLE = STUDENT_TITLES[0];
const INSTRUCTOR_PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const STUDENT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function formatCurriculumDisplay(curriculumId: string | null | undefined) {
  return getCurriculumName(
    curriculumId,
    curriculumId ? `ไม่รู้จัก (${curriculumId})` : "-",
  );
}

// ============================================================
// VALIDATION ERROR MESSAGES (Thai)
// ============================================================
const ERROR_MESSAGES = {
  student_code: {
    required: "กรุณากรอกรหัสนักศึกษา",
    format: `รหัสนักศึกษาต้องเป็นตัวเลข 8 หลักเท่านั้น`,
    duplicate: "รหัสนักศึกษานี้มีอยู่แล้ว",
  },
  email: {
    required: "กรุณากรอกอีเมล",
    maxLength: `อีเมลไม่เกิน ${EMAIL_MAX_LENGTH} ตัวอักษร`,
    invalid: "อีเมลต้องเป็น @mail.wu.ac.th เท่านั้น",
    duplicate: "อีเมลนี้ถูกใช้แล้ว",
  },
  first_name: {
    required: "กรุณากรอกชื่อ",
    maxLength: `ชื่อไม่เกิน ${FIRST_NAME_MAX_LENGTH} ตัวอักษร`,
  },
  last_name: {
    required: "กรุณากรอกนามสกุล",
    maxLength: `นามสกุลไม่เกิน ${LAST_NAME_MAX_LENGTH} ตัวอักษร`,
  },
  password: {
    required: "กรุณากรอกรหัสผ่าน",
    minLength: `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`,
    mismatch: "รหัสผ่านไม่ตรงกัน",
  },
};

// ============================================================
// TYPES
// ============================================================
interface FormErrors {
  student_code?: string;
  email?: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  confirmPassword?: string;
}

interface DuplicateCheckResponse {
  exists: boolean;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as {
    response?: { data?: { message?: unknown } };
    message?: unknown;
  };

  // Prefer the server's error message from the response body over the generic
  // AxiosError.message (which is just "Request failed with status code N").
  const serverMessage = apiError.response?.data?.message;
  if (Array.isArray(serverMessage) && typeof serverMessage[0] === "string") {
    return serverMessage[0];
  }
  if (typeof serverMessage === "string" && serverMessage.trim()) {
    return serverMessage;
  }

  if (error instanceof Error && error.message) return error.message;
  if (typeof apiError.message === "string" && apiError.message.trim()) {
    return apiError.message;
  }

  return fallback;
}

export default function SimpleShowUsers() {
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddInstructorModal, setShowAddInstructorModal] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState<string>(DEFAULT_STUDENT_TITLE);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentConfirmPassword, setStudentConfirmPassword] = useState("");
  const [addFacultyCode, setAddFacultyCode] = useState<number>(DEFAULT_FACULTY_CODE);
  const [addCurriculumId, setAddCurriculumId] = useState<string>(DEFAULT_CURRICULUM_ID);
  const [allInstructors, setAllInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [modalInstructorFacultyFilter, setModalInstructorFacultyFilter] =
    useState("ALL");
  const [modalInstructorCurriculumFilter, setModalInstructorCurriculumFilter] =
    useState("ALL");

  // Validation errors state
  const [errors, setErrors] = useState<FormErrors>({});

  const [user, setUser] = useState<AuthUser | null>(null);

  // Duplicate check loading states
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);
  const [isAddingInstructor, setIsAddingInstructor] = useState(false);
  const [instructorPage, setInstructorPage] = useState(1);
  const [instructorItemsPerPage, setInstructorItemsPerPage] = useState(10);
  const [studentPage, setStudentPage] = useState(1);
  const [studentItemsPerPage, setStudentItemsPerPage] = useState(25);

  // Unenroll confirmation state
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState(false);
  const [unenrollingStudent, setUnenrollingStudent] = useState<{ code: string; name: string } | null>(null);
  const [isUnenrolling, setIsUnenrolling] = useState(false);
  const [isRemoveInstructorModalOpen, setIsRemoveInstructorModalOpen] =
    useState(false);
  const [removingInstructor, setRemovingInstructor] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isRemovingInstructor, setIsRemovingInstructor] = useState(false);

  // Alert state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "error" | "success" | "warning";
  }>({ isOpen: false, title: "", message: "", variant: "error" });

  const [offering, setOffering] = useState<CourseOffering | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const isMemberDeleteLocked = offering?.member_delete_locked ?? false;
  const deleteBlockedMessage =
    "มีการสร้างชุดข้อสอบหรือมีการจัดสอบในรายวิชานี้แล้ว ระบบไม่อนุญาตให้ลบอาจารย์หรือนักศึกษาออกจากรายวิชา";

  const { offeringId } = useParams<{ offeringId: string }>();

  const fetchStudents = useCallback(async () => {
    if (!offeringId) return;
    try {
      setLoadingStudents(true);
      const data = await apiFetch<Student[]>(
        `course-offerings/${offeringId}/students`,
      );
      setStudents(data);
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [offeringId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ============================================================
  // VALIDATION HELPERS
  // ============================================================

  /**
   * Validates student code synchronously (required + 8 digits format)
   */
  const validateStudentCode = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return ERROR_MESSAGES.student_code.required;
    if (!STUDENT_CODE_REGEX.test(trimmed))
      return ERROR_MESSAGES.student_code.format;
    return undefined;
  };

  /**
   * Validates email synchronously (required + @mail.wu.ac.th domain)
   */
  const validateEmail = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return ERROR_MESSAGES.email.required;
    if (trimmed.length > EMAIL_MAX_LENGTH) return ERROR_MESSAGES.email.maxLength;
    if (!EMAIL_REGEX.test(trimmed)) return ERROR_MESSAGES.email.invalid;
    return undefined;
  };

  /**
   * Validates first name synchronously (required + max length)
   */
  const validateFirstName = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return ERROR_MESSAGES.first_name.required;
    if (trimmed.length > FIRST_NAME_MAX_LENGTH)
      return ERROR_MESSAGES.first_name.maxLength;
    if (!NAME_REGEX.test(trimmed))
      return "ชื่อต้องเป็นภาษาไทยเท่านั้น";
    return undefined;
  };

  /**
   * Validates last name synchronously (required + max length)
   */
  const validateLastName = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return ERROR_MESSAGES.last_name.required;
    if (trimmed.length > LAST_NAME_MAX_LENGTH)
      return ERROR_MESSAGES.last_name.maxLength;
    if (!NAME_REGEX.test(trimmed))
      return "นามสกุลต้องเป็นภาษาไทยเท่านั้น";
    return undefined;
  };

  /**
   * Checks if a student code already exists in this offering
   */
  const checkCodeDuplicate = useCallback(
    async (code: string): Promise<boolean> => {
      if (!code.trim() || !offeringId) return false;

      try {
        setIsCheckingCode(true);
        const response = await apiFetch<DuplicateCheckResponse>(
          `/course-offerings/${offeringId}/students/check-code?student_code=${encodeURIComponent(code.trim())}`,
        );
        return response.exists;
      } catch (err) {
        console.error("Failed to check code duplicate:", err);
        return false; // Allow submission if check fails
      } finally {
        setIsCheckingCode(false);
      }
    },
    [offeringId],
  );

  /**
   * Checks if an email already exists in this offering
   */
  const checkEmailDuplicate = useCallback(
    async (emailValue: string): Promise<boolean> => {
      if (!emailValue.trim() || !offeringId) return false;

      try {
        setIsCheckingEmail(true);
        const codeParam = studentId.trim()
          ? `&exclude_student_code=${encodeURIComponent(studentId.trim())}`
          : "";
        const response = await apiFetch<DuplicateCheckResponse>(
          `/course-offerings/${offeringId}/students/check-email?email=${encodeURIComponent(emailValue.trim())}${codeParam}`,
        );
        return response.exists;
      } catch (err) {
        console.error("Failed to check email duplicate:", err);
        return false;
      } finally {
        setIsCheckingEmail(false);
      }
    },
    [offeringId, studentId],
  );

  /**
   * Validates all fields including async duplicate checks
   */
  const validateForm = async (): Promise<boolean> => {
    const newErrors: FormErrors = {};

    // Sync validation first
    const codeError = validateStudentCode(studentId);
    const emailError = validateEmail(email);
    const firstNameError = validateFirstName(firstName);
    const lastNameError = validateLastName(lastName);

    if (codeError) newErrors.student_code = codeError;
    if (emailError) newErrors.email = emailError;
    if (!title.trim()) newErrors.title = "กรุณาเลือกคำนำหน้า";
    if (firstNameError) newErrors.first_name = firstNameError;
    if (lastNameError) newErrors.last_name = lastNameError;
    if (!studentPassword) {
      newErrors.password = ERROR_MESSAGES.password.required;
    } else if (studentPassword.length < PASSWORD_MIN_LENGTH) {
      newErrors.password = ERROR_MESSAGES.password.minLength;
    }
    if (studentPassword !== studentConfirmPassword) {
      newErrors.confirmPassword = ERROR_MESSAGES.password.mismatch;
    }

    // If sync validation failed, don't check duplicates
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    // Async duplicate checks (run in parallel for speed)
    const [codeExists, emailExists] = await Promise.all([
      checkCodeDuplicate(studentId),
      checkEmailDuplicate(email),
    ]);

    if (codeExists) {
      newErrors.student_code = ERROR_MESSAGES.student_code.duplicate;
    }

    if (emailExists) {
      newErrors.email = ERROR_MESSAGES.email.duplicate;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // INPUT HANDLERS with real-time validation
  // ============================================================

  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 8
    const value = e.target.value.replace(/\D/g, "").slice(0, STUDENT_CODE_LENGTH);
    setStudentId(value);
    setErrors((prev) => ({
      ...prev,
      student_code: validateStudentCode(value),
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setErrors((prev) => ({
      ...prev,
      email: validateEmail(value),
    }));
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const rawValue = e.target.value;
    //only letter and space
    const value = rawValue.replace(/[^ก-๙\s]/g, "");

    setFirstName(value);
    setErrors((prev) => ({
      ...prev,
      first_name: validateFirstName(value),
    }));
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const rawValue = e.target.value;
    //only letter and space
    const value = rawValue.replace(/[^ก-๙\s]/g, "");

    setLastName(value);
    setErrors((prev) => ({
      ...prev,
      last_name: validateLastName(value),
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStudentPassword(value);
    setErrors((prev) => ({
      ...prev,
      password:
        value.length === 0
          ? ERROR_MESSAGES.password.required
          : value.length < PASSWORD_MIN_LENGTH
            ? ERROR_MESSAGES.password.minLength
            : undefined,
      confirmPassword:
        studentConfirmPassword && value !== studentConfirmPassword
          ? ERROR_MESSAGES.password.mismatch
          : undefined,
    }));
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setStudentConfirmPassword(value);
    setErrors((prev) => ({
      ...prev,
      confirmPassword:
        studentPassword !== value ? ERROR_MESSAGES.password.mismatch : undefined,
    }));
  };

  const handleCancelAddStudent = () => {
    setShowAddStudentModal(false);
    setStudentId("");
    setEmail("");
    setTitle(DEFAULT_STUDENT_TITLE);
    setFirstName("");
    setLastName("");
    setStudentPassword("");
    setStudentConfirmPassword("");
    setAddFacultyCode(DEFAULT_FACULTY_CODE);
    setAddCurriculumId(DEFAULT_CURRICULUM_ID);
    setErrors({}); // Clear errors when closing modal
  };

  // ฟังก์ชันเพิ่มนักศึกษา
  const handleAddStudent = async () => {
    // Validate before submitting
    const isValid = await validateForm();

    if (!isValid) {
      return; // Errors are already set
    }

    setIsSubmitting(true);
    try {
      await apiFetch(`course-offerings/${offeringId}/students`, {
        method: "POST",
        data: {
          student_code: studentId.trim(),
          email: email.trim(),
          password: studentPassword,
          facultyCode: addFacultyCode,
          curriculumId: addCurriculumId,
          title,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      });
      await fetchStudents();
      handleCancelAddStudent();
    } catch (err: unknown) {
      console.error(err);
      setAlertState({
        isOpen: true,
        title: "เกิดข้อผิดพลาด",
        message: getErrorMessage(
          err,
          "ไม่สามารถเพิ่มนักศึกษาได้ กรุณาลองใหม่อีกครั้ง",
        ),
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ฟังก์ชันลบนักศึกษาออกจากรายวิชา (ไม่ลบข้อมูลนักศึกษาในระบบ)
  const handleUnenrollStudent = async (
    studentCode: string,
    studentName: string,
  ) => {
    if (isMemberDeleteLocked) {
      setAlertState({
        isOpen: true,
        title: "ไม่สามารถลบได้",
        message: deleteBlockedMessage,
        variant: "warning",
      });
      return;
    }

    setUnenrollingStudent({ code: studentCode, name: studentName });
    setIsUnenrollModalOpen(true);
  };

  const handleUnenrollConfirm = async () => {
    if (!unenrollingStudent) return;

    setIsUnenrolling(true);
    try {
      await apiFetch(`course-offerings/${offeringId}/students/${unenrollingStudent.code}`, {
        method: "DELETE",
      });
      await fetchStudents(); // Refresh list
      setIsUnenrollModalOpen(false);
      setUnenrollingStudent(null);
    } catch (err: unknown) {
      console.error("Failed to unenroll student:", err);
      setAlertState({
        isOpen: true,
        title: "เกิดข้อผิดพลาด",
        message: getErrorMessage(
          err,
          "ไม่สามารถลบนักศึกษาได้ กรุณาลองใหม่อีกครั้ง",
        ),
        variant: "error",
      });
    } finally {
      setIsUnenrolling(false);
    }
  };

  const handleRemoveInstructor = (staffUserId: string, instructorName: string) => {
    if (isMemberDeleteLocked) {
      setAlertState({
        isOpen: true,
        title: "ไม่สามารถลบได้",
        message: deleteBlockedMessage,
        variant: "warning",
      });
      return;
    }

    setRemovingInstructor({ id: staffUserId, name: instructorName });
    setIsRemoveInstructorModalOpen(true);
  };

  const handleRemoveInstructorConfirm = async () => {
    if (!removingInstructor) return;

    setIsRemovingInstructor(true);
    try {
      await apiFetch(
        `course-offerings/${offeringId}/instructors/${removingInstructor.id}`,
        {
          method: "DELETE",
        },
      );
      await fetchOffering();
      setIsRemoveInstructorModalOpen(false);
      setRemovingInstructor(null);
    } catch (err: unknown) {
      console.error("Failed to remove instructor:", err);
      setAlertState({
        isOpen: true,
        title: "เกิดข้อผิดพลาด",
        message: getErrorMessage(
          err,
          "ไม่สามารถลบอาจารย์ออกจากรายวิชาได้ กรุณาลองใหม่อีกครั้ง",
        ),
        variant: "error",
      });
    } finally {
      setIsRemovingInstructor(false);
    }
  };

  const fetchOffering = useCallback(async () => {
    if (!offeringId) return;
    try {
      const data = await apiFetch<CourseOffering>(
        `course-offerings/${offeringId}`,
      );
      setOffering(data);
    } catch {
      setOffering(null);
    }
  }, [offeringId]);

  const fetchInstructors = useCallback(async () => {
    try {
      setIsLoadingInstructors(true);
      const data = await apiFetch<Instructor[]>("/staff/instructors");
      setAllInstructors(data);
    } catch (err: unknown) {
      console.error("Failed to fetch instructors:", err);
      setAllInstructors([]);
      setAlertState({
        isOpen: true,
        title: "เกิดข้อผิดพลาด",
        message: getErrorMessage(
          err,
          "ไม่สามารถโหลดรายชื่ออาจารย์ได้ กรุณาลองใหม่อีกครั้ง",
        ),
        variant: "error",
      });
    } finally {
      setIsLoadingInstructors(false);
    }
  }, []);

  const handleCancelAddInstructor = () => {
    setShowAddInstructorModal(false);
    setSelectedInstructorId("");
    setModalInstructorFacultyFilter("ALL");
    setModalInstructorCurriculumFilter("ALL");
  };

  const handleAddInstructor = async () => {
    if (!selectedInstructorId) {
      setAlertState({
        isOpen: true,
        title: "กรุณาเลือกอาจารย์",
        message: "เลือกอาจารย์ที่ต้องการเพิ่มเข้ารายวิชา",
        variant: "warning",
      });
      return;
    }

    setIsAddingInstructor(true);
    try {
      await apiFetch(`course-offerings/${offeringId}/instructors`, {
        method: "POST",
        data: { staff_users_id: selectedInstructorId },
      });
      await fetchOffering();
      handleCancelAddInstructor();
    } catch (err: unknown) {
      console.error("Failed to add instructor:", err);
      setAlertState({
        isOpen: true,
        title: "เกิดข้อผิดพลาด",
        message: getErrorMessage(
          err,
          "ไม่สามารถเพิ่มอาจารย์ได้ กรุณาลองใหม่อีกครั้ง",
        ),
        variant: "error",
      });
    } finally {
      setIsAddingInstructor(false);
    }
  };

  //fetch instructors name
  useEffect(() => {
    fetchOffering();
  }, [fetchOffering]);

  useEffect(() => {
    apiFetch<AuthUser>("/auth/me")
      .then((user) => {
        setUser(user);
      })
      .catch((err) => {
        console.error("Failed to fetch user", err);
      });
  }, []);

  useEffect(() => {
    if (showAddInstructorModal) {
      fetchInstructors();
    }
  }, [fetchInstructors, showAddInstructorModal]);

  const isStudent =
    String(user?.type ?? user?.userType ?? "").toUpperCase() === "STUDENT";

  const assignedInstructorIds = useMemo(
    () =>
      new Set(
        (offering?.course_instructors ?? []).map((ci) =>
          String(ci.staff_users_id),
        ),
      ),
    [offering?.course_instructors],
  );

  const availableInstructors = useMemo(
    () =>
      allInstructors.filter(
        (instructor) =>
          !assignedInstructorIds.has(String(instructor.staff_users_id)),
      ),
    [allInstructors, assignedInstructorIds],
  );

  const modalInstructorFacultyOptions = useMemo(() => {
    return Object.keys(FACULTY_MAP)
      .map(Number)
      .sort((a, b) => a - b);
  }, []);

  const modalInstructorCurriculumOptions = useMemo(() => {
    return CURRICULUMS.filter(
      (curriculum) =>
        modalInstructorFacultyFilter === "ALL" ||
        curriculum.facultyCode === Number(modalInstructorFacultyFilter),
    );
  }, [modalInstructorFacultyFilter]);

  const filteredAvailableInstructors = useMemo(
    () =>
      availableInstructors.filter((instructor) => {
        const facultyCode = instructor.facultyCode ?? DEFAULT_FACULTY_CODE;
        const facultyMatches =
          modalInstructorFacultyFilter === "ALL" ||
          facultyCode === Number(modalInstructorFacultyFilter);
        const curriculumMatches =
          modalInstructorCurriculumFilter === "ALL" ||
          instructor.curriculumId === modalInstructorCurriculumFilter;

        return facultyMatches && curriculumMatches;
      }),
    [
      availableInstructors,
      modalInstructorCurriculumFilter,
      modalInstructorFacultyFilter,
    ],
  );

  const selectedInstructor = filteredAvailableInstructors.find(
    (instructor) => String(instructor.staff_users_id) === selectedInstructorId,
  );

  useEffect(() => {
    if (!showAddInstructorModal) return;

    const stillAvailable = filteredAvailableInstructors.some(
      (instructor) => String(instructor.staff_users_id) === selectedInstructorId,
    );
    if (!stillAvailable) {
      setSelectedInstructorId(
        filteredAvailableInstructors[0]
          ? String(filteredAvailableInstructors[0].staff_users_id)
          : "",
      );
    }
  }, [
    filteredAvailableInstructors,
    selectedInstructorId,
    showAddInstructorModal,
  ]);

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  // Check if any field has errors or is empty
  const hasErrors = Object.values(errors).some((error) => !!error);
  const isFormEmpty =
    !studentId.trim() ||
    !email.trim() ||
    !firstName.trim() ||
    !lastName.trim() ||
    !studentPassword ||
    !studentConfirmPassword;
  const isSubmitDisabled =
    hasErrors ||
    isFormEmpty ||
    isSubmitting ||
    isCheckingCode ||
    isCheckingEmail;
  const isAddInstructorDisabled =
    isAddingInstructor ||
    isLoadingInstructors ||
    filteredAvailableInstructors.length === 0 ||
    !selectedInstructorId;
  const instructorRows = useMemo(
    () =>
      (offering?.course_instructors ?? []).map((ci, instructorIndex) => ({
        ...ci,
        instructorIndex,
      })),
    [offering?.course_instructors],
  );
  const instructorCountLabel = `${instructorRows.length} คน`;
  const totalInstructorPages = Math.max(
    1,
    Math.ceil(instructorRows.length / instructorItemsPerPage),
  );
  const firstVisibleInstructor =
    instructorRows.length === 0
      ? 0
      : (instructorPage - 1) * instructorItemsPerPage + 1;
  const lastVisibleInstructor = Math.min(
    instructorPage * instructorItemsPerPage,
    instructorRows.length,
  );
  const instructorSummary =
    instructorRows.length === 0
      ? "ยังไม่มีรายการ"
      : `แสดง ${firstVisibleInstructor}–${lastVisibleInstructor} จาก ${instructorRows.length}`;
  const paginatedInstructorRows = useMemo(
    () =>
      instructorRows.slice(
        (instructorPage - 1) * instructorItemsPerPage,
        instructorPage * instructorItemsPerPage,
      ),
    [instructorItemsPerPage, instructorPage, instructorRows],
  );
  const totalStudentPages = Math.max(
    1,
    Math.ceil(students.length / studentItemsPerPage),
  );
  const firstVisibleStudent =
    students.length === 0 ? 0 : (studentPage - 1) * studentItemsPerPage + 1;
  const lastVisibleStudent = Math.min(
    studentPage * studentItemsPerPage,
    students.length,
  );
  const studentSummary =
    students.length === 0
      ? "ยังไม่มีรายการ"
      : `แสดง ${firstVisibleStudent}–${lastVisibleStudent} จาก ${students.length}`;
  const paginatedStudents = useMemo(
    () =>
      students.slice(
        (studentPage - 1) * studentItemsPerPage,
        studentPage * studentItemsPerPage,
      ),
    [studentItemsPerPage, studentPage, students],
  );

  useEffect(() => {
    setInstructorPage((page) => Math.min(page, totalInstructorPages));
  }, [totalInstructorPages]);

  useEffect(() => {
    setStudentPage((page) => Math.min(page, totalStudentPages));
  }, [totalStudentPages]);

  return (
    <Navbar>
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <CourseTabs offeringId={offeringId} active="members" />

          <div className="space-y-4">
            <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 lg:p-8">
              {isMemberDeleteLocked && !isStudent && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-base font-semibold">ล็อกการลบสมาชิก</p>
                    <p className="mt-1 text-[15px] font-normal leading-6">
                      {deleteBlockedMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Header Card */}
              <div className="mb-6 rounded-xl border border-[#EFE8FB]">
                <div className="flex flex-col gap-3 border-b border-[#EFE8FB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="flex items-center gap-2 text-[17px] font-semibold text-[#2F2A3A]">
                    <UsersRound size={18} className="text-[#B7A3E3]" />
                    <span>อาจารย์</span>
                    <span className="rounded-full bg-[#F4EFFF] px-2.5 py-0.5 text-[13px] font-medium tabular-nums text-[#7455C9] ring-1 ring-[#D9CCF2]">
                      {instructorCountLabel}
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {!isStudent && (
                      <button
                        onClick={() => setShowAddInstructorModal(true)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#F4EFFF] px-3.5 text-[15px] font-medium text-[#7455C9] ring-1 ring-[#D9CCF2] transition-colors hover:bg-white hover:ring-[#CDBCF2]"
                        title="เพิ่มอาจารย์"
                      >
                        <UsersRound size={16} />
                        เพิ่มอาจารย์
                      </button>
                    )}
                  </div>
                </div>
                <MemberTableControls
                  summary={instructorSummary}
                  itemsPerPage={instructorItemsPerPage}
                  pageSizeOptions={INSTRUCTOR_PAGE_SIZE_OPTIONS}
                  onItemsPerPageChange={(value) => {
                    setInstructorItemsPerPage(value);
                    setInstructorPage(1);
                  }}
                  itemLabel="คน"
                />
                <div className="hidden border-b border-[#EFE8FB] bg-[#F7F3FF] px-5 py-4 md:grid md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.35fr)_minmax(12rem,1.35fr)_2.25rem] md:items-center md:gap-4">
                  <span className="text-[15px] font-medium text-[#5B4A73]">
                    ชื่อ-นามสกุล
                  </span>
                  <span className="text-[15px] font-medium text-[#5B4A73]">
                    สำนักวิชา
                  </span>
                  <span className="text-[15px] font-medium text-[#5B4A73]">
                    หลักสูตร
                  </span>
                  <span aria-hidden />
                </div>
                <div className="divide-y divide-[#EFE8FB]">
                  {instructorRows.length === 0 ? (
                    <div className="px-5 py-8 text-center text-[15px] font-medium text-[#7A7287]">
                      ยังไม่มีอาจารย์ในรายวิชานี้
                    </div>
                  ) : (
                    paginatedInstructorRows.map((ci) => {
                    const instructorName = formatInstructorName(ci.staff_users);
                    const isPrimaryInstructor = ci.instructorIndex === 0;

                    return (
                    <div
                      key={ci.staff_users_id}
                      className="flex items-center gap-3 px-5 py-4 md:grid md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.35fr)_minmax(12rem,1.35fr)_2.25rem] md:items-start md:gap-4"
                    >
                      <div className="flex flex-col flex-1 min-w-0 md:contents">
                        <span className="truncate text-[15px] font-normal leading-6 text-[#2F2A3A] md:min-w-0 md:overflow-visible md:whitespace-normal md:text-clip md:wrap-break-word">
                          {instructorName}
                        </span>
                        <span className="truncate text-[15px] leading-6 text-[#7A7287] md:hidden">
                          {getFacultyName(ci.staff_users.facultyCode ?? 1)}
                          {" · "}
                          {getCurriculumName(ci.staff_users.curriculumId)}
                        </span>
                        <span className="hidden min-w-0 text-[15px] font-normal leading-6 text-[#514667] wrap-break-word md:block">
                          {getFacultyName(ci.staff_users.facultyCode ?? 1)}
                        </span>
                        <span className="hidden min-w-0 text-[15px] font-normal leading-6 text-[#514667] wrap-break-word md:block">
                          {getCurriculumName(ci.staff_users.curriculumId)}
                        </span>
                      </div>
                      {!isStudent && (
                        isPrimaryInstructor ? (
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#B7A3E3] md:justify-self-end md:self-start"
                            title="อาจารย์คนแรกไม่สามารถลบได้"
                            aria-label="อาจารย์คนแรกไม่สามารถลบได้"
                          >
                            <Lock size={18} />
                          </span>
                        ) : isMemberDeleteLocked ? (
                          <button
                            onClick={() =>
                              setAlertState({
                                isOpen: true,
                                title: "ไม่สามารถลบได้",
                                message: deleteBlockedMessage,
                                variant: "warning",
                              })
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-amber-50 hover:text-amber-500 md:justify-self-end md:self-start"
                            title="มีการสอบแล้ว ไม่สามารถลบได้"
                            aria-label="มีการสอบแล้ว ไม่สามารถลบได้"
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleRemoveInstructor(
                                ci.staff_users_id,
                                instructorName,
                              )
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-500 md:justify-self-end md:self-start"
                            title="นำอาจารย์ออกจากรายวิชา"
                            aria-label="นำอาจารย์ออกจากรายวิชา"
                          >
                            <Trash2 size={18} />
                          </button>
                        )
                      )}
                    </div>
                    );
                  }))}
                </div>
                <MemberPagination
                  currentPage={instructorPage}
                  totalPages={totalInstructorPages}
                  onPrevious={() =>
                    setInstructorPage((page) => Math.max(1, page - 1))
                  }
                  onNext={() =>
                    setInstructorPage((page) =>
                      Math.min(totalInstructorPages, page + 1),
                    )
                  }
                />
              </div>
              {/* Users List */}
              <div className="overflow-hidden rounded-xl border border-[#EFE8FB]">
                {/* Title */}
                <div className="flex flex-col gap-3 border-b border-[#EFE8FB] px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <h3 className="flex items-center gap-2 text-[17px] font-semibold text-[#2F2A3A]">
                    <UsersRound size={18} className="text-[#B7A3E3]" />
                    <span>นักศึกษา</span>
                    <span className="rounded-full bg-[#F4EFFF] px-2.5 py-0.5 text-[13px] font-medium tabular-nums text-[#7455C9] ring-1 ring-[#D9CCF2]">
                      {students.length} คน
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {!isStudent && (
                      <>
                        <button
                          onClick={() => setShowAddStudentModal(true)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#F4EFFF] px-3.5 text-[15px] font-medium text-[#7455C9] ring-1 ring-[#D9CCF2] transition-colors hover:bg-white hover:ring-[#CDBCF2]"
                          title="เพิ่มนักศึกษา"
                        >
                          <UserPlus size={16} />
                          เพิ่มนักศึกษา
                        </button>
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#F4EFFF] px-3.5 text-[15px] font-medium text-[#7455C9] ring-1 ring-[#D9CCF2] transition-colors hover:bg-white hover:ring-[#CDBCF2]"
                          title="อัปโหลด CSV"
                        >
                          <Upload size={16} />
                          อัปโหลด CSV
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <MemberTableControls
                  summary={loadingStudents ? "กำลังโหลดข้อมูล..." : studentSummary}
                  itemsPerPage={studentItemsPerPage}
                  pageSizeOptions={STUDENT_PAGE_SIZE_OPTIONS}
                  onItemsPerPageChange={(value) => {
                    setStudentItemsPerPage(value);
                    setStudentPage(1);
                  }}
                  itemLabel="คน"
                />

                {/* Desktop column header */}
                <div className="hidden border-b border-[#EFE8FB] bg-[#F7F3FF] px-5 py-4 md:grid md:grid-cols-[8.5rem_minmax(10rem,1fr)_minmax(12rem,1.35fr)_minmax(12rem,1.35fr)_2.25rem] md:items-center md:gap-4">
                  <span className="text-[15px] font-medium text-[#5B4A73]">รหัสนักศึกษา</span>
                  <span className="text-[15px] font-medium text-[#5B4A73]">ชื่อ-นามสกุล</span>
                  <span className="text-[15px] font-medium text-[#5B4A73]">สำนักวิชา</span>
                  <span className="text-[15px] font-medium text-[#5B4A73]">หลักสูตร</span>
                  <span aria-hidden />
                </div>

                {/* List */}
                <div className="divide-y divide-[#EFE8FB]">
                  {loadingStudents ? (
                    <div className="px-5 py-8 text-center text-[15px] font-medium text-[#7A7287]">
                      กำลังโหลดรายชื่อนักศึกษา...
                    </div>
                  ) : students.length === 0 ? (
                    <div className="px-5 py-8 text-center text-[15px] font-medium text-[#7A7287]">
                      ยังไม่มีนักศึกษาในรายวิชานี้
                    </div>
                  ) : (
                    paginatedStudents.map((student) => (
                    <div
                      key={student.student_code}
                      className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[#FAF8FF] md:grid md:grid-cols-[8.5rem_minmax(10rem,1fr)_minmax(12rem,1.35fr)_minmax(12rem,1.35fr)_2.25rem] md:items-start md:gap-4"
                    >
                      <div className="flex flex-col flex-1 min-w-0 md:contents">
                        <div className="flex items-center gap-3 md:contents">
                          <span className="text-[15px] font-normal leading-6 text-[#2F2A3A] md:min-w-0 md:truncate">
                            {student.student_code}
                          </span>
                          <span className="text-[15px] font-normal leading-6 text-[#2F2A3A] md:min-w-0 md:whitespace-normal md:wrap-break-word">
                            {student.title} {student.first_name} {student.last_name}
                          </span>
                        </div>
                        <span className="mt-0.5 truncate text-[15px] leading-6 text-[#7A7287] md:hidden">
                          {getFacultyName(student.facultyCode ?? 1)}
                          {" · "}
                          {formatCurriculumDisplay(student.curriculumId)}
                        </span>
                        <span className="hidden min-w-0 text-[15px] font-normal leading-6 text-[#514667] wrap-break-word md:block">
                          {getFacultyName(student.facultyCode ?? 1)}
                        </span>
                        <span className="hidden min-w-0 text-[15px] font-normal leading-6 text-[#514667] wrap-break-word md:block">
                          {formatCurriculumDisplay(student.curriculumId)}
                        </span>
                      </div>
                      {/* Delete button - visible on hover */}
                      {!isStudent ? (
                        isMemberDeleteLocked ? (
                          <button
                            onClick={() =>
                              setAlertState({
                                isOpen: true,
                                title: "ไม่สามารถลบได้",
                                message: deleteBlockedMessage,
                                variant: "warning",
                              })
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-amber-50 hover:text-amber-500 md:justify-self-end md:self-start"
                            title="มีการสอบแล้ว ไม่สามารถลบได้"
                            aria-label="มีการสอบแล้ว ไม่สามารถลบได้"
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleUnenrollStudent(
                                student.student_code,
                                `${student.title} ${student.first_name} ${student.last_name}`,
                              )
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-500 md:justify-self-end md:self-start"
                            title="นำออกจากรายวิชา"
                          >
                            <Trash2 size={18} />
                          </button>
                        )
                      ) : (
                        <span aria-hidden className="hidden md:block" />
                      )}
                    </div>
                  )))}
                </div>
                <MemberPagination
                  currentPage={studentPage}
                  totalPages={totalStudentPages}
                  onPrevious={() =>
                    setStudentPage((page) => Math.max(1, page - 1))
                  }
                  onNext={() =>
                    setStudentPage((page) =>
                      Math.min(totalStudentPages, page + 1),
                    )
                  }
                />
              </div>
            </div>

          </div>
        </div>

        {/* Add Student Modal */}
        {showAddStudentModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-6 sm:p-6">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
              {/* Close button */}
              <button
                type="button"
                onClick={handleCancelAddStudent}
                disabled={isSubmitting}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="ปิดหน้าต่างเพิ่มนักศึกษา"
                title="ปิด"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="mb-5 pr-10">
                <h2 className="text-xl font-bold text-gray-900">
                  เพิ่มนักศึกษา
                </h2>
              </div>

              {/* Student Code */}
              <div className="mb-4">
                <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
                  รหัสนักศึกษา <span className="text-red-500">*</span>{" "}
                  <span className="text-xs font-medium text-gray-500">
                    ({studentId.length}/{STUDENT_CODE_LENGTH})
                  </span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={studentId}
                  onChange={handleStudentIdChange}
                  maxLength={STUDENT_CODE_LENGTH}
                  placeholder="12345678"
                  className={`w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none ${
                    errors.student_code
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#9264F5] focus:border-[#B7A3E3]"
                  }`}
                />
                {errors.student_code && (
                  <p className="text-red-500 text-xs mt-1">{errors.student_code}</p>
                )}
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
                  อีเมล <span className="text-red-500">*</span>{" "}
                  <span className="text-xs font-medium text-gray-500">@mail.wu.ac.th</span>
                  <span className="ml-1 text-xs font-medium text-gray-500">
                    ({email.length}/{EMAIL_MAX_LENGTH})
                  </span>
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={handleEmailChange}
                  maxLength={EMAIL_MAX_LENGTH}
                  placeholder="student@mail.wu.ac.th"
                  className={`w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none ${
                    errors.email
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#9264F5] focus:border-[#B7A3E3]"
                  }`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
                  คำนำหน้า <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none appearance-none bg-white pr-10 ${
                      errors.title
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#9264F5] focus:border-[#B7A3E3]"
                    }`}
                  >
                    {STUDENT_TITLES.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
                {errors.title && (
                  <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                )}
              </div>

              {/* First Name + Last Name */}
              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <div className="mb-4">
                  <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
                    ชื่อ <span className="text-red-500">*</span>{" "}
                    <span className="text-xs font-medium text-gray-500">
                      ({firstName.length}/{FIRST_NAME_MAX_LENGTH})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={handleFirstNameChange}
                    maxLength={FIRST_NAME_MAX_LENGTH}
                    placeholder="ภาษาไทยเท่านั้น"
                    className={`w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none ${
                      errors.first_name
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#9264F5] focus:border-[#B7A3E3]"
                    }`}
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
                    นามสกุล <span className="text-red-500">*</span>{" "}
                    <span className="text-xs font-medium text-gray-500">
                      ({lastName.length}/{LAST_NAME_MAX_LENGTH})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={handleLastNameChange}
                    maxLength={LAST_NAME_MAX_LENGTH}
                    placeholder="ภาษาไทยเท่านั้น"
                    className={`w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none ${
                      errors.last_name
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#9264F5] focus:border-[#B7A3E3]"
                    }`}
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
                  )}
                </div>
              </div>

              {/* Faculty */}
              <div className="mb-4">
                <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
                  สำนักวิชา <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={addFacultyCode}
                    onChange={(e) => setAddFacultyCode(Number(e.target.value))}
                    className="w-full rounded-xl border-2 border-[#9264F5] px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none focus:border-[#B7A3E3] appearance-none bg-white pr-10"
                  >
                    {Object.entries(FACULTY_MAP).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>

              {/* Curriculum */}
              <div className="mb-4">
                <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
                  หลักสูตร <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={addCurriculumId}
                    onChange={(e) => setAddCurriculumId(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#9264F5] px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none focus:border-[#B7A3E3] appearance-none bg-white pr-10"
                  >
                    {CURRICULUMS.map((c) => (
                      <option key={c.id} value={c.id}>{getCurriculumName(c.id)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <div className="mb-4">
                  <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
                    รหัสผ่าน <span className="text-red-500">*</span>{" "}
                    <span className="text-xs font-medium text-gray-500">
                      (อย่างน้อย {PASSWORD_MIN_LENGTH} ตัวอักษร)
                    </span>
                  </label>
                  <input
                    type="password"
                    value={studentPassword}
                    onChange={handlePasswordChange}
                    className={`w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none ${
                      errors.password
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#9264F5] focus:border-[#B7A3E3]"
                    }`}
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
                    ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={studentConfirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className={`w-full rounded-xl border-2 px-4 py-2.5 text-[15px] text-gray-900 shadow-sm transition-colors focus:outline-none ${
                      errors.confirmPassword
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#9264F5] focus:border-[#B7A3E3]"
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelAddStudent}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-2.5 font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={isSubmitDisabled}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-6 py-2.5 font-semibold text-white shadow-lg transition-colors hover:bg-[#9264F5] disabled:opacity-50"
                >
                  {(isSubmitting || isCheckingCode || isCheckingEmail) && (
                    <Loader2 size={18} className="animate-spin" />
                  )}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Instructor Modal */}
        {showAddInstructorModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-6 sm:p-6">
            <div className="relative w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
              <button
                type="button"
                onClick={handleCancelAddInstructor}
                disabled={isAddingInstructor}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="ปิดหน้าต่างเพิ่มอาจารย์"
                title="ปิด"
              >
                <X size={18} />
              </button>

              <div className="mb-5 pr-10">
                <h2 className="text-xl font-bold text-gray-900">
                  เพิ่มอาจารย์
                </h2>
              </div>

              <div className="mb-4 grid gap-3 rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB] sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[15px] font-medium text-[#6B617A]">
                    สำนักวิชา
                  </label>
                  <div className="relative">
                    <select
                      value={modalInstructorFacultyFilter}
                      onChange={(event) => {
                        setModalInstructorFacultyFilter(event.target.value);
                        setModalInstructorCurriculumFilter("ALL");
                      }}
                      disabled={isLoadingInstructors || availableInstructors.length === 0}
                      className="h-11 w-full appearance-none rounded-xl border border-[#E7DDF8] bg-white px-3.5 pr-9 text-[15px] font-normal text-[#2F2A3A] outline-none transition-colors focus:border-[#B7A3E3] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option value="ALL">ทุกสำนักวิชา</option>
                      {modalInstructorFacultyOptions.map((facultyCode) => (
                        <option key={facultyCode} value={facultyCode}>
                          {getFacultyName(facultyCode)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9A90AA]"
                      size={16}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-medium text-[#6B617A]">
                    หลักสูตร
                  </label>
                  <div className="relative">
                    <select
                      value={modalInstructorCurriculumFilter}
                      onChange={(event) =>
                        setModalInstructorCurriculumFilter(event.target.value)
                      }
                      disabled={
                        isLoadingInstructors ||
                        modalInstructorCurriculumOptions.length === 0
                      }
                      className="h-11 w-full appearance-none rounded-xl border border-[#E7DDF8] bg-white px-3.5 pr-9 text-[15px] font-normal text-[#2F2A3A] outline-none transition-colors focus:border-[#B7A3E3] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option value="ALL">ทุกหลักสูตร</option>
                      {modalInstructorCurriculumOptions.map((curriculum) => (
                        <option key={curriculum.id} value={curriculum.id}>
                          {curriculum.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9A90AA]"
                      size={16}
                    />
                  </div>
                </div>

                {(modalInstructorFacultyFilter !== "ALL" ||
                  modalInstructorCurriculumFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalInstructorFacultyFilter("ALL");
                      setModalInstructorCurriculumFilter("ALL");
                    }}
                    className="h-10 rounded-xl bg-white px-4 text-[15px] font-medium text-[#7455C9] ring-1 ring-[#D9CCF2] transition-colors hover:bg-[#F4EFFF] sm:col-span-2"
                  >
                    ล้างตัวกรอง
                  </button>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-[15px] font-semibold text-gray-800 mb-1.5">
                  อาจารย์ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedInstructorId}
                    onChange={(e) => setSelectedInstructorId(e.target.value)}
                    disabled={
                      isLoadingInstructors ||
                      filteredAvailableInstructors.length === 0
                    }
                    className="w-full appearance-none rounded-xl border border-[#B7A3E3] bg-white px-4 py-2.5 pr-10 text-[15px] text-gray-900 shadow-sm transition-colors focus:border-[#9264F5] focus:outline-none disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    {isLoadingInstructors ? (
                      <option value="">กำลังโหลดรายชื่ออาจารย์...</option>
                    ) : availableInstructors.length === 0 ? (
                      <option value="">ไม่มีอาจารย์ที่สามารถเพิ่มได้</option>
                    ) : filteredAvailableInstructors.length === 0 ? (
                      <option value="">ไม่พบอาจารย์ตามตัวกรองที่เลือก</option>
                    ) : (
                      filteredAvailableInstructors.map((instructor) => (
                        <option
                          key={instructor.staff_users_id}
                          value={String(instructor.staff_users_id)}
                        >
                          {formatInstructorName(instructor)}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>

              {selectedInstructor && (
                <div className="mb-5 rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB]">
                  <p className="text-[15px] font-semibold text-[#2F2A3A]">
                    {formatInstructorName(selectedInstructor)}
                  </p>
                  <p className="mt-1 text-[15px] font-normal leading-6 text-[#7A7287]">
                    {getFacultyName(selectedInstructor.facultyCode ?? 1)}
                    {" · "}
                    {getCurriculumName(selectedInstructor.curriculumId)}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCancelAddInstructor}
                  disabled={isAddingInstructor}
                  className="flex-1 rounded-xl border-2 border-gray-300 px-6 py-2.5 font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddInstructor}
                  disabled={isAddInstructorDisabled}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7A3E3] px-6 py-2.5 font-semibold text-white shadow-lg transition-colors hover:bg-[#9264F5] disabled:opacity-50"
                >
                  {isAddingInstructor && (
                    <Loader2 size={18} className="animate-spin" />
                  )}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        <BulkUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          offeringId={offeringId}
          onSuccess={() => fetchStudents()}
        />

        {/* Unenroll Confirmation Modal */}
        <ConfirmModal
          isOpen={isUnenrollModalOpen}
          onClose={() => {
            if (!isUnenrolling) {
              setIsUnenrollModalOpen(false);
              setUnenrollingStudent(null);
            }
          }}
          onConfirm={handleUnenrollConfirm}
          title="นำนักศึกษาออกจากรายวิชา"
          message={`คุณแน่ใจหรือไม่ว่าต้องการนำ ${unenrollingStudent?.name || ""} (${unenrollingStudent?.code || ""}) ออกจากรายวิชานี้?`}
          confirmText="นำออก"
          cancelText="ยกเลิก"
          isLoading={isUnenrolling}
          variant="danger"
        />

        <ConfirmModal
          isOpen={isRemoveInstructorModalOpen}
          onClose={() => {
            if (!isRemovingInstructor) {
              setIsRemoveInstructorModalOpen(false);
              setRemovingInstructor(null);
            }
          }}
          onConfirm={handleRemoveInstructorConfirm}
          title="นำอาจารย์ออกจากรายวิชา"
          message={`คุณแน่ใจหรือไม่ว่าต้องการนำ ${removingInstructor?.name || ""} ออกจากรายวิชานี้?`}
          confirmText="นำออก"
          cancelText="ยกเลิก"
          isLoading={isRemovingInstructor}
          variant="danger"
        />

        <AlertModal
          isOpen={alertState.isOpen}
          onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
          title={alertState.title}
          message={alertState.message}
          variant={alertState.variant}
        />
      </div>
    </Navbar>
  );
}

function MemberTableControls({
  summary,
  itemsPerPage,
  pageSizeOptions,
  onItemsPerPageChange,
  itemLabel,
}: {
  summary: string;
  itemsPerPage: number;
  pageSizeOptions: readonly number[];
  onItemsPerPageChange: (value: number) => void;
  itemLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#EFE8FB] bg-white px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-[#6B617A]">{summary}</span>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block w-full sm:w-36">
          <span className="sr-only">จำนวนแถวต่อหน้า</span>
          <select
            value={itemsPerPage}
            onChange={(event) =>
              onItemsPerPageChange(Number(event.target.value))
            }
            className="h-9 w-full appearance-none rounded-lg border border-[#E7DDF8] bg-[#FAF8FF] px-3 pr-8 text-sm font-normal text-[#2F2A3A] outline-none transition-colors focus:border-[#B7A3E3] focus:bg-white"
            title="จำนวนต่อหน้า"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                แสดง {option} {itemLabel}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9A90AA]"
            size={16}
          />
        </label>

      </div>
    </div>
  );
}

function MemberPagination({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-[#EFE8FB] px-5 py-2.5">
      <span className="text-sm font-medium text-[#7A7287]">
        หน้า {currentPage}/{totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={currentPage === 1}
          onClick={onPrevious}
          title="หน้าก่อนหน้า"
          aria-label="หน้าก่อนหน้า"
          type="button"
        >
          <ChevronLeft size={17} strokeWidth={2.4} />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={currentPage === totalPages}
          onClick={onNext}
          title="หน้าถัดไป"
          aria-label="หน้าถัดไป"
          type="button"
        >
          <ChevronRight size={17} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
