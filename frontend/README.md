# Frontend

The Next.js 16 app (App Router, React 19, TypeScript, Tailwind CSS 4) for the Airbnb clone.
See the [root README](../README.md) for the full feature list, architecture, local setup and deployment.

```bash
npm install
npm run dev        # http://localhost:3000; expects the FastAPI backend on http://localhost:8000
npm test           # vitest unit tests
npm run lint && npm run typecheck && npm run build
```

`BACKEND_URL` (see `.env.example`) sets where the `/api/*` rewrite and the server components reach the backend.
