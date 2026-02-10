import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TabsModule } from 'primeng/tabs';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, TabsModule, InputTextModule, PasswordModule, ButtonModule, MessageModule, TranslatePipe],
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.8); }
      to   { opacity: 1; transform: scale(1); }
    }
    :host ::ng-deep .animate-fade-in-up {
      animation: fadeInUp 0.6s ease-out both;
    }
    :host ::ng-deep .animate-fade-in {
      animation: fadeIn 0.6s ease-out both;
    }
    :host ::ng-deep .animate-scale-in {
      animation: scaleIn 0.5s ease-out both;
    }
  `],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center p-4 relative">
      <div class="glow-orb"></div>
      <div class="glow-orb-amber"></div>
      <div class="w-full max-w-md animate-fade-in-up">
        <!-- Brand header -->
        <div class="text-center mb-8">
          <img [src]="theme.isDark() ? '/light_logo_noBG.png' : '/dark_logo_noBG.png'" alt="Sabr"
               class="w-24 h-24 mx-auto mb-4 animate-scale-in" />
          <h1 class="text-4xl text-primary animate-fade-in" style="font-family: 'Inter', sans-serif; font-weight: 800; letter-spacing: -0.02em">
            {{ 'app.brandName' | translate }}
          </h1>
          <p class="mt-2 text-secondary text-sm animate-fade-in" style="animation-delay: 0.2s">{{ 'auth.brandSubtitle' | translate }}</p>
        </div>

        <!-- Lang toggle -->
        <div class="flex justify-center mb-4 animate-fade-in" style="animation-delay: 0.3s">
          <button
            (click)="i18n.toggle()"
            class="text-sm text-secondary hover:text-primary transition-colors flex items-center gap-1"
          >
            <i class="pi pi-language"></i>
            {{ i18n.lang() === 'en' ? ('lang.arabic' | translate) : ('lang.english' | translate) }}
          </button>
        </div>

        <!-- Card -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 animate-fade-in-up" style="animation-delay: 0.15s">
          <p-tabs [(value)]="activeTab">
            <p-tablist>
              <p-tab value="0">{{ 'auth.signIn' | translate }}</p-tab>
              <p-tab value="1">{{ 'auth.student' | translate }}</p-tab>
              <p-tab value="2">{{ 'auth.professor' | translate }}</p-tab>
            </p-tablist>
            
            <p-tabpanels>
              <!-- LOGIN TAB -->
              <p-tabpanel value="0">
              <form (ngSubmit)="login()" class="p-6 space-y-5">
                @if (error()) {
                  <p-message severity="error" [text]="error()!" styleClass="w-full" />
                }

                <div class="flex flex-col gap-2">
                  <label for="loginEmail" class="text-sm font-medium text-primary">{{ 'common.email' | translate }}</label>
                  <input
                    pInputText
                    id="loginEmail"
                    type="email"
                    [(ngModel)]="loginEmail"
                    name="loginEmail"
                    [placeholder]="'auth.emailPlaceholder' | translate"
                    class="w-full"
                    required
                  />
                </div>

                <div class="flex flex-col gap-2">
                  <label for="loginPassword" class="text-sm font-medium text-primary">{{ 'common.password' | translate }}</label>
                  <p-password
                    id="loginPassword"
                    [(ngModel)]="loginPassword"
                    name="loginPassword"
                    placeholder="••••••••"
                    [toggleMask]="true"
                    [feedback]="false"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                  />
                </div>

                <div class="pt-2">
                  <p-button
                    type="submit"
                    icon="pi pi-sign-in"
                    [label]="'auth.signIn' | translate"
                    styleClass="w-full"
                    [loading]="loading()"
                  />
                </div>
              </form>
            </p-tabpanel>

            <!-- REGISTER STUDENT TAB -->
            <p-tabpanel value="1">
              <form (ngSubmit)="registerStudent()" class="p-6 space-y-5">
                @if (regError()) {
                  <p-message severity="error" [text]="regError()!" styleClass="w-full" />
                }
                @if (regSuccess()) {
                  <p-message severity="success" [text]="'auth.accountCreated' | translate" styleClass="w-full" />
                }

                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-primary">{{ 'auth.fullName' | translate }}</label>
                  <input pInputText [(ngModel)]="regName" name="regName" [placeholder]="'auth.namePlaceholder' | translate" class="w-full" required />
                </div>

                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-primary">{{ 'common.email' | translate }}</label>
                  <input pInputText type="email" [(ngModel)]="regEmail" name="regEmail" [placeholder]="'auth.emailPlaceholder' | translate" class="w-full" required />
                </div>

                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-primary">{{ 'common.section' | translate }}</label>
                  <input pInputText [(ngModel)]="regSection" name="regSection" [placeholder]="'auth.sectionPlaceholder' | translate" class="w-full" required />
                </div>

                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-primary">{{ 'common.password' | translate }}</label>
                  <p-password
                    [(ngModel)]="regPassword"
                    name="regPassword"
                    [placeholder]="'auth.minPassword' | translate"
                    [toggleMask]="true"
                    [feedback]="false"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                  />
                </div>

                <div class="pt-2">
                  <p-button
                    type="submit"
                    icon="pi pi-user-plus"
                    [label]="'auth.createStudentAccount' | translate"
                    styleClass="w-full"
                    [loading]="regLoading()"
                  />
                </div>
              </form>
            </p-tabpanel>

            <!-- REGISTER PROFESSOR TAB -->
            <p-tabpanel value="2">
              <form (ngSubmit)="registerProfessor()" class="p-6 space-y-5">
                @if (profError()) {
                  <p-message severity="error" [text]="profError()!" styleClass="w-full" />
                }
                @if (profSuccess()) {
                  <p-message severity="success" [text]="'auth.accountCreated' | translate" styleClass="w-full" />
                }

                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-primary">{{ 'auth.fullName' | translate }}</label>
                  <input pInputText [(ngModel)]="profName" name="profName" [placeholder]="'auth.profNamePlaceholder' | translate" class="w-full" required />
                </div>

                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-primary">{{ 'common.email' | translate }}</label>
                  <input pInputText type="email" [(ngModel)]="profEmail" name="profEmail" [placeholder]="'auth.profEmailPlaceholder' | translate" class="w-full" required />
                </div>

                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-primary">{{ 'common.password' | translate }}</label>
                  <p-password
                    [(ngModel)]="profPassword"
                    name="profPassword"
                    [placeholder]="'auth.minPassword' | translate"
                    [toggleMask]="true"
                    [feedback]="false"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                  />
                </div>

                <div class="pt-2">
                  <p-button
                    type="submit"
                    icon="pi pi-user-plus"
                    [label]="'auth.createProfessorAccount' | translate"
                    styleClass="w-full"
                    [loading]="profLoading()"
                  />
                </div>
              </form>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  i18n = inject(I18nService);
  theme = inject(ThemeService);

  activeTab = '0';

  /* ─── Login state ─── */
  loginEmail = '';
  loginPassword = '';
  loading = signal(false);
  error = signal<string | null>(null);

  /* ─── Student registration ─── */
  regName = '';
  regEmail = '';
  regSection = '';
  regPassword = '';
  regLoading = signal(false);
  regError = signal<string | null>(null);
  regSuccess = signal(false);

  /* ─── Professor registration ─── */
  profName = '';
  profEmail = '';
  profPassword = '';
  profLoading = signal(false);
  profError = signal<string | null>(null);
  profSuccess = signal(false);

  login() {
    this.loading.set(true);
    this.error.set(null);

    this.auth.login({ email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        const role = this.auth.role();
        if (role === 'STUDENT') this.router.navigate(['/student']);
        else if (role === 'PROFESSOR') this.router.navigate(['/professor']);
        else if (role === 'ADMIN') this.router.navigate(['/admin']);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Login failed');
      },
    });
  }

  registerStudent() {
    this.regLoading.set(true);
    this.regError.set(null);
    this.regSuccess.set(false);

    this.auth
      .registerStudent({
        name: this.regName,
        email: this.regEmail,
        password: this.regPassword,
        sectionNumber: this.regSection,
      })
      .subscribe({
        next: () => {
          this.regLoading.set(false);
          this.regSuccess.set(true);
          this.activeTab = '0';
        },
        error: (err: any) => {
          this.regLoading.set(false);
          this.regError.set(err.error?.message ?? 'Registration failed');
        },
      });
  }

  registerProfessor() {
    this.profLoading.set(true);
    this.profError.set(null);
    this.profSuccess.set(false);

    this.auth
      .registerProfessor({
        name: this.profName,
        email: this.profEmail,
        password: this.profPassword,
      })
      .subscribe({
        next: () => {
          this.profLoading.set(false);
          this.profSuccess.set(true);
          this.activeTab = '0';
        },
        error: (err: any) => {
          this.profLoading.set(false);
          this.profError.set(err.error?.message ?? 'Registration failed');
        },
      });
  }
}
