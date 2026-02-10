import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false, // impure so it re-runs when language signal changes
})
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string, count?: number): string {
    if (count !== undefined && count !== null) {
      return this.i18n.tp(key, count);
    }
    return this.i18n.t(key);
  }
}
