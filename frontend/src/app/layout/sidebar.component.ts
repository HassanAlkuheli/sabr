import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';
import { I18nService } from '../core/services/i18n.service';
import { TranslatePipe } from '../shared/pipes/translate.pipe';

interface NavItem {
  labelKey: string;
  icon: string;
  route: string;
  roles: string[];
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, DialogModule, ButtonModule, InputTextModule, MessageModule, TranslatePipe],
  template: `
    <aside
      class="fixed inset-inline-start-0 top-0 bottom-0 bg-sidebar text-white flex flex-col z-50 transition-all duration-300"
      [class.w-60]="!collapsed()"
      [class.w-0]="collapsed()"
      [class.overflow-hidden]="collapsed()"
    >
      <!-- Brand -->
      <div class="h-16 flex items-center px-4 border-b border-white/10 gap-3">
        <img src="/light_logo_noBG.png" alt="Sabr" class="w-10 h-10 rounded-lg" />
        <span class="text-2xl tracking-tight whitespace-nowrap" style="font-family: 'Inter', sans-serif; font-weight: 800; letter-spacing: -0.02em">
          {{ 'app.brandName' | translate }}
        </span>
        <!-- Close button -->
        <button
          (click)="collapsed.set(true)"
          class="ms-auto text-slate-400 hover:text-white transition-colors"
        >
          <i class="pi pi-times text-sm"></i>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
        @for (item of visibleItems(); track item.route) {
          @if (item.children) {
            <!-- Expandable group – header is a navigable link (same style as simple links) -->
            <div class="flex items-center rounded-lg transition-colors"
              routerLinkActive="bg-sidebar-active"
              [routerLinkActiveOptions]="{ exact: false }">
              <a
                [routerLink]="item.route"
                routerLinkActive="text-accent"
                [routerLinkActiveOptions]="{ exact: false }"
                class="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm font-medium
                       text-slate-300 hover:text-white transition-colors"
              >
                <i [class]="item.icon + ' text-base'"></i>
                {{ item.labelKey | translate }}
              </a>
              <button
                (click)="toggleExpand(item.route); $event.stopPropagation()"
                class="px-2.5 py-2.5 text-slate-400 hover:text-white transition-colors rounded-r-lg"
              >
                <i class="pi text-xs"
                   [class.pi-chevron-down]="expanded()[item.route]"
                   [class.pi-chevron-right]="!expanded()[item.route]"
                ></i>
              </button>
            </div>
            @if (expanded()[item.route]) {
              <div class="ms-4 space-y-0.5">
                @for (child of item.children; track child.route) {
                  <a
                    [routerLink]="child.route"
                    routerLinkActive="bg-sidebar-active text-accent"
                    [routerLinkActiveOptions]="{ exact: true }"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium
                           text-slate-400 hover:bg-sidebar-hover hover:text-white transition-colors"
                  >
                    <i [class]="child.icon + ' text-sm'"></i>
                    {{ child.labelKey | translate }}
                  </a>
                }
              </div>
            }
          } @else {
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-sidebar-active text-accent"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                     text-slate-300 hover:bg-sidebar-hover hover:text-white transition-colors"
            >
              <i [class]="item.icon + ' text-base'"></i>
              {{ item.labelKey | translate }}
            </a>
          }
        }
      </nav>

      <!-- Controls + User info + logout -->
      <div class="border-t border-white/10 p-4 space-y-2">
        @if (auth.user(); as user) {
          <!-- Profile button -->
          <button
            (click)="openProfileDialog()"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-hover transition-colors cursor-pointer"
          >
            <div
              class="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center
                     justify-center text-sm font-bold"
            >
              {{ user.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ user.name }}</p>
              <p class="text-xs text-slate-400 truncate">{{ user.role }}</p>
            </div>
          </button>
        }

        <!-- Dark mode toggle -->
        <button
          (click)="theme.toggle()"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300
                 hover:bg-sidebar-hover hover:text-white transition-colors"
        >
          <i [class]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'"></i>
          {{ (theme.isDark() ? 'sidebar.lightMode' : 'sidebar.darkMode') | translate }}
        </button>

        <!-- Language toggle -->
        <button
          (click)="i18n.toggle()"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300
                 hover:bg-sidebar-hover hover:text-white transition-colors"
        >
          <i class="pi pi-language"></i>
          {{ i18n.lang() === 'en' ? ('lang.arabic' | translate) : ('lang.english' | translate) }}
        </button>

        <button
          (click)="auth.logout()"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300
                 hover:bg-sidebar-hover hover:text-white transition-colors"
        >
          <i class="pi pi-sign-out"></i>
          {{ 'auth.signOut' | translate }}
        </button>
      </div>
    </aside>

    <!-- Profile Dialog -->
    <p-dialog
      [header]="'profile.editProfile' | translate"
      [(visible)]="showProfileDialog"
      [modal]="true"
      [style]="{ width: '420px' }"
    >
      <div class="space-y-4">
        <div>
          <label class="text-xs font-medium text-secondary mb-1 block">{{ 'profile.name' | translate }}</label>
          <input pInputText [(ngModel)]="profileName" class="w-full" />
        </div>
        <div>
          <label class="text-xs font-medium text-secondary mb-1 block">{{ 'profile.newPassword' | translate }}</label>
          <input pInputText type="password" [(ngModel)]="profilePassword" [placeholder]="'profile.leaveBlank' | translate" class="w-full" />
        </div>
        <div>
          <label class="text-xs font-medium text-secondary mb-1 block">{{ 'profile.confirmPassword' | translate }}</label>
          <input pInputText type="password" [(ngModel)]="profilePasswordConfirm" [placeholder]="'profile.confirmPlaceholder' | translate" class="w-full" />
        </div>

        @if (profileError()) {
          <p-message severity="error" [text]="profileError()!" styleClass="w-full" />
        }
        @if (profileSuccess()) {
          <p-message severity="success" [text]="'profile.updated' | translate" styleClass="w-full" />
        }

        <div class="flex justify-end gap-2 pt-2">
          <p-button [label]="'common.cancel' | translate" [outlined]="true" (onClick)="showProfileDialog = false" />
          <p-button [label]="'common.save' | translate" icon="pi pi-check" (onClick)="saveProfile()" [loading]="savingProfile()" />
        </div>
      </div>
    </p-dialog>
  `,
})
export class SidebarComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  i18n = inject(I18nService);
  private router = inject(Router);

  collapsed = signal(false);
  expanded = signal<Record<string, boolean>>({ '/admin': true, '/professor': true, '/student': true });

  // ─── Profile dialog ───────────────────────
  showProfileDialog = false;
  profileName = '';
  profilePassword = '';
  profilePasswordConfirm = '';
  profileError = signal<string | null>(null);
  profileSuccess = signal(false);
  savingProfile = signal(false);

  openProfileDialog() {
    const user = this.auth.user();
    this.profileName = user?.name ?? '';
    this.profilePassword = '';
    this.profilePasswordConfirm = '';
    this.profileError.set(null);
    this.profileSuccess.set(false);
    this.showProfileDialog = true;
  }

  saveProfile() {
    this.profileError.set(null);
    this.profileSuccess.set(false);

    if (this.profilePassword && this.profilePassword !== this.profilePasswordConfirm) {
      this.profileError.set('Passwords do not match');
      return;
    }
    if (this.profilePassword && this.profilePassword.length < 6) {
      this.profileError.set('Password must be at least 6 characters');
      return;
    }

    const body: { name?: string; password?: string } = {};
    const user = this.auth.user();
    if (this.profileName.trim() && this.profileName.trim() !== user?.name) {
      body.name = this.profileName.trim();
    }
    if (this.profilePassword) {
      body.password = this.profilePassword;
    }

    if (!body.name && !body.password) {
      this.showProfileDialog = false;
      return;
    }

    this.savingProfile.set(true);
    this.auth.updateProfile(body).subscribe({
      next: () => {
        this.profileSuccess.set(true);
        this.savingProfile.set(false);
        setTimeout(() => { this.showProfileDialog = false; }, 1000);
      },
      error: (err) => {
        this.profileError.set(err?.error?.message ?? 'Failed to update profile');
        this.savingProfile.set(false);
      },
    });
  }

  private navItems: NavItem[] = [
    { labelKey: 'sidebar.classDashboard', icon: 'pi pi-users', route: '/student-class', roles: ['STUDENT'] },
    {
      labelKey: 'sidebar.studentDashboard',
      icon: 'pi pi-user',
      route: '/student',
      roles: ['STUDENT'],
      children: [
        { labelKey: 'common.projects', icon: 'pi pi-folder', route: '/student/projects', roles: ['STUDENT'] },
        { labelKey: 'admin.runningProjects', icon: 'pi pi-play-circle', route: '/student/running', roles: ['STUDENT'] },
        { labelKey: 'professor.labs', icon: 'pi pi-book', route: '/student/labs', roles: ['STUDENT'] },
      ],
    },
    { labelKey: 'sidebar.classDashboard', icon: 'pi pi-users', route: '/class-dashboard', roles: ['PROFESSOR'] },
    {
      labelKey: 'sidebar.professorPanel',
      icon: 'pi pi-briefcase',
      route: '/professor',
      roles: ['PROFESSOR'],
      children: [
        { labelKey: 'admin.projects', icon: 'pi pi-folder', route: '/professor/projects', roles: ['PROFESSOR'] },
        { labelKey: 'admin.students', icon: 'pi pi-user', route: '/professor/students', roles: ['PROFESSOR'] },
        { labelKey: 'admin.runningProjects', icon: 'pi pi-play-circle', route: '/professor/running', roles: ['PROFESSOR'] },
        { labelKey: 'professor.labs', icon: 'pi pi-book', route: '/professor/labs', roles: ['PROFESSOR'] },
      ],
    },
    {
      labelKey: 'sidebar.adminPanel',
      icon: 'pi pi-cog',
      route: '/admin',
      roles: ['ADMIN'],
      children: [
        { labelKey: 'admin.projects', icon: 'pi pi-folder', route: '/admin/projects', roles: ['ADMIN'] },
        { labelKey: 'admin.students', icon: 'pi pi-user', route: '/admin/students', roles: ['ADMIN'] },
        { labelKey: 'admin.professors', icon: 'pi pi-users', route: '/admin/professors', roles: ['ADMIN'] },
        { labelKey: 'admin.runningProjects', icon: 'pi pi-play-circle', route: '/admin/running', roles: ['ADMIN'] },
        { labelKey: 'professor.labs', icon: 'pi pi-book', route: '/admin/labs', roles: ['ADMIN'] },
      ],
    },
  ];

  visibleItems = computed(() => {
    const role = this.auth.role();
    if (!role) return [];
    return this.navItems.filter((item) => item.roles.includes(role));
  });

  toggleExpand(route: string) {
    this.expanded.update((e) => ({ ...e, [route]: !e[route] }));
  }

  isGroupActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }
}
