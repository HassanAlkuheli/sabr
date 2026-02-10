import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { HeaderComponent } from '../../layout/header.component';
import { ProjectsService } from '../../core/services/projects.service';
import { Project } from '../../core/models/project.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-upload-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    MessageModule,
    DialogModule,
    FileUploadModule,
    HeaderComponent,
    StatusBadgeComponent,
    TranslatePipe,
  ],
  template: `
    <app-header [title]="'upload.title' | translate" />

    <div class="p-6 space-y-6">
      <!-- Upload card -->
      <div class="bg-white rounded-xl border border-slate-200 p-6">
        <h2 class="text-lg font-semibold text-primary mb-4">{{ 'upload.uploadProject' | translate }}</h2>

        @if (uploadError()) {
          <p-message severity="error" [text]="uploadError()!" styleClass="w-full mb-4" />
        }
        @if (uploadSuccess()) {
          <p-message severity="success" [text]="'upload.success' | translate" styleClass="w-full mb-4" />
        }

        <div class="flex items-end gap-4 flex-wrap">
          <div class="flex flex-col gap-2 flex-1 min-w-[200px]">
            <label class="text-sm font-medium text-primary">{{ 'upload.projectName' | translate }}</label>
            <input pInputText [(ngModel)]="projectName" [placeholder]="'upload.projectNamePlaceholder' | translate" class="w-full" />
          </div>

          <div class="flex flex-col gap-2 flex-1 min-w-[200px]">
            <label class="text-sm font-medium text-primary">{{ 'upload.archiveLabel' | translate }}</label>
            <input
              type="file"
              accept=".zip,.rar"
              (change)="onFileSelect($event)"
              class="block w-full text-sm text-slate-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-lg file:border-0
                     file:text-sm file:font-semibold
                     file:bg-accent/10 file:text-amber-700
                     hover:file:bg-accent/20"
            />
          </div>

          <p-button
            icon="pi pi-upload"
            [loading]="uploading()"
            (onClick)="upload()"
            [disabled]="!selectedFile || !projectName"
          >
            {{ 'upload.upload' | translate }}
          </p-button>
        </div>
      </div>

      <!-- Projects table -->
      <div class="bg-white rounded-xl border border-slate-200">
        <p-table
          [value]="projects()"
          [loading]="loadingProjects()"
          [paginator]="true"
          [rows]="10"
          styleClass="p-datatable-striped"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>{{ 'common.name' | translate }}</th>
              <th>{{ 'common.status' | translate }}</th>
              <th>{{ 'common.url' | translate }}</th>
              <th>{{ 'common.created' | translate }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-project>
            <tr>
              <td class="font-medium">{{ project.name }}</td>
              <td>
                <app-status-badge [status]="project.status" />
              </td>
              <td>
                @if (project.url) {
                  <a
                    [href]="project.url"
                    target="_blank"
                    class="text-accent hover:underline text-sm"
                  >
                    {{ project.url }}
                  </a>
                } @else {
                  <span class="text-slate-400 text-sm">—</span>
                }
              </td>
              <td class="text-sm text-secondary">
                {{ project.createdAt | date:'medium' }}
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="4" class="text-center py-8 text-secondary">
                {{ 'upload.noProjects' | translate }}
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `,
})
export class UploadDashboardComponent implements OnInit {
  private projectsService = inject(ProjectsService);

  projects = signal<Project[]>([]);
  loadingProjects = signal(false);
  uploading = signal(false);
  uploadError = signal<string | null>(null);
  uploadSuccess = signal(false);

  projectName = '';
  selectedFile: File | null = null;

  ngOnInit() {
    this.loadProjects();
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  upload() {
    if (!this.selectedFile || !this.projectName) return;

    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploadSuccess.set(false);

    this.projectsService.upload(this.selectedFile, this.projectName).subscribe({
      next: () => {
        this.uploading.set(false);
        this.uploadSuccess.set(true);
        this.projectName = '';
        this.selectedFile = null;
        this.loadProjects();
      },
      error: (err: any) => {
        this.uploading.set(false);
        this.uploadError.set(err.error?.message ?? 'Upload failed');
      },
    });
  }

  private loadProjects() {
    this.loadingProjects.set(true);
    this.projectsService.list().subscribe({
      next: (data) => {
        this.projects.set(data);
        this.loadingProjects.set(false);
      },
      error: () => this.loadingProjects.set(false),
    });
  }
}
