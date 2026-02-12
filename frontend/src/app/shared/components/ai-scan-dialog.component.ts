import { Component, input, output, signal, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { AiService, AiScanResult, DeepScanResult } from '../../core/services/ai.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-ai-scan-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, ProgressBarModule, MessageModule, TabsModule, TagModule, TranslatePipe, DatePipe],
  template: `
    <p-dialog
      [header]="'ai.scanTitle' | translate"
      [visible]="visible()"
      (visibleChange)="closed.emit()"
      [modal]="true"
      [style]="{ width: '680px', maxHeight: '85vh' }"
      [contentStyle]="{ overflow: 'auto' }"
    >
      <!-- Predicted Grade Banner -->
      @if (predictedGrade() !== null) {
        <div class="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-4">
          <div class="flex items-center gap-2">
            <i class="pi pi-star-fill text-blue-500"></i>
            <span class="text-sm font-semibold">{{ 'ai.predictedGrade' | translate }}</span>
          </div>
          <span class="text-lg font-bold text-blue-600 dark:text-blue-400">{{ predictedGrade() }}</span>
        </div>
      }

      <p-tabs [value]="activeTab()" (valueChange)="activeTab.set(+($event ?? 0))">
        <p-tablist>
          <p-tab [value]="0">{{ 'ai.codeScan' | translate }}</p-tab>
          <p-tab [value]="1">{{ 'ai.deepScan' | translate }}</p-tab>
        </p-tablist>
        <p-tabpanels>
        <!-- ═══ TAB: Code Scan ═══ -->
        <p-tabpanel [value]="0">
          @if (loadingCode()) {
            <div class="flex flex-col items-center gap-4 py-8">
              <i class="pi pi-spin pi-cog text-4xl text-primary"></i>
              <p class="text-sm text-secondary">{{ 'ai.scanning' | translate }}</p>
              <p-progressBar mode="indeterminate" styleClass="w-full" />
            </div>
          } @else if (errorCode()) {
            <p-message severity="error" [text]="errorCode()!" styleClass="w-full mb-4" />
            <div class="flex justify-end">
              <p-button [label]="'ai.retry' | translate" icon="pi pi-refresh" (onClick)="runCodeScan()" />
            </div>
          } @else if (codeScanResult()) {
            <div class="space-y-4">
              <!-- Scanned at timestamp + Scan Again button -->
              <div class="flex items-center justify-between">
                @if (codeScanAt()) {
                  <span class="text-xs text-secondary">
                    {{ 'ai.scannedAt' | translate }}: {{ codeScanAt() | date:'short' }}
                  </span>
                }
                <p-button [label]="'ai.scanAgain' | translate" icon="pi pi-refresh" severity="secondary" [text]="true" size="small" (onClick)="runCodeScan()" />
              </div>

              <!-- Match percentage -->
              <div class="text-center">
                <div class="text-4xl font-bold" [class]="percentColor(codeScanResult()!.matchPercentage)">
                  {{ codeScanResult()!.matchPercentage }}%
                </div>
                <p class="text-sm text-secondary mt-1">{{ 'ai.matchLabel' | translate }}</p>
              </div>

              <!-- Summary -->
              <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                <p class="text-sm">{{ codeScanResult()!.summary }}</p>
              </div>

              <!-- Strengths -->
              @if (codeScanResult()!.strengths.length) {
                <div>
                  <h4 class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                    <i class="pi pi-check-circle"></i> {{ 'ai.strengths' | translate }}
                  </h4>
                  <ul class="list-disc ltr:ml-5 rtl:mr-5 space-y-1 text-sm">
                    @for (s of codeScanResult()!.strengths; track s) {
                      <li>{{ s }}</li>
                    }
                  </ul>
                </div>
              }

              <!-- Improvements -->
              @if (codeScanResult()!.improvements.length) {
                <div>
                  <h4 class="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                    <i class="pi pi-exclamation-circle"></i> {{ 'ai.improvements' | translate }}
                  </h4>
                  <ul class="list-disc ltr:ml-5 rtl:mr-5 space-y-1 text-sm">
                    @for (imp of codeScanResult()!.improvements; track imp) {
                      <li>{{ imp }}</li>
                    }
                  </ul>
                </div>
              }

              <!-- Missing requirements -->
              @if (codeScanResult()!.missingRequirements.length) {
                <div>
                  <h4 class="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                    <i class="pi pi-times-circle"></i> {{ 'ai.missing' | translate }}
                  </h4>
                  <ul class="list-disc ltr:ml-5 rtl:mr-5 space-y-1 text-sm">
                    @for (m of codeScanResult()!.missingRequirements; track m) {
                      <li>{{ m }}</li>
                    }
                  </ul>
                </div>
              }
            </div>
          } @else {
            <!-- No scan yet -->
            <div class="flex flex-col items-center gap-4 py-8">
              <i class="pi pi-search text-4xl text-secondary"></i>
              <p class="text-sm text-secondary">{{ 'ai.noScanYet' | translate }}</p>
              <p-button [label]="'ai.runScan' | translate" icon="pi pi-play" (onClick)="runCodeScan()" />
            </div>
          }
        </p-tabpanel>

        <!-- ═══ TAB: Deep Scan ═══ -->
        <p-tabpanel [value]="1">
          @if (loadingDeep()) {
            <div class="flex flex-col items-center gap-4 py-8">
              <i class="pi pi-spin pi-globe text-4xl text-primary"></i>
              <p class="text-sm text-secondary">{{ 'ai.deepScanning' | translate }}</p>
              <p class="text-xs text-secondary text-center">{{ 'ai.deepScanWait' | translate }}</p>
              <p-progressBar mode="indeterminate" styleClass="w-full" />
            </div>
          } @else if (errorDeep()) {
            <p-message severity="error" [text]="errorDeep()!" styleClass="w-full mb-4" />
            <div class="flex justify-end">
              <p-button [label]="'ai.retry' | translate" icon="pi pi-refresh" (onClick)="runDeepScan()" />
            </div>
          } @else if (deepScanResult()) {
            <div class="space-y-4">
              <!-- Scanned at timestamp + Scan Again button -->
              <div class="flex items-center justify-between">
                @if (deepScanAt()) {
                  <span class="text-xs text-secondary">
                    {{ 'ai.scannedAt' | translate }}: {{ deepScanAt() | date:'short' }}
                  </span>
                }
                <p-button [label]="'ai.scanAgain' | translate" icon="pi pi-refresh" severity="secondary" [text]="true" size="small" (onClick)="runDeepScan()" />
              </div>

              <!-- Match percentage + page load badge -->
              <div class="text-center">
                <div class="text-4xl font-bold" [class]="percentColor(deepScanResult()!.matchPercentage)">
                  {{ deepScanResult()!.matchPercentage }}%
                </div>
                <p class="text-sm text-secondary mt-1">{{ 'ai.behaviorMatch' | translate }}</p>
                <div class="mt-2">
                  <p-tag
                    [value]="deepScanResult()!.pageLoads ? ('ai.pageLoadsOk' | translate) : ('ai.pageLoadsFail' | translate)"
                    [severity]="deepScanResult()!.pageLoads ? 'success' : 'danger'"
                    icon="{{ deepScanResult()!.pageLoads ? 'pi pi-check' : 'pi pi-times' }}"
                  />
                </div>
              </div>

              <!-- Summary -->
              <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                <p class="text-sm">{{ deepScanResult()!.summary }}</p>
              </div>

              <!-- Interactive tests -->
              @if (deepScanResult()!.interactiveTests.length) {
                <div>
                  <h4 class="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                    <i class="pi pi-check-square"></i> {{ 'ai.interactiveTests' | translate }}
                  </h4>
                  <div class="space-y-2">
                    @for (test of deepScanResult()!.interactiveTests; track test.description) {
                      <div class="flex items-start gap-2 text-sm">
                        <i [class]="test.passed ? 'pi pi-check text-emerald-500' : 'pi pi-times text-red-500'" class="mt-0.5"></i>
                        <div>
                          <span class="font-medium">{{ test.description }}</span>
                          @if (test.details) {
                            <p class="text-xs text-secondary mt-0.5">{{ test.details }}</p>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Console errors -->
              @if (deepScanResult()!.consoleErrors.length) {
                <div>
                  <h4 class="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                    <i class="pi pi-exclamation-triangle"></i> {{ 'ai.consoleErrors' | translate }}
                  </h4>
                  <ul class="list-disc ltr:ml-5 rtl:mr-5 space-y-1 text-xs font-mono">
                    @for (e of deepScanResult()!.consoleErrors; track e) {
                      <li>{{ e }}</li>
                    }
                  </ul>
                </div>
              }

              <!-- Missing behaviors -->
              @if (deepScanResult()!.missingBehaviors.length) {
                <div>
                  <h4 class="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                    <i class="pi pi-info-circle"></i> {{ 'ai.missingBehaviors' | translate }}
                  </h4>
                  <ul class="list-disc ltr:ml-5 rtl:mr-5 space-y-1 text-sm">
                    @for (b of deepScanResult()!.missingBehaviors; track b) {
                      <li>{{ b }}</li>
                    }
                  </ul>
                </div>
              }

              <!-- Pages visited -->
              @if (deepScanResult()!.pagesVisited?.length) {
                <div>
                  <h4 class="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
                    <i class="pi pi-globe"></i> {{ 'ai.pagesVisited' | translate }}
                  </h4>
                  <ul class="list-disc ltr:ml-5 rtl:mr-5 space-y-1 text-xs font-mono">
                    @for (p of deepScanResult()!.pagesVisited!; track p) {
                      <li>{{ p }}</li>
                    }
                  </ul>
                </div>
              }

              <!-- Screenshots from MinIO -->
              @if (screenshotUrls().length) {
                <div>
                  <h4 class="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-1">
                    <i class="pi pi-image"></i> {{ 'ai.screenshots' | translate }}
                  </h4>
                  <div class="grid grid-cols-2 gap-2">
                    @for (url of screenshotUrls(); track $index) {
                      <img [src]="url"
                           class="rounded border border-slate-200 dark:border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                           (click)="openScreenshotUrl(url)"
                           alt="Screenshot {{ $index + 1 }}" />
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- No deep scan yet -->
            <div class="flex flex-col items-center gap-4 py-8">
              <i class="pi pi-globe text-4xl text-secondary"></i>
              <p class="text-sm text-secondary">{{ 'ai.noDeepScanYet' | translate }}</p>
              <p class="text-xs text-secondary text-center">{{ 'ai.deepScanHint' | translate }}</p>
              <p-button [label]="'ai.runDeepScan' | translate" icon="pi pi-play" severity="help" (onClick)="runDeepScan()" />
            </div>
          }
        </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </p-dialog>
  `,
})
export class AiScanDialogComponent {
  visible = input.required<boolean>();
  projectId = input.required<string>();
  closed = output<void>();

