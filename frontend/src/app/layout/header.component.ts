import { Component, input } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  template: `
    <header
      class="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-6"
    >
      <h1 class="text-base font-semibold text-primary">{{ title() }}</h1>
    </header>
  `,
})
export class HeaderComponent {
  title = input('Dashboard');
}
