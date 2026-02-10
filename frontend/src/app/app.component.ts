import { Component, inject, ViewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar.component';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { I18nService } from './core/services/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    @if (auth.isLoggedIn() && !isLoginPage()) {
      <app-sidebar #sidebar />
      <!-- Hamburger to re-open collapsed sidebar -->
      @if (sidebar.collapsed()) {
        <button
          (click)="sidebar.collapsed.set(false)"
          class="fixed top-4 start-4 z-50 w-10 h-10 rounded-lg bg-sidebar text-white
                 flex items-center justify-center shadow-lg hover:bg-sidebar-hover
                 transition-all duration-300 cursor-pointer"
        >
          <i class="pi pi-bars"></i>
        </button>
      }
      <main
        class="min-h-screen bg-surface transition-all duration-300 relative overflow-x-clip"
        [class.ms-60]="!sidebar.collapsed()"
        [class.ms-0]="sidebar.collapsed()"
      >
        <div class="glow-orb"></div>
        <div class="glow-orb-amber"></div>
        <router-outlet />
      </main>
    } @else {
      <router-outlet />
    }
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  private theme = inject(ThemeService); // initialize early
  private i18n = inject(I18nService); // initialize early for dir/lang

  isLoginPage(): boolean {
    return this.router.url === '/login' || this.router.url === '/';
  }
}
