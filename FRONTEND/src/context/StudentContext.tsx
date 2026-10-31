'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface StudentProfile {
  id: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  admissionNumber: string;
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  address?: string;
  photoUrl?: string;
  status: string;
  role: string;
  department?: string | null;
  currentClass: string;
  currentClassCode?: string;
  currentClassId?: string | null;
  guardians?: Array<{
    id?: string;
    name: string;
    firstName?: string;
    lastName?: string;
    phone: string;
    email: string;
    relationship: string;
    isPrimary: boolean;
  }>;
}

interface StudentContextType {
  student: StudentProfile | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const StudentContext = createContext<StudentContextType>({
  student: null,
  isLoading: true,
  refresh: async () => {},
});

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudentProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (!data.authenticated || data.role !== 'student') {
        setIsLoading(false);
        return;
      }

      const profile = data.profile || {};
      setStudent({
        id: profile.id || data.user?.id,
        name: profile.name || data.user?.metadata?.full_name || '—',
        firstName: profile.firstName,
        middleName: profile.middleName,
        lastName: profile.lastName,
        admissionNumber: profile.admissionNumber || data.user?.metadata?.admission_number || '—',
        gender: profile.gender || '—',
        dob: profile.dob,
        bloodGroup: profile.bloodGroup,
        address: profile.address,
        photoUrl: profile.photoUrl,
        status: profile.status || 'active',
        role: 'student',
        department: profile.department || null,
        currentClass: profile.currentClass || '—',
        currentClassCode: profile.currentClassCode,
        currentClassId: profile.currentClassId,
        guardians: profile.guardians || [],
      });

      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  return (
    <StudentContext.Provider
      value={{
        student,
        isLoading,
        refresh: fetchStudentProfile,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
}
