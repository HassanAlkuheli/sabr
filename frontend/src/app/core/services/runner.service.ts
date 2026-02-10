import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class RunnerService {
  private readonly api = `${environment.apiUrl}/runner`;

  constructor(private http: HttpClient) {}

  start(projectId: string): Observable<string> {
    return this.http
      .post<ApiResponse<never> & { url: string }>(`${this.api}/${projectId}/start`, {})
      .pipe(map((r) => r.url));
  }

  stop(projectId: string): Observable<string> {
    return this.http
      .post<ApiResponse<never> & { message: string }>(`${this.api}/${projectId}/stop`, {})
      .pipe(map((r) => r.message));
  }

  /** Get Docker container logs for a project (professor/admin) */
  getLogs(projectId: string, tail = 200): Observable<string> {
    return this.http
      .get<ApiResponse<string>>(`${this.api}/${projectId}/logs`, { params: { tail: tail.toString() } })
      .pipe(map((r) => r.data));
  }
}
