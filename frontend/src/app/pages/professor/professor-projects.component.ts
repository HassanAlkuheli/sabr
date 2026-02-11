import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { AiScanDialogComponent } from '../../shared/components/ai-scan-dialog.component';
import { ProfessorStateService } from './professor-state.service';
import { ProfessorService } from '../../core/services/professor.service';
import { AdminProject } from '../../core/models/project.model';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';

@Component({
  selector: 'app-prof-projects',
  standalone: true,
  imports: [
    FormsModule, TableModule, ButtonModule, InputTextModule,
    SelectModule, TooltipModule, DialogModule, MessageModule,
    StatusBadgeComponent, TranslatePipe, LogsDialogComponent, AiScanDialogComponent,
  ],
  template: `
    <div class="p-6 space-y-4">
      <!-- Upload hints for sharing with students -->
      <details class="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <summary class="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300 p-3 select-none flex items-center gap-2">
          <i class="pi pi-info-circle"></i> {{ 'upload.hint.toggle' | translate }}
          <span class="text-xs font-normal opacity-70">({{ 'upload.hint.professor' | translate }})</span>
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

      <!-- Search / filters bar -->
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-64">
          <input pInputText type="text" [(ngModel)]="search" (ngModelChange)="applyFilters()"
            [placeholder]="'common.searchProjects' | translate" class="w-full" />
        </div>
        <p-select [options]="state.sectionOptions()" [(ngModel)]="sectionFilter" (ngModelChange)="applyFilters()"
          optionLabel="label" optionValue="value" [placeholder]="'common.allSections' | translate"
          [showClear]="true" styleClass="w-48" />
        <p-select [options]="state.labOptions()" [(ngModel)]="labFilter" (ngModelChange)="applyFilters()"
          optionLabel="label" optionValue="value" [placeholder]="'professor.allLabs' | translate"
          [showClear]="true" styleClass="w-56" />
        <p-button icon="pi pi-refresh" [outlined]="true" [pTooltip]="'common.refresh' | translate"
          (onClick)="refresh()" />
      </div>

      <div class="bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <p-table [value]="displayed()" [loading]="state.loadingProjects()" [paginator]="true" [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25, 50]" dataKey="id" styleClass="p-datatable-striped">
          <ng-template pTemplate="caption">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-primary">{{ 'common.projects' | translate }}</span>
              <span class="text-sm text-secondary">{{ displayed().length }} {{ 'common.projectCount' | translate:displayed().length }}</span>
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">{{ 'common.project' | translate }} <p-sortIcon field="name" /></th>
              <th pSortableColumn="studentName">{{ 'common.student' | translate }} <p-sortIcon field="studentName" /></th>
              <th pSortableColumn="sectionNumber">{{ 'common.section' | translate }} <p-sortIcon field="sectionNumber" /></th>
              <th>{{ 'professor.lab' | translate }}</th>
              <th>{{ 'professor.grade' | translate }}</th>
              <th>{{ 'common.status' | translate }}</th>
              <th class="text-right">{{ 'common.actions' | translate }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr>
              <td class="font-medium">{{ p.name }}</td>
              <td>
                <div class="text-sm">{{ p.studentName }}</div>
                <div class="text-xs text-secondary">{{ p.studentEmail }}</div>
              </td>
              <td>
                @if (p.sectionNumber) {
                  <span class="bg-accent/10 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">{{ p.sectionNumber }}</span>
                }
              </td>
              <td class="text-sm">{{ getLabName(p.labId) }}</td>
              <td>
                @if (p.grade !== null && p.grade !== undefined) {
                  <span class="font-semibold text-emerald-600">{{ p.grade }}</span>
                  <span class="text-xs text-secondary">/ {{ getLabMaxGrade(p.labId) }}</span>
                } @else {
                  <span class="text-slate-400 text-sm italic">—</span>
                }
              </td>
              <td><app-status-badge [status]="p.status" /></td>
              <td class="text-right space-x-1">
                <p-button icon="pi pi-star" severity="warn" [text]="true" [rounded]="true"
                  [pTooltip]="'professor.gradeProject' | translate" (onClick)="openGradeDialog(p)" />
                <p-button icon="pi pi-play" severity="success" [text]="true" [rounded]="true"
                  [pTooltip]="'common.deploy' | translate"
                  tooltipPosition="left"
                  [disabled]="(p.status !== 'STOPPED' && p.status !== 'ERROR') || state.pendingStartIds().has(p.id)"
                  [loading]="state.pendingStartIds().has(p.id)"
                  (onClick)="state.startProject(p)" />
                <p-button icon="pi pi-stop" severity="danger" [text]="true" [rounded]="true"
                  [pTooltip]="'common.stop' | translate"
                  tooltipPosition="left"
                  [disabled]="p.status !== 'RUNNING' || state.pendingStopIds().has(p.id)"
                  [loading]="state.pendingStopIds().has(p.id)"
                  (onClick)="state.stopProject(p)" />
                <p-button icon="pi pi-code" severity="secondary" [text]="true" [rounded]="true"
                  [pTooltip]="'common.browseFiles' | translate" tooltipPosition="left" (onClick)="state.openExplorer(p)" />
                <p-button
                  icon="pi pi-list"
                  severity="contrast"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'common.terminal' | translate"
                  tooltipPosition="left"
                  [disabled]="p.status === 'STOPPED'"
                  (onClick)="state.openLogs(p)"
                />
                @if (p.labId) {
                  <p-button
                    icon="pi pi-sparkles"
                    severity="help"
                    [text]="true"
                    [rounded]="true"
                    [pTooltip]="'ai.scan' | translate"
                    tooltipPosition="left"
                    (onClick)="openAiScan(p)"
                  />
                }
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="text-center py-8 text-secondary">{{ 'common.noProjects' | translate }}</td></tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <app-logs-dialog
      [visible]="!!state.logsProject()"
      [projectName]="state.logsProject()?.name ?? ''"
      [logs]="state.logsContent()"
      [loading]="state.logsLoading()"
      (closed)="state.closeLogs()"
      (refreshRequested)="state.refreshLogs()"
    />

    <!-- Grade Dialog -->
    <p-dialog [header]="'professor.gradeProject' | translate" [(visible)]="showGradeDialog" [modal]="true" [style]="{ width: '420px' }">
      @if (gradeTarget()) {
        <div class="space-y-4">
          <p class="text-sm text-secondary">{{ gradeTarget()!.name }} — {{ gradeTarget()!.studentName }}</p>
          <div>
            <label class="text-xs font-medium text-secondary mb-1 block">{{ 'professor.grade' | translate }}</label>
            <input pInputText type="number" [(ngModel)]="gradeValue" class="w-full" [placeholder]="'professor.gradePlaceholder' | translate" />
          </div>
          <div>
            <label class="text-xs font-medium text-secondary mb-1 block">{{ 'professor.message' | translate }}</label>
            <input pInputText [(ngModel)]="gradeMessage" class="w-full" [placeholder]="'professor.messagePlaceholder' | translate" />
          </div>
          @if (gradeError()) { <p-message severity="error" [text]="gradeError()!" styleClass="w-full" /> }
          @if (gradeSuccess()) { <p-message severity="success" [text]="'professor.gradeSaved' | translate" styleClass="w-full" /> }
          <div class="flex justify-end gap-2 pt-2">
            <p-button [label]="'common.cancel' | translate" [outlined]="true" (onClick)="showGradeDialog = false" />
            <p-button [label]="'common.save' | translate" icon="pi pi-check" (onClick)="saveGrade()" [loading]="savingGrade()" />
          </div>
        </div>
      }
    </p-dialog>

    <!-- AI Scan Dialog -->
    <app-ai-scan-dialog
      [visible]="showAiScan()"
      [projectId]="aiScanProjectId()"
      (closed)="closeAiScan()"
    />
  `,
})
export class ProfessorProjectsComponent {
  state = inject(ProfessorStateService);
  private profService = inject(ProfessorService);

