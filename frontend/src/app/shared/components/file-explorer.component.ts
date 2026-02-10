import { Component, inject, input, output, signal, OnInit, ChangeDetectorRef, effect } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { TreeModule } from 'primeng/tree';
import { ProgressBarModule } from 'primeng/progressbar';
import { EditorComponent as MonacoEditor } from 'ngx-monaco-editor-v2';
import { ViewerService } from '../../core/services/viewer.service';
import { FileNode } from '../../core/models/file-node.model';
import { ThemeService } from '../../core/services/theme.service';
import { I18nService } from '../../core/services/i18n.service';
import { TranslatePipe } from '../pipes/translate.pipe';

/** Convert our API FileNode[] to PrimeNG TreeNode[] */
function toTreeNodes(nodes: FileNode[]): any[] {
  return nodes.map((n) => ({
    key: n.path,
    label: n.name,
    icon: n.type === 'folder' ? 'pi pi-folder' : 'pi pi-file',
    leaf: n.type === 'file',
    children: n.children ? toTreeNodes(n.children) : undefined,
    data: n,
  }));
}

/** Guess Monaco language from file extension */
function guessLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    js: 'javascript',
    json: 'json',
    html: 'html',
    css: 'css',
    scss: 'scss',
    xml: 'xml',
    md: 'markdown',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bash: 'shell',
    dockerfile: 'dockerfile',
    txt: 'plaintext',
  };
  return map[ext] ?? 'plaintext';
}

@Component({
  selector: 'app-file-explorer',
  standalone: true,
  imports: [DialogModule, TreeModule, ProgressBarModule, MonacoEditor, TranslatePipe],
  styles: [`
    :host ::ng-deep .p-tree .p-tree-filter-input {
      margin-bottom: 0.75rem;
    }
  `],
  template: `
    <p-dialog
      [header]="('explorer.browse' | translate) + ': ' + projectName()"
      [visible]="true"
      [modal]="true"
      [closable]="true"
      [maximizable]="true"
      [style]="{ width: '90vw', height: '85vh' }"
      (onHide)="closed.emit()"
      (onShow)="onDialogShow()"
    >
      <div class="flex gap-4" style="height: calc(85vh - 80px)">
        <!-- Tree panel -->
        <div class="w-72 flex-shrink-0 border-r border-slate-200 overflow-y-auto pr-2">
          @if (loadingTree()) {
            <p-progressBar mode="indeterminate" [style]="{ height: '4px' }" />
          }
          <p-tree
            [value]="treeNodes()"
            selectionMode="single"
            [(selection)]="selectedNode"
            (onNodeSelect)="onNodeSelected($event)"
            [filter]="true"
            [filterPlaceholder]="'explorer.searchFiles' | translate"
            styleClass="border-0"
          />
        </div>

        <!-- Editor panel (always LTR for code) -->
        <div class="flex-1 flex flex-col min-w-0" dir="ltr">
          @if (selectedFilePath()) {
            <div class="flex items-center gap-2 pb-2 border-b border-slate-200 mb-2">
              <i class="pi pi-file text-secondary"></i>
              <span class="text-sm font-medium text-primary truncate">{{ selectedFilePath() }}</span>
            </div>
          }

          @if (loadingFile()) {
            <p-progressBar mode="indeterminate" [style]="{ height: '4px' }" />
          }

          <div class="flex-1 rounded-lg overflow-hidden border border-slate-200" style="min-height: 0">
            <ngx-monaco-editor
              [options]="editorOptions"
              (onInit)="onEditorInit($event)"
              style="display: block; width: 100%; height: 100%"
            />
          </div>
        </div>
      </div>
    </p-dialog>
  `,
})
export class FileExplorerComponent implements OnInit {
  private viewer = inject(ViewerService);
  private cdr = inject(ChangeDetectorRef);
  private theme = inject(ThemeService);
  private i18n = inject(I18nService);

  projectId = input.required<string>();
  projectName = input<string>('Project');
  closed = output<void>();

  treeNodes = signal<any[]>([]);
  loadingTree = signal(false);
  loadingFile = signal(false);
  selectedNode: any = null;
  selectedFilePath = signal<string>('');
  private editorInstance: any = null;

  /** Static initial options – theme & language are changed via Monaco API */
  editorOptions = {
    theme: this.theme.isDark() ? 'vs-dark' : 'vs',
    language: 'plaintext',
    readOnly: true,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
  };

  constructor() {
    // React to theme changes via Monaco global API (no editor re-init)
    effect(() => {
      const dark = this.theme.isDark();
      const monaco = (window as any).monaco;
      if (monaco) {
        monaco.editor.setTheme(dark ? 'vs-dark' : 'vs');
      }
    });
  }

  ngOnInit() {
    this.loadTree();
  }

  onEditorInit(editor: any) {
    this.editorInstance = editor;
    // Force layout after initialization to ensure correct dimensions
    setTimeout(() => editor.layout(), 100);
  }

  /** Called when p-dialog finishes showing – re-layout the editor */
  onDialogShow() {
    if (this.editorInstance) {
      setTimeout(() => this.editorInstance.layout(), 50);
    }
  }

  onNodeSelected(event: any) {
    const node: FileNode = event.node?.data;
    if (!node || node.type === 'folder') return;

    this.selectedFilePath.set(node.path);
    this.loadingFile.set(true);

    this.viewer.getFileContent(this.projectId(), node.path).subscribe({
      next: (file) => {
        const lang = guessLanguage(file.path);

        // Set content and language directly on the editor model (no ngModel)
        if (this.editorInstance) {
          const model = this.editorInstance.getModel();
          if (model) {
            model.setValue(file.content);
            const monaco = (window as any).monaco;
            if (monaco) {
              monaco.editor.setModelLanguage(model, lang);
            }
          }
          // Re-layout after content change
          this.editorInstance.layout();
        }

        this.loadingFile.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        const msg = this.i18n.t('explorer.failedToLoad');
        if (this.editorInstance) {
          const model = this.editorInstance.getModel();
          if (model) model.setValue(msg);
        }
        this.loadingFile.set(false);
      },
    });
  }

  private loadTree() {
    this.loadingTree.set(true);
    this.viewer.getStructure(this.projectId()).subscribe({
      next: (nodes) => {
        const treeNodes = toTreeNodes(nodes);
        this.treeNodes.set(treeNodes);
        this.loadingTree.set(false);

        // Auto-open the first index.html found
        const indexNode = this.findIndexNode(treeNodes);
        if (indexNode) {
          this.selectedNode = indexNode;
          this.onNodeSelected({ node: indexNode });
        }
      },
      error: () => this.loadingTree.set(false),
    });
  }

  /** Recursively search tree nodes for the first index.html file */
  private findIndexNode(nodes: any[]): any | null {
    for (const node of nodes) {
      if (node.leaf && node.label === 'index.html') {
        return node;
      }
      if (node.children) {
        const found = this.findIndexNode(node.children);
        if (found) return found;
      }
    }
    return null;
  }
}
