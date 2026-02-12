import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';
import { AiScanDialogComponent } from '../../shared/components/ai-scan-dialog.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/services/i18n.service';
import { StudentStateService } from './student-state.service';
import { ProjectsService } from '../../core/services/projects.service';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-student-projects',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    TooltipModule,
    SelectModule,
    ConfirmDialogModule,
    StatusBadgeComponent,
    LogsDialogComponent,
    AiScanDialogComponent,
    TranslatePipe,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="p-6 space-y-6">
      <!-- Upload card -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 class="text-lg font-semibold text-primary mb-4">{{ 'upload.uploadProject' | translate }}</h2>

        <details class="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <summary class="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300 p-3 select-none flex items-center gap-2">
            <i class="pi pi-info-circle"></i> {{ 'upload.hint.toggle' | translate }}
          </summary>
          <div class="px-4 pb-3 space-y-3 text-xs text-blue-600 dark:text-blue-400">
            <div>
              <p class="font-semibold text-blue-700 dark:text-blue-300 mb-1">{{ 'upload.hint.static.title' | translate }}</p>
              <ul class="ltr:ml-5 rtl:mr-5 list-disc space-y-0.5">
                <li>{{ 'upload.hint.static.1' | translate }}</li>
                <li>{{ 'upload.hint.static.2' | translate }}</li>
                <li>{{ 'upload.hint.static.3' | translate }}</li>
              </ul>
            </div>
            <div>
              <p class="font-semibold text-blue-700 dark:text-blue-300 mb-1">{{ 'upload.hint.node.title' | translate }}</p>
              <ul class="ltr:ml-5 rtl:mr-5 list-disc space-y-0.5">
                <li>{{ 'upload.hint.node.1' | translate }}</li>
                <li>{{ 'upload.hint.node.2' | translate }}</li>
                <li>{{ 'upload.hint.node.3' | translate }}</li>
                <li>{{ 'upload.hint.node.4' | translate }}</li>
                <li>{{ 'upload.hint.node.5' | translate }}</li>
                <li>{{ 'upload.hint.node.6' | translate }}</li>
              </ul>
            </div>
            <div>
              <p class="font-semibold text-blue-700 dark:text-blue-300 mb-1">{{ 'upload.hint.general.title' | translate }}</p>
              <ul class="ltr:ml-5 rtl:mr-5 list-disc space-y-0.5">
                <li>{{ 'upload.hint.general.1' | translate }}</li>
                <li>{{ 'upload.hint.general.2' | translate }}</li>
                <li>{{ 'upload.hint.general.3' | translate }}</li>
              </ul>
            </div>
          </div>
        </details>

        @if (uploadError()) {
          <p-message severity="error" [text]="uploadError()!" styleClass="w-full mb-4" />
        }
        @if (uploadSuccess()) {
          <p-message severity="success" [text]="'upload.success' | translate" styleClass="w-full mb-4" />
        }

        <div class="flex items-end gap-4 flex-wrap">
          <div class="flex flex-col gap-2 flex-1 min-w-[200px]">
            <label class="text-sm font-medium text-primary">{{ 'student.selectLab' | translate }}</label>
            <p-select
              [options]="activeLabs()"
              optionLabel="name"
              optionValue="id"
              [(ngModel)]="selectedLabId"
              [placeholder]="'student.selectLab' | translate"
              appendTo="body"
              styleClass="w-full"
            />
          </div>

          <div class="flex flex-col gap-2 flex-1 min-w-[200px]">
            <label class="text-sm font-medium text-primary">{{ 'upload.projectName' | translate }}</label>
            <input pInputText [(ngModel)]="projectName" [placeholder]="'upload.projectNamePlaceholder' | translate" class="w-full" />
          </div>

          <div class="flex flex-col gap-2 flex-1 min-w-[200px]">
            <label class="text-sm font-medium text-primary">{{ 'upload.archiveLabel' | translate }}</label>
            <!-- Hidden native input -->
            <input
              type="file"
              accept=".zip,.rar"
              (change)="onFileSelect($event)"
              #fileInput
              class="hidden"
            />
            <!-- Custom styled button + filename -->
            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="fileInput.click()"
                class="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer
                       bg-emerald-50 text-emerald-700 hover:bg-emerald-100
                       dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50
                       transition-colors whitespace-nowrap"
              >
                {{ 'upload.chooseFile' | translate }}
              </button>
              <span class="text-sm text-secondary truncate">
                {{ selectedFile ? selectedFile.name : ('upload.noFileChosen' | translate) }}
              </span>
            </div>
          </div>

          <p-button
            icon="pi pi-upload"
            [label]="'upload.upload' | translate"
            severity="success"
            [loading]="uploading()"
            (onClick)="upload()"
            [disabled]="!selectedFile || !projectName || !selectedLabId"
          />
        </div>
      </div>

      <!-- Projects table -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <p-table
          [value]="state.allProjects()"
          [loading]="state.loadingProjects()"
          [paginator]="true"
          [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25, 50]"
          [globalFilterFields]="['name']"
          styleClass="p-datatable-striped"
        >
          <ng-template pTemplate="caption">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-primary">
                {{ 'common.projects' | translate }}
              </span>
              <div class="flex items-center gap-3">
                <span class="text-sm text-secondary">
                  {{ state.allProjects().length }} {{ 'common.projectCount' | translate:state.allProjects().length }}
                </span>
                <p-button
                  icon="pi pi-refresh"
                  [text]="true"
                  [rounded]="true"
                  severity="secondary"
                  [pTooltip]="'common.refresh' | translate"
                  (onClick)="state.loadProjects()"
                />
              </div>
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">{{ 'common.name' | translate }} <p-sortIcon field="name" /></th>
              <th>{{ 'common.status' | translate }}</th>
              <th>{{ 'professor.lab' | translate }}</th>
              <th>{{ 'professor.grade' | translate }}</th>
              <th>{{ 'common.size' | translate }}</th>
              <th pSortableColumn="createdAt">{{ 'common.created' | translate }} <p-sortIcon field="createdAt" /></th>
              <th class="text-right">{{ 'common.actions' | translate }}</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-project>
            <tr>
              <td class="font-medium">{{ project.name }}</td>
              <td>
                <app-status-badge [status]="project.status" />
              </td>
              <td>
                @if (state.getLabName(project.labId); as labName) {
                  <span class="text-xs font-medium text-primary">{{ labName }}</span>
                } @else {
                  <span class="text-slate-400 italic">{{ 'professor.unassigned' | translate }}</span>
                }
              </td>
              <td>
                @if (project.labId && project.grade !== null) {
                  <span class="text-sm font-semibold text-green-600 dark:text-green-400">
                    {{ project.grade }} / {{ state.getLabMaxGrade(project.labId) }}
                  </span>
                  @if (project.gradeMessage) {
                    <div class="text-xs text-secondary mt-0.5">{{ project.gradeMessage }}</div>
                  }
                  @if (project.aiPredictedGrade !== null && project.aiPredictedGrade !== undefined) {
                    <div class="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                      <i class="pi pi-sparkles text-[10px]"></i> {{ 'ai.predictedGrade' | translate }}: {{ project.aiPredictedGrade }}
                    </div>
                  }
                } @else if (project.labId) {
                  <span class="text-slate-400 italic text-sm">{{ 'professor.notGraded' | translate }}</span>
                  @if (project.aiPredictedGrade !== null && project.aiPredictedGrade !== undefined) {
                    <div class="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                      <i class="pi pi-sparkles text-[10px]"></i> {{ 'ai.predictedGrade' | translate }}: {{ project.aiPredictedGrade }} / {{ state.getLabMaxGrade(project.labId) }}
                    </div>
                  }
                } @else {
                  <span class="text-slate-400">—</span>
                }
              </td>
              <td class="text-sm text-secondary">
                {{ project.fileSize ? state.formatSize(project.fileSize) : '—' }}
              </td>
              <td class="text-sm text-secondary">
                {{ project.createdAt | date:'shortDate' }}
              </td>
              <td class="text-right space-x-1">
                <p-button
                  icon="pi pi-play"
                  severity="success"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'common.deploy' | translate"
                  tooltipPosition="left"
                  [disabled]="(project.status !== 'STOPPED' && project.status !== 'ERROR') || state.pendingStartIds().has(project.id)"
                  [loading]="state.pendingStartIds().has(project.id)"
                  (onClick)="confirmStart(project)"
                />
                <p-button
                  icon="pi pi-stop"
                  severity="danger"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'common.stop' | translate"
                  tooltipPosition="left"
                  [disabled]="project.status !== 'RUNNING' || state.pendingStopIds().has(project.id)"
                  [loading]="state.pendingStopIds().has(project.id)"
                  (onClick)="confirmStop(project)"
                />
                <p-button
                  icon="pi pi-external-link"
                  severity="info"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'common.openUrl' | translate"
                  tooltipPosition="left"
                  [disabled]="!project.url"
                  (onClick)="state.openUrl(project.url)"
                />
                @if (project.adminUrl && project.status === 'RUNNING') {
                  <p-button
                    icon="pi pi-database"
                    severity="warn"
                    [text]="true"
                    [rounded]="true"
                    [pTooltip]="'common.openDb' | translate"
                    tooltipPosition="left"
                    (onClick)="state.openUrl(project.adminUrl)"
                  />
                }
                <p-button
                  icon="pi pi-code"
                  severity="secondary"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'common.browseFiles' | translate"
                  tooltipPosition="left"
                  (onClick)="state.openExplorer(project)"
                />
                <p-button
                  icon="pi pi-list"
                  severity="contrast"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'common.terminal' | translate"
                  tooltipPosition="left"
                  [disabled]="project.status === 'STOPPED'"
                  (onClick)="state.openLogs(project)"
                />
                @if (project.labId) {
                  <p-button
                    icon="pi pi-sparkles"
                    severity="help"
                    [text]="true"
                    [rounded]="true"
                    [pTooltip]="'ai.scan' | translate"
                    tooltipPosition="left"
                    (onClick)="openAiScan(project)"
                  />
                }
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'common.delete' | translate"
                  tooltipPosition="left"
                  [disabled]="project.status === 'STARTING'"
                  (onClick)="confirmDelete(project)"
                />
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center py-8 text-secondary">
                {{ 'upload.noProjects' | translate }}
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <p-confirmDialog />

    <app-logs-dialog
      [visible]="!!state.logsProject()"
      [projectName]="state.logsProject()?.name ?? ''"
      [logs]="state.logsContent()"
      [loading]="state.logsLoading()"
      (closed)="state.closeLogs()"
      (refreshRequested)="state.refreshLogs()"
    />

    <!-- AI Scan Dialog -->
    <app-ai-scan-dialog
      [visible]="showAiScan()"
      [projectId]="aiScanProjectId()"
      [maxGrade]="aiScanMaxGrade()"
      (closed)="closeAiScan()"
    />
  `,
})
export class StudentProjectsComponent {
  state = inject(StudentStateService);
  private projectsService = inject(ProjectsService);
  private confirmationService = inject(ConfirmationService);
  private i18n = inject(I18nService);

  uploading = signal(false);
  uploadError = signal<string | null>(null);
  uploadSuccess = signal(false);

  // AI scan
  showAiScan = signal(false);
  aiScanProjectId = signal('');
  aiScanMaxGrade = signal(100);

  projectName = '';
  selectedFile: File | null = null;
  selectedLabId: string | null = null;

  /** Only show active (non-expired) labs in the dropdown */
  activeLabs = () => this.state.labs().filter((lab) => !this.state.isLabExpired(lab.deadline));

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  upload() {
    if (!this.selectedFile || !this.projectName) return;

    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploadSuccess.set(false);

    const obs = this.projectsService.submitToLab(this.selectedLabId!, this.selectedFile!, this.projectName);

    obs.subscribe({
      next: () => {
        this.uploading.set(false);
        this.uploadSuccess.set(true);
        this.projectName = '';
        this.selectedFile = null;
        this.selectedLabId = null;
        this.state.loadProjects();
        this.state.loadLabs();
      },
      error: (err: any) => {
        this.uploading.set(false);
        this.uploadError.set(err.error?.message ?? 'Upload failed');
      },
    });
  }

  confirmStart(project: Project) {
    this.confirmationService.confirm({
      message: this.i18n.t('confirm.startProject'),
      header: this.i18n.t('common.confirm'),
      icon: 'pi pi-play',
      acceptLabel: this.i18n.t('common.yes'),
      rejectLabel: this.i18n.t('common.no'),
      accept: () => this.state.startProject(project),
    });
  }

  confirmStop(project: Project) {
    this.confirmationService.confirm({
      message: this.i18n.t('confirm.stopProject'),
      header: this.i18n.t('common.confirm'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.t('common.yes'),
      rejectLabel: this.i18n.t('common.no'),
      accept: () => this.state.stopProject(project),
    });
  }

  confirmDelete(project: Project) {
    this.confirmationService.confirm({
      message: this.i18n.t('confirm.deleteProject'),
      header: this.i18n.t('common.confirm'),
      icon: 'pi pi-trash',
      acceptLabel: this.i18n.t('common.yes'),
      rejectLabel: this.i18n.t('common.no'),
      accept: () => this.state.deleteProject(project),
    });
  }

  // ─── AI Scan ──────────────────────────────

  openAiScan(project: Project) {
    this.aiScanProjectId.set(project.id);
    this.aiScanMaxGrade.set(this.state.getLabMaxGrade(project.labId) ?? 100);
    this.showAiScan.set(true);
  }

  closeAiScan() {
    this.showAiScan.set(false);
  }
}
