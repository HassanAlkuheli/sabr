import { Injectable, signal, effect } from '@angular/core';

const THEME_KEY = 'sabr_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _dark = signal(this.storedDark());
  readonly isDark = this._dark.asReadonly();

  constructor() {
    // Sync the class on <html> whenever the signal changes
    effect(() => {
      const html = document.documentElement;
      if (this._dark()) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    });
  }

  toggle() {
    const next = !this._dark();
    this._dark.set(next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  }

  private storedDark(): boolean {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored === 'dark';
    // Respect system preference
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
