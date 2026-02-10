import { Injectable, signal, computed } from '@angular/core';
import { AdminService } from '../../core/services/admin.service';
import { RunnerService } from '../../core/services/runner.service';
import { AdminProject } from '../../core/models/project.model';
import { AdminLab } from '../../core/models/project.model';
import { User } from '../../core/models/user.model';

@Injectable({ providedIn: 'root' })
export class AdminStateService {
  constructor(
    private adminService: AdminService,
    private runnerService: RunnerService,
  ) {}

  // ─── Shared state ─────────────────────────
  sections = signal<string[]>([]);
  sectionOptions = computed(() =>
    this.sections().map((s) => ({ label: s, value: s })),
  );

  explorerProject = signal<{ id: string; name: string } | null>(null);

  // ─── Logs state ──────────────────────────
  logsProject = signal<{ id: string; name: string } | null>(null);
  logsContent = signal('');
  logsLoading = signal(false);

  // ─── All Projects ─────────────────────────
  allProjects = signal<AdminProject[]>([]);
  loadingProjects = signal(false);

  // ─── Students ─────────────────────────────
  allStudents = signal<any[]>([]);
  loadingStudents = signal(false);

  // ─── Professors ───────────────────────────
  professors = signal<User[]>([]);
  loadingProfessors = signal(false);

  // ─── Running Projects ─────────────────────
  runningProjects = signal<AdminProject[]>([]);
  loadingRunning = signal(false);

  // ─── Labs ─────────────────────────────────
  adminLabs = signal<AdminLab[]>([]);
  loadingLabs = signal(false);
  gradedProjects = signal<AdminProject[]>([]);
  loadingGradedProjects = signal(false);

  private _initialized = false;

  /** Call once to load all data */
  initialize() {
    if (this._initialized) return;
    this._initialized = true;
    this.loadAllProjects();
    this.loadSections();
    this.loadProfessors();
    this.loadRunningProjects();
    this.loadStudents();
    this.loadLabs();
    this.loadGradedProjects();
  }

  loadAllProjects() {
    this.loadingProjects.set(true);
    this.adminService.getAllProjects().subscribe({
      next: (data) => {
        this.allProjects.set(data);
        this.loadingProjects.set(false);
      },
      error: () => this.loadingProjects.set(false),
    });
  }

  loadSections() {
    this.adminService.getSections().subscribe({
      next: (data) => this.sections.set(data),
    });
  }

  loadStudents() {
    this.loadingStudents.set(true);
    this.adminService.getStudents().subscribe({
      next: (data) => {
        this.allStudents.set(data);
        this.loadingStudents.set(false);
      },
      error: () => this.loadingStudents.set(false),
    });
  }

  loadProfessors() {
    this.loadingProfessors.set(true);
    this.adminService.getProfessors().subscribe({
      next: (data) => {
        this.professors.set(data);
        this.loadingProfessors.set(false);
      },
      error: () => this.loadingProfessors.set(false),
    });
  }

  loadRunningProjects() {
    this.loadingRunning.set(true);
    this.adminService.getRunningProjects().subscribe({
      next: (data) => {
        this.runningProjects.set(data);
        this.loadingRunning.set(false);
      },
      error: () => this.loadingRunning.set(false),
    });
  }

  loadLabs() {
    this.loadingLabs.set(true);
    this.adminService.getLabs().subscribe({
      next: (data) => {
        this.adminLabs.set(data);
        this.loadingLabs.set(false);
      },
      error: () => this.loadingLabs.set(false),
    });
  }

  loadGradedProjects() {
    this.loadingGradedProjects.set(true);
    this.adminService.getProjectsWithGrades().subscribe({
      next: (data) => {
        this.gradedProjects.set(data);
        this.loadingGradedProjects.set(false);
      },
      error: () => this.loadingGradedProjects.set(false),
    });
  }

  startProject(project: AdminProject) {
    this.updateProjectLocal(project.id, { status: 'RUNNING' });
    this.runnerService.start(project.id).subscribe({
      next: (url) => this.updateProjectLocal(project.id, { status: 'RUNNING', url }),
      error: () => this.updateProjectLocal(project.id, { status: 'ERROR' }),
    });
  }

  stopProject(project: AdminProject) {
    this.runnerService.stop(project.id).subscribe({
      next: () => {
        this.updateProjectLocal(project.id, { status: 'STOPPED', url: null });
        this.runningProjects.update((list) => list.filter((p) => p.id !== project.id));
      },
    });
  }

  stopRunningProject(project: AdminProject) {
    this.runnerService.stop(project.id).subscribe({
      next: () => {
        this.runningProjects.update((list) => list.filter((p) => p.id !== project.id));
        this.updateProjectLocal(project.id, { status: 'STOPPED', url: null });
      },
    });
  }

  updateProjectLocal(id: string, changes: Partial<AdminProject>) {
    this.allProjects.update((list) =>
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
}
