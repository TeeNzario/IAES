'use client';

import { useEffect, useState } from 'react';
import { fetchStudents } from '@/features/student/student.api';
import { Student } from '@/types/student';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  console.log(students);

  useEffect(() => {
    fetchStudents().then(setStudents);
  }, []);
''';;;;;;;
  return (
    <div>
      <h1>Students</h1>
      <ul>
        {students.map(s => (  
          <li key={s.id}>{s.username}</li>
        ))}
      </ul>
    </div>
  );
}
