'use client';

import { useEffect, useState } from 'react';
import { fetchStudents } from '@/features/student/student.api';
import { Student } from '@/types/student';
import NavBar from '@/components/layout/NavBar';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  console.log(students);

  useEffect(() => {
    fetchStudents().then(setStudents);
  }, []);
kuy
  return (
    <div>
      <NavBar>
      <h1>Students</h1>
      <ul>
        {students.map(s => (  
          <li key={s.id}>{s.username}</li>
        ))}
      </ul>
      </NavBar>
    </div>
  );
}
