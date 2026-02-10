import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Project, Lab } from '../models/project.model';
import { ApiResponse } from '../models/api.model';

export interface Classmate {
  id: string;
  name: string;
  email: string;
  sectionNumber: string | null;
  status: string;
}

export interface SectionProfessor {
  id: string;
  name: string;
  email: string;
  sections: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  /** Upload a project archive (zip/rar) */
  upload(file: File, name: string): Observable<Project> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name);
    return this.http.post<ApiResponse<Project>>(this.api + '/upload', fd).pipe(map((r) => r.data));
  }

  /** List the authenticated student's own projects */
  list(): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(this.api + '/').pipe(map((r) => r.data));
  }

  /** List student's running projects */
  listRunning(): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(this.api + '/running').pipe(map((r) => r.data));
  }

  /** Get labs for the student's section */
  getMyLabs(): Observable<Lab[]> {
    return this.http.get<ApiResponse<Lab[]>>(this.api + '/my-labs').pipe(map((r) => r.data));
  }

  /** Get classmates in the same section */
  getClassmates(): Observable<Classmate[]> {
    return this.http.get<ApiResponse<Classmate[]>>(this.api + '/classmates').pipe(map((r) => r.data));
  }

  /** Get professors assigned to the student's section */
  getSectionProfessors(): Observable<SectionProfessor[]> {
    return this.http.get<ApiResponse<SectionProfessor[]>>(this.api + '/section-professors').pipe(map((r) => r.data));
  }

  /** Submit project to a specific lab (creates or replaces) */
  submitToLab(labId: string, file: File, name: string): Observable<Project> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name);
    return this.http.post<ApiResponse<Project>>(`${this.api}/submit-to-lab/${labId}`, fd).pipe(map((r) => r.data));
  }

  /** Student starts their own project */
  startProject(projectId: string): Observable<{ url: string; adminUrl: string | null }> {
    return this.http
      .post<ApiResponse<never> & { url: string; adminUrl: string | null }>(`${this.api}/${projectId}/start`, {})
      .pipe(map((r) => ({ url: r.url, adminUrl: r.adminUrl ?? null })));
  }

  /** Student stops their own project */
  stopProject(projectId: string): Observable<string> {
    return this.http
      .post<ApiResponse<never> & { message: string }>(`${this.api}/${projectId}/stop`, {})
      .pipe(map((r) => r.message));
  }

  /** Get Docker container logs for own project */
  getProjectLogs(projectId: string, tail = 200): Observable<string> {
    return this.http
      .get<ApiResponse<string>>(`${this.api}/${projectId}/logs`, { params: { tail: tail.toString() } })
      .pipe(map((r) => r.data));
  }

  /** Delete own project */
  deleteProject(projectId: string): Observable<string> {
    return this.http
      .delete<ApiResponse<never> & { message: string }>(`${this.api}/${projectId}`)
      .pipe(map((r) => r.message));
  }
}
