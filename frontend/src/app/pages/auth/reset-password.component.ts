import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, PasswordModule, ButtonModule, MessageModule, RouterLink, TranslatePipe],
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

          @if (success()) {
            <p-message severity="success" [text]="'auth.passwordReset' | translate" styleClass="w-full mb-4" />
            <div class="text-center">
              <a routerLink="/login" class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                <i class="pi pi-sign-in mr-1"></i>{{ 'auth.signIn' | translate }}
              </a>
            </div>
          } @else {
            @if (!token) {
              <p-message severity="error" text="Invalid reset link. Please request a new one." styleClass="w-full mb-4" />
              <div class="text-center">
                <a routerLink="/forgot-password" class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  {{ 'auth.forgotPassword' | translate }}
                </a>
              </div>
            } @else {
              @if (error()) {
                <p-message severity="error" [text]="error()!" styleClass="w-full mb-4" />
              }

              <form (ngSubmit)="submit()" class="space-y-4">
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-primary">{{ 'auth.newPassword' | translate }}</label>
                  <p-password
                    [(ngModel)]="password"
                    name="password"
                    [placeholder]="'auth.minPassword' | translate"
                    [toggleMask]="true"
                    [feedback]="false"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                  />
                </div>

                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-primary">{{ 'auth.confirmNewPassword' | translate }}</label>
                  <p-password
                    [(ngModel)]="confirmPassword"
                    name="confirmPassword"
                    placeholder="••••••••"
                    [toggleMask]="true"
                    [feedback]="false"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                  />
                </div>

                @if (password && confirmPassword && password !== confirmPassword) {
                  <p-message severity="warn" text="Passwords do not match" styleClass="w-full" />
                }

                <p-button
                  type="submit"
                  icon="pi pi-key"
                  [label]="'auth.resetPassword' | translate"
                  styleClass="w-full"
                  [loading]="loading()"
                  [disabled]="!password || password.length < 6 || password !== confirmPassword"
                />
              </form>
            }
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
export class ResetPasswordComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  i18n = inject(I18nService);
  theme = inject(ThemeService);

  token = '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  submit() {
    if (this.password !== this.confirmPassword) return;
    
    this.loading.set(true);
    this.error.set(null);

    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Failed to reset password');
      },
    });
  }
}
