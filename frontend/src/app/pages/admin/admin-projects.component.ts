import { Component, inject, signal, effect, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { AdminStateService } from './admin-state.service';
import { AdminProject } from '../../core/models/project.model';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    StatusBadgeComponent,
    TranslatePipe,
    LogsDialogComponent,
  ],
  template: `
    <div class="p-6 space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-64">
          <input
            pInputText
            type="text"
            [(ngModel)]="projectSearch"
            (ngModelChange)="applyFilters()"
            [placeholder]="'admin.searchProjects' | translate"
            class="w-full"
          />
        </div>
        <p-select
          [options]="state.sectionOptions()"
          [(ngModel)]="sectionFilter"
          (ngModelChange)="applyFilters()"
          optionLabel="label"
          optionValue="value"
          [placeholder]="'admin.allSections' | translate"
          [showClear]="true"
          styleClass="w-48"
        />
        <p-select
          [options]="statusOptions"
          [(ngModel)]="statusFilter"
          (ngModelChange)="applyFilters()"
          optionLabel="label"
          optionValue="value"
          [placeholder]="'admin.allStatuses' | translate"
          [showClear]="true"
          styleClass="w-48"
        />
        <p-button
          icon="pi pi-refresh"
          [outlined]="true"
          [pTooltip]="'common.refresh' | translate"
          (onClick)="refresh()"
        />
      </div>

      <div class="bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <p-table
          [value]="displayedProjects()"
          [loading]="state.loadingProjects()"
          [paginator]="true"
          [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25, 50]"
          [sortField]="'createdAt'"
          [sortOrder]="-1"
          dataKey="id"
          styleClass="p-datatable-striped"
        >
          <ng-template pTemplate="caption">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-primary">{{ 'admin.projects' | translate }}</span>
              <span class="text-sm text-secondary">
                {{ displayedProjects().length }} {{ 'admin.projectCount' | translate:displayedProjects().length }}
              </span>
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">{{ 'common.project' | translate }} <p-sortIcon field="name" /></th>
              <th pSortableColumn="studentName">{{ 'common.student' | translate }} <p-sortIcon field="studentName" /></th>
              <th pSortableColumn="sectionNumber">{{ 'common.section' | translate }} <p-sortIcon field="sectionNumber" /></th>
              <th pSortableColumn="status">{{ 'common.status' | translate }} <p-sortIcon field="status" /></th>
              <th pSortableColumn="fileSize">{{ 'common.size' | translate }} <p-sortIcon field="fileSize" /></th>
              <th pSortableColumn="createdAt">{{ 'common.created' | translate }} <p-sortIcon field="createdAt" /></th>
              <th class="text-right">{{ 'common.actions' | translate }}</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-project>
            <tr>
              <td class="font-medium">{{ project.name }}</td>
              <td>
                <div class="text-sm">{{ project.studentName }}</div>
                <div class="text-xs text-secondary">{{ project.studentEmail }}</div>
              </td>
              <td>
                @if (project.sectionNumber) {
                  <span class="bg-accent/10 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {{ project.sectionNumber }}
                  </span>
                } @else {
                  <span class="text-slate-400">&mdash;</span>
                }
              </td>
              <td><app-status-badge [status]="project.status" /></td>
              <td class="text-sm text-secondary">
                {{ project.fileSize ? state.formatSize(project.fileSize) : '—' }}
              </td>
              <td class="text-sm text-secondary">{{ project.createdAt | date: 'shortDate' }}</td>
              <td class="text-right space-x-1">
                <p-button
                  icon="pi pi-play"
                  severity="success"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'admin.deploy' | translate"
                  tooltipPosition="left"
                  [disabled]="project.status !== 'STOPPED' && project.status !== 'ERROR'"
                  (onClick)="state.startProject(project)"
                  [style]="(project.status === 'STOPPED' || project.status === 'ERROR') ? {} : { opacity: '0.3', pointerEvents: 'none' }"
                />
                <p-button
                  icon="pi pi-stop"
                  severity="danger"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'admin.stop' | translate"
                  tooltipPosition="left"
                  [disabled]="project.status !== 'RUNNING'"
                  (onClick)="state.stopProject(project)"
                  [style]="project.status === 'RUNNING' ? {} : { opacity: '0.3', pointerEvents: 'none' }"
                />
                @if (project.url) {
                  <p-button
                    icon="pi pi-external-link"
                    severity="info"
                    [text]="true"
                    [rounded]="true"
                    [pTooltip]="'admin.openUrl' | translate"
                    (onClick)="state.openUrl(project.url)"
                  />
                }
                @if (project.adminUrl && project.status === 'RUNNING') {
                  <p-button
                    icon="pi pi-database"
                    severity="warn"
                    [text]="true"
                    [rounded]="true"
                    [pTooltip]="'admin.openDb' | translate"
                    (onClick)="state.openUrl(project.adminUrl)"
                  />
                }
                <p-button
                  icon="pi pi-code"
                  severity="secondary"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'admin.browseFiles' | translate"
                  tooltipPosition="left"
                  (onClick)="state.openExplorer(project)"
                />
                <p-button icon="pi pi-list" severity="contrast" [text]="true" [rounded]="true"
                  [pTooltip]="'common.terminal' | translate" tooltipPosition="left"
                  [disabled]="project.status === 'STOPPED'"
                  (onClick)="state.openLogs(project)" />
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center py-8 text-secondary">
                {{ 'admin.noProjects' | translate }}
              </td>
            </tr>
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
  `,
})
export class AdminProjectsComponent {
  state = inject(AdminStateService);

  projectSearch = '';
  sectionFilter: string | null = null;
  statusFilter: string | null = null;
  displayedProjects = signal<AdminProject[]>([]);

  statusOptions = [
    { label: 'Running', value: 'RUNNING' },
    { label: 'Stopped', value: 'STOPPED' },
    { label: 'Error', value: 'ERROR' },
  ];

  constructor() {
    // Auto-update displayed list when source data changes
    effect(() => {
      const _all = this.state.allProjects();
      this.applyFilters();
    });
  }

  applyFilters() {
    let list = this.state.allProjects();
    if (this.sectionFilter) {
      list = list.filter((p) => p.sectionNumber === this.sectionFilter);
    }
    if (this.statusFilter) {
      list = list.filter((p) => p.status === this.statusFilter);
    }
    if (this.projectSearch?.trim()) {
      const q = this.projectSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.studentName.toLowerCase().includes(q) ||
          p.studentEmail.toLowerCase().includes(q),
      );
    }
    this.displayedProjects.set(list);
  }

  refresh() {
    this.state.loadAllProjects();
  }
}