  private aiService = inject(AiService);
  private lastProjectId = '';

  activeTab = signal(0);

  // Code scan state
  loadingCode = signal(false);
  errorCode = signal<string | null>(null);
  codeScanResult = signal<AiScanResult | null>(null);
  codeScanAt = signal<string | null>(null);

  // Deep scan state
  loadingDeep = signal(false);
  errorDeep = signal<string | null>(null);
  deepScanResult = signal<DeepScanResult | null>(null);
  deepScanAt = signal<string | null>(null);

  // Predicted grade
  predictedGrade = signal<number | null>(null);

  // Screenshot URLs from MinIO
  screenshotUrls = signal<string[]>([]);

  // Loading cached results
  loadingCached = signal(false);

  percentColor(p: number) {
    if (p >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (p >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }

  /** Load cached results from DB */
  loadCached() {
    this.loadingCached.set(true);
    this.aiService.getCachedScan(this.projectId()).subscribe({
      next: (res) => {
        this.loadingCached.set(false);
        if (res.success && res.data) {
          if (res.data.result) {
            this.codeScanResult.set(res.data.result);
            this.codeScanAt.set(res.data.scannedAt);
          }
          if (res.data.deepResult) {
            this.deepScanResult.set(res.data.deepResult);
            this.deepScanAt.set(res.data.deepScannedAt);
            this.loadScreenshotUrls(res.data.deepResult);
          }
          this.predictedGrade.set(res.data.predictedGrade ?? null);
        }
      },
      error: () => {
        this.loadingCached.set(false);
      },
    });
  }

  /** Run code scan (LLM call) */
  runCodeScan() {
    this.loadingCode.set(true);
    this.errorCode.set(null);

    this.aiService.scanProject(this.projectId()).subscribe({
      next: (res) => {
        this.loadingCode.set(false);
        if (res.success) {
          this.codeScanResult.set(res.data);
          this.codeScanAt.set(new Date().toISOString());
          // Reload to get updated predicted grade
          this.aiService.getCachedScan(this.projectId()).subscribe({
            next: (r) => { if (r.success) this.predictedGrade.set(r.data.predictedGrade ?? null); },
          });
        } else {
          this.errorCode.set(res.message ?? 'Scan failed');
        }
      },
      error: (err) => {
        this.loadingCode.set(false);
        this.errorCode.set(err?.error?.message ?? 'AI scan failed. Please try again.');
      },
    });
  }

  /** Run deep scan (crawl + LLM call) */
  runDeepScan() {
    this.loadingDeep.set(true);
    this.errorDeep.set(null);

    this.aiService.deepScanProject(this.projectId()).subscribe({
      next: (res) => {
        this.loadingDeep.set(false);
        if (res.success) {
          this.deepScanResult.set(res.data);
          this.deepScanAt.set(new Date().toISOString());
          this.loadScreenshotUrls(res.data);
          // Reload cached to get updated predicted grade
          this.aiService.getCachedScan(this.projectId()).subscribe({
            next: (r) => { if (r.success) this.predictedGrade.set(r.data.predictedGrade ?? null); },
          });
        } else {
          this.errorDeep.set(res.message ?? 'Deep scan failed');
        }
      },
      error: (err) => {
        this.loadingDeep.set(false);
        this.errorDeep.set(err?.error?.message ?? 'Deep scan failed. Please try again.');
      },
    });
  }

  /** Build screenshot URLs (direct backend proxy, no API calls needed) */
  private loadScreenshotUrls(deep: DeepScanResult) {
    const paths = deep.screenshotPaths ?? [];
    if (!paths.length) { this.screenshotUrls.set([]); return; }
    const urls = paths.map((_, i) => this.aiService.getScreenshotUrl(this.projectId(), i));
    this.screenshotUrls.set(urls);
  }

  /** Open a screenshot URL in a new tab */
  openScreenshotUrl(url: string) {
    window.open(url, '_blank');
  }

  // When dialog opens, load cached results; reset if project changed
  ngOnChanges() {
    const currentId = this.projectId();
    if (this.visible()) {
      if (currentId !== this.lastProjectId) {
        this.lastProjectId = currentId;
        this.codeScanResult.set(null);
        this.codeScanAt.set(null);
        this.deepScanResult.set(null);
        this.deepScanAt.set(null);
        this.errorCode.set(null);
        this.errorDeep.set(null);
        this.predictedGrade.set(null);
        this.screenshotUrls.set([]);
        this.activeTab.set(0);
      }
      // Load cached results from DB
      if (!this.codeScanResult() && !this.loadingCode() && !this.loadingCached()) {
        this.loadCached();
      }
    }
  }
}
