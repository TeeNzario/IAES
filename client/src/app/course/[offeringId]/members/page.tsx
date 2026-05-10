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

// ============================================================
// CONFIGURATION CONSTANTS — Adjust limits here
// ============================================================
const STUDENT_CODE_LENGTH = 8;
const STUDENT_CODE_REGEX = /^\d{8}$/;
const FIRST_NAME_MAX_LENGTH = 50;
const LAST_NAME_MAX_LENGTH = 50;

// Email and Name validation regex pattern
const EMAIL_REGEX = /^[^\s@]+@mail\.wu\.ac\.th$/;
const NAME_REGEX = /^[ก-๙\s]+$/;


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

    setLoadingStudents(true);
    const data = await apiFetch<Student[]>(
      `course-offerings/${offeringId}/students`,
    );
    setStudents(data);
    setLoadingStudents(false);
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
        const response = await apiFetch<DuplicateCheckResponse>(
          `/course-offerings/${offeringId}/students/check-email?email=${encodeURIComponent(emailValue.trim())}`,
        );
        return response.exists;
      } catch (err) {
        console.error("Failed to check email duplicate:", err);
        return false;
      } finally {
        setIsCheckingEmail(false);
      }
    },
    [offeringId],
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
    const data = await apiFetch<CourseOffering>(
      `course-offerings/${offeringId}`,
    );
    setOffering(data);
  }, [offeringId]);

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

