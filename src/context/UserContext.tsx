'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Role } from '@/lib/types';

interface UserContextType {
  userName: string;
  role: Role | null;
  userId: string;
  login: (name: string, role: Role) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState('');

  const login = (name: string, selectedRole: Role) => {
    setUserName(name);
    setRole(selectedRole);
    setUserId(`${selectedRole}-${Date.now()}`);
  };

  const logout = () => {
    setUserName('');
    setRole(null);
    setUserId('');
  };

  return (
    <UserContext.Provider
      value={{
        userName,
        role,
        userId,
        login,
        logout,
        isLoggedIn: !!role && !!userName,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
