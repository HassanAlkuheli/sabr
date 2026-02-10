import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  User,
  LoginRequest,
  RegisterStudentRequest,
  RegisterProfessorRequest,
  AuthResponse,
  RegisterResponse,
} from '../models/user.model';
import { ApiResponse } from '../models/api.model';

const TOKEN_KEY = 'sabr_token';
const USER_KEY = 'sabr_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = `${environment.apiUrl}/auth`;

  /** Reactive state */
  private _user = signal<User | null>(this.storedUser());
  private _token = signal<string | null>(this.storedToken());

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());
  readonly role = computed(() => this._user()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  /* ─── Auth actions ─── */

  login(body: LoginRequest) {
    return this.http.post<AuthResponse>(`${this.api}/login`, body).pipe(
      tap((res) => {
        this.persist(res.token, res.data);
      }),
    );
  }

  registerStudent(body: RegisterStudentRequest) {
    return this.http.post<RegisterResponse>(`${this.api}/register/student`, body);
  }

  registerProfessor(body: RegisterProfessorRequest) {
    return this.http.post<RegisterResponse>(`${this.api}/register/professor`, body);
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  /* ─── Helpers ─── */

  private persist(token: string, user: User) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._token.set(token);
    this._user.set(user);
  }

  private storedToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private storedUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  /* ─── Profile update ─── */

  updateProfile(body: { name?: string; password?: string }): Observable<User> {
    return this.http
      .patch<ApiResponse<User>>(`${this.api}/profile`, body)
      .pipe(
        map((r) => r.data),
        tap((user) => {
          this._user.set(user);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        }),
      );
  }
}
