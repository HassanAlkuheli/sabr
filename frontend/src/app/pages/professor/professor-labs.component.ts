import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { ProfessorStateService } from './professor-state.service';
import { ProfessorService } from '../../core/services/professor.service';
import { Lab } from '../../core/models/project.model';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-prof-labs',
  standalone: true,
  imports: [
    FormsModule, DatePipe, TableModule, ButtonModule, InputTextModule,
    SelectModule, MultiSelectModule, TooltipModule, DialogModule, MessageModule,
    DatePickerModule, TextareaModule, TranslatePipe,
  ],
  template: `
    <div class="p-6 space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-64">
          <input pInputText type="text" [(ngModel)]="search" (ngModelChange)="applyFilters()"
            [placeholder]="'professor.searchLabs' | translate" class="w-full" />
        </div>
        <p-select [options]="state.sectionOptions()" [(ngModel)]="sectionFilter" (ngModelChange)="applyFilters()"
          optionLabel="label" optionValue="value" [placeholder]="'common.allSections' | translate"
          [showClear]="true" styleClass="w-48" />
        <p-button icon="pi pi-plus" [label]="'professor.createLab' | translate" (onClick)="openCreateDialog()" />
        <p-button icon="pi pi-refresh" [outlined]="true" [pTooltip]="'common.refresh' | translate"
          (onClick)="refresh()" />
      </div>

      <div class="bg-white rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <p-table [value]="displayed()" [loading]="state.loadingLabs()" [paginator]="true" [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25, 50]" dataKey="id" styleClass="p-datatable-striped">
          <ng-template pTemplate="caption">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-primary">{{ 'professor.labs' | translate }}</span>
              <span class="text-sm text-secondary">{{ displayed().length }} {{ 'professor.labCount' | translate:displayed().length }}</span>
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">{{ 'common.name' | translate }} <p-sortIcon field="name" /></th>
              <th>{{ 'professor.description' | translate }}</th>
              <th>{{ 'common.section' | translate }}</th>
              <th pSortableColumn="maxGrade">{{ 'professor.maxGrade' | translate }} <p-sortIcon field="maxGrade" /></th>
              <th pSortableColumn="deadline">{{ 'professor.deadline' | translate }} <p-sortIcon field="deadline" /></th>
              <th>{{ 'common.status' | translate }}</th>
              <th class="text-right">{{ 'common.actions' | translate }}</th>
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
              <td class="font-semibold">{{ lab.maxGrade }}</td>
              <td class="text-sm">{{ lab.deadline | date: 'mediumDate' }}</td>
              <td>
                @if (state.isLabExpired(lab.deadline)) {
                  <span class="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">{{ 'professor.expired' | translate }}</span>
                } @else {
                  <span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full">{{ 'professor.active' | translate }}</span>
                }
              </td>
              <td class="text-right space-x-1">
                <p-button icon="pi pi-pencil" severity="info" [text]="true" [rounded]="true"
                  [pTooltip]="'common.edit' | translate" (onClick)="openEditDialog(lab)" />
                <p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true"
                  [pTooltip]="'common.delete' | translate" (onClick)="confirmDelete(lab)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7" class="text-center py-8 text-secondary">{{ 'professor.noLabs' | translate }}</td></tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <!-- Create / Edit Lab Dialog -->
    <p-dialog [header]="isEditing ? ('professor.editLab' | translate) : ('professor.createLab' | translate)"
      [(visible)]="showLabDialog" [modal]="true" [style]="{ width: '480px' }">
      <div class="space-y-4">
        <div>
          <label class="text-xs font-medium text-secondary mb-1 block">{{ 'common.name' | translate }} *</label>
          <input pInputText [(ngModel)]="form.name" class="w-full" [placeholder]="'professor.labNamePlaceholder' | translate" />
        </div>
        <div>
          <label class="text-xs font-medium text-secondary mb-1 block">{{ 'professor.description' | translate }}</label>
          <textarea pTextarea [(ngModel)]="form.description" class="w-full" rows="3"
            [placeholder]="'professor.descriptionPlaceholder' | translate"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-medium text-secondary mb-1 block">{{ 'professor.maxGrade' | translate }} *</label>
            <input pInputText type="number" [(ngModel)]="form.maxGrade" class="w-full" min="1" />
          </div>
          <div>
            <label class="text-xs font-medium text-secondary mb-1 block">{{ 'professor.deadline' | translate }} *</label>
            <p-datepicker [(ngModel)]="form.deadlineDate" [showTime]="true" [showIcon]="true"
              dateFormat="yy-mm-dd" styleClass="w-full" [appendTo]="'body'" />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-secondary mb-1 block">{{ 'common.section' | translate }} *</label>
          <p-multiSelect [options]="state.sectionOptions()" [(ngModel)]="form.sections"
            optionLabel="label" optionValue="value" [placeholder]="'professor.selectSection' | translate"
            styleClass="w-full" [appendTo]="'body'" display="chip" />
        </div>
        @if (labError()) { <p-message severity="error" [text]="labError()!" styleClass="w-full" /> }

        <div class="flex justify-end gap-2 pt-2">
          <p-button [label]="'common.cancel' | translate" [outlined]="true" (onClick)="showLabDialog = false" />
          <p-button [label]="'common.save' | translate" icon="pi pi-check" (onClick)="saveLab()" [loading]="saving()" />
        </div>
      </div>
    </p-dialog>

    <!-- Delete Confirmation -->
    <p-dialog [header]="'professor.deleteLab' | translate" [(visible)]="showDeleteDialog" [modal]="true" [style]="{ width: '380px' }">
      <p class="text-sm">{{ 'professor.deleteLabConfirm' | translate }}</p>
      <div class="flex justify-end gap-2 pt-4">
        <p-button [label]="'common.cancel' | translate" [outlined]="true" (onClick)="showDeleteDialog = false" />
        <p-button [label]="'common.delete' | translate" severity="danger" icon="pi pi-trash" (onClick)="deleteLab()" />
      </div>
    </p-dialog>
  `,
})
export class ProfessorLabsComponent {
  state = inject(ProfessorStateService);
  private profService = inject(ProfessorService);

