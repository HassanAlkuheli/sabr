import { Injectable, signal, effect } from '@angular/core';
import { EN, AR, Translations } from '../i18n/translations';

export type Lang = 'en' | 'ar';

const STORAGE_KEY = 'sabr_lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _lang = signal<Lang>(this.getInitialLang());

  readonly lang = this._lang.asReadonly();

  private translations: Record<Lang, Translations> = { en: EN, ar: AR };

  constructor() {
    effect(() => {
      const lang = this._lang();
      localStorage.setItem(STORAGE_KEY, lang);

      const html = document.documentElement;
      html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      html.setAttribute('lang', lang);
    });
  }

  /** Translate a key using the current language */
  t(key: string): string {
    return this.translations[this._lang()][key] ?? key;
  }

  /** Translate with Arabic-aware pluralisation (1 = one, 2 = two, 3+ = many) */
  tp(key: string, count: number): string {
    const lang = this._lang();
    let suffix: string;
    if (lang === 'ar') {
      if (count === 1) suffix = 'one';
      else if (count === 2) suffix = 'two';
      else suffix = 'many';
    } else {
      suffix = count === 1 ? 'one' : 'many';
    }
    return this.translations[lang][`${key}.${suffix}`] ?? this.translations[lang][key] ?? key;
  }

  /** Toggle between en and ar */
  toggle(): void {
    this._lang.update((l) => (l === 'en' ? 'ar' : 'en'));
  }

  /** Set language explicitly */
  setLang(lang: Lang): void {
    this._lang.set(lang);
  }

  private getInitialLang(): Lang {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === 'en' || stored === 'ar') return stored;
    // Detect from browser
    const browserLang = navigator.language?.split('-')[0];
    return browserLang === 'ar' ? 'ar' : 'en';
  }
}