  search = '';
  sectionFilter: string | null = null;
  labFilter: string | null = null;
  displayed = signal<AdminProject[]>([]);

  // Grade dialog
  showGradeDialog = false;
  gradeTarget = signal<AdminProject | null>(null);
  gradeValue: number | null = null;
  gradeMessage = '';
  gradeError = signal<string | null>(null);
  gradeSuccess = signal(false);
  savingGrade = signal(false);

  // AI scan
  showAiScan = signal(false);
  aiScanProjectId = signal('');

  constructor() {
    effect(() => {
      const _projects = this.state.allProjects();
      this.applyFilters();
    });
  }

  applyFilters() {
    let list = this.state.allProjects();
    if (this.sectionFilter) list = list.filter((p) => p.sectionNumber === this.sectionFilter);
    if (this.labFilter) list = list.filter((p) => p.labId === this.labFilter);
    if (this.search?.trim()) {
      const q = this.search.trim().toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) || p.studentName?.toLowerCase().includes(q) || p.studentEmail?.toLowerCase().includes(q),
      );
    }
    this.displayed.set(list);
  }

  refresh() {
    this.state.loadAllProjects();
    this.state.loadLabs();
  }

  getLabName(labId: string | null): string {
    if (!labId) return '—';
    const lab = this.state.labs().find((l) => l.id === labId);
    return lab ? lab.name : '—';
  }

  getLabMaxGrade(labId: string | null): number {
    if (!labId) return 100;
    const lab = this.state.labs().find((l) => l.id === labId);
    return lab ? lab.maxGrade : 100;
  }

  // ─── Grade ────────────────────────────────

  openGradeDialog(p: AdminProject) {
    this.gradeTarget.set(p);
    this.gradeValue = p.grade;
    this.gradeMessage = p.gradeMessage ?? '';
    this.gradeError.set(null);
    this.gradeSuccess.set(false);
    this.showGradeDialog = true;
  }

  saveGrade() {
    const p = this.gradeTarget();
    if (!p) return;
    this.gradeError.set(null);
    this.savingGrade.set(true);

    const body: { grade?: number; gradeMessage?: string } = {};
    if (this.gradeValue !== null && this.gradeValue !== undefined) body.grade = this.gradeValue;
    if (this.gradeMessage.trim()) body.gradeMessage = this.gradeMessage.trim();

    this.profService.gradeProject(p.id, body).subscribe({
      next: () => {
        this.gradeSuccess.set(true);
        this.savingGrade.set(false);
        this.state.updateProjectLocal(p.id, { grade: body.grade ?? p.grade, gradeMessage: body.gradeMessage ?? p.gradeMessage });
        setTimeout(() => { this.showGradeDialog = false; }, 800);
      },
      error: (err) => {
        this.gradeError.set(err?.error?.message ?? 'Failed to save grade');
        this.savingGrade.set(false);
      },
    });
  }

  // ─── AI Scan ──────────────────────────────

  openAiScan(p: AdminProject) {
    this.aiScanProjectId.set(p.id);
    this.showAiScan.set(true);
  }

  closeAiScan() {
    this.showAiScan.set(false);
  }
}
