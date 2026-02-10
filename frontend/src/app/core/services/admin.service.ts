import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { ApiResponse } from '../models/api.model';
import { StudentRow, AdminProject, AdminLab } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getProfessors(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.api}/professors`).pipe(map((r) => r.data));
  }

  getStudents(): Observable<StudentRow[]> {
    return this.http.get<ApiResponse<StudentRow[]>>(`${this.api}/students`).pipe(map((r) => r.data));
  }

  getAllProjects(): Observable<AdminProject[]> {
    return this.http
      .get<ApiResponse<AdminProject[]>>(`${this.api}/projects`)
      .pipe(map((r) => r.data));
  }

  getRunningProjects(): Observable<AdminProject[]> {
    return this.http
      .get<ApiResponse<AdminProject[]>>(`${this.api}/projects/running`)
      .pipe(map((r) => r.data));
  }

  getSections(): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(`${this.api}/sections`)
      .pipe(map((r) => r.data));
  }

  assignSections(professorId: string, sections: string[]): Observable<User> {
    return this.http
      .put<ApiResponse<User>>(`${this.api}/professors/${professorId}/sections`, { sections })
      .pipe(map((r) => r.data));
  }

  addProfessorSection(professorId: string, section: string): Observable<User> {
    return this.http
      .post<ApiResponse<User>>(`${this.api}/professors/${professorId}/sections/add`, { section })
      .pipe(map((r) => r.data));
  }

  removeProfessorSection(professorId: string, section: string): Observable<User> {
    return this.http
      .post<ApiResponse<User>>(`${this.api}/professors/${professorId}/sections/remove`, { section })
      .pipe(map((r) => r.data));
  }

  updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED'): Observable<User> {
    return this.http
      .patch<ApiResponse<User>>(`${this.api}/users/${userId}/status`, { status })
      .pipe(map((r) => r.data));
  }

  updateStudentSection(studentId: string, sectionNumber: string): Observable<User> {
    return this.http
      .patch<ApiResponse<User>>(`${this.api}/students/${studentId}/section`, { sectionNumber })
      .pipe(map((r) => r.data));
  }

  getLabs(): Observable<AdminLab[]> {
    return this.http.get<ApiResponse<AdminLab[]>>(`${this.api}/labs`).pipe(map((r) => r.data));
  }

  getProjectsWithGrades(): Observable<AdminProject[]> {
    return this.http.get<ApiResponse<AdminProject[]>>(`${this.api}/projects/grades`).pipe(map((r) => r.data));
  }
}
