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
import { User } from '../../core/models/user.model';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-admin-professors',
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
      @if (profError()) {
        <p-message severity="error" [text]="profError()!" styleClass="w-full" />
      }

      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-64">
          <input
            pInputText
            type="text"
            [(ngModel)]="profSearch"
            (ngModelChange)="applyFilters()"
            [placeholder]="'admin.searchProfessors' | translate"
            class="w-full"
          />
        </div>
        <p-select
          [options]="state.sectionOptions()"
          [(ngModel)]="profSectionFilter"
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
          [value]="displayedProfessors()"
          [loading]="state.loadingProfessors()"
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
                {{ displayedProfessors().length }} {{ 'admin.professorCount' | translate:displayedProfessors().length }}
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
                      class="bg-accent/10 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full"
                    >
                      {{ section }}
                    </span>
                  }
                  @if (!parseSections(prof.sections).length) {
                    <span class="text-slate-400 text-sm italic">{{ 'common.noSections' | translate }}</span>
                  }
                </div>
              </td>
              <td><app-status-badge [status]="prof.status" /></td>
              <td class="text-right">
                <p-button
                  icon="pi pi-pencil"
                  severity="info"
                  [text]="true"
                  [rounded]="true"
                  [pTooltip]="'admin.editSections' | translate"
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

    <!-- Edit Sections Dialog -->
    <p-dialog
      [header]="'admin.editSections' | translate"
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
                      isSectionAssigned(s)
                        ? 'bg-blue-50 text-blue-700 border-blue-400'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-400 cursor-pointer'
                    "
                    (click)="toggleSection(s)"
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
              [(ngModel)]="newSection"
              [placeholder]="'admin.sectionPlaceholder' | translate"
              class="flex-1 min-w-0"
              (keydown.enter)="addSection()"
            />
            <p-button
              [label]="'common.add' | translate"
              icon="pi pi-plus"
              (onClick)="addSection()"
              [disabled]="!newSection.trim()"
              styleClass="whitespace-nowrap"
            />
          </div>

          @if (sectionError()) {
            <p-message severity="error" [text]="sectionError()!" styleClass="w-full" />
          }
        </div>
      }
    </p-dialog>
  `,
})
export class AdminProfessorsComponent {
  state = inject(AdminStateService);
  private adminService = inject(AdminService);

  profSearch = '';
  profSectionFilter: string | null = null;
  profError = signal<string | null>(null);
  displayedProfessors = signal<User[]>([]);
  showAddSectionDialog = false;
  selectedProfessor = signal<User | null>(null);
  newSection = '';
  sectionError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const _all = this.state.professors();
      this.applyFilters();
    });
  }

  applyFilters() {
    let list = this.state.professors();
    if (this.profSectionFilter) {
      list = list.filter((p) =>
        this.parseSections(p.sections).includes(this.profSectionFilter!),
      );
    }
    if (this.profSearch?.trim()) {
      const q = this.profSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q),
      );
    }
    this.displayedProfessors.set(list);
  }

  refresh() {
    this.state.loadProfessors();
  }

  parseSections(json: string | null): string[] {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
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

  toggleSection(section: string) {
    if (this.isSectionAssigned(section)) {
      this.removeSectionFromDialog(section);
    } else {
      this.newSection = section;
      this.addSection();
    }
  }

  addSection() {
    const prof = this.selectedProfessor();
    const section = this.newSection.trim().toUpperCase();
    if (!prof || !section) return;

    this.sectionError.set(null);
    this.adminService.addProfessorSection(prof.id, section).subscribe({
      next: (updated) => {
        this.state.professors.update((list) =>
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
        this.state.professors.update((list) =>
          list.map((p) => (p.id === updated.id ? { ...p, sections: updated.sections } : p)),
        );
        if (this.selectedProfessor()?.id === professorId) {
          this.selectedProfessor.update((p) => (p ? { ...p, sections: updated.sections } : p));
        }
      },
      error: (err) => {
        this.profError.set(err?.error?.message ?? 'Failed to remove section');
      },
    });
  }

  removeSectionFromDialog(section: string) {
    const prof = this.selectedProfessor();
    if (!prof) return;
    this.sectionError.set(null);
    this.removeSection(prof.id, section);
  }
}
