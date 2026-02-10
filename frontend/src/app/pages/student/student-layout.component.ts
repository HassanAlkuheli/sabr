import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../layout/header.component';
import { FileExplorerComponent } from '../../shared/components/file-explorer.component';
import { StudentStateService } from './student-state.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FileExplorerComponent, TranslatePipe],
  template: `
    <app-header [title]="'student.title' | translate" />
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
export class StudentLayoutComponent implements OnInit {
  state = inject(StudentStateService);

  ngOnInit() {
    this.state.initialize();
  }
}
