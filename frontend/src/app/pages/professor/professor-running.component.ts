import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ProfessorStateService } from './professor-state.service';
import { AdminProject } from '../../core/models/project.model';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';

@Component({
  selector: 'app-prof-running',
  standalone: true,
  imports: [
    FormsModule, DatePipe, TableModule, ButtonModule, InputTextModule,
    SelectModule, TooltipModule, TranslatePipe, LogsDialogComponent,
  ],
  template: `
    <div class="p-6 space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-64">
          <input pInputText type="text" [(ngModel)]="search" (ngModelChange)="applyFilters()"
            [placeholder]="'common.searchProjects' | translate" class="w-full" />
        </div>
        <p-select [options]="state.sectionOptions()" [(ngModel)]="sectionFilter" (ngModelChange)="applyFilters()"
          optionLabel="label" optionValue="value" [placeholder]="'common.allSections' | translate"
          [showClear]="true" styleClass="w-48" />
        <p-button icon="pi pi-refresh" [outlined]="true" [pTooltip]="'common.refresh' | translate"
          (onClick)="refresh()" />
      </div>

      <div class="bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <p-table [value]="displayed()" [loading]="state.loadingRunning()" [paginator]="true" [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25, 50]" dataKey="id" styleClass="p-datatable-striped">
          <ng-template pTemplate="caption">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-primary">{{ 'common.runningProjects' | translate }}</span>
              <span class="text-sm text-secondary">{{ displayed().length }} {{ 'common.active' | translate }}</span>
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">{{ 'common.project' | translate }} <p-sortIcon field="name" /></th>
              <th pSortableColumn="studentName">{{ 'common.student' | translate }} <p-sortIcon field="studentName" /></th>
              <th pSortableColumn="sectionNumber">{{ 'common.section' | translate }} <p-sortIcon field="sectionNumber" /></th>
              <th>{{ 'common.url' | translate }}</th>
              <th pSortableColumn="updatedAt">{{ 'common.runningSince' | translate }} <p-sortIcon field="updatedAt" /></th>
              <th>{{ 'common.uptime' | translate }}</th>
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
              <td>
                @if (p.url) {
                  <a [href]="p.url" target="_blank" class="text-accent hover:underline text-sm">{{ p.url }}</a>
                }
              </td>
              <td class="text-sm text-secondary">{{ p.updatedAt | date: 'short' }}</td>
              <td><span class="text-emerald-600 font-medium text-sm">{{ state.getRunningTime(p.updatedAt) }}</span></td>
              <td class="text-right space-x-1">
                <p-button icon="pi pi-stop" severity="danger" [text]="true" [rounded]="true"
                  [pTooltip]="'common.stop' | translate"
                  tooltipPosition="left"
                  [loading]="state.pendingStopIds().has(p.id)"
                  (onClick)="stopProject(p)" />
                @if (p.url) {
                  <p-button icon="pi pi-external-link" severity="info" [text]="true" [rounded]="true"
                    [pTooltip]="'common.openUrl' | translate" (onClick)="state.openUrl(p.url)" />
                }
                <p-button icon="pi pi-code" severity="secondary" [text]="true" [rounded]="true"
                  [pTooltip]="'common.browseFiles' | translate" tooltipPosition="left" (onClick)="state.openExplorer(p)" />
                <p-button
                  icon="pi pi-list"
                  severity="contrast"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'common.terminal' | translate"
                  tooltipPosition="left"
                  (onClick)="state.openLogs(p)"
                />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="text-center py-8 text-secondary">{{ 'common.noRunning' | translate }}</td></tr>
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
export class ProfessorRunningComponent {
  state = inject(ProfessorStateService);

  search = '';
  sectionFilter: string | null = null;
  displayed = signal<AdminProject[]>([]);

  constructor() {
    effect(() => {
      const _all = this.state.runningProjects();
      this.applyFilters();
    });
  }

  applyFilters() {
    let list = this.state.runningProjects();
    if (this.sectionFilter) list = list.filter((p) => p.sectionNumber === this.sectionFilter);
    if (this.search?.trim()) {
      const q = this.search.trim().toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) || p.studentName?.toLowerCase().includes(q) || p.studentEmail?.toLowerCase().includes(q),
      );
    }
    this.displayed.set(list);
  }

  refresh() { this.state.loadRunningProjects(); }

  stopProject(p: AdminProject) {
    this.state.stopProject(p);
    this.state.runningProjects.update((list) => list.filter((r) => r.id !== p.id));
  }
}
