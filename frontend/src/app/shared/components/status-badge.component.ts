import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span [class]="badgeClass()">
      {{ status() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  status = input.required<string>();

  badgeClass() {
    const base = 'inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ml-1';
    switch (this.status()) {
      case 'RUNNING':
        return `${base} bg-emerald-100 text-emerald-700`;
      case 'STARTING':
        return `${base} bg-amber-100 text-amber-700`;
      case 'STOPPED':
        return `${base} bg-slate-100 text-slate-600`;
      case 'ERROR':
        return `${base} bg-red-100 text-red-700`;
      case 'ACTIVE':
        return `${base} bg-emerald-100 text-emerald-700`;
      case 'SUSPENDED':
        return `${base} bg-red-100 text-red-700`;
      default:
        return `${base} bg-slate-100 text-slate-600`;
    }
  }
}
