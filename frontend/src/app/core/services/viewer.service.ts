import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FileNode, FileContent } from '../models/file-node.model';
import { ApiResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ViewerService {
  private readonly api = `${environment.apiUrl}/viewer`;

  constructor(private http: HttpClient) {}

  /** Get the folder / file tree for a project */
  getStructure(projectId: string): Observable<FileNode[]> {
    return this.http
      .get<ApiResponse<FileNode[]>>(`${this.api}/${projectId}/structure`)
      .pipe(map((r) => r.data));
  }

  /** Read a single file's content */
  getFileContent(projectId: string, filePath: string): Observable<FileContent> {
    return this.http
      .get<ApiResponse<FileContent>>(`${this.api}/${projectId}`, {
        params: { path: filePath },
      })
      .pipe(map((r) => r.data));
  }
}
