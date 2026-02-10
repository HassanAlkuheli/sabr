import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { FileExplorerComponent } from '../../shared/components/file-explorer.component';
import { ProfessorStateService } from './professor-state.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-professor-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FileExplorerComponent, TranslatePipe],
  template: `
    <app-header [title]="'professor.title' | translate" />
    <router-outlet />

    @if (state.explorerProject()) {
      <app-file-explorer
        [projectId]="state.explorerProject()!.id"
        [projectName]="state.explorerProject()!.name"
        (closed)="state.closeExplorer()"
      />
    }
  `,
})
export class ProfessorLayoutComponent implements OnInit {
  state = inject(ProfessorStateService);

  ngOnInit() {
    this.state.initialize();
  }
}
