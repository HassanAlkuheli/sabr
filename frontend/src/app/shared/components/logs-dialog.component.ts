import { Component, input, output, effect } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-logs-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, ProgressSpinnerModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="('common.projectLogs' | translate) + (projectName() ? ' — ' + projectName() : '')"
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: '70vw', maxHeight: '80vh' }"
    >
      <div class="flex justify-end mb-3">
        <p-button
          icon="pi pi-refresh"
          [label]="'common.refreshLogs' | translate"
          severity="secondary"
          [outlined]="true"
          size="small"
          [loading]="loading()"
          (onClick)="refreshRequested.emit()"
        />
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <p-progressSpinner strokeWidth="3" [style]="{ width: '40px', height: '40px' }" />
          <span class="ml-3 text-secondary">{{ 'common.loadingLogs' | translate }}</span>
        </div>
      } @else if (logs()) {
        <pre
          class="bg-slate-900 text-emerald-400 text-xs font-mono p-4 rounded-lg overflow-auto whitespace-pre-wrap break-words"
          style="max-height: 60vh; direction: ltr; text-align: left;"
        >{{ logs() }}</pre>
      } @else {
        <div class="text-center py-8 text-secondary">
          {{ 'common.noLogs' | translate }}
        </div>
      }
    </p-dialog>
  `,
})
export class LogsDialogComponent {
  projectName = input<string>('');
  logs = input<string>('');
  loading = input(false);
  visible = input(false);

  closed = output<void>();
  refreshRequested = output<void>();

  onVisibleChange(value: boolean) {
    if (!value) {
      this.closed.emit();
    }
  }
}
