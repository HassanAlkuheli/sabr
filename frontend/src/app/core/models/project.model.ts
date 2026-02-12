export type ProjectStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR';
export type ProjectType = 'static' | 'nodejs';

export interface Project {
  id: string;
  studentId: string;
  name: string;
  minioSourcePath: string | null;
  url: string | null;
  adminUrl: string | null;
  projectType: ProjectType;
  status: ProjectStatus;
  fileSize: number | null;
  lastActive: string | null;
  labId: string | null;
  grade: number | null;
  gradeMessage: string | null;
  predictedGrade: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Enriched view used in professor dashboard */
export interface StudentRow {
  id: string;
  name: string;
  email: string;
  sectionNumber: string | null;
  status: string;
  projects: Project[];
}

/** Admin view of a project with student info */
export interface AdminProject {
  id: string;
  name: string;
  status: ProjectStatus;
  url: string | null;
  adminUrl: string | null;
  projectType: ProjectType;
  fileSize: number | null;
  lastActive: string | null;
  createdAt: string;
  updatedAt: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  sectionNumber: string | null;
  labId: string | null;
  grade: number | null;
  gradeMessage: string | null;
  predictedGrade: number | null;
  errorMessage: string | null;
}

/** Lab model */
export interface Lab {
  id: string;
  professorId: string;
  name: string;
  description: string | null;
  deadline: string;
  maxGrade: number;
  sections: string;
  attachments: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Admin lab view with professor info */
export interface AdminLab {
  id: string;
  name: string;
  description: string | null;
  deadline: string;
  maxGrade: number;
  sections: string;
  attachments: string | null;
  createdAt: string;
  updatedAt: string;
  professorId: string;
  professorName: string;
  professorEmail: string;
}
