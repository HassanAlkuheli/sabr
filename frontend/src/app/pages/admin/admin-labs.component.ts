import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { TabsModule } from 'primeng/tabs';
import { AdminStateService } from './admin-state.service';
import { AdminLab, AdminProject } from '../../core/models/project.model';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-admin-labs',
  standalone: true,
  imports: [
    FormsModule, DatePipe, TableModule, ButtonModule, InputTextModule,
    SelectModule, TooltipModule, TabsModule, TranslatePipe,
  ],
  template: `
    <div class="p-6 space-y-4">
      <!-- Filters -->
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-64">
          <input pInputText type="text" [(ngModel)]="search" (ngModelChange)="applyLabFilters()"
            [placeholder]="'professor.searchLabs' | translate" class="w-full" />
        </div>
        <p-select [options]="state.sectionOptions()" [(ngModel)]="sectionFilter" (ngModelChange)="applyLabFilters(); applyGradeFilters()"
          optionLabel="label" optionValue="value" [placeholder]="'admin.allSections' | translate"
          [showClear]="true" styleClass="w-48" />
        <p-button icon="pi pi-refresh" [outlined]="true" [pTooltip]="'common.refresh' | translate"
          (onClick)="refresh()" />
      </div>

      <p-tabs value="0">
        <p-tablist>
          <p-tab value="0">{{ 'professor.labs' | translate }} ({{ displayedLabs().length }})</p-tab>
          <p-tab value="1">{{ 'professor.grades' | translate }} ({{ displayedGrades().length }})</p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- Labs table -->
          <p-tabpanel value="0">
            <div class="bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 mt-4">
              <p-table [value]="displayedLabs()" [loading]="state.loadingLabs()" [paginator]="true" [rows]="15"
                [rowsPerPageOptions]="[10, 15, 25, 50]" dataKey="id" styleClass="p-datatable-striped">
                <ng-template pTemplate="header">
                  <tr>
                    <th pSortableColumn="name">{{ 'common.name' | translate }} <p-sortIcon field="name" /></th>
                    <th>{{ 'professor.description' | translate }}</th>
                    <th>{{ 'common.section' | translate }}</th>
                    <th>{{ 'admin.professor' | translate }}</th>
                    <th pSortableColumn="maxGrade">{{ 'professor.maxGrade' | translate }} <p-sortIcon field="maxGrade" /></th>
                    <th pSortableColumn="deadline">{{ 'professor.deadline' | translate }} <p-sortIcon field="deadline" /></th>
                    <th>{{ 'common.status' | translate }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-lab>
                  <tr>
                    <td class="font-medium">{{ lab.name }}</td>
                    <td class="text-sm text-secondary max-w-48 truncate">{{ lab.description || '—' }}</td>
                    <td>
                      @for (sec of parseSections(lab.sections); track sec) {
                        <span class="bg-accent/10 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full mr-1">{{ sec }}</span>
                      }
                    </td>
                    <td>
                      <div class="text-sm">{{ lab.professorName }}</div>
                      <div class="text-xs text-secondary">{{ lab.professorEmail }}</div>
                    </td>
                    <td class="font-semibold">{{ lab.maxGrade }}</td>
                    <td class="text-sm">{{ lab.deadline | date: 'mediumDate' }}</td>
                    <td>
                      @if (isExpired(lab.deadline)) {
                        <span class="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">{{ 'professor.expired' | translate }}</span>
                      } @else {
                        <span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full">{{ 'professor.active' | translate }}</span>
                      }
                    </td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="7" class="text-center py-8 text-secondary">{{ 'professor.noLabs' | translate }}</td></tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabpanel>

          <!-- Grades table -->
          <p-tabpanel value="1">
            <div class="bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 mt-4">
              <p-table [value]="displayedGrades()" [loading]="state.loadingGradedProjects()" [paginator]="true" [rows]="15"
                [rowsPerPageOptions]="[10, 15, 25, 50]" dataKey="id" styleClass="p-datatable-striped">
                <ng-template pTemplate="header">
                  <tr>
                    <th pSortableColumn="name">{{ 'common.project' | translate }} <p-sortIcon field="name" /></th>
                    <th pSortableColumn="studentName">{{ 'common.student' | translate }} <p-sortIcon field="studentName" /></th>
                    <th pSortableColumn="sectionNumber">{{ 'common.section' | translate }} <p-sortIcon field="sectionNumber" /></th>
                    <th>{{ 'professor.grade' | translate }}</th>
                    <th>{{ 'professor.message' | translate }}</th>
                    <th>{{ 'common.status' | translate }}</th>
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
                      @if (p.grade !== null && p.grade !== undefined) {
                        <span class="font-semibold text-emerald-600">{{ p.grade }}</span>
                      } @else {
                        <span class="text-slate-400 text-sm italic">{{ 'professor.notGraded' | translate }}</span>
                      }
                    </td>
                    <td class="text-sm text-secondary max-w-48 truncate">{{ p.gradeMessage || '—' }}</td>
                    <td>
                      @if (p.grade !== null && p.grade !== undefined) {
                        <span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full">{{ 'professor.graded' | translate }}</span>
                      } @else {
                        <span class="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full">{{ 'professor.pending' | translate }}</span>
                      }
                    </td>
                  </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                  <tr><td colspan="6" class="text-center py-8 text-secondary">{{ 'admin.noProjects' | translate }}</td></tr>
                </ng-template>
              </p-table>
            </div>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>
  `,
})
export class AdminLabsComponent {
  state = inject(AdminStateService);

  search = '';
  sectionFilter: string | null = null;
  displayedLabs = signal<AdminLab[]>([]);
  displayedGrades = signal<AdminProject[]>([]);

  constructor() {
    effect(() => {
      const _labs = this.state.adminLabs();
      this.applyLabFilters();
    });
    effect(() => {
      const _grades = this.state.gradedProjects();
      this.applyGradeFilters();
    });
  }

  applyLabFilters() {
    let list = this.state.adminLabs();
    if (this.sectionFilter) list = list.filter((l) => this.parseSections(l.sections).includes(this.sectionFilter!));
    if (this.search?.trim()) {
      const q = this.search.trim().toLowerCase();
      list = list.filter((l) =>
        l.name.toLowerCase().includes(q) || l.professorName?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q),
      );
    }
    this.displayedLabs.set(list);
  }

  applyGradeFilters() {
    let list = this.state.gradedProjects();
    if (this.sectionFilter) list = list.filter((p) => p.sectionNumber === this.sectionFilter);
    this.displayedGrades.set(list);
  }

  refresh() {
    this.state.loadLabs();
    this.state.loadGradedProjects();
  }

  isExpired(deadline: string): boolean {
    return new Date(deadline) < new Date();
  }

  parseSections(sections: string): string[] {
    try { return JSON.parse(sections); } catch { return []; }
  }
}
