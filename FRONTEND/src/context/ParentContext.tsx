'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ChildStudent {
  id: string;
  name: string;
  admissionNumber: string;
  gender: string;
  photoUrl?: string | null;
  isPrimary?: boolean;
  pickupAuthorized?: boolean;
  currentClass: string;
  classId?: string | null;
  department?: string | null;
}

export interface ParentProfile {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  altPhone?: string;
  relationship?: string;
  occupation?: string;
  address?: string;
  role: string;
  children: ChildStudent[];
}

interface ParentContextType {
  parent: ParentProfile | null;
  childrenList: ChildStudent[];
  activeChild: ChildStudent | null;
  setActiveChildId: (childId: string) => void;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const ParentContext = createContext<ParentContextType>({
  parent: null,
  childrenList: [],
  activeChild: null,
  setActiveChildId: () => {},
  isLoading: true,
  refresh: async () => {},
});

export function ParentProvider({ children }: { children: React.ReactNode }) {
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [childrenList, setChildrenList] = useState<ChildStudent[]>([]);
  const [activeChild, setActiveChild] = useState<ChildStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchParentData = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (!data.authenticated || data.role !== 'parent') {
        setIsLoading(false);
        return;
      }

      const profile = data.profile || {};
      const kids: ChildStudent[] = profile.children || [];

      setParent({
        id: profile.id || data.user?.id,
        name: profile.name || 'Guardian',
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email || data.user?.email || '',
        phone: profile.phone || '',
        altPhone: profile.altPhone || '',
        relationship: profile.relationship || 'Guardian',
        occupation: profile.occupation || '',
        address: profile.address || '',
        role: 'parent',
        children: kids,
      });

      setChildrenList(kids);

      // Restore or set active child
      const savedChildId = typeof window !== 'undefined' ? localStorage.getItem('oakland_active_child_id') : null;
      const matched = kids.find((k) => k.id === savedChildId);
      const initial = matched || kids[0] || null;
      setActiveChild(initial);

      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParentData();
  }, []);

  const setActiveChildId = (childId: string) => {
    const selected = childrenList.find((c) => c.id === childId);
    if (selected) {
      setActiveChild(selected);
      if (typeof window !== 'undefined') {
        localStorage.setItem('oakland_active_child_id', childId);
      }
    }
  };

  return (
    <ParentContext.Provider
      value={{
        parent,
        childrenList,
        activeChild,
        setActiveChildId,
        isLoading,
        refresh: fetchParentData,
      }}
    >
      {children}
    </ParentContext.Provider>
  );
}

export function useActiveChild() {
  const context = useContext(ParentContext);
  if (!context) {
    throw new Error('useActiveChild must be used within a ParentProvider');
  }
  return context;
}
