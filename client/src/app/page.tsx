"use client";

import { Plus, Edit } from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CourseOffering } from "@/types/course";
import { formatInstructorName } from "@/utils/formatName";
import EditCourseOfferingModal from "@/components/courseOffering/EditCourseOfferingModal";
import { AuthUser } from "@/types/auth";
import { useRouter } from "next/navigation";

export default function CourseHomePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOffering, setSelectedOffering] = useState<CourseOffering | null>(null);

  
  const [user, setUser] = useState<AuthUser | null>(null);

  const fetchCourseOfferings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<CourseOffering[]>("course-offerings");
      setCourses(data);
    } catch (err) {
      setError("Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourseOfferings();
  }, [fetchCourseOfferings]);

  const handleEditClick = (
    e: React.MouseEvent,
    courseOffering: CourseOffering,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedOffering(courseOffering);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchCourseOfferings();
  };

    useEffect(() => {
    apiFetch<AuthUser>("/auth/me")
      .then((user) => {
        setUser(user);
      })
      .catch((err) => {
        console.error("Failed to fetch user", err);
      });
  }, []);

  // Fetch courses AFTER user is loaded
  useEffect(() => {
    if (!user) return;

    console.log("Check : ", user.userType);
2
    if (user.role === "ADMIN") {
      router.push("/admin/manage-users");
    }
  }, [user]);

  return (
    <NavBar>
      <div className="min-h-screen bg-[#F1EAFF] p-20">
        <div className="w-full">
          <h1 className="text-3xl font-bold mb-8 text-gray-900"></h1>

          <div className="flex flex-wrap gap-6">
            {courses.map((courseOffering) => (
              <Link
                href={`/course/${courseOffering.course_offerings_id}`}
                key={courseOffering.course_offerings_id}
                className={`rounded-3xl overflow-hidden hover:shadow-lg transition-shadow w-72 h-72 flex flex-col ${
                  courseOffering.is_active
                    ? "bg-white"
                    : "bg-gray-200 opacity-60"
                }`}
              >
                {/* Course Header */}
                <div className="p-6 flex-1 overflow-hidden flex flex-col">
                  <p
                    className={`text-sm font-medium ${
                      courseOffering.is_active
                        ? "text-[#b7a3e3]"
                        : "text-gray-400"
                    }`}
                  >
                    {courseOffering.semester}/{courseOffering.academic_year}{" "}
                    {courseOffering.courses.course_code}
                    {!courseOffering.is_active && (
                      <span className="ml-2 text-xs bg-gray-400 text-white px-2 py-0.5 rounded">
                        ปิดใช้งาน
                      </span>
                    )}
                  </p>
                  <h2
                    className={`text-2xl font-light mb-1 ${
                      courseOffering.is_active
                        ? "text-[#575757]"
                        : "text-gray-400"
                    }`}
                  >
                    {courseOffering.courses.course_name}
                  </h2>
                  {courseOffering.course_instructors.map((staff) => (
                    <p
                      key={staff.staff_users_id}
                      className={`text-sm ${
                        courseOffering.is_active
                          ? "text-[#575757]"
                          : "text-gray-400"
                      }`}
                    >
                      {formatInstructorName(staff.staff_users)}
                    </p>
                  ))}
                </div>

                {/* Action Section */}
                <div className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => handleEditClick(e, courseOffering)}
                        className={`p-3 rounded-full hover:opacity-80 transition-colors ${
                          courseOffering.is_active
                            ? "bg-[#b7a3e3]"
                            : "bg-gray-400"
                        }`}
                      >
                        <Edit size={18} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            <Link
              href={`/course`}
              className="rounded-3xl border border-white border-dashed border-3 overflow-hiddend w-72 h-72 flex flex-col items-center justify-center hover:shadow-lg transition-shadow"
            >
              <Plus size={45} className="text-white" />
            </Link>
          </div>
        </div>
      </div>

      {/* Edit Course Offering Modal */}
      {selectedOffering && (
        <EditCourseOfferingModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedOffering(null);
          }}
          courseOffering={selectedOffering}
          onSuccess={handleEditSuccess}
        />
      )}
    </NavBar>
  );
}
