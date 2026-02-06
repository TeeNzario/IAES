"use client";

import React, { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/layout/NavBar";
import { useRouter } from "next/navigation";
import { UserPlus, Upload } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useParams } from "next/navigation";
import { Student } from "@/types/student";
import { CourseOffering } from "@/types/course";
import { formatInstructorName } from "@/utils/formatName";
import BulkUploadModal from "@/features/courseOffering/components/BulkUploadStudent";
import { AuthUser } from "@/types/auth";

// ============================================================
// CONFIGURATION CONSTANTS — Adjust limits here
// ============================================================
const STUDENT_CODE_MAX_LENGTH = 8;
const EMAIL_MAX_LENGTH = 50;
const FIRST_NAME_MAX_LENGTH = 50;
const LAST_NAME_MAX_LENGTH = 50;

// Email validation regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================
// VALIDATION ERROR MESSAGES (Thai)
// ============================================================
const ERROR_MESSAGES = {
  student_code: {
    required: "กรุณากรอกรหัสนักศึกษา",
    maxLength: `รหัสนักศึกษาไม่เกิน ${STUDENT_CODE_MAX_LENGTH} ตัวอักษร`,
    duplicate: "รหัสนักศึกษานี้มีอยู่แล้ว",
  },
  email: {
    required: "กรุณากรอกอีเมล",
    maxLength: `อีเมลไม่เกิน ${EMAIL_MAX_LENGTH} ตัวอักษร`,
    invalid: "รูปแบบอีเมลไม่ถูกต้อง",
    duplicate: "อีเมลนี้ถูกใช้แล้ว",
  },
  first_name: {
    required: "กรุณากรอกชื่อจริง",
    maxLength: `ชื่อจริงไม่เกิน ${FIRST_NAME_MAX_LENGTH} ตัวอักษร`,
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
  first_name?: string;
  last_name?: string;
}

interface DuplicateCheckResponse {
  exists: boolean;
}

export default function SimpleShowUsers() {
  const [activeTab, setActiveTab] = useState("learn");
  const [activeTopTab, setActiveTopTab] = useState("student");
  const [showAddModal, setShowAddModal] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Validation errors state
  const [errors, setErrors] = useState<FormErrors>({});

  const [user, setUser] = useState<AuthUser | null>(null);

  // Duplicate check loading states
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // ============================================================
  // VALIDATION HELPERS
  // ============================================================

  /**
   * Validates student code synchronously (required + max length)
   */
  const validateStudentCode = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return ERROR_MESSAGES.student_code.required;
    if (trimmed.length > STUDENT_CODE_MAX_LENGTH)
      return ERROR_MESSAGES.student_code.maxLength;
    return undefined;
  };

  /**
   * Validates email synchronously (required + max length + format)
   */
  const validateEmail = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return ERROR_MESSAGES.email.required;
    if (trimmed.length > EMAIL_MAX_LENGTH)
      return ERROR_MESSAGES.email.maxLength;
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
    const value = e.target.value;
    setStudentId(value);
    // Clear error and re-validate synchronously
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
    setFirstName("");
    setLastName("");
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
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      });
      await fetchStudents();
      handleCancelAddStudent();
    } catch (err: any) {
      console.error(err);
      alert("ERROR: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ฟังก์ชันลบนักศึกษาออกจากรายวิชา (ไม่ลบข้อมูลนักศึกษาในระบบ)
  const handleUnenrollStudent = async (
    studentCode: string,
    studentName: string,
  ) => {
    const confirmed = window.confirm(
      `ยืนยันการนำ ${studentName} (${studentCode}) ออกจากรายวิชานี้?`,
    );

    if (!confirmed) return;

    try {
      await apiFetch(`course-offerings/${offeringId}/students/${studentCode}`, {
        method: "DELETE",
      });
      await fetchStudents(); // Refresh list
    } catch (err: any) {
      console.error("Failed to unenroll student:", err);
      alert("เกิดข้อผิดพลาด: " + (err?.message || "ไม่สามารถลบนักศึกษาได้"));
    }
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

   useEffect(() => {
  apiFetch<AuthUser>("/auth/me")
    .then((user) => {
      setUser(user);
    })
    .catch((err) => {
      console.error("Failed to fetch user", err);
    });
}, []);

const isStudent = user?.userType === "STUDENT";

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
      <div className="min-h-screen bg-[#F4EFFF] p-4">
        <div className="max-w-5xl mx-auto">
          <div className="border-b border-gray-200/50 px-6 lg:px-8 pt-4">
            <div className="flex items-center gap-6 pb-3">
              <button
                onClick={() => {
                  setActiveTopTab("home");
                  handleBackToCourse();
                }}
                className={`font-light text-sm transition-colors cursor-pointer ${
                  activeTopTab === "home"
                    ? "text-[##B7A3E3]"
                    : "text-gray-500 hover:text-[#B7A3E3]"
                }`}
              >
                หน้าหลัก
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <button
                onClick={() => {
                  setActiveTopTab("student");
                }}
                className={`font-light text-sm transition-colors cursor-pointer ${
                  activeTopTab === "student"
                    ? "text-[#B7A3E3]"
                    : "text-gray-500 hover:text-[#B7A3E3]"
                }`}
              >
                สมาชิก
              </button>
            </div>
          </div>

          {/* Main Flex Container */}
          <div className="flex gap-4 mt-4">
            {/* Left Section - Lists */}
            <div className="flex-1 bg-white rounded-3xl p-10">
              {/* Header Card */}
              <div className=" rounded-lg mb-4">
                <div className="px-5 py-4 border-b border-[#D9D9D9] flex items-center justify-between">
                  <h3 className="text-sm text-[#575757] font-light">อาจารย์</h3>
                </div>
                <div className="p-5">
                  <div className="flex gap-3">
                    {offering && (
                      <div className="flex flex-col gap-2">
                        {offering.course_instructors.map((ci) => (
                          <div
                            key={ci.staff_users_id}
                            className="text-base text-[#575757]"
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
              <div className=" rounded-lg">
                {/* Title */}
                <div className="px-5 py-4 border-b border-[#D9D9D9] flex items-center justify-between">
                  <div className="flex items-center gap-4 w-full justify-between">
                    <h3 className="text-sm text-[#575757] font-light">
                      นักศึกษา
                    </h3>
                    <span className="text-sm text-[#575757]">
                      {students.length} คน
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
                      {!isStudent && (
                      <button
                        onClick={() =>
                          handleUnenrollStudent(
                            student.student_code,
                            `${student.first_name} ${student.last_name}`,
                          )
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                        title="นำออกจากรายวิชา"
                      >
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
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section - Action Buttons */}
            {!isStudent && (
            <div className="flex flex-col gap-3 ">
              {/* Add Student Button */}
              <div className="bg-red-500 flex flex-col bg-white rounded-2xl py-1">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-12 h-12 rounded-lg flex items-center justify-center cursor-pointer"
                  title="เพิ่มนักศึกษา"
                >
                  <UserPlus className="w-5 h-5 text-[#1E1E1E]" />
                </button>

                {/* CSV Upload Button */}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="cursor-pointer"
                  title="อัพโหลด CSV"
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center cursor-pointer">
                    <Upload className="w-5 h-5 text-[#1E1E1E]" />
                  </div>
                </button>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Add Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg px-6">
              {/* Modal Header */}
              <div className="text-center pt-8 pb-6 px-8">
                <h3 className="text-2xl font-light text-gray-900">
                  เพิ่มนักศึกษา
                </h3>
              </div>

              {/* Modal Body */}
              <div className="px-8 pb-8 space-y-4">
                {/* รหัสนักศึกษา */}
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-2">
                    รหัสนักศึกษา <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={handleStudentIdChange}
                    maxLength={STUDENT_CODE_MAX_LENGTH}
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
                      {studentId.length}/{STUDENT_CODE_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                {/* อีเมล */}
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-2">
                    อีเมล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    maxLength={EMAIL_MAX_LENGTH}
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
                      {email.length}/{EMAIL_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                {/* ชื่อจริง */}
                <div>
                  <label className="block text-base font-normal text-gray-900 mb-2">
                    ชื่อจริง <span className="text-red-500">*</span>
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
              </div>

              {/* Modal Footer */}
              <div className="px-8 pb-8 space-y-3">
                <button
                  onClick={handleAddStudent}
                  disabled={isSubmitDisabled}
                  className="w-full py-4 text-xl font-medium text-white bg-[#9264F5] hover:bg-purple-700 rounded-3xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {(isSubmitting || isCheckingCode || isCheckingEmail) && (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  บันทึก
                </button>
                <button
                  onClick={handleCancelAddStudent}
                  disabled={isSubmitting}
                  className="w-full py-4 text-xl font-medium text-[#B7A3E3] bg-white border-2 border-[#B7A3E3] hover:bg-purple-50 rounded-3xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
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
      </div>
    </Navbar>
  );
}
