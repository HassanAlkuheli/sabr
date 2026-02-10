import { Injectable, signal } from '@angular/core';
import { ProjectsService, Classmate, SectionProfessor } from '../../core/services/projects.service';
import { Project, Lab } from '../../core/models/project.model';

@Injectable({ providedIn: 'root' })
export class StudentStateService {
  constructor(
    private projectsService: ProjectsService,
  ) {}

  // ─── State ─────────────────────────────────
  allProjects = signal<Project[]>([]);
  loadingProjects = signal(false);

  runningProjects = signal<Project[]>([]);
  loadingRunning = signal(false);

  labs = signal<Lab[]>([]);
  loadingLabs = signal(false);

  classmates = signal<Classmate[]>([]);
  loadingClassmates = signal(false);

  professors = signal<SectionProfessor[]>([]);

  explorerProject = signal<{ id: string; name: string } | null>(null);

  // ─── Logs state ──────────────────────
  logsProject = signal<{ id: string; name: string } | null>(null);
  logsContent = signal('');
  logsLoading = signal(false);

  // ─── Pending operation tracking ────────────
  pendingStartIds = signal<Set<string>>(new Set());
  pendingStopIds = signal<Set<string>>(new Set());

  private _initialized = false;

  initialize() {
    if (this._initialized) return;
    this._initialized = true;
    this.loadProjects();
    this.loadRunningProjects();
    this.loadLabs();
    this.loadClassmates();
    this.loadProfessors();
  }

  loadProjects() {
    this.loadingProjects.set(true);
    this.projectsService.list().subscribe({
      next: (data) => {
        this.allProjects.set(data);
        this.loadingProjects.set(false);
      },
      error: () => this.loadingProjects.set(false),
    });
  }

  loadRunningProjects() {
    this.loadingRunning.set(true);
    this.projectsService.listRunning().subscribe({
      next: (data) => {
        this.runningProjects.set(data);
        this.loadingRunning.set(false);
      },
      error: () => this.loadingRunning.set(false),
    });
  }

  loadLabs() {
    this.loadingLabs.set(true);
    this.projectsService.getMyLabs().subscribe({
      next: (data) => {
        this.labs.set(data);
        this.loadingLabs.set(false);
      },
      error: () => this.loadingLabs.set(false),
    });
  }

  loadClassmates() {
    this.loadingClassmates.set(true);
    this.projectsService.getClassmates().subscribe({
      next: (data) => {
        this.classmates.set(data);
        this.loadingClassmates.set(false);
      },
      error: () => this.loadingClassmates.set(false),
    });
  }

  loadProfessors() {
    this.projectsService.getSectionProfessors().subscribe({
      next: (data) => this.professors.set(data),
    });
  }

  // ─── Actions ──────────────────────────────

  startProject(project: { id: string }) {
    this.pendingStartIds.update((s) => new Set([...s, project.id]));
    this.updateProjectLocal(project.id, { status: 'STARTING' });
    this.projectsService.startProject(project.id).subscribe({
      next: ({ url, adminUrl }) => {
        this.updateProjectLocal(project.id, { status: 'RUNNING', url, adminUrl });
        this.pendingStartIds.update((s) => { const n = new Set(s); n.delete(project.id); return n; });
        if (url) window.open(url, '_blank');
      },
      error: (err) => {
        const errorMsg = err?.error?.message ?? 'Deployment failed';
        this.updateProjectLocal(project.id, { status: 'ERROR', errorMessage: errorMsg });
        this.pendingStartIds.update((s) => { const n = new Set(s); n.delete(project.id); return n; });
      },
    });
  }

  stopProject(project: { id: string }) {
    this.pendingStopIds.update((s) => new Set([...s, project.id]));
    this.projectsService.stopProject(project.id).subscribe({
      next: () => {
        this.updateProjectLocal(project.id, { status: 'STOPPED', url: null });
        this.runningProjects.update((list) => list.filter((p) => p.id !== project.id));
        this.pendingStopIds.update((s) => { const n = new Set(s); n.delete(project.id); return n; });
      },
      error: () => {
        this.pendingStopIds.update((s) => { const n = new Set(s); n.delete(project.id); return n; });
      },
    });
  }

  updateProjectLocal(id: string, changes: Partial<Project>) {
    this.allProjects.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...changes } : p)),
    );
    this.runningProjects.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...changes } : p)),
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
    this.projectsService.getProjectLogs(project.id).subscribe({
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

  deleteProject(project: { id: string }) {
    this.projectsService.deleteProject(project.id).subscribe({
      next: () => {
        this.allProjects.update((list) => list.filter((p) => p.id !== project.id));
        this.runningProjects.update((list) => list.filter((p) => p.id !== project.id));
      },
    });
  }

  // ─── Helpers ───────────────────────────────

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

  getLabName(labId: string | null): string | null {
    if (!labId) return null;
    const lab = this.labs().find((l) => l.id === labId);
    return lab ? lab.name : null;
  }

  getLabMaxGrade(labId: string | null): number {
    if (!labId) return 100;
    const lab = this.labs().find((l) => l.id === labId);
    return lab ? lab.maxGrade : 100;
  }

  /** Get student's project for a specific lab */
  getProjectForLab(labId: string): Project | undefined {
    return this.allProjects().find((p) => p.labId === labId);
  }
}