  search = '';
  sectionFilter: string | null = null;
  displayed = signal<Lab[]>([]);

  // Dialog
  showLabDialog = false;
  isEditing = false;
  editingId: string | null = null;
  labError = signal<string | null>(null);
  saving = signal(false);

  form = {
    name: '',
    description: '',
    maxGrade: 100,
    deadlineDate: null as Date | null,
    sections: [] as string[],
  };

  // Delete
  showDeleteDialog = false;
  deleteTarget: Lab | null = null;

  constructor() {
    effect(() => {
      const _labs = this.state.labs();
      this.applyFilters();
    });
  }

  applyFilters() {
    let list = this.state.labs();
    if (this.sectionFilter) list = list.filter((l) => this.parseSections(l.sections).includes(this.sectionFilter!));
    if (this.search?.trim()) {
      const q = this.search.trim().toLowerCase();
      list = list.filter((l) => l.name.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q));
    }
    this.displayed.set(list);
  }

  refresh() { this.state.loadLabs(); }

  openCreateDialog() {
    this.isEditing = false;
    this.editingId = null;
    this.form = { name: '', description: '', maxGrade: 100, deadlineDate: null, sections: [] };
    this.labError.set(null);
    this.showLabDialog = true;
  }

  openEditDialog(lab: Lab) {
    this.isEditing = true;
    this.editingId = lab.id;
    this.form = {
      name: lab.name,
      description: lab.description ?? '',
      maxGrade: lab.maxGrade,
      deadlineDate: new Date(lab.deadline),
      sections: this.parseSections(lab.sections),
    };
    this.labError.set(null);
    this.showLabDialog = true;
  }

  saveLab() {
    this.labError.set(null);
    if (!this.form.name.trim()) { this.labError.set('Name is required'); return; }
    if (!this.form.deadlineDate) { this.labError.set('Deadline is required'); return; }
    if (this.form.maxGrade < 1) { this.labError.set('Max grade must be at least 1'); return; }

    if (!this.form.sections.length) { this.labError.set('At least one section is required'); this.saving.set(false); return; }

    this.saving.set(true);
    const deadline = this.form.deadlineDate.toISOString();

    if (this.isEditing && this.editingId) {
      this.profService.updateLab(this.editingId, {
        name: this.form.name.trim(),
        description: this.form.description.trim() || undefined,
        deadline,
        maxGrade: this.form.maxGrade,
        sections: this.form.sections,
      }).subscribe({
        next: (updated) => {
          this.state.labs.update((list) => list.map((l) => (l.id === updated.id ? updated : l)));
          this.saving.set(false);
          this.showLabDialog = false;
        },
        error: (err) => {
          this.labError.set(err?.error?.message ?? 'Failed to update lab');
          this.saving.set(false);
        },
      });
    } else {
      this.profService.createLab({
        name: this.form.name.trim(),
        description: this.form.description.trim() || undefined,
        deadline,
        maxGrade: this.form.maxGrade,
        sections: this.form.sections,
      }).subscribe({
        next: (created) => {
          this.state.labs.update((list) => [...list, created]);
          this.saving.set(false);
          this.showLabDialog = false;
        },
        error: (err) => {
          this.labError.set(err?.error?.message ?? 'Failed to create lab');
          this.saving.set(false);
        },
      });
    }
  }

  confirmDelete(lab: Lab) {
    this.deleteTarget = lab;
    this.showDeleteDialog = true;
  }

  parseSections(sections: string): string[] {
    try { return JSON.parse(sections); } catch { return []; }
  }

  deleteLab() {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.id;
    this.profService.deleteLab(id).subscribe({
      next: () => {
        this.state.labs.update((list) => list.filter((l) => l.id !== id));
        this.showDeleteDialog = false;
      },
    });
  }
}
