# AGENTS.md

Repo-specific guidance for OpenCode sessions. Read this before editing.

## Project

VouchIt — voucher swapping platform. React 18 + Vite frontend, Express API deployed as Vercel serverless functions, MongoDB Atlas via Mongoose.

## Commands

- `npm run dev` — Vite frontend only on port **8080** (README's `5173` is stale). Does NOT start the API.
- `npm run build` — production build (terser drops `console.log/info/debug` in production mode).
- `npm test` — `vitest run` across repo (no config file; defaults). Watch: `npm run test:watch`.
- `npm run type-check` — `tsc --build --dry --force`.
- `npm run lint` / `npm run lint:fix` — ESLint flat config.
- `npm run seed:demo` — idempotent demo seed; loads `.env` itself. Demo login `demo@vouchit.app` / `DemoPass123!`.

Suggested order before commits: `lint` -> `type-check` -> `test`.

## Architecture

- **Frontend** (`src/`): path alias `@/` -> `./src/`. Entry `src/main.tsx`. Pages in `src/pages`, services in `src/services`, contexts in `src/contexts`. API calls go through `src/services/api-client.ts` which unwraps the `{ data, error }` envelope and throws `ApiClientError` on non-2xx.
- **API** (`server/` + `api/`): Express app factory in `server/app.ts` (`createApp`). Vercel serverless entrypoint is `api/[...path].ts` (the only file in `api/` — Vercel counts every top-level `api/*.ts` as a function, Hobby plan limit is 12) which imports `createApp()` from `../server/app.js` and exports it directly (not wrapped in `serverless-http` — `deployment.test.ts` asserts `default.handle` exists). `vercel.json` rewrites `/api/:path*` -> `/api/[...path]` and adds SPA fallback + `X-Frame-Options: SAMEORIGIN`.
- **Running API locally**: `npx tsx server/app.ts` (per README). Frontend dev hits `/api/*` only when deployed to Vercel.
- **DB** (`server/lib/db.ts`): `connectDb` caches the Mongoose promise on `globalThis.mongooseConnection` for serverless reuse; throws if `MONGODB_URI` missing.
- **Auth** (`server/middleware/auth.ts`): httpOnly cookie `auth_token` (JWT). `requireAuth` sets `req.userId`. Use `AuthedRequest` type.
- **HTTP envelope**: every route returns `{ data, error: { message } | null }`. Use `ok`/`fail`/`ApiError` from `server/lib/http.ts`. Wrap async routes with `asyncRoute`. `errorHandler` maps `ApiError` and `ZodError` to envelope responses.

## Conventions

- **API imports use `.js` extensions** (NodeNext-style) even in `.ts` files: `import { authRouter } from './routes/auth.js'`. `deployment.test.ts` compiles the entrypoint with `module: NodeNext` — keep this pattern or that test fails.
- **Frontend uses `@/` alias**, API/server uses relative paths. Do not mix.
- **TypeScript is NOT strict** (`strict: false`, `strictNullChecks: false`, `noImplicitAny: false` in `tsconfig.json`). Match existing lax style; don't introduce strict-null ergonomics that diverge from the codebase.
- **ESLint flat config** (`eslint.config.js`); ignores `dist`, `node_modules`, `coverage`, `*.config.*`. `no-console` is warn, `@typescript-eslint/no-explicit-any` is warn, `no-eval`/`no-implied-eval`/`no-new-func`/`no-script-url` are errors.

## Testing

- Vitest, no config file. Tests colocated as `*.test.ts` next to source.
- **Route tests do not touch MongoDB.** They `vi.mock('../lib/db', ...)` and mock each model in `server/models/*` (see `server/routes/auth.test.ts` for the pattern). New route tests must follow this — do not import real Mongoose models.
- API tests use `supertest` against `createApp()`.
- `api/deployment.test.ts` shells out to `npx tsc` with NodeNext settings — keep API entrypoint NodeNext-compatible.

## Env

Required (see `.env.example`): `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`. `CORS_ORIGIN` only for local dev (leave empty on Vercel — same-origin). `.env` is gitignored; never commit secrets.
