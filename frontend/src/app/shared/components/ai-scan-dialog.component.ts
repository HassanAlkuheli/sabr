import { Component, input, output, signal, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { AiService, AiScanResult } from '../../core/services/ai.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-ai-scan-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, ProgressBarModule, MessageModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'ai.scanTitle' | translate"
      [visible]="visible()"
      (visibleChange)="closed.emit()"
      [modal]="true"
      [style]="{ width: '600px', maxHeight: '80vh' }"
      [contentStyle]="{ overflow: 'auto' }"
    >
      @if (loading()) {
        <div class="flex flex-col items-center gap-4 py-8">
          <i class="pi pi-spin pi-cog text-4xl text-primary"></i>
          <p class="text-sm text-secondary">{{ 'ai.scanning' | translate }}</p>
          <p-progressBar mode="indeterminate" styleClass="w-full" />
        </div>
      } @else if (error()) {
        <p-message severity="error" [text]="error()!" styleClass="w-full mb-4" />
        <div class="flex justify-end">
          <p-button [label]="'ai.retry' | translate" icon="pi pi-refresh" (onClick)="scan()" />
        </div>
      } @else if (result()) {
        <div class="space-y-4">
          <!-- Match percentage -->
          <div class="text-center">
            <div class="text-4xl font-bold" [class]="percentColor()">
              {{ result()!.matchPercentage }}%
            </div>
            <p class="text-sm text-secondary mt-1">{{ 'ai.matchLabel' | translate }}</p>
          </div>

          <!-- Summary -->
          <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p class="text-sm">{{ result()!.summary }}</p>
          </div>

          <!-- Strengths -->
          @if (result()!.strengths.length) {
            <div>
              <h4 class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                <i class="pi pi-check-circle"></i> {{ 'ai.strengths' | translate }}
              </h4>
              <ul class="list-disc ltr:ml-5 rtl:mr-5 space-y-1 text-sm">
                @for (s of result()!.strengths; track s) {
                  <li>{{ s }}</li>
                }
              </ul>
            </div>
          }

          <!-- Improvements -->
          @if (result()!.improvements.length) {
            <div>
              <h4 class="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                <i class="pi pi-exclamation-circle"></i> {{ 'ai.improvements' | translate }}
              </h4>
              <ul class="list-disc ltr:ml-5 rtl:mr-5 space-y-1 text-sm">
                @for (imp of result()!.improvements; track imp) {
                  <li>{{ imp }}</li>
                }
              </ul>
            </div>
          }

          <!-- Missing requirements -->
          @if (result()!.missingRequirements.length) {
            <div>
              <h4 class="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                <i class="pi pi-times-circle"></i> {{ 'ai.missing' | translate }}
              </h4>
              <ul class="list-disc ltr:ml-5 rtl:mr-5 space-y-1 text-sm">
                @for (m of result()!.missingRequirements; track m) {
                  <li>{{ m }}</li>
                }
              </ul>
            </div>
          }
        </div>
      }
    </p-dialog>
  `,
})
export class AiScanDialogComponent {
  visible = input.required<boolean>();
  projectId = input.required<string>();
  closed = output<void>();

  private aiService = inject(AiService);

  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<AiScanResult | null>(null);

  percentColor() {
    const p = this.result()?.matchPercentage ?? 0;
    if (p >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (p >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }

  scan() {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    this.aiService.scanProject(this.projectId()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.result.set(res.data);
        } else {
          this.error.set(res.message ?? 'Scan failed');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'AI scan failed. Please try again.');
      },
    });
  }

  // Auto-start scan when dialog opens
  ngOnChanges() {
    if (this.visible() && !this.result() && !this.loading()) {
      this.scan();
    }
  }
}
