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

export interface DeepScanResult {
  matchPercentage: number;
  summary: string;
  pageLoads: boolean;
  consoleErrors: string[];
  interactiveTests: { description: string; passed: boolean; details: string }[];
  missingBehaviors: string[];
  screenshotPaths?: string[];   // MinIO paths
  pagesVisited?: string[];  // URLs visited
}

export interface CachedScanData {
  result: AiScanResult | null;
  scannedAt: string | null;
  deepResult: DeepScanResult | null;
  deepScannedAt: string | null;
  predictedGrade: number | null;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  /** Get cached scan results from DB (no LLM call) */
  getCachedScan(projectId: string): Observable<{ success: boolean; data: CachedScanData }> {
    return this.http.get<any>(`${this.base}/ai/scan/${projectId}`);
  }

  /** Run or re-run the code scan (calls LLM, saves to DB) */
  scanProject(projectId: string): Observable<{ success: boolean; data: AiScanResult; message?: string }> {
    return this.http.post<any>(`${this.base}/ai/scan/${projectId}`, {});
  }

  /** Run deep scan — crawls deployed pages and evaluates behavior (calls LLM, saves to DB) */
  deepScanProject(projectId: string): Observable<{ success: boolean; data: DeepScanResult; message?: string }> {
    return this.http.post<any>(`${this.base}/ai/deep-scan/${projectId}`, {});
  }

  /** Get direct URL to a deep scan screenshot (proxied via backend) */
  getScreenshotUrl(projectId: string, index: number): string {
    return `${this.base}/ai/screenshot/${projectId}/${index}`;
  }
}
