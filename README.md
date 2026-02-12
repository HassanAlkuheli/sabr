# Sabr

Sabr is a full-stack student project deployment platform that lets professors publish lab assignments and automatically deploy every student submission in its own isolated environment. The platform pairs a Bun + Elysia backend for orchestration with an Angular + PrimeNG front end so teams can manage labs, grading, and live deployments without swapping between tools.

## What's new (v0.24)
- AI-assisted grading: code-based LLM analysis (code-scan) and Playwright-based behavioral deep-scan integrated into the platform.
- Predicted grade: automated grade suggestion computed as 60% code-scan + 40% deep-scan and shown on student/professor tables.
- Playwright screenshots persisted in MinIO and proxied by backend so browser `<img>` can load screenshots securely.
- Reliability fixes: longer Playwright timeouts, DB migration safety (IF NOT EXISTS fallback), and migration corrections.
- UX: screenshot gallery in the AI Scan dialog and predicted-grade column added to professor & student views.


## Key Capabilities
- **Lab management** – Professors create labs, set deadlines/max grades, and target specific class sections.
- **Student submissions** – Students upload archives; the platform unzips them, spins up Docker containers, and wires up databases automatically.
- **Automated deployment engine** – Builds Docker Compose stacks, provisions isolated PostgreSQL databases, and routes traffic through Traefik.
- **Operational visibility** – Logs, deployment status, and access URLs surface right inside the web UI.

## Architecture
- **Backend** – Powered by [Bun](https://bun.sh/) + [Elysia](https://elysiajs.dev/) with Drizzle ORM for PostgreSQL, MinIO for uploads, and a runner service that builds Docker Compose configs plus database/SQL sanitization logic.
- **Frontend** – Angular 21.1.3 standalone components styled with Tailwind v4 and PrimeNG v21.1.1; bilingual UI (English / Arabic) for professors and students.
- **Infrastructure** – `docker-compose.yml` brings up Traefik, PostgreSQL 16, MinIO, and pgAdmin. Each student project runs within its own Docker network and database for true multi-tenancy.

## Getting Started
### Prerequisites
- [Bun](https://bun.sh/) (for backend and runner scripts)
- Node.js (for Angular CLI tooling)
- Docker & Docker Compose (for PostgreSQL, MinIO, Traefik, and pgAdmin)
- Angular CLI (optional, installed via npm)

### 1. Configure environment
```bash
cp .env.example .env
# edit .env with values for POSTGRES_USER, MINIO credentials, DEPLOY_DOMAIN, etc.
```

### 2. Start supporting services
```bash
docker compose up -d
```
This boots Traefik, PostgreSQL (5434), MinIO (9002/9003), and pgAdmin (5051) inside the `sabr-net` bridge network.

### 3. Run the backend
```bash
cd backend
bun install
bun run index.ts
```
The backend listens on the port configured in `.env` (default `3000`). It handles authentication, lab/project APIs, and the deployment runner logic.

### 4. Run the frontend
```bash
cd frontend
npm install
ng serve
```
Visit http://localhost:4200/ to access the UI. Login as a professor or student to manage labs, upload projects, and see running deployments.

## Frontend Notes
- The Angular app ships with a hints panel for bilingual upload tips and PrimeNG tables/dialogs for labs/projects.
- `ng build` produces production assets in `dist/`
- Use `ng test` for unit tests and configure additional e2e tooling as needed.

## Deployment Flow
1. Professors create labs and assign sections.
2. Students upload zipped project archives via the dashboard.
3. The backend runner analyzes the project, sanitizes SQL, generates a Docker Compose stack, and starts containers.
4. Application logs and runtime URLs are exposed through the front end.

## Maintenance & Utilities
- Database migrations live under `backend/drizzle/`; run Drizzle CLI manually if schema changes are needed.
- `backend/src/modules/runner/runner.service.ts` contains logic for sanitizing SQL scripts, parsing manifests, and orchestrating deployments.
- Translation strings are located in `frontend/src/app/core/i18n/translations.ts` (English + Arabic).

## Testing & Scripts
- Frontend: `npm run test` (Karma) and `npm run e2e` (add your preferred runner).
- Backend: Add Bun script wrappers or use `bun run <script>` as defined in `backend/package.json`.

## Helpful Commands
| Purpose | Command |
| --- | --- |
| Frontend development | `npm run start` (`ng serve`) |
| Backend server | `bun run index.ts` |
| Bring up infra | `docker compose up -d` |
| Create production build | `ng build --configuration production` |
| Reset database | stop containers, drop `pgdata` volume, restart docker compose |

## Contribution
Feel free to open issues or PRs against the `main` branch. Describe new deployment scenarios, runner hooks, or UI improvements so the platform can serve even more courses.

## Security (important) ⚠️
- **Never commit `.env` or secrets** to Git. Use `.env` locally and add it to `.gitignore`.
- **Rotate secrets immediately** if they were committed by mistake: JWT secret, DB passwords, MinIO keys, and any admin passwords.
- When you rotate JWT secret, restart the backend so existing tokens become invalid and require users to re-authenticate.
- For public repositories, consider purging secrets from history (we performed a history purge and force-pushed for this repo).
- Use a secrets manager or CI/CD secret storage for production deployments.

