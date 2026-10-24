import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.ts';
import { api } from '../api/client.ts';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  switchUser: (userId: string) => Promise<void>;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isManager: boolean;
  canEdit: boolean;
  canGrade: boolean;
  canManageSettings: boolean;
  canAccessAi: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('cls_10a1');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.getUsers();
      setUsers(res.users);
      setCurrentUser(res.currentUser || res.users[0]);
    } catch (err) {
      console.error('Failed to load initial users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchUser = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      setCurrentUser(res.currentUser);
      if (res.currentUser.role === 'STUDENT') {
        setSelectedClassId('cls_10a1');
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  const role: UserRole = currentUser?.role || 'TEACHER';
  const isAdmin = role === 'ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isManager = role === 'SCHOOL_MANAGER';

  const canEdit = isAdmin || isTeacher;
  const canGrade = isAdmin || isTeacher;
  const canManageSettings = isAdmin;
  const canAccessAi = isAdmin || isTeacher || isManager;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoading,
        selectedClassId,
        setSelectedClassId,
        switchUser,
        isAdmin,
        isTeacher,
        isStudent,
        isManager,
        canEdit,
        canGrade,
        canManageSettings,
        canAccessAi,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
