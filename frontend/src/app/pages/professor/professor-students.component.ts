import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { FileExplorerComponent } from '../../shared/components/file-explorer.component';
import { ProfessorStateService } from './professor-state.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';
import { StudentRow, Project } from '../../core/models/project.model';

@Component({
  selector: 'app-prof-students',
  standalone: true,
  imports: [
    FormsModule, DatePipe, TableModule, ButtonModule, InputTextModule,
    SelectModule, TooltipModule, StatusBadgeComponent, FileExplorerComponent, TranslatePipe,
    LogsDialogComponent,
  ],
  template: `
    <div class="p-6 space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-64">
          <input pInputText type="text" [(ngModel)]="search" (ngModelChange)="applyFilters()"
            [placeholder]="'common.searchStudents' | translate" class="w-full" />
        </div>
        <p-select [options]="state.sectionOptions()" [(ngModel)]="sectionFilter" (ngModelChange)="applyFilters()"
          optionLabel="label" optionValue="value" [placeholder]="'common.allSections' | translate"
          [showClear]="true" styleClass="w-48" />
        <p-button icon="pi pi-refresh" [outlined]="true" [pTooltip]="'common.refresh' | translate"
          (onClick)="refresh()" />
      </div>

      <div class="bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <p-table [value]="displayed()" [loading]="state.loadingStudents()" [paginator]="true" [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25, 50]" dataKey="id" styleClass="p-datatable-striped">
          <ng-template pTemplate="caption">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-primary">{{ 'common.students' | translate }}</span>
              <span class="text-sm text-secondary">{{ displayed().length }} {{ 'common.studentCount' | translate:displayed().length }}</span>
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 3rem"></th>
              <th pSortableColumn="name">{{ 'common.name' | translate }} <p-sortIcon field="name" /></th>
              <th pSortableColumn="email">{{ 'common.email' | translate }} <p-sortIcon field="email" /></th>
              <th pSortableColumn="sectionNumber">{{ 'common.section' | translate }} <p-sortIcon field="sectionNumber" /></th>
              <th>{{ 'common.projects' | translate }}</th>
              <th>{{ 'common.status' | translate }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-s>
            <tr class="cursor-pointer" (click)="toggleRow(s.id)">
              <td>
                <p-button type="button" [text]="true" [rounded]="true" [plain]="true"
                  [icon]="isExpanded(s.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" />
              </td>
              <td class="font-medium">{{ s.name }}</td>
              <td class="text-sm text-secondary">{{ s.email }}</td>
              <td>
                @if (s.sectionNumber) {
                  <span class="bg-accent/10 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">{{ s.sectionNumber }}</span>
                } @else {
                  <span class="text-slate-400">—</span>
                }
              </td>
              <td class="text-sm text-secondary">{{ s.projects?.length || 0 }} {{ 'common.projectCount' | translate:(s.projects?.length || 0) }}</td>
              <td><app-status-badge [status]="s.status" /></td>
            </tr>

            @if (isExpanded(s.id)) {
              <tr>
                <td colspan="6" class="p-0">
                  <div class="p-4 bg-slate-50 dark:bg-slate-900/50">
                    @if (s.projects?.length) {
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="text-left text-xs text-secondary uppercase tracking-wider">
                            <th class="pb-2">{{ 'common.project' | translate }}</th>
                            <th class="pb-2">{{ 'common.status' | translate }}</th>
                            <th class="pb-2">{{ 'professor.lab' | translate }}</th>
                            <th class="pb-2">{{ 'professor.grade' | translate }}</th>
                            <th class="pb-2">{{ 'professor.predictedGrade' | translate }}</th>
                            <th class="pb-2">{{ 'common.created' | translate }}</th>
                            <th class="pb-2 text-right">{{ 'common.actions' | translate }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (project of s.projects; track project.id) {
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
                              <td class="py-2">
                                @if (project.predictedGrade !== null && project.predictedGrade !== undefined) {
                                  <span class="font-semibold text-blue-600">{{ project.predictedGrade }}</span>
                                  <span class="text-xs text-secondary">/ {{ getLabMaxGrade(project.labId) }}</span>
                                } @else {
                                  <span class="text-slate-400">—</span>
                                }
                              </td>
                              <td class="py-2 text-secondary">{{ project.createdAt | date:'shortDate' }}</td>
                              <td class="py-2 text-right space-x-1">
                                <p-button icon="pi pi-play" severity="success" [text]="true" [rounded]="true"
                                  [pTooltip]="'common.deploy' | translate"
                                  tooltipPosition="left"
                                  [disabled]="(project.status !== 'STOPPED' && project.status !== 'ERROR') || state.pendingStartIds().has(project.id)"
                                  [loading]="state.pendingStartIds().has(project.id)"
                                  (onClick)="state.startProject(project); $event.stopPropagation()" />
                                <p-button icon="pi pi-stop" severity="danger" [text]="true" [rounded]="true"
                                  [pTooltip]="'common.stop' | translate"
                                  tooltipPosition="left"
                                  [disabled]="project.status !== 'RUNNING' || state.pendingStopIds().has(project.id)"
                                  [loading]="state.pendingStopIds().has(project.id)"
                                  (onClick)="state.stopProject(project); $event.stopPropagation()" />
                                <p-button icon="pi pi-external-link" severity="info" [text]="true" [rounded]="true"
                                  [pTooltip]="'common.openUrl' | translate"
                                  tooltipPosition="left"
                                  [disabled]="!project.url"
                                  (onClick)="state.openUrl(project.url); $event.stopPropagation()" />
                                <p-button icon="pi pi-code" severity="secondary" [text]="true" [rounded]="true"
                                  [pTooltip]="'common.browseFiles' | translate"
                                  tooltipPosition="left"
                                  (onClick)="openExplorer(project); $event.stopPropagation()" />
                                <p-button
                                  icon="pi pi-list"
                                  severity="contrast"
                                  [text]="true"
                                  [rounded]="true"
                                  [pTooltip]="'common.terminal' | translate"
                                  tooltipPosition="left"
                                  [disabled]="project.status === 'STOPPED'"
                                  (onClick)="state.openLogs(project); $event.stopPropagation()"
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
            <tr><td colspan="6" class="text-center py-8 text-secondary">{{ 'common.noStudents' | translate }}</td></tr>
          </ng-template>
        </p-table>
      </div>
    </div>

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
export class ProfessorStudentsComponent {
  state = inject(ProfessorStateService);

  search = '';
  sectionFilter: string | null = null;
  displayed = signal<StudentRow[]>([]);
  expandedRows: Record<string, boolean> = {};
  explorerProject = signal<Project | null>(null);
  gradeInputs: Record<string, { grade: number | null; message: string }> = {};
  gradingIds = signal<Set<string>>(new Set());

  constructor() {
    effect(() => {
      const _all = this.state.allStudents();
      this.applyFilters();
    });
  }

  applyFilters() {
    let list = this.state.allStudents();
    if (this.sectionFilter) list = list.filter((s) => s.sectionNumber === this.sectionFilter);
    if (this.search?.trim()) {
      const q = this.search.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    this.displayed.set(list);
  }

  refresh() { this.state.loadStudents(); }

  toggleRow(id: string) {
    this.expandedRows = { ...this.expandedRows, [id]: !this.expandedRows[id] };
  }

  isExpanded(id: string): boolean {
    return !!this.expandedRows[id];
  }

  getLabMaxGrade(labId: string | null): number {
    if (!labId) return 100;
    const lab = this.state.labs().find(l => l.id === labId);
    return lab ? lab.maxGrade : 100;
  }

  getLabName(labId: string | null): string | null {
    if (!labId) return null;
    const lab = this.state.labs().find(l => l.id === labId);
    return lab ? lab.name : null;
  }

  openExplorer(project: Project) {
    this.explorerProject.set(project);
  }

  closeExplorer() {
    this.explorerProject.set(null);
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
    this.state.gradeProject(project.id, { grade: input.grade, gradeMessage: input.message || undefined }).subscribe({
      next: () => {
        this.gradingIds.update(s => { const n = new Set(s); n.delete(project.id); return n; });
      },
      error: () => {
        this.gradingIds.update(s => { const n = new Set(s); n.delete(project.id); return n; });
      },
    });
  }
}
