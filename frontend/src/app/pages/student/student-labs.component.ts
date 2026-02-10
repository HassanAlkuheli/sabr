import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { I18nService } from '../../core/services/i18n.service';
import { StudentStateService } from './student-state.service';
import { ProjectsService } from '../../core/services/projects.service';
import { Lab } from '../../core/models/project.model';

@Component({
  selector: 'app-student-labs',
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
    ConfirmDialogModule,
    StatusBadgeComponent,
    LogsDialogComponent,
    TranslatePipe,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="p-6 space-y-6">
      @if (submitSuccess()) {
        <p-message severity="success" [text]="'student.submitSuccess' | translate" styleClass="w-full" />
      }
      @if (submitError()) {
        <p-message severity="error" [text]="submitError()!" styleClass="w-full" />
      }

      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <p-table
          [value]="state.labs()"
          [loading]="state.loadingLabs()"
          [paginator]="true"
          [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25]"
          [globalFilterFields]="['name']"
          styleClass="p-datatable-striped"
        >
          <ng-template pTemplate="caption">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-primary">
                {{ 'professor.labs' | translate }}
              </span>
              <span class="text-sm text-secondary">
                {{ state.labs().length }} {{ 'professor.labCount' | translate:state.labs().length }}
              </span>
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">{{ 'common.name' | translate }} <p-sortIcon field="name" /></th>
              <th>{{ 'professor.description' | translate }}</th>
              <th>{{ 'professor.maxGrade' | translate }}</th>
              <th>{{ 'professor.deadline' | translate }}</th>
              <th>{{ 'common.status' | translate }}</th>
              <th>{{ 'student.mySubmission' | translate }}</th>
              <th>{{ 'student.projectStatus' | translate }}</th>
              <th>{{ 'professor.grade' | translate }}</th>
              <th class="text-right">{{ 'common.actions' | translate }}</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-lab>
            <tr>
              <td>
                <button class="font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                        (click)="openLabDetail(lab)">
                  {{ lab.name }}
                </button>
              </td>
              <td class="text-sm text-secondary max-w-xs truncate">{{ lab.description || '—' }}</td>
              <td class="text-sm">{{ lab.maxGrade }}</td>
              <td class="text-sm text-secondary">{{ lab.deadline | date:'shortDate' }}</td>
              <td>
                @if (state.isLabExpired(lab.deadline)) {
                  <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                    <i class="pi pi-clock text-[10px]"></i> {{ 'professor.expired' | translate }}
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    <i class="pi pi-check-circle text-[10px]"></i> {{ 'professor.active' | translate }}
                  </span>
                }
              </td>
              <td>
                @if (state.getProjectForLab(lab.id); as project) {
                  <span class="text-xs font-medium text-primary">{{ project.name }}</span>
                } @else {
                  <span class="text-slate-400 italic text-sm">{{ 'student.notSubmitted' | translate }}</span>
                }
              </td>
              <td>
                @if (state.getProjectForLab(lab.id); as project) {
                  <app-status-badge [status]="project.status" />
                }
              </td>
              <td>
                @if (state.getProjectForLab(lab.id); as project) {
                  @if (project.grade !== null) {
                    <span class="text-sm font-semibold text-green-600 dark:text-green-400">
                      {{ project.grade }} / {{ lab.maxGrade }}
                    </span>
                    @if (project.gradeMessage) {
                      <div class="text-xs text-secondary mt-0.5">{{ project.gradeMessage }}</div>
                    }
                  } @else {
                    <span class="text-slate-400 italic text-sm">{{ 'professor.notGraded' | translate }}</span>
                  }
                } @else {
                  <span class="text-slate-400">—</span>
                }
              </td>
              <td class="text-right space-x-1">
                <p-button
                  icon="pi pi-upload"
                  severity="warn"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="state.isLabExpired(lab.deadline) ? ('student.labExpired' | translate) : ((state.getProjectForLab(lab.id) ? 'student.resubmit' : 'student.submit') | translate)"
                  tooltipPosition="left"
                  [disabled]="state.isLabExpired(lab.deadline)"
                  (onClick)="confirmSubmit(lab)"
                />
                @if (state.getProjectForLab(lab.id); as project) {
                  <p-button
                    icon="pi pi-play"
                    severity="success"
                    [text]="true"
                    [rounded]="true"
                    [pTooltip]="'common.deploy' | translate"
                    tooltipPosition="left"
                    [disabled]="(project.status !== 'STOPPED' && project.status !== 'ERROR') || state.pendingStartIds().has(project.id)"
                    [loading]="state.pendingStartIds().has(project.id)"
                    (onClick)="state.startProject(project)"
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
                    (onClick)="confirmStopProject(project)"
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
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    [text]="true"
                    [rounded]="true"
                    [pTooltip]="'common.delete' | translate"
                    tooltipPosition="left"
                    [disabled]="project.status === 'STARTING'"
                    (onClick)="confirmDeleteProject(project)"
                  />
                }
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="9" class="text-center py-8 text-secondary">
                {{ 'professor.noLabs' | translate }}
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <!-- Lab Detail dialog -->
    <p-dialog
      [header]="selectedLab()?.name ?? ''"
      [(visible)]="showLabDetail"
      [modal]="true"
      [style]="{ width: '560px' }"
    >
      @if (selectedLab(); as lab) {
        <div class="space-y-4">
          <div>
            <label class="text-xs font-medium text-secondary block mb-1">{{ 'professor.description' | translate }}</label>
            <p class="text-sm text-primary whitespace-pre-wrap">{{ lab.description || '—' }}</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-medium text-secondary block mb-1">{{ 'professor.maxGrade' | translate }}</label>
              <p class="text-sm font-semibold text-primary">{{ lab.maxGrade }}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-secondary block mb-1">{{ 'professor.deadline' | translate }}</label>
              <p class="text-sm text-primary">{{ lab.deadline | date:'medium' }}</p>
            </div>
          </div>
          <div>
            <label class="text-xs font-medium text-secondary block mb-1">{{ 'common.status' | translate }}</label>
            @if (state.isLabExpired(lab.deadline)) {
              <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                <i class="pi pi-clock text-[10px]"></i> {{ 'professor.expired' | translate }}
              </span>
            } @else {
              <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                <i class="pi pi-check-circle text-[10px]"></i> {{ 'professor.active' | translate }}
              </span>
            }
          </div>
          @if (state.getProjectForLab(lab.id); as project) {
            <div class="border-t border-slate-200 dark:border-slate-700 pt-3">
              <label class="text-xs font-medium text-secondary block mb-1">{{ 'student.mySubmission' | translate }}</label>
              <div class="text-sm font-medium text-primary">{{ project.name }}</div>
              <div class="mt-1">
                <app-status-badge [status]="project.status" />
              </div>
              @if (project.grade !== null) {
                <p class="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                  {{ 'professor.grade' | translate }}: {{ project.grade }} / {{ lab.maxGrade }}
                </p>
                @if (project.gradeMessage) {
                  <p class="text-xs text-secondary mt-0.5">{{ project.gradeMessage }}</p>
                }
              }
            </div>
          }
          <div class="flex justify-end gap-2 pt-2">
            <p-button [label]="'common.cancel' | translate" [outlined]="true" (onClick)="showLabDetail = false" />
            <p-button
              [label]="(state.getProjectForLab(lab.id) ? 'student.resubmit' : 'student.submit') | translate"
              icon="pi pi-upload"
              severity="warn"
              [disabled]="state.isLabExpired(lab.deadline)"
              (onClick)="showLabDetail = false; confirmSubmit(lab)"
            />
          </div>
        </div>
      }
    </p-dialog>

    <!-- Submit to Lab dialog -->
    <p-dialog
      [header]="(submitLab()?.name ?? '') + ' – ' + (('student.submit') | translate)"
      [(visible)]="showSubmitDialog"
      [modal]="true"
      [style]="{ width: '460px' }"
    >
      <div class="space-y-4">
        <details class="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <summary class="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300 p-3 select-none flex items-center gap-2">
            <i class="pi pi-info-circle"></i> {{ 'upload.hint.toggle' | translate }}
          </summary>
          <ul class="px-4 pb-3 space-y-1.5 text-xs text-blue-600 dark:text-blue-400 ltr:ml-5 rtl:mr-5 list-disc">
            <li>{{ 'upload.hint.1' | translate }}</li>
            <li>{{ 'upload.hint.2' | translate }}</li>
            <li>{{ 'upload.hint.3' | translate }}</li>
            <li>{{ 'upload.hint.4' | translate }}</li>
            <li>{{ 'upload.hint.5' | translate }}</li>
            <li>{{ 'upload.hint.6' | translate }}</li>
            <li>{{ 'upload.hint.7' | translate }}</li>
          </ul>
        </details>

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

        @if (submitError()) {
          <p-message severity="error" [text]="submitError()!" styleClass="w-full" />
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
export class StudentLabsComponent {
  state = inject(StudentStateService);
  private projectsService = inject(ProjectsService);
  private confirmationService = inject(ConfirmationService);
  private i18n = inject(I18nService);

  showLabDetail = false;
  selectedLab = signal<Lab | null>(null);

  showSubmitDialog = false;
  submitLab = signal<Lab | null>(null);
  submitName = '';
  submitFile: File | null = null;
  submitting = signal(false);
  submitError = signal<string | null>(null);
  submitSuccess = signal(false);

  openLabDetail(lab: Lab) {
    this.selectedLab.set(lab);
    this.showLabDetail = true;
  }

  confirmSubmit(lab: Lab) {
    const existing = this.state.getProjectForLab(lab.id);
    if (existing) {
      this.confirmationService.confirm({
        message: this.i18n.t('confirm.resubmitToLab'),
        header: this.i18n.t('common.confirm'),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: this.i18n.t('common.yes'),
        rejectLabel: this.i18n.t('common.no'),
        accept: () => this.openSubmitDialog(lab),
      });
    } else {
      this.openSubmitDialog(lab);
    }
  }

  confirmStopProject(project: { id: string }) {
    this.confirmationService.confirm({
      message: this.i18n.t('confirm.stopProject'),
      header: this.i18n.t('common.confirm'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.i18n.t('common.yes'),
      rejectLabel: this.i18n.t('common.no'),
      accept: () => this.state.stopProject(project),
    });
  }

  openSubmitDialog(lab: Lab) {
    this.submitLab.set(lab);
    const existing = this.state.getProjectForLab(lab.id);
    this.submitName = existing?.name ?? '';
    this.submitFile = null;
    this.submitError.set(null);
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
    this.submitError.set(null);
    this.submitSuccess.set(false);

    this.projectsService.submitToLab(lab.id, this.submitFile, this.submitName).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitSuccess.set(true);
        this.showSubmitDialog = false;
        this.state.loadProjects();
        this.state.loadLabs();
        setTimeout(() => this.submitSuccess.set(false), 3000);
      },
      error: (err: any) => {
        this.submitting.set(false);
        this.submitError.set(err.error?.message ?? 'Submission failed');
      },
    });
  }

  confirmDeleteProject(project: { id: string }) {
    this.confirmationService.confirm({
      message: this.i18n.t('confirm.deleteProject'),
      header: this.i18n.t('common.confirm'),
      icon: 'pi pi-trash',
      acceptLabel: this.i18n.t('common.yes'),
      rejectLabel: this.i18n.t('common.no'),
      accept: () => this.state.deleteProject(project),
    });
  }
}
