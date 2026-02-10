import { resolve, join } from "node:path";

/** Project root = backend/ */
const PROJECT_ROOT = resolve(import.meta.dir, "../..");

/** Temporary workspace base: backend/tmp/ */
export const TMP_DIR = join(PROJECT_ROOT, "tmp");

/** Runner workspaces: backend/tmp/runners/<studentId>/ */
export const RUNNERS_DIR = join(TMP_DIR, "runners");

/** Viewer cache: backend/tmp/viewers/<studentId>/ */
export const VIEWERS_DIR = join(TMP_DIR, "viewers");

/** Static templates: backend/public/ */
export const PUBLIC_DIR = join(PROJECT_ROOT, "public");

/** Nginx config template path */
export const NGINX_CONF_PATH = join(PUBLIC_DIR, "nginx.conf");
