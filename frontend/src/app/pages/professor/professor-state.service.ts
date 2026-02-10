import { Injectable, signal, computed } from '@angular/core';
import { tap } from 'rxjs';
import { ProfessorService } from '../../core/services/professor.service';
import { RunnerService } from '../../core/services/runner.service';
import { AdminProject, StudentRow, Lab } from '../../core/models/project.model';

@Injectable({ providedIn: 'root' })
export class ProfessorStateService {
  constructor(
    private profService: ProfessorService,
    private runnerService: RunnerService,
  ) {}

  // ─── Shared state ─────────────────────────
  sections = signal<string[]>([]);
  sectionOptions = computed(() => {
    let secs = this.sections();
    // Fallback: derive sections from loaded labs if API returned empty
    if (!secs.length) {
      const labSections = new Set<string>();
      for (const l of this.labs()) {
        try { for (const s of JSON.parse(l.sections) as string[]) labSections.add(s); } catch {}
      }
      if (labSections.size) secs = [...labSections].sort();
    }
    return secs.map((s) => ({ label: s, value: s }));
  });

  explorerProject = signal<{ id: string; name: string } | null>(null);

  // ─── Logs state ──────────────────────
  logsProject = signal<{ id: string; name: string } | null>(null);
  logsContent = signal('');
  logsLoading = signal(false);

  // ─── Projects ─────────────────────────────
  allProjects = signal<AdminProject[]>([]);
  loadingProjects = signal(false);

  // ─── Students ─────────────────────────────
  allStudents = signal<StudentRow[]>([]);
  loadingStudents = signal(false);

  // ─── Running ──────────────────────────────
  runningProjects = signal<AdminProject[]>([]);
  loadingRunning = signal(false);

  // ─── Labs ─────────────────────────────────
  labs = signal<Lab[]>([]);
  loadingLabs = signal(false);
  labOptions = computed(() =>
    this.labs().map((l) => {
      let secs: string[] = [];
      try { secs = JSON.parse(l.sections); } catch {}
      return { label: `${l.name} (${secs.join(', ')})`, value: l.id };
    }),
  );

  private _initialized = false;

  initialize() {
    if (this._initialized) return;
    this._initialized = true;
    this.loadSections();
    this.loadAllProjects();
    this.loadStudents();
    this.loadRunningProjects();
    this.loadLabs();
  }

  loadSections() {
    this.profService.getSections().subscribe({
      next: (data) => this.sections.set(data),
    });
  }

  loadAllProjects() {
    this.loadingProjects.set(true);
    this.profService.getProjects().subscribe({
      next: (data) => {
        this.allProjects.set(data);
        this.loadingProjects.set(false);
      },
      error: () => this.loadingProjects.set(false),
    });
  }

  loadStudents() {
    this.loadingStudents.set(true);
    this.profService.getStudents().subscribe({
      next: (data) => {
        this.allStudents.set(data);
        this.loadingStudents.set(false);
      },
      error: () => this.loadingStudents.set(false),
    });
  }

  loadRunningProjects() {
    this.loadingRunning.set(true);
    this.profService.getRunningProjects().subscribe({
      next: (data) => {
        this.runningProjects.set(data);
        this.loadingRunning.set(false);
      },
      error: () => this.loadingRunning.set(false),
    });
  }

  loadLabs() {
    this.loadingLabs.set(true);
    this.profService.getLabs().subscribe({
      next: (data) => {
        this.labs.set(data);
        this.loadingLabs.set(false);
      },
      error: () => this.loadingLabs.set(false),
    });
  }

  // ─── Pending operation tracking ────────────
  pendingStartIds = signal<Set<string>>(new Set());
  pendingStopIds = signal<Set<string>>(new Set());

  // ─── Actions ──────────────────────────────

  startProject(project: { id: string }) {
    this.pendingStartIds.update(s => new Set([...s, project.id]));
    this.updateProjectLocal(project.id, { status: 'STARTING' });
    this.updateStudentProjectLocal(project.id, { status: 'STARTING' });
    this.runnerService.start(project.id).subscribe({
      next: (url) => {
        this.updateProjectLocal(project.id, { status: 'RUNNING', url });
        this.updateStudentProjectLocal(project.id, { status: 'RUNNING', url });
        this.pendingStartIds.update(s => { const n = new Set(s); n.delete(project.id); return n; });
        if (url) window.open(url, '_blank');
      },
      error: (err) => {
        const errorMsg = err?.error?.message ?? 'Deployment failed';
        this.updateProjectLocal(project.id, { status: 'ERROR' } as any);
        this.updateStudentProjectLocal(project.id, { status: 'ERROR', errorMessage: errorMsg });
        this.pendingStartIds.update(s => { const n = new Set(s); n.delete(project.id); return n; });
      },
    });
  }

  stopProject(project: { id: string }) {
    this.pendingStopIds.update(s => new Set([...s, project.id]));
    this.runnerService.stop(project.id).subscribe({
      next: () => {
        this.updateProjectLocal(project.id, { status: 'STOPPED', url: null });
        this.updateStudentProjectLocal(project.id, { status: 'STOPPED', url: null });
        this.runningProjects.update((list) => list.filter((p) => p.id !== project.id));
        this.pendingStopIds.update(s => { const n = new Set(s); n.delete(project.id); return n; });
      },
      error: () => {
        this.pendingStopIds.update(s => { const n = new Set(s); n.delete(project.id); return n; });
      },
    });
  }

  updateProjectLocal(id: string, changes: Partial<AdminProject>) {
    this.allProjects.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...changes } : p)),
    );
  }

  updateStudentProjectLocal(id: string, changes: Record<string, any>) {
    this.allStudents.update((students) =>
      students.map((s) => ({
        ...s,
        projects: s.projects?.map((p) => (p.id === id ? { ...p, ...changes } : p)),
      })),
    );
  }

  openExplorer(project: { id: string; name: string }) {
    this.explorerProject.set(project);
  }

  closeExplorer() {
    this.explorerProject.set(null);
  }

  openLogs(project: { id: string; name: string }) {
    this.logsProject.set(project);
    this.logsContent.set('');
    this.logsLoading.set(true);
    this.runnerService.getLogs(project.id).subscribe({
      next: (logs) => {
        this.logsContent.set(logs);
        this.logsLoading.set(false);
      },
      error: () => {
        this.logsContent.set('Failed to load logs.');
        this.logsLoading.set(false);
      },
    });
  }

  refreshLogs() {
    const p = this.logsProject();
    if (p) this.openLogs(p);
  }

  closeLogs() {
    this.logsProject.set(null);
    this.logsContent.set('');
  }

  openUrl(url: string | null) {
    if (url) window.open(url, '_blank');
  }

  gradeProject(projectId: string, body: { grade?: number; gradeMessage?: string }) {
    return this.profService.gradeProject(projectId, body).pipe(
      tap(() => {
        this.updateProjectLocal(projectId, { grade: body.grade ?? null, gradeMessage: body.gradeMessage ?? null } as any);
        this.updateStudentProjectLocal(projectId, { grade: body.grade ?? null, gradeMessage: body.gradeMessage ?? null });
      }),
    );
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getRunningTime(updatedAt: string | null): string {
    if (!updatedAt) return '—';
    const ms = Date.now() - new Date(updatedAt).getTime();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  isLabExpired(deadline: string): boolean {
    return new Date(deadline) < new Date();
  }

  /** Parse lab.sections JSON string into string array. */
  parseLabSections(lab: Lab): string[] {
    try { return JSON.parse(lab.sections); } catch { return []; }
  }
}
