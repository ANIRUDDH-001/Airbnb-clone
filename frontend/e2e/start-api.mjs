// Starts FastAPI for the end-to-end tests on a brand-new SQLite file, seeded on startup.
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const backend = resolve(import.meta.dirname, "..", "..", "backend");
const db = join(tmpdir(), "airbnb-clone-e2e.db");
for (const suffix of ["", "-wal", "-shm"]) rmSync(db + suffix, { force: true });

// The backend's virtualenv if there is one (local runs), otherwise whatever Python is on PATH (CI).
const venvPython = [join(backend, ".venv", "Scripts", "python.exe"), join(backend, ".venv", "bin", "python")].find(existsSync);
const python = process.env.E2E_PYTHON ?? venvPython ?? "python";

const api = spawn(python, ["-m", "uvicorn", "app.main:create_app", "--factory", "--port", process.env.API_PORT ?? "8001"], {
  cwd: backend,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: `sqlite:///${db.replaceAll("\\", "/")}`, SEED_ON_STARTUP: "true" },
});
api.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => api.kill(signal));
