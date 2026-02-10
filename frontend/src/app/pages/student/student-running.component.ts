import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/services/i18n.service';
import { StudentStateService } from './student-state.service';

@Component({
  selector: 'app-student-running',
  standalone: true,
  imports: [
    DatePipe,
    TableModule,
    ButtonModule,
    TooltipModule,
    ConfirmDialogModule,
    StatusBadgeComponent,
    LogsDialogComponent,
    TranslatePipe,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="p-6 space-y-6">
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <p-table
          [value]="state.runningProjects()"
          [loading]="state.loadingRunning()"
          [paginator]="true"
          [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25]"
          styleClass="p-datatable-striped"
        >
          <ng-template pTemplate="caption">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-primary">
                {{ 'common.runningProjects' | translate }}
              </span>
              <div class="flex items-center gap-3">
                <span class="text-sm text-secondary">
                  {{ state.runningProjects().length }} {{ 'common.active' | translate }}
                </span>
                <p-button
                  icon="pi pi-refresh"
                  [text]="true"
                  [rounded]="true"
                  severity="secondary"
                  [pTooltip]="'common.refresh' | translate"
                  (onClick)="state.loadRunningProjects()"
                />
              </div>
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">{{ 'common.project' | translate }} <p-sortIcon field="name" /></th>
              <th>{{ 'common.status' | translate }}</th>
              <th>{{ 'common.url' | translate }}</th>
              <th>{{ 'common.runningSince' | translate }}</th>
              <th>{{ 'common.uptime' | translate }}</th>
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
                @if (project.url) {
                  <a [href]="project.url" target="_blank" class="text-accent hover:underline text-sm">
                    {{ project.url }}
                  </a>
                } @else {
                  <span class="text-slate-400 text-sm">—</span>
                }
              </td>
              <td class="text-sm text-secondary">
                {{ project.lastActive | date:'short' }}
              </td>
              <td class="text-sm text-secondary">
                {{ state.getRunningTime(project.lastActive) }}
              </td>
              <td class="text-right space-x-1">
                <p-button
                  icon="pi pi-stop"
                  severity="danger"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'common.stop' | translate"
                  tooltipPosition="left"
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
                  (onClick)="state.openLogs(project)"
                />
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center py-8 text-secondary">
                {{ 'common.noRunning' | translate }}
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
  `,
})
export class StudentRunningComponent {
  state = inject(StudentStateService);
  private confirmationService = inject(ConfirmationService);
  private i18n = inject(I18nService);

  confirmStop(project: { id: string }) {
    this.confirmationService.confirm({
      message: this.i18n.t('confirm.stopProject'),
      header: this.i18n.t('common.confirm'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.t('common.yes'),
      rejectLabel: this.i18n.t('common.no'),
      accept: () => this.state.stopProject(project),
    });
  }
}
