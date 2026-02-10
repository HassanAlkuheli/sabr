import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { StudentRow, Project } from '../models/project.model';
import { AdminService } from '../services/admin.service';
import { RunnerService } from '../services/runner.service';

export interface StudentsState {
  students: StudentRow[];
  loading: boolean;
  activeProjectId: string | null;
  error: string | null;
}

const initialState: StudentsState = {
  students: [],
  loading: false,
  activeProjectId: null,
  error: null,
};

export const StudentsStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((store) => ({
    activeProject: computed(() => {
      const id = store.activeProjectId();
      if (!id) return null;
      for (const s of store.students()) {
        const p = s.projects?.find((p) => p.id === id);
        if (p) return p;
      }
      return null;
    }),
    totalStudents: computed(() => store.students().length),
  })),

  withMethods((store) => {
    const adminService = inject(AdminService);
    const runnerService = inject(RunnerService);

    return {
      /* ─── Load students list ─── */
      loadStudents: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() =>
            adminService.getStudents().pipe(
              tapResponse({
                next: (students) => patchState(store, { students, loading: false }),
                error: (err: Error) =>
                  patchState(store, { error: err.message, loading: false }),
              }),
            ),
          ),
        ),
      ),

      /* ─── Update project status locally ─── */
      setProjectStatus(projectId: string, status: Project['status'], url?: string | null) {
        const students = store.students().map((s) => ({
          ...s,
          projects: s.projects?.map((p) =>
            p.id === projectId ? { ...p, status, url: url ?? p.url } : p,
          ),
        }));
        patchState(store, { students });
      },

      /* ─── Set the currently-viewed project ─── */
      setActiveProject(projectId: string | null) {
        patchState(store, { activeProjectId: projectId });
      },

      /* ─── Deploy a project container ─── */
      startProject: rxMethod<string>(
        pipe(
          tap((id) => {
            // Optimistic: mark as RUNNING
            const students = store.students().map((s) => ({
              ...s,
              projects: s.projects?.map((p) =>
                p.id === id ? { ...p, status: 'RUNNING' as const } : p,
              ),
            }));
            patchState(store, { students });
          }),
          switchMap((id) =>
            runnerService.start(id).pipe(
              tapResponse({
                next: (url) => {
                  const students = store.students().map((s) => ({
                    ...s,
                    projects: s.projects?.map((p) =>
                      p.id === id ? { ...p, status: 'RUNNING' as const, url } : p,
                    ),
                  }));
                  patchState(store, { students });
                },
                error: (err: Error) => {
                  const students = store.students().map((s) => ({
                    ...s,
                    projects: s.projects?.map((p) =>
                      p.id === id ? { ...p, status: 'ERROR' as const } : p,
                    ),
                  }));
                  patchState(store, { students, error: err.message });
                },
              }),
            ),
          ),
        ),
      ),

      /* ─── Stop a project container ─── */
      stopProject: rxMethod<string>(
        pipe(
          switchMap((id) =>
            runnerService.stop(id).pipe(
              tapResponse({
                next: () => {
                  const students = store.students().map((s) => ({
                    ...s,
                    projects: s.projects?.map((p) =>
                      p.id === id ? { ...p, status: 'STOPPED' as const, url: null } : p,
                    ),
                  }));
                  patchState(store, { students });
                },
                error: (err: Error) => patchState(store, { error: err.message }),
              }),
            ),
          ),
        ),
      ),
    };
  }),
);
