export type Role = 'ADMIN' | 'PROFESSOR' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  sectionNumber: string | null;
  sections: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterStudentRequest {
  name: string;
  email: string;
  password: string;
  sectionNumber: string;
}

export interface RegisterProfessorRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  data: User;
}

export interface RegisterResponse {
  success: boolean;
  data: User;
  message?: string;
}
