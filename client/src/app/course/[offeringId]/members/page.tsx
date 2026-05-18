"use client";

import React, { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/layout/NavBar";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Upload,
  ChevronDown,
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
import { formatInstructorName } from "@/utils/formatName";
import BulkUploadModal from "@/features/courseOffering/components/BulkUploadStudent";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AlertModal from "@/components/ui/AlertModal";
import { AuthUser } from "@/types/auth";
import { DEFAULT_FACULTY_CODE, FACULTY_MAP, getFacultyName } from "@/lib/faculty-map";
import { CURRICULUMS, DEFAULT_CURRICULUM_ID, getCurriculumName } from "@/config/curriculums";
import { DEFAULT_TITLE, THAI_TITLES } from "@/config/titles";
import { FIELD_LIMITS } from "@/config/fieldLimits";

// ============================================================
// CONFIGURATION CONSTANTS — Adjust limits here
// ============================================================
const STUDENT_CODE_LENGTH = 8;
const STUDENT_CODE_REGEX = /^\d{8}$/;
const EMAIL_MAX_LENGTH = FIELD_LIMITS.email;
const FIRST_NAME_MAX_LENGTH = FIELD_LIMITS.firstName;
const LAST_NAME_MAX_LENGTH = FIELD_LIMITS.lastName;

// Email validation regex pattern
const EMAIL_REGEX = /^[^\s@]+@mail\.wu\.ac\.th$/;

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
  const [activeTopTab, setActiveTopTab] = useState("student");
  const [showAddModal, setShowAddModal] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [addFacultyCode, setAddFacultyCode] = useState<number>(DEFAULT_FACULTY_CODE);
  const [addCurriculumId, setAddCurriculumId] = useState<string>(DEFAULT_CURRICULUM_ID);

  // Validation errors state
  const [errors, setErrors] = useState<FormErrors>({});

  const [user, setUser] = useState<AuthUser | null>(null);

  // Duplicate check loading states
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const hasCourseExams = (offering?._count?.course_exams ?? 0) > 0;
  const deleteBlockedMessage =
    "มีการสร้างชุดสอบหรือการสอบในรายวิชานี้แล้ว ระบบไม่อนุญาตให้ลบอาจารย์หรือนักศึกษาออกจากรายวิชา";

  const router = useRouter();

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
    const value = e.target.value;
    setFirstName(value);
    setErrors((prev) => ({
      ...prev,
      first_name: validateFirstName(value),
    }));
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLastName(value);
    setErrors((prev) => ({
      ...prev,
      last_name: validateLastName(value),
    }));
  };

  // ฟังก์ชันกลับไปหน้า Course
  const handleBackToCourse = () => {
    router.back();
  };

  const handleCancelAddStudent = () => {
    setShowAddModal(false);
    setStudentId("");
    setEmail("");
    setTitle(DEFAULT_TITLE);
    setFirstName("");
    setLastName("");
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
    if (hasCourseExams) {
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
    if (hasCourseExams) {
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

  //fetch instructors name
  useEffect(() => {
    fetchOffering();
  }, [fetchOffering]);

  useEffect(() => {
    let isMounted = true;

    apiFetch<AuthUser>("/auth/me")
      .then((user) => {
        if (isMounted) setUser(user);
      })
      .catch((err: unknown) => {
        console.error("Failed to fetch user", err);
        if (!isMounted) return;

        setAlertState({
          isOpen: true,
          title: "เกิดข้อผิดพลาด",
          message: getErrorMessage(
            err,
            "ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง",
          ),
          variant: "error",
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isStudent =
    String(user?.type ?? user?.userType ?? "").toUpperCase() === "STUDENT";
  const canManageMembers = user !== null && !isStudent;

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  // Check if any field has errors or is empty
  const hasErrors = Object.values(errors).some((error) => !!error);
  const isFormEmpty =
    !studentId.trim() || !email.trim() || !firstName.trim() || !lastName.trim();
  const isSubmitDisabled =
    hasErrors ||
    isFormEmpty ||
    isSubmitting ||
    isCheckingCode ||
    isCheckingEmail;

  return (
    <Navbar>
      <div className="min-h-screen bg-[#F4EFFF] px-4 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 border-b border-[#DDD1F6] pb-3">
            <div className="flex items-center gap-6 pb-3">
              <button
                onClick={() => {
                  setActiveTopTab("home");
                  handleBackToCourse();
                }}
                className={`text-base font-medium transition-colors cursor-pointer ${
                  activeTopTab === "home"
                    ? "text-[#7C5BD9]"
                    : "text-[#7A7287] hover:text-[#7C5BD9]"
                }`}
              >
                หน้าหลัก
              </button>
              <div className="h-4 w-px bg-[#D4C7ED]"></div>
              <button
                onClick={() => {
                  setActiveTopTab("student");
                }}
                className={`text-base font-medium transition-colors cursor-pointer ${
                  activeTopTab === "student"
                    ? "text-[#7C5BD9]"
                    : "text-[#7A7287] hover:text-[#7C5BD9]"
                }`}
              >
                สมาชิก
              </button>
            </div>
          </div>

          {/* Main Flex Container */}
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Left Section - Lists */}
            <div className="min-w-0 flex-1 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 lg:p-8">
              {hasCourseExams && canManageMembers && (
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
                <div className="flex items-center justify-between border-b border-[#EFE8FB] px-5 py-4">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-[#2F2A3A]">
                    <UsersRound size={18} className="text-[#B7A3E3]" />
                    อาจารย์
                  </h3>
                  <span className="text-base font-semibold tabular-nums text-[#514667]">
                    {offering?.course_instructors.length ?? 0} คน
                  </span>
                </div>
                <div className="hidden border-b border-[#EFE8FB] bg-[#F7F3FF] px-5 py-4 md:grid md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.35fr)_minmax(12rem,1.35fr)_2.25rem] md:items-center md:gap-4">
                  <span className="text-[15px] font-semibold text-[#5B4A73]">
                    ชื่อ-นามสกุล
                  </span>
                  <span className="text-[15px] font-semibold text-[#5B4A73]">
                    สำนักวิชา
                  </span>
                  <span className="text-[15px] font-semibold text-[#5B4A73]">
                    หลักสูตร
                  </span>
                  <span aria-hidden />
                </div>
                <div>
                  {offering?.course_instructors.map((ci, instructorIndex) => {
                    const instructorName = formatInstructorName(ci.staff_users);
                    const isPrimaryInstructor = instructorIndex === 0;

                    return (
                    <div
                      key={ci.staff_users_id}
                      className="flex items-center gap-3 px-5 py-4 md:grid md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.35fr)_minmax(12rem,1.35fr)_2.25rem] md:items-start md:gap-4"
                    >
                      <div className="flex flex-col flex-1 min-w-0 md:contents">
                        <span className="truncate text-[15px] font-normal leading-6 text-[#2F2A3A] md:min-w-0 md:overflow-visible md:whitespace-normal md:text-clip md:wrap-break-word">
                          {instructorName}
                        </span>
                        <span className="truncate text-sm leading-5 text-[#7A7287] md:hidden">
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
                      {canManageMembers && (
                        isPrimaryInstructor ? (
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#B7A3E3] md:justify-self-end md:self-start"
                            title="อาจารย์คนแรกไม่สามารถลบได้"
                            aria-label="อาจารย์คนแรกไม่สามารถลบได้"
                          >
                            <Lock size={18} />
                          </span>
                        ) : hasCourseExams ? (
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
                  })}
                </div>
              </div>
              {/* Users List */}
              <div className="overflow-hidden rounded-xl border border-[#EFE8FB]">
                {/* Title */}
                <div className="flex items-center justify-between border-b border-[#EFE8FB] px-5 py-4">
                  <div className="flex w-full items-center justify-between gap-4">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-[#2F2A3A]">
                      <UsersRound size={18} className="text-[#B7A3E3]" />
                      นักศึกษา
                    </h3>
                    <span className="text-base font-semibold tabular-nums text-[#514667]">
                      {students.length} คน
                    </span>
                  </div>
                </div>

                {/* Desktop column header */}
                <div className="hidden border-b border-[#EFE8FB] bg-[#F7F3FF] px-5 py-4 md:grid md:grid-cols-[8.5rem_minmax(10rem,1fr)_minmax(12rem,1.35fr)_minmax(12rem,1.35fr)_2.25rem] md:items-center md:gap-4">
                  <span className="text-[15px] font-semibold text-[#5B4A73]">รหัสนักศึกษา</span>
                  <span className="text-[15px] font-semibold text-[#5B4A73]">ชื่อ-นามสกุล</span>
                  <span className="text-[15px] font-semibold text-[#5B4A73]">สำนักวิชา</span>
                  <span className="text-[15px] font-semibold text-[#5B4A73]">หลักสูตร</span>
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
                    students.map((student) => (
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
                        <span className="mt-0.5 truncate text-sm leading-5 text-[#7A7287] md:hidden">
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
                      {canManageMembers ? (
                        hasCourseExams ? (
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
              </div>
            </div>

            {/* Right Section - Action Buttons */}
            {canManageMembers && (
            <div className="flex flex-row gap-3 lg:flex-col">
              {/* Add Student Button */}
              <div className="flex flex-row rounded-2xl bg-white p-1 shadow-sm ring-1 ring-[#E7DDF8] lg:flex-col">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                  title="เพิ่มนักศึกษา"
                >
                  <UserPlus className="h-[22px] w-[22px]" />
                </button>

                {/* CSV Upload Button */}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="cursor-pointer"
                  title="อัพโหลด CSV"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer">
                    <Upload className="h-[22px] w-[22px]" />
                  </div>
                </button>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Add Student Modal */}
        {showAddModal && (
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
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
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
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
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
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
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
                    {THAI_TITLES.map((option) => (
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
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
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
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
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
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
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
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
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
