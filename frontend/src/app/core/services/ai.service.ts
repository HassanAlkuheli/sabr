import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AiScanResult {
  matchPercentage: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  missingRequirements: string[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  scanProject(projectId: string): Observable<{ success: boolean; data: AiScanResult; message?: string }> {
    return this.http.post<any>(`${this.base}/ai/scan/${projectId}`, {});
  }
}
