import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { HeaderComponent } from '../../layout/header.component';
import { FileExplorerComponent } from '../../shared/components/file-explorer.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AuthService } from '../../core/services/auth.service';
import { ProjectsService, Classmate, SectionProfessor } from '../../core/services/projects.service';
import { Project, Lab } from '../../core/models/project.model';
import { StudentStateService } from './student-state.service';

@Component({
  selector: 'app-student-class-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    TooltipModule,
    DialogModule,
    HeaderComponent,
    FileExplorerComponent,
    StatusBadgeComponent,
    LogsDialogComponent,
    TranslatePipe,
  ],
  template: `
    <app-header [title]="'class.title' | translate" />

    <div class="p-6 space-y-6">
      @if (error()) {
        <p-message severity="error" [text]="error()!" styleClass="w-full" />
      }
      @if (submitSuccess()) {
        <p-message severity="success" [text]="'student.submitSuccess' | translate" styleClass="w-full" />
      }

      <!-- Professor info -->
      @for (prof of professors(); track prof.id) {
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 flex items-center justify-center font-bold text-sm">
            {{ prof.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="text-sm font-medium text-blue-900 dark:text-blue-100">{{ prof.name }}</p>
            <p class="text-xs text-blue-600 dark:text-blue-300">{{ prof.email }}</p>
          </div>
          <span class="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200">
            {{ 'common.professor' | translate }}
          </span>
        </div>
      }

      <!-- Classmates table -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <p-table
          [value]="classmates()"
          [loading]="loading()"
          [paginator]="true"
          [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25, 50]"
          dataKey="id"
          styleClass="p-datatable-striped"
        >
          <ng-template pTemplate="caption">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-primary">
                {{ 'class.students' | translate }} – {{ section() }}
              </span>
              <span class="text-sm text-secondary">
                {{ classmates().length }} {{ 'common.studentCount' | translate:classmates().length }}
              </span>
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th style="width: 3rem"></th>
              <th pSortableColumn="name">{{ 'common.name' | translate }} <p-sortIcon field="name" /></th>
              <th pSortableColumn="email">{{ 'common.email' | translate }} <p-sortIcon field="email" /></th>
              <th>{{ 'common.section' | translate }}</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-student>
            <tr>
              <td>
                @if (isCurrentUser(student.id)) {
                  <p-button
                    type="button"
                    [text]="true"
                    [rounded]="true"
                    [plain]="true"
                    [icon]="isExpanded(student.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                    (onClick)="toggleRow(student.id)"
                  />
                }
              </td>
              <td class="font-medium">
                {{ student.name }}
                @if (isCurrentUser(student.id)) {
                  <span class="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                    {{ 'student.you' | translate }}
                  </span>
                }
              </td>
              <td class="text-sm text-secondary">{{ student.email }}</td>
              <td class="text-sm text-secondary">{{ student.sectionNumber }}</td>
            </tr>

            <!-- Expanded row: own labs + submissions (only for current user) -->
            @if (isCurrentUser(student.id) && isExpanded(student.id)) {
              <tr>
                <td colspan="4" class="p-0">
                  <div class="p-4 bg-slate-50 dark:bg-slate-900/50">
                    @if (labs().length) {
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="text-left text-xs text-secondary uppercase tracking-wider">
                            <th class="pb-2">{{ 'professor.lab' | translate }}</th>
                            <th class="pb-2">{{ 'professor.deadline' | translate }}</th>
                            <th class="pb-2">{{ 'common.status' | translate }}</th>
                            <th class="pb-2">{{ 'student.mySubmission' | translate }}</th>
                            <th class="pb-2">{{ 'student.projectStatus' | translate }}</th>
                            <th class="pb-2">{{ 'professor.grade' | translate }}</th>
                            <th class="pb-2 text-right">{{ 'common.actions' | translate }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (lab of labs(); track lab.id) {
                            <tr class="border-t border-slate-200 dark:border-slate-700">
                              <td class="py-2 font-medium">{{ lab.name }}</td>
                              <td class="py-2 text-secondary">{{ lab.deadline | date:'shortDate' }}</td>
                              <td class="py-2">
                                @if (isLabExpired(lab.deadline)) {
                                  <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                    {{ 'professor.expired' | translate }}
                                  </span>
                                } @else {
                                  <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                    {{ 'professor.active' | translate }}
                                  </span>
                                }
                              </td>
                              <td class="py-2">
                                @if (getProjectForLab(lab.id); as project) {
                                  <span class="text-xs font-medium text-primary">{{ project.name }}</span>
                                } @else {
                                  <span class="text-slate-400 italic">{{ 'student.notSubmitted' | translate }}</span>
                                }
                              </td>
                              <td class="py-2">
                                @if (getProjectForLab(lab.id); as project) {
                                  <app-status-badge [status]="project.status" />
                                }
                              </td>
                              <td class="py-2">
                                @if (getProjectForLab(lab.id); as project) {
                                  @if (project.grade !== null) {
                                    <span class="text-sm font-semibold text-green-600 dark:text-green-400">
                                      {{ project.grade }} / {{ lab.maxGrade }}
                                    </span>
                                    @if (project.gradeMessage) {
                                      <div class="text-xs text-secondary mt-0.5">{{ project.gradeMessage }}</div>
                                    }
                                  } @else {
                                    <span class="text-slate-400 italic">{{ 'professor.notGraded' | translate }}</span>
                                  }
                                } @else {
                                  <span class="text-slate-400">—</span>
                                }
                              </td>
                              <td class="py-2 text-right space-x-1">
                                <p-button
                                  icon="pi pi-upload"
                                  severity="warn"
                                  [text]="true"
                                  [rounded]="true"
                                  [pTooltip]="(getProjectForLab(lab.id) ? 'student.resubmit' : 'student.submit') | translate"
                                  tooltipPosition="left"
                                  (onClick)="openSubmitDialog(lab)"
                                />
                                @if (getProjectForLab(lab.id); as project) {
                                  <p-button
                                    icon="pi pi-play"
                                    severity="success"
                                    [text]="true"
                                    [rounded]="true"
                                    [pTooltip]="'common.deploy' | translate"
                                    tooltipPosition="left"
                                    [disabled]="(project.status !== 'STOPPED' && project.status !== 'ERROR') || pendingStartIds().has(project.id)"
                                    [loading]="pendingStartIds().has(project.id)"
                                    (onClick)="startProject(project)"
                                  />
                                  <p-button
                                    icon="pi pi-stop"
                                    severity="danger"
                                    [text]="true"
                                    [rounded]="true"
                                    [pTooltip]="'common.stop' | translate"
                                    tooltipPosition="left"
                                    [disabled]="project.status !== 'RUNNING' || pendingStopIds().has(project.id)"
                                    [loading]="pendingStopIds().has(project.id)"
                                    (onClick)="stopProject(project)"
                                  />
                                  <p-button
                                    icon="pi pi-external-link"
                                    severity="info"
                                    [text]="true"
                                    [rounded]="true"
                                    [pTooltip]="'common.openUrl' | translate"
                                    tooltipPosition="left"
                                    [disabled]="!project.url"
                                    (onClick)="openUrl(project.url)"
                                  />
                                  <p-button
                                    icon="pi pi-code"
                                    severity="secondary"
                                    [text]="true"
                                    [rounded]="true"
                                    [pTooltip]="'common.browseFiles' | translate"
                                    tooltipPosition="left"
                                    (onClick)="openExplorer(project)"
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
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    } @else {
                      <p class="text-secondary text-sm py-2">{{ 'professor.noLabs' | translate }}</p>
                    }
                  </div>
                </td>
              </tr>
            }
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="4" class="text-center py-8 text-secondary">
                {{ 'class.noStudents' | translate }}
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <!-- File Explorer Dialog -->
    @if (explorerProject()) {
      <app-file-explorer
        [projectId]="explorerProject()!.id"
        [projectName]="explorerProject()!.name"
        (closed)="closeExplorer()"
      />
    }

    <!-- Submit to Lab dialog -->
    <p-dialog
      [header]="(submitLab()?.name ?? '') + ' – ' + (('student.submit') | translate)"
      [(visible)]="showSubmitDialog"
      [modal]="true"
      [style]="{ width: '460px' }"
    >
      <div class="space-y-4">
        <div>
          <label class="text-xs font-medium text-secondary mb-1 block">{{ 'upload.projectName' | translate }}</label>
          <input pInputText [(ngModel)]="submitName" [placeholder]="'upload.projectNamePlaceholder' | translate" class="w-full" />
        </div>
        <div>
          <label class="text-xs font-medium text-secondary mb-1 block">{{ 'upload.archiveLabel' | translate }}</label>
          <input
            type="file"
            accept=".zip,.rar"
            (change)="onSubmitFileSelect($event)"
            class="block w-full text-sm text-slate-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-lg file:border-0
                   file:text-sm file:font-semibold
                   file:bg-accent/10 file:text-amber-700
                   hover:file:bg-accent/20"
          />
        </div>

        @if (submitDialogError()) {
          <p-message severity="error" [text]="submitDialogError()!" styleClass="w-full" />
        }

        <div class="flex justify-end gap-2 pt-2">
          <p-button [label]="'common.cancel' | translate" [outlined]="true" (onClick)="showSubmitDialog = false" />
          <p-button
            [label]="'upload.upload' | translate"
            icon="pi pi-upload"
            (onClick)="submitToLab()"
            [disabled]="!submitFile || !submitName"
            [loading]="submitting()"
          />
        </div>
      </div>
    </p-dialog>

    <app-logs-dialog
      [visible]="!!state.logsProject()"
      [projectName]="state.logsProject()?.name ?? ''"
      [logs]="state.logsContent()"
      [loading]="state.logsLoading()"
      (closed)="state.closeLogs()"
      (refreshRequested)="state.refreshLogs()"
    />
  `,
})
export class StudentClassDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private projectsService = inject(ProjectsService);
  state = inject(StudentStateService);

  classmates = signal<Classmate[]>([]);
  professors = signal<SectionProfessor[]>([]);
  labs = signal<Lab[]>([]);
  myProjects = signal<Project[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  expandedRows: Record<string, boolean> = {};
  explorerProject = signal<Project | null>(null);
  pendingStartIds = signal<Set<string>>(new Set());
  pendingStopIds = signal<Set<string>>(new Set());

  // Submit dialog
  showSubmitDialog = false;
  submitLab = signal<Lab | null>(null);
  submitName = '';
  submitFile: File | null = null;
  submitting = signal(false);
  submitError = signal<string | null>(null);
  submitDialogError = signal<string | null>(null);
  submitSuccess = signal(false);

  section = computed(() => {
    const user = this.auth.user();
    return user?.sectionNumber ?? '';
  });

  ngOnInit() {
    this.loading.set(true);

    this.projectsService.getClassmates().subscribe({
      next: (data) => {
        this.classmates.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load classmates');
        this.loading.set(false);
      },
    });

    this.projectsService.getSectionProfessors().subscribe({
      next: (data) => this.professors.set(data),
    });

    this.projectsService.getMyLabs().subscribe({
      next: (data) => this.labs.set(data),
    });

    this.projectsService.list().subscribe({
      next: (data) => this.myProjects.set(data),
    });
  }

  isCurrentUser(id: string): boolean {
    return this.auth.user()?.id === id;
  }

  toggleRow(id: string) {
    this.expandedRows = { ...this.expandedRows, [id]: !this.expandedRows[id] };
  }

  isExpanded(id: string): boolean {
    return !!this.expandedRows[id];
  }

  isLabExpired(deadline: string): boolean {
    return new Date(deadline) < new Date();
  }

  getProjectForLab(labId: string): Project | undefined {
    return this.myProjects().find((p) => p.labId === labId);
  }

  // ─── Start / Stop ──────────────────────────

  startProject(project: Project) {
    this.pendingStartIds.update((s) => new Set([...s, project.id]));
    this.updateProjectLocal(project.id, { status: 'STARTING' });
    this.projectsService.startProject(project.id).subscribe({
      next: ({ url, adminUrl }) => {
        this.updateProjectLocal(project.id, { status: 'RUNNING', url, adminUrl });
        this.pendingStartIds.update((s) => { const n = new Set(s); n.delete(project.id); return n; });
        if (url) window.open(url, '_blank');
      },
      error: (err) => {
        const errorMsg = err?.error?.message ?? 'Deployment failed';
        this.updateProjectLocal(project.id, { status: 'ERROR', errorMessage: errorMsg });
        this.pendingStartIds.update((s) => { const n = new Set(s); n.delete(project.id); return n; });
      },
    });
  }

  stopProject(project: Project) {
    this.pendingStopIds.update((s) => new Set([...s, project.id]));
    this.projectsService.stopProject(project.id).subscribe({
      next: () => {
        this.updateProjectLocal(project.id, { status: 'STOPPED', url: null });
        this.pendingStopIds.update((s) => { const n = new Set(s); n.delete(project.id); return n; });
      },
      error: () => {
        this.pendingStopIds.update((s) => { const n = new Set(s); n.delete(project.id); return n; });
      },
    });
  }

  updateProjectLocal(id: string, changes: Partial<Project>) {
    this.myProjects.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...changes } : p)),
    );
  }

  openExplorer(project: Project) {
    this.explorerProject.set(project);
  }

  closeExplorer() {
    this.explorerProject.set(null);
  }

  openUrl(url: string | null) {
    if (url) window.open(url, '_blank');
  }

  // ─── Submit to Lab ─────────────────────────

  openSubmitDialog(lab: Lab) {
    this.submitLab.set(lab);
    const existing = this.getProjectForLab(lab.id);
    this.submitName = existing?.name ?? '';
    this.submitFile = null;
    this.submitDialogError.set(null);
    this.showSubmitDialog = true;
  }

  onSubmitFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    this.submitFile = input.files?.[0] ?? null;
  }

  submitToLab() {
    const lab = this.submitLab();
    if (!lab || !this.submitFile || !this.submitName) return;

    this.submitting.set(true);
    this.submitDialogError.set(null);
    this.submitSuccess.set(false);

    this.projectsService.submitToLab(lab.id, this.submitFile, this.submitName).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitSuccess.set(true);
        this.showSubmitDialog = false;
        // Reload projects
        this.projectsService.list().subscribe({
          next: (data) => this.myProjects.set(data),
        });
        setTimeout(() => this.submitSuccess.set(false), 3000);
      },
      error: (err: any) => {
        this.submitting.set(false);
        this.submitDialogError.set(err.error?.message ?? 'Submission failed');
      },
    });
  }
}
