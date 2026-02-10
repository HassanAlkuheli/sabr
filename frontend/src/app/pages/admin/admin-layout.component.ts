import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { FileExplorerComponent } from '../../shared/components/file-explorer.component';
import { AdminStateService } from './admin-state.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FileExplorerComponent, TranslatePipe],
  template: `
    <app-header [title]="'admin.title' | translate" />
    <router-outlet />

    <!-- Shared File Explorer Dialog -->
    @if (state.explorerProject()) {
      <app-file-explorer
        [projectId]="state.explorerProject()!.id"
        [projectName]="state.explorerProject()!.name"
        (closed)="state.closeExplorer()"
      />
    }
  `,
})
export class AdminLayoutComponent implements OnInit {
  state = inject(AdminStateService);

  ngOnInit() {
    this.state.initialize();
  }
}
