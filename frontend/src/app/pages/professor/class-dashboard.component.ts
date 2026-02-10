import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { HeaderComponent } from '../../layout/header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { FileExplorerComponent } from '../../shared/components/file-explorer.component';
import { StudentRow, Project, Lab } from '../../core/models/project.model';
import { AuthService } from '../../core/services/auth.service';
import { ProfessorService } from '../../core/services/professor.service';
import { RunnerService } from '../../core/services/runner.service';
import { ProfessorStateService } from './professor-state.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';

@Component({
  selector: 'app-class-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    TabsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    TooltipModule,
    HeaderComponent,
    StatusBadgeComponent,
    FileExplorerComponent,
    TranslatePipe,
    LogsDialogComponent,
  ],
  template: `
    <app-header [title]="'class.title' | translate" />

    <div class="p-6 space-y-6">
      @if (error()) {
        <p-message severity="error" [text]="error()!" styleClass="w-full" />
      }

      @if (sections().length === 0 && !loading()) {
        <div class="text-center py-12 text-secondary">
          <i class="pi pi-inbox text-4xl mb-4 block text-slate-300"></i>
          <p>{{ 'class.noSections' | translate }}</p>
        </div>
      }

      @if (sections().length > 0) {
        <p-tabs [(value)]="activeSection">
          <p-tablist>
            @for (section of sections(); track section) {
              <p-tab [value]="section">
                <i class="pi pi-bookmark mr-2"></i>{{ section }}
                <span class="ml-2 text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 px-1.5 py-0.5 rounded-full">
                  {{ studentsBySection()[section]?.length || 0 }}
                </span>
              </p-tab>
            }
          </p-tablist>

          <p-tabpanels>
            @for (section of sections(); track section) {
              <p-tabpanel [value]="section">
                <div class="space-y-4 pt-4">
                  <!-- Professor info for this section -->
                  @if (professorForSection()[section]; as prof) {
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 flex items-center justify-center font-bold text-sm">
                        {{ prof.name.charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <p class="text-sm font-medium text-blue-900 dark:text-blue-100">{{ prof.name }}</p>
                        <p class="text-xs text-blue-600 dark:text-blue-300">{{ prof.email }}</p>
                      </div>
                    </div>
                  }

                  <!-- Students table -->
                  <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p-table
                      [value]="studentsBySection()[section] || []"
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
                            {{ 'class.students' | translate }} – {{ section }}
                          </span>
                          <span class="text-sm text-secondary">
                            {{ (studentsBySection()[section] || []).length }} {{ 'common.studentCount' | translate:(studentsBySection()[section] || []).length }}
                          </span>
                        </div>
                      </ng-template>

                      <ng-template pTemplate="header">
                        <tr>
                          <th style="width: 3rem"></th>
                          <th pSortableColumn="name">{{ 'common.name' | translate }} <p-sortIcon field="name" /></th>
                          <th pSortableColumn="email">{{ 'common.email' | translate }} <p-sortIcon field="email" /></th>
                          <th>{{ 'common.projects' | translate }}</th>
                          <th>{{ 'common.status' | translate }}</th>
                        </tr>
                      </ng-template>

                      <ng-template pTemplate="body" let-student>
                        <tr>
                          <td>
                            <p-button
                              type="button"
                              [text]="true"
                              [rounded]="true"
                              [plain]="true"
                              [icon]="isExpanded(student.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
                              (onClick)="toggleRow(student.id)"
                            />
                          </td>
                          <td class="font-medium">{{ student.name }}</td>
                          <td class="text-sm text-secondary">{{ student.email }}</td>
                          <td class="text-sm text-secondary">
                            {{ student.projects?.length || 0 }} {{ 'common.projectCount' | translate:(student.projects?.length || 0) }}
                          </td>
                          <td>
                            <app-status-badge [status]="student.status" />
                          </td>
                        </tr>

                        <!-- Manual expanded row -->
                        @if (isExpanded(student.id)) {
                          <tr>
                            <td colspan="5" class="p-0">
                              <div class="p-4 bg-slate-50 dark:bg-slate-900/50">
                                @if (student.projects?.length) {
                                  <table class="w-full text-sm">
                                    <thead>
                                      <tr class="text-left text-xs text-secondary uppercase tracking-wider">
                                        <th class="pb-2">{{ 'common.project' | translate }}</th>
                                        <th class="pb-2">{{ 'common.status' | translate }}</th>
                                        <th class="pb-2">{{ 'professor.lab' | translate }}</th>
                                        <th class="pb-2">{{ 'professor.grade' | translate }}</th>
                                        <th class="pb-2">{{ 'common.created' | translate }}</th>
                                        <th class="pb-2 text-right">{{ 'common.actions' | translate }}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      @for (project of student.projects; track project.id) {
                                        <tr class="border-t border-slate-200 dark:border-slate-700">
                                          <td class="py-2 font-medium">{{ project.name }}</td>
                                          <td class="py-2">
                                            <app-status-badge [status]="project.status" />
                                          </td>
                                          <td class="py-2">
                                            @if (getLabName(project.labId); as labName) {
                                              <span class="text-xs font-medium text-primary">{{ labName }}</span>
                                            } @else {
                                              <span class="text-slate-400 italic">{{ 'professor.unassigned' | translate }}</span>
                                            }
                                          </td>
                                          <td class="py-2">
                                            @if (project.labId) {
                                              <div class="flex items-center gap-1.5">
                                                <input type="number" [ngModel]="getGradeInput(project).grade"
                                                  (ngModelChange)="getGradeInput(project).grade = $event"
                                                  [max]="getLabMaxGrade(project.labId)" min="0" step="1"
                                                  class="w-16 text-sm border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 text-primary"
                                                  [placeholder]="'professor.gradePlaceholder' | translate" />
                                                <span class="text-xs text-secondary">/ {{ getLabMaxGrade(project.labId) }}</span>
                                                <p-button icon="pi pi-check" severity="success" [text]="true" [rounded]="true"
                                                  [pTooltip]="'common.save' | translate" tooltipPosition="left"
                                                  [loading]="gradingIds().has(project.id)"
                                                  (onClick)="saveGrade(project); $event.stopPropagation()" size="small" />
                                              </div>
                                            } @else {
                                              <span class="text-slate-400">—</span>
                                            }
                                          </td>
                                          <td class="py-2 text-secondary">
                                            {{ project.createdAt | date:'shortDate' }}
                                          </td>
                                          <td class="py-2 text-right space-x-1">
                                            <p-button
                                              icon="pi pi-play"
                                              severity="success"
                                              [text]="true"
                                              [rounded]="true"
                                              [pTooltip]="'common.deploy' | translate"
                                              tooltipPosition="left"
                                              [disabled]="(project.status !== 'STOPPED' && project.status !== 'ERROR') || pendingStartIds().has(project.id)"
                                              [loading]="pendingStartIds().has(project.id)"
                                              (onClick)="startProject(project.id)"
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
                                              (onClick)="stopProject(project.id)"
                                            />
                                            <p-button
                                              icon="pi pi-external-link"
                                              severity="info"
                                              [text]="true"
                                              [rounded]="true"
                                              [pTooltip]="'common.openUrl' | translate"
                                              tooltipPosition="left"
                                              [disabled]="!project.url"
                                              (onClick)="openProjectUrl(project.url); $event.stopPropagation()"
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
                                          </td>
                                        </tr>
                                      }
                                    </tbody>
                                  </table>
                                } @else {
                                  <p class="text-secondary text-sm py-2">{{ 'class.noProjectsYet' | translate }}</p>
                                }
                              </div>
                            </td>
                          </tr>
                        }
                      </ng-template>

                      <ng-template pTemplate="emptymessage">
                        <tr>
                          <td colspan="5" class="text-center py-8 text-secondary">
                            {{ 'class.noStudents' | translate }}
                          </td>
                        </tr>
                      </ng-template>
                    </p-table>
                  </div>
                </div>
              </p-tabpanel>
            }
          </p-tabpanels>
        </p-tabs>
      }
    </div>

    <!-- File Explorer Dialog -->
    @if (explorerProject()) {
      <app-file-explorer
        [projectId]="explorerProject()!.id"
        [projectName]="explorerProject()!.name"
        (closed)="closeExplorer()"
      />
    }

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
export class ClassDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private profService = inject(ProfessorService);
  private runnerService = inject(RunnerService);
  state = inject(ProfessorStateService);

  // Local state
  students = signal<StudentRow[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  labs = signal<Lab[]>([]);
  pendingStartIds = signal<Set<string>>(new Set());
  pendingStopIds = signal<Set<string>>(new Set());

  expandedRows: Record<string, boolean> = {};
  explorerProject = signal<Project | null>(null);
  activeSection = '';
  gradeInputs: Record<string, { grade: number | null; message: string }> = {};
  gradingIds = signal<Set<string>>(new Set());

  toggleRow(id: string) {
    this.expandedRows = { ...this.expandedRows, [id]: !this.expandedRows[id] };
  }

  isExpanded(id: string): boolean {
    return !!this.expandedRows[id];
  }

  // Professors list (for showing professor info per section)
  allProfessors = signal<any[]>([]);

  // Derive sections from user's assigned sections (professor) or all sections (admin)
  sections = computed(() => {
    const user = this.auth.user();
    if (!user) return [];

    if (user.role === 'ADMIN') {
      const sectionSet = new Set<string>();
      for (const s of this.students()) {
        if (s.sectionNumber) sectionSet.add(s.sectionNumber);
      }
      return [...sectionSet].sort();
    }

    if (user.sections) {
      try {
        return JSON.parse(user.sections) as string[];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Group students by section
  studentsBySection = computed(() => {
    const map: Record<string, StudentRow[]> = {};
    for (const student of this.students()) {
      const section = student.sectionNumber || 'Unassigned';
      if (!map[section]) map[section] = [];
      map[section].push(student);
    }
    return map;
  });

  // Map section to its professor
  professorForSection = computed(() => {
    const map: Record<string, { name: string; email: string }> = {};
    for (const prof of this.allProfessors()) {
      let sections: string[] = [];
      try {
        sections = prof.sections ? JSON.parse(prof.sections) : [];
      } catch { /* ignore */ }
      for (const s of sections) {
        map[s] = { name: prof.name, email: prof.email };
      }
    }
    return map;
  });

  ngOnInit() {
    this.loading.set(true);
    this.profService.getStudents().subscribe({
      next: (students) => {
        this.students.set(students);
        this.loading.set(false);
        const s = this.sections();
        if (s.length && !this.activeSection) {
          this.activeSection = s[0];
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load students');
        this.loading.set(false);
      },
    });

    this.profService.getProfessors().subscribe({
      next: (profs) => this.allProfessors.set(profs),
    });

    this.profService.getLabs().subscribe({
      next: (labs) => this.labs.set(labs),
    });
  }

  // ─── Lab helpers ────────────────────────────

  getLabMaxGrade(labId: string | null): number {
    if (!labId) return 100;
    const lab = this.labs().find(l => l.id === labId);
    return lab ? lab.maxGrade : 100;
  }

  getLabName(labId: string | null): string | null {
    if (!labId) return null;
    const lab = this.labs().find(l => l.id === labId);
    return lab ? lab.name : null;
  }

  // ─── Start / Stop ──────────────────────────

  startProject(id: string) {
    this.pendingStartIds.update(s => new Set([...s, id]));
    this.students.update((list) =>
      list.map((s) => ({
        ...s,
        projects: s.projects?.map((p) => (p.id === id ? { ...p, status: 'RUNNING' as const } : p)),
      })),
    );
    this.runnerService.start(id).subscribe({
      next: (url) => {
        this.students.update((list) =>
          list.map((s) => ({
            ...s,
            projects: s.projects?.map((p) => (p.id === id ? { ...p, status: 'RUNNING' as const, url } : p)),
          })),
        );
        this.pendingStartIds.update(s => { const n = new Set(s); n.delete(id); return n; });
        if (url) window.open(url, '_blank');
      },
      error: (err) => {
        const errorMsg = err?.error?.message ?? 'Deployment failed';
        this.students.update((list) =>
          list.map((s) => ({
            ...s,
            projects: s.projects?.map((p) => (p.id === id ? { ...p, status: 'ERROR' as const, errorMessage: errorMsg } : p)),
          })),
        );
        this.pendingStartIds.update(s => { const n = new Set(s); n.delete(id); return n; });
      },
    });
  }

  stopProject(id: string) {
    this.pendingStopIds.update(s => new Set([...s, id]));
    this.runnerService.stop(id).subscribe({
      next: () => {
        this.students.update((list) =>
          list.map((s) => ({
            ...s,
            projects: s.projects?.map((p) => (p.id === id ? { ...p, status: 'STOPPED' as const, url: null } : p)),
          })),
        );
        this.pendingStopIds.update(s => { const n = new Set(s); n.delete(id); return n; });
      },
      error: () => {
        this.pendingStopIds.update(s => { const n = new Set(s); n.delete(id); return n; });
      },
    });
  }

  openExplorer(project: Project) {
    this.explorerProject.set(project);
  }

  closeExplorer() {
    this.explorerProject.set(null);
  }

  openProjectUrl(url: string | null) {
    if (url) window.open(url, '_blank');
  }

  getGradeInput(project: Project): { grade: number | null; message: string } {
    if (!this.gradeInputs[project.id]) {
      this.gradeInputs[project.id] = { grade: project.grade ?? null, message: project.gradeMessage ?? '' };
    }
    return this.gradeInputs[project.id];
  }

  saveGrade(project: Project) {
    const input = this.gradeInputs[project.id];
    if (!input || input.grade === null || input.grade === undefined) return;
    this.gradingIds.update(s => new Set([...s, project.id]));
    this.profService.gradeProject(project.id, { grade: input.grade, gradeMessage: input.message || undefined }).subscribe({
      next: () => {
        this.students.update((list) =>
          list.map((s) => ({
            ...s,
            projects: s.projects?.map((p) => (p.id === project.id ? { ...p, grade: input.grade, gradeMessage: input.message } : p)),
          })),
        );
        this.gradingIds.update(s => { const n = new Set(s); n.delete(project.id); return n; });
      },
      error: () => {
        this.gradingIds.update(s => { const n = new Set(s); n.delete(project.id); return n; });
      },
    });
  }
}
