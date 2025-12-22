"use client";

import { Plus, Edit } from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import Image from "next/image";

interface CourseCard {
  id: string;
  code: string;
  title: string;
  description: string;
  instructor: string;
  image: string;
}

const courses: CourseCard[] = [
  {
    id: "1",
    code: "COE64-145",
    title: "ยอพิมพ์และการรุ้นแรค",
    description: "เอก ๏ก.นสำคัญในสื่อการ",
    instructor: "คุณครูทีม",
    image: "/instructor1.jpg",
  },
  {
    id: "2",
    code: "COE64-132",
    title: "ระบบอินเกอร์เน็ตการ",
    description: "คอ.โฟกัส นอบสิ่ง\nคิด ประชามิน อกติครสงคม",
    instructor: "คุณครูสมศักดิ์",
    image: "/instructor2.jpg",
  },
  {
    id: "3",
    code: "GEN64-555",
    title: "ชีวประจำในอบการ",
    description: "คำอบม คำ",
    instructor: "คุณครูสมชาย",
    image: "/instructor3.jpg",
  },
  {
    id: "4",
    code: "GEN64-555",
    title: "ชีวประจำในอบการ",
    description: "คำอบม คำ",
    instructor: "คุณครูสมชาย",
    image: "/instructor3.jpg",
  },
   {
    id: "5",
    code: "GEN64-555",
    title: "ชีวประจำในอบการ",
    description: "คำอบม คำ",
    instructor: "คุณครูสมชาย",
    image: "/instructor3.jpg",
  },
  {
    id: "6",
    code: "COE64-145",
    title: "ยอพิมพ์และการรุ้นแรค",
    description: "เอก ๏ก.นสำคัญในสื่อการ",
    instructor: "คุณครูทีม",
    image: "/instructor1.jpg",
  },
  {
    id: "7",
    code: "COE64-132",
    title: "ระบบอินเกอร์เน็ตการ",
    description: "คอ.โฟกัส นอบสิ่ง\nคิด ประชามิน อกติครสงคม",
    instructor: "คุณครูสมศักดิ์",
    image: "/instructor2.jpg",
  },
  {
    id: "8",
    code: "GEN64-555",
    title: "ชีวประจำในอบการ",
    description: "คำอบม คำ",
    instructor: "คุณครูสมชาย",
    image: "/instructor3.jpg",
  },
  {
    id: "9",
    code: "GEN64-555",
    title: "ชีวประจำในอบการ",
    description: "คำอบม คำ",
    instructor: "คุณครูสมชาย",
    image: "/instructor3.jpg",
  },
   {
    id: "10",
    code: "GEN64-555",
    title: "ชีวประจำในอบการ",
    description: "คำอบม คำ",
    instructor: "คุณครูสมชาย",
    image: "/instructor3.jpg",
  },
];

export default function CourseHomePage() {
  return (
    <NavBar>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="w-full">
          <h1 className="text-3xl font-bold mb-8 text-gray-900"></h1>

          <div className="flex flex-wrap gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow w-72 h-72 flex flex-col"
              >
                {/* Course Header */}
                <div className="p-6 flex-1 overflow-hidden flex flex-col">
                  <p className="text-sm font-medium" style={{ color: "#b7a3e3" }}>
                    {course.code}
                  </p>
                  <h2 className="text-lg font-bold text-gray-900 mt-2">
                    {course.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 flex-1">
                    {course.description}
                  </p>
                </div>

                {/* Instructor Section */}
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
                        <Image
                          src={course.image}
                          alt={course.instructor}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {course.instructor}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="p-2 rounded-full hover:opacity-80 transition-colors" style={{ backgroundColor: "#b7a3e3" }}>
                        <Plus size={18} className="text-white" />
                      </button>
                      <button className="p-2 rounded-full hover:opacity-80 transition-colors" style={{ backgroundColor: "#b7a3e3" }}>
                        <Edit size={18} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </NavBar>
  );
}