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
import { AdminStateService } from './admin-state.service';
import { AdminService } from '../../core/services/admin.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-admin-students',
  standalone: true,
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    DialogModule,
    MessageModule,
    StatusBadgeComponent,
    TranslatePipe,
  ],
  template: `
    <div class="p-6 space-y-4">
      @if (studentError()) {
        <p-message severity="error" [text]="studentError()!" styleClass="w-full" />
      }

      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-64">
          <input
            pInputText
            type="text"
            [(ngModel)]="studentSearch"
            (ngModelChange)="applyFilters()"
            [placeholder]="'admin.searchStudents' | translate"
            class="w-full"
          />
        </div>
        <p-select
          [options]="state.sectionOptions()"
          [(ngModel)]="studentSectionFilter"
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
          [value]="displayedStudents()"
          [loading]="state.loadingStudents()"
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
                  <span class="bg-accent/10 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {{ student.sectionNumber }}
                  </span>
                } @else {
                  <span class="text-slate-400">—</span>
                }
              </td>
              <td class="text-sm text-secondary">
                {{ student.projects?.length || 0 }} {{ 'admin.projectCount' | translate:(student.projects?.length || 0) }}
              </td>
              <td><app-status-badge [status]="student.status" /></td>
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

          @if (state.sections().length) {
            <div>
              <label class="text-xs font-medium text-secondary mb-1 block">
                {{ 'admin.availableSections' | translate }}
              </label>
              <div class="flex flex-wrap gap-1.5">
                @for (s of state.sections(); track s) {
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

          <div class="flex gap-2 items-center">
            <input
              pInputText
              [(ngModel)]="newStudentSection"
              [placeholder]="'admin.sectionPlaceholder' | translate"
              class="flex-1 min-w-0"
              (keydown.enter)="saveStudentSection()"
            />
            <p-button
              [label]="'common.save' | translate"
              icon="pi pi-check"
              (onClick)="saveStudentSection()"
              [disabled]="!newStudentSection.trim()"
              styleClass="whitespace-nowrap"
            />
          </div>

          @if (studentSectionError()) {
            <p-message severity="error" [text]="studentSectionError()!" styleClass="w-full" />
          }
        </div>
      }
    </p-dialog>
  `,
})
export class AdminStudentsComponent {
  state = inject(AdminStateService);
  private adminService = inject(AdminService);

  studentSearch = '';
  studentSectionFilter: string | null = null;
  studentError = signal<string | null>(null);
  displayedStudents = signal<any[]>([]);

  showEditStudentSectionDialog = false;
  selectedStudent = signal<any | null>(null);
  newStudentSection = '';
  studentSectionError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const _all = this.state.allStudents();
      this.applyFilters();
    });
  }

  applyFilters() {
    let list = this.state.allStudents();
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

  refresh() {
    this.state.loadStudents();
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
        this.state.allStudents.update((list) =>
          list.map((s: any) => (s.id === updated.id ? { ...s, sectionNumber: updated.sectionNumber } : s)),
        );
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
        this.state.allStudents.update((list) =>
          list.map((s: any) => (s.id === updated.id ? { ...s, status: updated.status } : s)),
        );
      },
      error: (err) => {
        this.studentError.set(err?.error?.message ?? 'Failed to update status');
      },
    });
  }
}
