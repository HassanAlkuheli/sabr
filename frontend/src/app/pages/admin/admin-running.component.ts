import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { AdminStateService } from './admin-state.service';
import { AdminProject } from '../../core/models/project.model';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';

@Component({
  selector: 'app-admin-running',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
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
            [(ngModel)]="runningSearch"
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
        <p-button
          icon="pi pi-refresh"
          [outlined]="true"
          [pTooltip]="'common.refresh' | translate"
          (onClick)="refresh()"
        />
      </div>

      <div class="bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <p-table
          [value]="displayedRunning()"
          [loading]="state.loadingRunning()"
          [paginator]="true"
          [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25, 50]"
          dataKey="id"
          styleClass="p-datatable-striped"
        >
          <ng-template pTemplate="caption">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-primary">{{ 'admin.runningProjects' | translate }}</span>
              <span class="text-sm text-secondary">
                {{ displayedRunning().length }} {{ 'admin.active' | translate }}
              </span>
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">{{ 'common.project' | translate }} <p-sortIcon field="name" /></th>
              <th pSortableColumn="studentName">{{ 'common.student' | translate }} <p-sortIcon field="studentName" /></th>
              <th pSortableColumn="sectionNumber">{{ 'common.section' | translate }} <p-sortIcon field="sectionNumber" /></th>
              <th>{{ 'common.url' | translate }}</th>
              <th pSortableColumn="updatedAt">{{ 'admin.runningSince' | translate }} <p-sortIcon field="updatedAt" /></th>
              <th>{{ 'admin.uptime' | translate }}</th>
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
                }
              </td>
              <td>
                @if (project.url) {
                  <a [href]="project.url" target="_blank" class="text-accent hover:underline text-sm">
                    {{ project.url }}
                  </a>
                }
              </td>
              <td class="text-sm text-secondary">{{ project.updatedAt | date: 'short' }}</td>
              <td>
                <span class="text-emerald-600 font-medium text-sm">
                  {{ state.getRunningTime(project.updatedAt) }}
                </span>
              </td>
              <td class="text-right space-x-1">
                <p-button
                  icon="pi pi-stop"
                  severity="danger"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'admin.stop' | translate"
                  tooltipPosition="left"
                  (onClick)="state.stopRunningProject(project)"
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
                  (onClick)="state.openLogs(project)" />
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center py-8 text-secondary">
                {{ 'admin.noRunning' | translate }}
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
export class AdminRunningComponent {
  state = inject(AdminStateService);

  runningSearch = '';
  sectionFilter: string | null = null;
  displayedRunning = signal<AdminProject[]>([]);

  constructor() {
    effect(() => {
      const _all = this.state.runningProjects();
      this.applyFilters();
    });
  }

  applyFilters() {
    let list = this.state.runningProjects();
    if (this.sectionFilter) {
      list = list.filter((p) => p.sectionNumber === this.sectionFilter);
    }
    if (this.runningSearch?.trim()) {
      const q = this.runningSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.studentName && p.studentName.toLowerCase().includes(q)) ||
          (p.studentEmail && p.studentEmail.toLowerCase().includes(q)),
      );
    }
    this.displayedRunning.set(list);
  }

  refresh() {
    this.state.loadRunningProjects();
  }
}
