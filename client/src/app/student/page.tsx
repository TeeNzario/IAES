'use client';

import { useEffect, useState } from 'react';
import { fetchStudents } from '@/features/student/student.api';
import { StudentDto } from '@/types/student';
import NavBar from '@/components/layout/NavBar';

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentDto[]>([]);
  console.log(students);

  useEffect(() => {
    fetchStudents().then(setStudents);
  }, []);

  return (
    <div>
      <NavBar>
      <h1>Students</h1>
      <ul>
        {students.map(s => (  
          <li key={s.student_code}>{s.email}</li>
        ))}
      </ul>
      </NavBar>
    </div>
  );
}
