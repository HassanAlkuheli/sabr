import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, InputTextModule, ButtonModule, MessageModule, RouterLink, TranslatePipe],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Brand -->
        <div class="text-center mb-8">
          <img [src]="theme.isDark() ? '/light_logo_noBG.png' : '/dark_logo_noBG.png'" alt="Sabr"
               class="w-20 h-20 mx-auto mb-3" />
          <h1 class="text-3xl font-extrabold text-primary">{{ 'app.brandName' | translate }}</h1>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 class="text-lg font-semibold text-primary mb-4">{{ 'auth.resetPassword' | translate }}</h2>

          @if (sent()) {
            <p-message severity="success" [text]="'auth.resetEmailSent' | translate" styleClass="w-full mb-4" />
          }

          @if (error()) {
            <p-message severity="error" [text]="error()!" styleClass="w-full mb-4" />
          }

          @if (!sent()) {
            <form (ngSubmit)="submit()" class="space-y-4">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-primary">{{ 'common.email' | translate }}</label>
                <input pInputText type="email" [(ngModel)]="email" name="email"
                       [placeholder]="'auth.emailPlaceholder' | translate" class="w-full" required />
              </div>
              <p-button
                type="submit"
                icon="pi pi-envelope"
                [label]="'auth.resetLink' | translate"
                styleClass="w-full"
                [loading]="loading()"
                [disabled]="!email"
              />
            </form>
          }

          <div class="mt-4 text-center">
            <a routerLink="/login" class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
              <i class="pi pi-arrow-left mr-1"></i>{{ 'auth.backToLogin' | translate }}
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  i18n = inject(I18nService);
  theme = inject(ThemeService);

  email = '';
  loading = signal(false);
  error = signal<string | null>(null);
  sent = signal(false);

  submit() {
    this.loading.set(true);
    this.error.set(null);

    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Failed to send reset email');
      },
    });
  }
}
