import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.model';
import { AdminProject, StudentRow, Lab } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProfessorService {
  private readonly api = `${environment.apiUrl}/professor`;

  constructor(private http: HttpClient) {}

  getSections(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.api}/sections`).pipe(map((r) => r.data));
  }

  getProjects(): Observable<AdminProject[]> {
    return this.http.get<ApiResponse<AdminProject[]>>(`${this.api}/projects`).pipe(map((r) => r.data));
  }

  getStudents(): Observable<StudentRow[]> {
    return this.http.get<ApiResponse<StudentRow[]>>(`${this.api}/students`).pipe(map((r) => r.data));
  }

  getProfessors(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.api}/professors`).pipe(map((r) => r.data));
  }

  getRunningProjects(): Observable<AdminProject[]> {
    return this.http.get<ApiResponse<AdminProject[]>>(`${this.api}/projects/running`).pipe(map((r) => r.data));
  }

  getLabs(): Observable<Lab[]> {
    return this.http.get<ApiResponse<Lab[]>>(`${this.api}/labs`).pipe(map((r) => r.data));
  }

  createLab(body: { name: string; description?: string; deadline: string; maxGrade: number; sections: string[] }): Observable<Lab> {
    return this.http.post<ApiResponse<Lab>>(`${this.api}/labs`, body).pipe(map((r) => r.data));
  }

  updateLab(labId: string, body: { name?: string; description?: string; deadline?: string; maxGrade?: number; sections?: string[] }): Observable<Lab> {
    return this.http.put<ApiResponse<Lab>>(`${this.api}/labs/${labId}`, body).pipe(map((r) => r.data));
  }

  deleteLab(labId: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.api}/labs/${labId}`);
  }

  gradeProject(projectId: string, body: { grade?: number; gradeMessage?: string }): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.api}/projects/${projectId}/grade`, body).pipe(map((r) => r.data));
  }

  assignProjectToLab(projectId: string, labId: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.api}/projects/${projectId}/assign-lab`, { labId }).pipe(map((r) => r.data));
  }

  unassignProjectFromLab(projectId: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.api}/projects/${projectId}/unassign-lab`, {}).pipe(map((r) => r.data));
  }

  assignLabToSection(labId: string): Observable<{ count: number }> {
    return this.http.patch<ApiResponse<{ count: number }>>(`${this.api}/labs/${labId}/assign-section`, {}).pipe(map((r) => r.data));
  }
}
