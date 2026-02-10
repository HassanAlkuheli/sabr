import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { HeaderComponent } from '../../layout/header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { FileExplorerComponent } from '../../shared/components/file-explorer.component';
import { AdminService } from '../../core/services/admin.service';
import { RunnerService } from '../../core/services/runner.service';
import { AdminProject } from '../../core/models/project.model';
import { User } from '../../core/models/user.model';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LogsDialogComponent } from '../../shared/components/logs-dialog.component';
import { AdminStateService } from './admin-state.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    TabsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    DialogModule,
    MessageModule,
    HeaderComponent,
    StatusBadgeComponent,
    FileExplorerComponent,
    TranslatePipe,
    LogsDialogComponent,
  ],
  template: `
    <app-header [title]="'admin.title' | translate" />

    <div class="p-6">
      <p-tabs [(value)]="activeTab">
        <p-tablist>
          <p-tab value="projects">
            <i class="pi pi-folder mr-2"></i>{{ 'admin.projects' | translate }}
          </p-tab>
          <p-tab value="students">
            <i class="pi pi-user mr-2"></i>{{ 'admin.students' | translate }}
          </p-tab>
          <p-tab value="professors">
            <i class="pi pi-users mr-2"></i>{{ 'admin.professors' | translate }}
          </p-tab>
          <p-tab value="running">
            <i class="pi pi-play-circle mr-2"></i>{{ 'admin.runningProjects' | translate }}
          </p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- ═══════ TAB 1 – PROJECTS ═══════ -->
          <p-tabpanel value="projects">
            <div class="space-y-4 pt-4">
              <div class="flex flex-wrap gap-3 items-center">
                <div class="flex-1 min-w-64">
                  <input
                    pInputText
                    type="text"
                    [(ngModel)]="projectSearch"
                    (ngModelChange)="applyProjectFilters()"
                    [placeholder]="'admin.searchProjects' | translate"
                    class="w-full"
                  />
                </div>
                <p-select
                  [options]="sectionOptions()"
                  [(ngModel)]="sectionFilter"
                  (ngModelChange)="applyProjectFilters()"
                  optionLabel="label"
                  optionValue="value"
                  [placeholder]="'admin.allSections' | translate"
                  [showClear]="true"
                  styleClass="w-48"
                />
                <p-select
                  [options]="statusOptions"
                  [(ngModel)]="statusFilter"
                  (ngModelChange)="applyProjectFilters()"
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
                  (onClick)="loadAllProjects()"
                />
              </div>

              <div class="bg-white rounded-xl border border-slate-200">
                <p-table
                  [value]="displayedProjects()"
                  [loading]="loadingProjects()"
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
                      <th pSortableColumn="name">
                        {{ 'common.project' | translate }} <p-sortIcon field="name" />
                      </th>
                      <th pSortableColumn="studentName">
                        {{ 'common.student' | translate }} <p-sortIcon field="studentName" />
                      </th>
                      <th pSortableColumn="sectionNumber">
                        {{ 'common.section' | translate }} <p-sortIcon field="sectionNumber" />
                      </th>
                      <th pSortableColumn="status">
                        {{ 'common.status' | translate }} <p-sortIcon field="status" />
                      </th>
                      <th pSortableColumn="fileSize">
                        {{ 'common.size' | translate }} <p-sortIcon field="fileSize" />
                      </th>
                      <th pSortableColumn="createdAt">
                        {{ 'common.created' | translate }} <p-sortIcon field="createdAt" />
                      </th>
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
                          <span
                            class="bg-accent/10 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full"
                          >
                            {{ project.sectionNumber }}
                          </span>
                        } @else {
                          <span class="text-slate-400">&mdash;</span>
                        }
                      </td>
                      <td>
                        <app-status-badge [status]="project.status" />
                      </td>
                      <td class="text-sm text-secondary">
                        {{ project.fileSize ? formatSize(project.fileSize) : '—' }}
                      </td>
                      <td class="text-sm text-secondary">
                        {{ project.createdAt | date: 'shortDate' }}
                      </td>
                      <td class="text-right space-x-1">
                        <p-button
                          icon="pi pi-play"
                          severity="success"
                          [text]="true"
                          [rounded]="true"
                          [pTooltip]="'admin.deploy' | translate"
                          tooltipPosition="left"
                          [disabled]="project.status !== 'STOPPED' && project.status !== 'ERROR'"
                          (onClick)="startProject(project)"
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
                          (onClick)="stopProject(project)"
                          [style]="project.status === 'RUNNING' ? {} : { opacity: '0.3', pointerEvents: 'none' }"
                        />
                        @if (project.url) {
                          <p-button
                            icon="pi pi-external-link"
                            severity="info"
                            [text]="true"
                            [rounded]="true"
                            [pTooltip]="'admin.openUrl' | translate"
                            (onClick)="openUrl(project.url)"
                          />
                        }
                        @if (project.adminUrl && project.status === 'RUNNING') {
                          <p-button
                            icon="pi pi-database"
                            severity="warn"
                            [text]="true"
                            [rounded]="true"
                            [pTooltip]="'admin.openDb' | translate"
                            (onClick)="openUrl(project.adminUrl)"
                          />
                        }
                        <p-button
                          icon="pi pi-code"
                          severity="secondary"
                          [text]="true"
                          [rounded]="true"
                          [pTooltip]="'admin.browseFiles' | translate"
                          tooltipPosition="left"
                          (onClick)="openExplorer(project)"
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
          </p-tabpanel>

          <!-- ═══════ TAB 2 – STUDENTS ═══════ -->
          <p-tabpanel value="students">
            <div class="space-y-4 pt-4">
              @if (studentError()) {
                <p-message severity="error" [text]="studentError()!" styleClass="w-full" />
              }

              <div class="flex flex-wrap gap-3 items-center">
                <div class="flex-1 min-w-64">
                  <input
                    pInputText
                    type="text"
                    [(ngModel)]="studentSearch"
                    (ngModelChange)="applyStudentFilters()"
                    [placeholder]="'admin.searchStudents' | translate"
                    class="w-full"
                  />
                </div>
                <p-select
                  [options]="sectionOptions()"
                  [(ngModel)]="studentSectionFilter"
                  (ngModelChange)="applyStudentFilters()"
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
                  (onClick)="loadStudents()"
                />
              </div>

              <div class="bg-white rounded-xl border border-slate-200">
                <p-table
                  [value]="displayedStudents()"
                  [loading]="loadingStudents()"
                  [paginator]="true"
                  [rows]="15"
                  [rowsPerPageOptions]="[10, 15, 25, 50]"
                  dataKey="id"
                  styleClass="p-datatable-striped"
                >
                  <ng-template pTemplate="caption">
                    <div class="flex items-center justify-between">
                      <span class="text-lg font-semibold text-primary">{{ 'admin.students' | translate }}</span>
                      <span class="text-sm text-secondary">
                        {{ displayedStudents().length }} {{ 'admin.studentCount' | translate:displayedStudents().length }}
                      </span>
                    </div>
                  </ng-template>

                  <ng-template pTemplate="header">
                    <tr>
                      <th pSortableColumn="name">{{ 'common.name' | translate }} <p-sortIcon field="name" /></th>
                      <th pSortableColumn="email">{{ 'common.email' | translate }} <p-sortIcon field="email" /></th>
                      <th pSortableColumn="sectionNumber">{{ 'common.section' | translate }} <p-sortIcon field="sectionNumber" /></th>
                      <th>{{ 'common.projects' | translate }}</th>
                      <th>{{ 'common.status' | translate }}</th>
                      <th class="text-right">{{ 'common.actions' | translate }}</th>
                    </tr>
                  </ng-template>

                  <ng-template pTemplate="body" let-student>
                    <tr>
                      <td class="font-medium">{{ student.name }}</td>
                      <td class="text-sm text-secondary">{{ student.email }}</td>
                      <td>
                        @if (student.sectionNumber) {
                          <span
                            class="bg-accent/10 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full"
                          >
                            {{ student.sectionNumber }}
                          </span>
                        } @else {
                          <span class="text-slate-400">—</span>
                        }
                      </td>
                      <td class="text-sm text-secondary">
                        {{ student.projects?.length || 0 }} {{ 'admin.projectCount' | translate:(student.projects?.length || 0) }}
                      </td>
                      <td>
                        <app-status-badge [status]="student.status" />
                      </td>
                      <td class="text-right space-x-1">
                        <p-button
                          icon="pi pi-pencil"
                          severity="info"
                          [text]="true"
                          [rounded]="true"
                          [pTooltip]="'admin.changeSection' | translate"
                          (onClick)="openEditStudentSection(student)"
                        />
                        @if (student.status === 'ACTIVE') {
                          <p-button
                            icon="pi pi-ban"
                            severity="danger"
                            [text]="true"
                            [rounded]="true"
                            [pTooltip]="'admin.suspend' | translate"
                            (onClick)="toggleStudentStatus(student)"
                          />
                        } @else {
                          <p-button
                            icon="pi pi-check-circle"
                            severity="success"
                            [text]="true"
                            [rounded]="true"
                            [pTooltip]="'admin.activate' | translate"
                            (onClick)="toggleStudentStatus(student)"
                          />
                        }
                      </td>
                    </tr>
                  </ng-template>

                  <ng-template pTemplate="emptymessage">
                    <tr>
                      <td colspan="6" class="text-center py-8 text-secondary">
                        {{ 'admin.noStudents' | translate }}
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              </div>
            </div>

            <!-- Edit Student Section Dialog -->
            <p-dialog
              [header]="'admin.changeSection' | translate"
              [(visible)]="showEditStudentSectionDialog"
              [modal]="true"
              [style]="{ width: '420px' }"
            >
              @if (selectedStudent()) {
                <div class="space-y-4">
                  <p class="text-sm text-secondary">
                    {{ 'admin.changeSectionFor' | translate }}
                    <strong>{{ selectedStudent()!.name }}</strong>
                  </p>

                  @if (sections().length) {
                    <div>
                      <label class="text-xs font-medium text-secondary mb-1 block">
                        {{ 'admin.availableSections' | translate }}
                      </label>
                      <div class="flex flex-wrap gap-1.5">
                        @for (s of sections(); track s) {
                          <button
                            class="text-xs px-2.5 py-1 rounded-full border transition-colors"
                            [class]="
                              newStudentSection === s
                                ? 'bg-blue-50 text-blue-700 border-blue-400'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-400 cursor-pointer'
                            "
                            (click)="newStudentSection = s"
                          >
                            {{ s }}
                          </button>
                        }
                      </div>
                    </div>
                  }

                  <div class="flex gap-2">
                    <input
                      pInputText
                      [(ngModel)]="newStudentSection"
                      [placeholder]="'admin.sectionPlaceholder' | translate"
                      class="flex-1"
                      (keydown.enter)="saveStudentSection()"
                    />
                    <p-button
                      icon="pi pi-check"
                      (onClick)="saveStudentSection()"
                      [disabled]="!newStudentSection.trim()"
                    >
                      {{ 'common.save' | translate }}
                    </p-button>
                  </div>

                  @if (studentSectionError()) {
                    <p-message severity="error" [text]="studentSectionError()!" styleClass="w-full" />
                  }
                </div>
              }
            </p-dialog>
          </p-tabpanel>

          <!-- ═══════ TAB 3 – PROFESSORS ═══════ -->
          <p-tabpanel value="professors">
            <div class="space-y-4 pt-4">
              @if (profError()) {
                <p-message severity="error" [text]="profError()!" styleClass="w-full" />
              }

              <div class="bg-white rounded-xl border border-slate-200">
                <p-table
                  [value]="professors()"
                  [loading]="loadingProfessors()"
                  [paginator]="true"
                  [rows]="10"
                  [rowsPerPageOptions]="[10, 25, 50]"
                  dataKey="id"
                  styleClass="p-datatable-striped"
                >
                  <ng-template pTemplate="caption">
                    <div class="flex items-center justify-between">
                      <span class="text-lg font-semibold text-primary">{{ 'admin.professors' | translate }}</span>
                      <span class="text-sm text-secondary">
                        {{ professors().length }} {{ 'admin.professorCount' | translate:professors().length }}
                      </span>
                    </div>
                  </ng-template>

                  <ng-template pTemplate="header">
                    <tr>
                      <th pSortableColumn="name">{{ 'common.name' | translate }} <p-sortIcon field="name" /></th>
                      <th pSortableColumn="email">{{ 'common.email' | translate }} <p-sortIcon field="email" /></th>
                      <th>{{ 'admin.assignedSections' | translate }}</th>
                      <th>{{ 'common.status' | translate }}</th>
                      <th class="text-right">{{ 'common.actions' | translate }}</th>
                    </tr>
                  </ng-template>

                  <ng-template pTemplate="body" let-prof>
                    <tr>
                      <td class="font-medium">{{ prof.name }}</td>
                      <td class="text-sm text-secondary">{{ prof.email }}</td>
                      <td>
                        <div class="flex flex-wrap gap-1.5 max-w-xs overflow-hidden">
                          @for (section of parseSections(prof.sections); track section) {
                            <span
                              class="inline-flex items-center gap-1 bg-blue-50 text-blue-700
                                     text-xs font-medium pl-2.5 pr-1 py-1 rounded-full"
                            >
                              {{ section }}
                              <button
                                class="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full
                                       text-blue-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                (click)="removeSection(prof.id, section)"
                                [title]="'admin.removeSection' | translate"
                              >
                                <i class="pi pi-times" style="font-size: 0.6rem"></i>
                              </button>
                            </span>
                          }
                          @if (!parseSections(prof.sections).length) {
                            <span class="text-slate-400 text-sm italic">{{ 'common.noSections' | translate }}</span>
                          }
                        </div>
                      </td>
                      <td>
                        <app-status-badge [status]="prof.status" />
                      </td>
                      <td class="text-right">
                        <p-button
                          icon="pi pi-plus"
                          severity="info"
                          [text]="true"
                          [rounded]="true"
                          [pTooltip]="'admin.addSection' | translate"
                          (onClick)="openAddSection(prof)"
                        />
                      </td>
                    </tr>
                  </ng-template>

                  <ng-template pTemplate="emptymessage">
                    <tr>
                      <td colspan="5" class="text-center py-8 text-secondary">
                        {{ 'admin.noProfessors' | translate }}
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              </div>
            </div>

            <!-- Add Section Dialog -->
            <p-dialog
              [header]="'admin.addSection' | translate"
              [(visible)]="showAddSectionDialog"
              [modal]="true"
              [style]="{ width: '420px' }"
            >
              @if (selectedProfessor()) {
                <div class="space-y-4">
                  <p class="text-sm text-secondary">
                    {{ 'admin.addSectionTo' | translate }}
                    <strong>{{ selectedProfessor()!.name }}</strong>
                  </p>

                  @if (sections().length) {
                    <div>
                      <label class="text-xs font-medium text-secondary mb-1 block">
                        {{ 'admin.availableSections' | translate }}
                      </label>
                      <div class="flex flex-wrap gap-1.5">
                        @for (s of sections(); track s) {
                          <button
                            class="text-xs px-2.5 py-1 rounded-full border transition-colors"
                            [class]="
                              isSectionAssigned(s)
                                ? 'bg-blue-50 text-blue-400 border-blue-200 cursor-default'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-400 cursor-pointer'
                            "
                            [disabled]="isSectionAssigned(s)"
                            (click)="addSectionQuick(s)"
                          >
                            {{ s }}
                          </button>
                        }
                      </div>
                    </div>
                  }

                  <div class="flex gap-2">
                    <input
                      pInputText
                      [(ngModel)]="newSection"
                      [placeholder]="'admin.sectionPlaceholder' | translate"
                      class="flex-1"
                      (keydown.enter)="addSection()"
                    />
                    <p-button
                      icon="pi pi-plus"
                      (onClick)="addSection()"
                      [disabled]="!newSection.trim()"
                    >
                      {{ 'common.add' | translate }}
                    </p-button>
                  </div>

                  @if (sectionError()) {
                    <p-message severity="error" [text]="sectionError()!" styleClass="w-full" />
                  }
                </div>
              }
            </p-dialog>
          </p-tabpanel>

          <!-- ═══════ TAB 4 – RUNNING PROJECTS ═══════ -->
          <p-tabpanel value="running">
            <div class="space-y-4 pt-4">
              <div class="flex justify-end">
                <p-button
                  icon="pi pi-refresh"
                  [outlined]="true"
                  (onClick)="loadRunningProjects()"
                >
                  {{ 'common.refresh' | translate }}
                </p-button>
              </div>

              <div class="bg-white rounded-xl border border-slate-200">
                <p-table
                  [value]="runningProjects()"
                  [loading]="loadingRunning()"
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
                        {{ runningProjects().length }} {{ 'admin.active' | translate }}
                      </span>
                    </div>
                  </ng-template>

                  <ng-template pTemplate="header">
                    <tr>
                      <th pSortableColumn="name">
                        {{ 'common.project' | translate }} <p-sortIcon field="name" />
                      </th>
                      <th pSortableColumn="studentName">
                        {{ 'common.student' | translate }} <p-sortIcon field="studentName" />
                      </th>
                      <th pSortableColumn="sectionNumber">
                        {{ 'common.section' | translate }} <p-sortIcon field="sectionNumber" />
                      </th>
                      <th>{{ 'common.url' | translate }}</th>
                      <th pSortableColumn="updatedAt">
                        {{ 'admin.runningSince' | translate }} <p-sortIcon field="updatedAt" />
                      </th>
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
                          <span
                            class="bg-accent/10 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full"
                          >
                            {{ project.sectionNumber }}
                          </span>
                        }
                      </td>
                      <td>
                        @if (project.url) {
                          <a
                            [href]="project.url"
                            target="_blank"
                            class="text-accent hover:underline text-sm"
                          >
                            {{ project.url }}
                          </a>
                        }
                      </td>
                      <td class="text-sm text-secondary">
                        {{ project.updatedAt | date: 'short' }}
                      </td>
                      <td>
                        <span class="text-emerald-600 font-medium text-sm">
                          {{ getRunningTime(project.updatedAt) }}
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
                          (onClick)="stopRunningProject(project)"
                        />
                        @if (project.url) {
                          <p-button
                            icon="pi pi-external-link"
                            severity="info"
                            [text]="true"
                            [rounded]="true"
                            [pTooltip]="'admin.openUrl' | translate"
                            (onClick)="openUrl(project.url)"
                          />
                        }
                        @if (project.adminUrl && project.status === 'RUNNING') {
                          <p-button
                            icon="pi pi-database"
                            severity="warn"
                            [text]="true"
                            [rounded]="true"
                            [pTooltip]="'admin.openDb' | translate"
                            (onClick)="openUrl(project.adminUrl)"
                          />
                        }
                        <p-button
                          icon="pi pi-code"
                          severity="secondary"
                          [text]="true"
                          [rounded]="true"
                          [pTooltip]="'admin.browseFiles' | translate"
                          tooltipPosition="left"
                          (onClick)="openExplorer(project)"
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
                        {{ 'admin.noRunning' | translate }}
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              </div>
            </div>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
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
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private runnerService = inject(RunnerService);
  state = inject(AdminStateService);

  activeTab = 'projects';

  // ─── All Projects ───────────────────────────
  allProjects = signal<AdminProject[]>([]);
  displayedProjects = signal<AdminProject[]>([]);
  loadingProjects = signal(false);
  projectSearch = '';
  sectionFilter: string | null = null;
  statusFilter: string | null = null;

  sections = signal<string[]>([]);
  sectionOptions = computed(() =>
    this.sections().map((s) => ({ label: s, value: s })),
  );

  statusOptions = [
    { label: 'Running', value: 'RUNNING' },
    { label: 'Stopped', value: 'STOPPED' },
    { label: 'Error', value: 'ERROR' },
  ];

  // ─── Students ───────────────────────────────
  allStudents = signal<any[]>([]);
  displayedStudents = signal<any[]>([]);
  loadingStudents = signal(false);
  studentSearch = '';
  studentSectionFilter: string | null = null;
  studentError = signal<string | null>(null);
  showEditStudentSectionDialog = false;
  selectedStudent = signal<any | null>(null);
  newStudentSection = '';
  studentSectionError = signal<string | null>(null);

  // ─── Professors ─────────────────────────────
  professors = signal<User[]>([]);
  loadingProfessors = signal(false);
  profError = signal<string | null>(null);
  showAddSectionDialog = false;
  selectedProfessor = signal<User | null>(null);
  newSection = '';
  sectionError = signal<string | null>(null);

  // ─── Running Projects ───────────────────────
  runningProjects = signal<AdminProject[]>([]);
  loadingRunning = signal(false);

  // ─── File Explorer ──────────────────────────
  explorerProject = signal<{ id: string; name: string } | null>(null);

  // ───────────────────────────────────────────────
  //  Lifecycle
  // ───────────────────────────────────────────────

  ngOnInit() {
    this.loadAllProjects();
    this.loadSections();
    this.loadProfessors();
    this.loadRunningProjects();
    this.loadStudents();
  }

  // ───────────────────────────────────────────────
  //  All Projects
  // ───────────────────────────────────────────────

  loadAllProjects() {
    this.loadingProjects.set(true);
    this.adminService.getAllProjects().subscribe({
      next: (data) => {
        this.allProjects.set(data);
        this.applyProjectFilters();
        this.loadingProjects.set(false);
      },
      error: () => this.loadingProjects.set(false),
    });
  }

  loadSections() {
    this.adminService.getSections().subscribe({
      next: (data) => this.sections.set(data),
    });
  }

  applyProjectFilters() {
    let list = this.allProjects();

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

  startProject(project: AdminProject) {
    this.updateProjectLocal(project.id, { status: 'RUNNING' });
    this.runnerService.start(project.id).subscribe({
      next: (url) => this.updateProjectLocal(project.id, { status: 'RUNNING', url }),
      error: () => this.updateProjectLocal(project.id, { status: 'ERROR' }),
    });
  }

  stopProject(project: AdminProject) {
    this.runnerService.stop(project.id).subscribe({
      next: () => {
        this.updateProjectLocal(project.id, { status: 'STOPPED', url: null });
        this.runningProjects.update((list) => list.filter((p) => p.id !== project.id));
      },
    });
  }

  private updateProjectLocal(id: string, changes: Partial<AdminProject>) {
    this.allProjects.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...changes } : p)),
    );
    this.applyProjectFilters();
  }

  // ───────────────────────────────────────────────
  //  Students
  // ───────────────────────────────────────────────

  loadStudents() {
    this.loadingStudents.set(true);
    this.adminService.getStudents().subscribe({
      next: (data) => {
        this.allStudents.set(data);
        this.applyStudentFilters();
        this.loadingStudents.set(false);
      },
      error: (err) => {
        this.studentError.set(err?.error?.message ?? 'Failed to load students');
        this.loadingStudents.set(false);
      },
    });
  }

  applyStudentFilters() {
    let list = this.allStudents();

    if (this.studentSectionFilter) {
      list = list.filter((s: any) => s.sectionNumber === this.studentSectionFilter);
    }
    if (this.studentSearch?.trim()) {
      const q = this.studentSearch.trim().toLowerCase();
      list = list.filter(
        (s: any) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q),
      );
    }

    this.displayedStudents.set(list);
  }

  openEditStudentSection(student: any) {
    this.selectedStudent.set(student);
    this.newStudentSection = student.sectionNumber || '';
    this.studentSectionError.set(null);
    this.showEditStudentSectionDialog = true;
  }

  saveStudentSection() {
    const student = this.selectedStudent();
    const section = this.newStudentSection.trim().toUpperCase();
    if (!student || !section) return;

    this.studentSectionError.set(null);
    this.adminService.updateStudentSection(student.id, section).subscribe({
      next: (updated) => {
        this.allStudents.update((list) =>
          list.map((s: any) => (s.id === updated.id ? { ...s, sectionNumber: updated.sectionNumber } : s)),
        );
        this.applyStudentFilters();
        this.showEditStudentSectionDialog = false;
      },
      error: (err) => {
        this.studentSectionError.set(err?.error?.message ?? 'Failed to update section');
      },
    });
  }

  toggleStudentStatus(student: any) {
    const newStatus = student.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.adminService.updateUserStatus(student.id, newStatus).subscribe({
      next: (updated) => {
        this.allStudents.update((list) =>
          list.map((s: any) => (s.id === updated.id ? { ...s, status: updated.status } : s)),
        );
        this.applyStudentFilters();
      },
      error: (err) => {
        this.studentError.set(err?.error?.message ?? 'Failed to update status');
      },
    });
  }

  // ───────────────────────────────────────────────
  //  Professors
  // ───────────────────────────────────────────────

  loadProfessors() {
    this.loadingProfessors.set(true);
    this.adminService.getProfessors().subscribe({
      next: (data) => {
        this.professors.set(data);
        this.loadingProfessors.set(false);
      },
      error: (err) => {
        this.profError.set(err?.error?.message ?? 'Failed to load professors');
        this.loadingProfessors.set(false);
      },
    });
  }

  parseSections(json: string | null): string[] {
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  isSectionAssigned(section: string): boolean {
    const prof = this.selectedProfessor();
    if (!prof) return false;
    return this.parseSections(prof.sections).includes(section);
  }

  openAddSection(prof: User) {
    this.selectedProfessor.set(prof);
    this.newSection = '';
    this.sectionError.set(null);
    this.showAddSectionDialog = true;
  }

  addSectionQuick(section: string) {
    this.newSection = section;
    this.addSection();
  }

  addSection() {
    const prof = this.selectedProfessor();
    const section = this.newSection.trim().toUpperCase();
    if (!prof || !section) return;

    this.sectionError.set(null);
    this.adminService.addProfessorSection(prof.id, section).subscribe({
      next: (updated) => {
        this.professors.update((list) =>
          list.map((p) => (p.id === updated.id ? { ...p, sections: updated.sections } : p)),
        );
        this.selectedProfessor.set({ ...prof, sections: updated.sections });
        this.newSection = '';
      },
      error: (err) => {
        this.sectionError.set(err?.error?.message ?? 'Failed to add section');
      },
    });
  }

  removeSection(professorId: string, section: string) {
    this.adminService.removeProfessorSection(professorId, section).subscribe({
      next: (updated) => {
        this.professors.update((list) =>
          list.map((p) => (p.id === updated.id ? { ...p, sections: updated.sections } : p)),
        );
        // Also update the dialog if it's open for this professor
        if (this.selectedProfessor()?.id === professorId) {
          this.selectedProfessor.update((p) => (p ? { ...p, sections: updated.sections } : p));
        }
      },
      error: (err) => {
        this.profError.set(err?.error?.message ?? 'Failed to remove section');
      },
    });
  }

  // ───────────────────────────────────────────────
  //  Running Projects
  // ───────────────────────────────────────────────

  loadRunningProjects() {
    this.loadingRunning.set(true);
    this.adminService.getRunningProjects().subscribe({
      next: (data) => {
        this.runningProjects.set(data);
        this.loadingRunning.set(false);
      },
      error: () => this.loadingRunning.set(false),
    });
  }

  stopRunningProject(project: AdminProject) {
    this.runnerService.stop(project.id).subscribe({
      next: () => {
        this.runningProjects.update((list) => list.filter((p) => p.id !== project.id));
        this.updateProjectLocal(project.id, { status: 'STOPPED', url: null });
      },
    });
  }

  getRunningTime(updatedAt: string | null): string {
    if (!updatedAt) return '—';
    const ms = Date.now() - new Date(updatedAt).getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  // ───────────────────────────────────────────────
  //  Shared helpers
  // ───────────────────────────────────────────────

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  openUrl(url: string | null) {
    if (url) window.open(url, '_blank');
  }

  openExplorer(project: AdminProject) {
    this.explorerProject.set({ id: project.id, name: project.name });
  }

  closeExplorer() {
    this.explorerProject.set(null);
  }
}