const isStudent =
  String(user?.type ?? user?.userType ?? "").toUpperCase() === "STUDENT";

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
                className={`text-sm font-medium transition-colors cursor-pointer ${
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
                className={`text-sm font-medium transition-colors cursor-pointer ${
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
              {hasCourseExams && !isStudent && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">ล็อกการลบสมาชิก</p>
                    <p className="mt-1 text-sm font-normal leading-6">
                      {deleteBlockedMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Header Card */}
              <div className="mb-6 rounded-xl border border-[#EFE8FB]">
                <div className="flex items-center justify-between border-b border-[#EFE8FB] px-5 py-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[#2F2A3A]">
                    <UsersRound size={16} className="text-[#B7A3E3]" />
                    อาจารย์
                  </h3>
                  <span className="text-sm font-semibold tabular-nums text-[#514667]">
                    {offering?.course_instructors.length ?? 0} คน
                  </span>
                </div>
                <div className="hidden border-b border-[#EFE8FB] bg-[#F7F3FF] px-5 py-4 md:grid md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.35fr)_minmax(12rem,1.35fr)_2.25rem] md:items-center md:gap-4">
                  <span className="text-sm font-semibold text-[#5B4A73]">
                    ชื่อ-นามสกุล
                  </span>
                  <span className="text-sm font-semibold text-[#5B4A73]">
                    สำนักวิชา
                  </span>
                  <span className="text-sm font-semibold text-[#5B4A73]">
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
                      className="flex items-center gap-3 px-5 py-3 md:grid md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.35fr)_minmax(12rem,1.35fr)_2.25rem] md:items-start md:gap-4"
                    >
                      <div className="flex flex-col flex-1 min-w-0 md:contents">
                        <span className="truncate text-sm font-normal text-[#2F2A3A] md:min-w-0 md:whitespace-normal md:text-clip md:wrap-break-word">
                          {instructorName}
                        </span>
                        <span className="truncate text-xs text-[#7A7287] md:hidden">
                          {getFacultyName(ci.staff_users.facultyCode ?? 1)}
                          {" · "}
                          {getCurriculumName(ci.staff_users.curriculumId)}
                        </span>
                        <span className="hidden min-w-0 text-sm font-normal text-[#514667] wrap-break-word md:block">
                          {getFacultyName(ci.staff_users.facultyCode ?? 1)}
                        </span>
                        <span className="hidden min-w-0 text-sm font-normal text-[#514667] wrap-break-word md:block">
                          {getCurriculumName(ci.staff_users.curriculumId)}
                        </span>
                      </div>
                      {!isStudent && (
                        isPrimaryInstructor ? (
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#B7A3E3] md:justify-self-end md:self-start"
                            title="อาจารย์คนแรกไม่สามารถลบได้"
                            aria-label="อาจารย์คนแรกไม่สามารถลบได้"
                          >
                            <Lock size={16} />
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
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-amber-50 hover:text-amber-500 md:justify-self-end md:self-start"
                            title="มีการสอบแล้ว ไม่สามารถลบได้"
                            aria-label="มีการสอบแล้ว ไม่สามารถลบได้"
                          >
                            <Trash2 size={17} />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleRemoveInstructor(
                                ci.staff_users_id,
                                instructorName,
                              )
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-500 md:justify-self-end md:self-start"
                            title="นำอาจารย์ออกจากรายวิชา"
                            aria-label="นำอาจารย์ออกจากรายวิชา"
                          >
                            <Trash2 size={17} />
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
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-[#2F2A3A]">
                      <UsersRound size={16} className="text-[#B7A3E3]" />
                      นักศึกษา
                    </h3>
                    <span className="text-sm font-semibold tabular-nums text-[#514667]">
                      {students.length} คน
                    </span>
                  </div>
                </div>

                {/* Desktop column header */}
                <div className="hidden border-b border-[#EFE8FB] bg-[#F7F3FF] px-5 py-4 md:grid md:grid-cols-[8.5rem_minmax(10rem,1fr)_minmax(12rem,1.35fr)_minmax(12rem,1.35fr)_2.25rem] md:items-center md:gap-4">
                  <span className="text-sm font-semibold text-[#5B4A73]">รหัสนักศึกษา</span>
                  <span className="text-sm font-semibold text-[#5B4A73]">ชื่อ-นามสกุล</span>
                  <span className="text-sm font-semibold text-[#5B4A73]">สำนักวิชา</span>
                  <span className="text-sm font-semibold text-[#5B4A73]">หลักสูตร</span>
                  <span aria-hidden />
                </div>

                {/* List */}
                <div className="divide-y divide-[#EFE8FB]">
                  {loadingStudents ? (
                    <div className="px-5 py-8 text-center text-sm font-medium text-[#7A7287]">
                      กำลังโหลดรายชื่อนักศึกษา...
                    </div>
                  ) : students.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm font-medium text-[#7A7287]">
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
                          <span className="text-sm font-normal text-[#2F2A3A] md:min-w-0 md:truncate">
                            {student.student_code}
                          </span>
                          <span className="text-sm font-normal text-[#2F2A3A] md:min-w-0 md:whitespace-normal md:wrap-break-word">
                            {student.title} {student.first_name} {student.last_name}
                          </span>
                        </div>
                        <span className="mt-0.5 truncate text-xs text-[#7A7287] md:hidden">
                          {getFacultyName(student.facultyCode ?? 1)}
                          {" · "}
                          {getCurriculumName(student.curriculumId)}
                        </span>
                        <span className="hidden min-w-0 text-sm font-normal text-[#514667] wrap-break-word md:block">
                          {getFacultyName(student.facultyCode ?? 1)}
                        </span>
                        <span className="hidden min-w-0 text-sm font-normal text-[#514667] wrap-break-word md:block">
                          {getCurriculumName(student.curriculumId)}
                        </span>
                      </div>
                      {/* Delete button - visible on hover */}
                      {!isStudent ? (
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
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-amber-50 hover:text-amber-500 md:justify-self-end md:self-start"
                            title="มีการสอบแล้ว ไม่สามารถลบได้"
                            aria-label="มีการสอบแล้ว ไม่สามารถลบได้"
                          >
                            <Trash2 size={17} />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleUnenrollStudent(
                                student.student_code,
                                `${student.title} ${student.first_name} ${student.last_name}`,
                              )
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-500 md:justify-self-end md:self-start"
                            title="นำออกจากรายวิชา"
                          >
                            <Trash2 size={17} />
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
            {!isStudent && (
            <div className="flex flex-row gap-3 lg:flex-col">
              {/* Add Student Button */}
              <div className="flex flex-row rounded-2xl bg-white p-1 shadow-sm ring-1 ring-[#E7DDF8] lg:flex-col">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                  title="เพิ่มนักศึกษา"
                >
                  <UserPlus className="h-5 w-5" />
                </button>

                {/* CSV Upload Button */}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="cursor-pointer"
                  title="อัพโหลด CSV"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer">
                    <Upload className="h-5 w-5" />
                  </div>
                </button>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Add Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              {/* Modal Header */}
              <div className="border-b border-[#EFE8FB] px-5 py-5 text-center sm:px-8">
                <h3 className="text-xl font-semibold text-[#2F2A3A]">
                  เพิ่มนักศึกษา
                </h3>
              </div>

              {/* Modal Body */}
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-8">
                {/* รหัสนักศึกษา */}
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-2">
                    รหัสนักศึกษา <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={studentId}
                    onChange={handleStudentIdChange}
                    maxLength={STUDENT_CODE_LENGTH}
                    placeholder="12345678"
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none transition-colors text-base ${
                      errors.student_code
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#B7A3E3] focus:border-purple-500"
                    }`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.student_code ? (
                      <p className="text-red-500 text-xs">
                        {errors.student_code}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-gray-400">
                      {studentId.length}/{STUDENT_CODE_LENGTH}
                    </span>
                  </div>
                </div>

                {/* อีเมล */}
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-2">
                    อีเมล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="student@mail.wu.ac.th"
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none transition-colors text-base ${
                      errors.email
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#B7A3E3] focus:border-purple-500"
                    }`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.email ? (
                      <p className="text-red-500 text-xs">{errors.email}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-gray-400">
                      @mail.wu.ac.th
                    </span>
                  </div>
                </div>

                {/* คำนำหน้า */}
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-2">
                    คำนำหน้า <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none transition-colors text-base appearance-none bg-white text-[#2F2A3A] ${
                        errors.title
                          ? "border-red-500 focus:border-red-500"
                          : "border-[#B7A3E3] focus:border-purple-500"
                      }`}
                    >
                      {THAI_TITLES.map((option) => (
                        <option
                          key={option}
                          value={option}
                          className="bg-white text-[#2F2A3A]"
                        >
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
                  </div>
                  {errors.title && (
                    <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                  )}
                </div>

                {/* ชื่อ */}
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-2">
                    ชื่อ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={handleFirstNameChange}
                    maxLength={FIRST_NAME_MAX_LENGTH}
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none transition-colors text-base ${
                      errors.first_name
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#B7A3E3] focus:border-purple-500"
                    }`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.first_name ? (
                      <p className="text-red-500 text-xs">
                        {errors.first_name}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-gray-400">
                      {firstName.length}/{FIRST_NAME_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                {/* นามสกุล */}
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-2">
                    นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={handleLastNameChange}
                    maxLength={LAST_NAME_MAX_LENGTH}
                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none transition-colors text-base ${
                      errors.last_name
                        ? "border-red-500 focus:border-red-500"
                        : "border-[#B7A3E3] focus:border-purple-500"
                    }`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.last_name ? (
                      <p className="text-red-500 text-xs">{errors.last_name}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-gray-400">
                      {lastName.length}/{LAST_NAME_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                {/* สำนักวิชา */}
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-2">
                    สำนักวิชา <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={addFacultyCode}
                      onChange={(e) => setAddFacultyCode(Number(e.target.value))}
                      className="w-full px-4 py-3.5 border border-[#B7A3E3] rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-base appearance-none bg-white text-[#2F2A3A]"
                    >
                      {Object.entries(FACULTY_MAP).map(([code, name]) => (
                        <option
                          key={code}
                          value={code}
                          className="bg-white text-[#2F2A3A]"
                        >
                          {name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>

                {/* หลักสูตร */}
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-2">
                    หลักสูตร <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={addCurriculumId}
                      onChange={(e) => setAddCurriculumId(e.target.value)}
                      className="w-full px-4 py-3.5 border border-[#B7A3E3] rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-base appearance-none bg-white text-[#2F2A3A]"
                    >
                      {CURRICULUMS.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          className="bg-white text-[#2F2A3A]"
                        >
                          {getCurriculumName(c.id)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-[#EFE8FB] px-5 py-5 sm:px-8">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={handleCancelAddStudent}
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border border-[#B7A3E3] bg-white px-6 text-base font-medium text-[#7C5BD9] transition-colors hover:bg-purple-50 cursor-pointer disabled:opacity-50 sm:min-w-32"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={isSubmitDisabled}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#9264F5] px-6 text-base font-medium text-white transition-colors hover:bg-purple-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-32"
                >
                  {(isSubmitting || isCheckingCode || isCheckingEmail) && (
                    <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  )}
                  บันทึก
                </button>
                </div>
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
