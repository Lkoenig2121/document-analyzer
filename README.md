# Document Analyzer

A full-stack document management app for uploading, storing, and viewing PDF, DOCX, and TXT files.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS, TanStack Query, React Hook Form, Axios |
| Backend | Express 5, Prisma 7, PostgreSQL, Multer, Pino |
| Database | PostgreSQL |

## Prerequisites

- **Node.js** `>= 20.19.0` (Prisma 7 requirement; Node 22 recommended)
- **PostgreSQL** running locally
- **npm**

## Project structure

```
document-analyzer/
├── client/                 # Next.js frontend
│   ├── app/                # Pages, layouts, components
│   ├── lib/
│   │   ├── api.ts          # Central API entry point
│   │   ├── api/            # Axios client + endpoint modules
│   │   ├── hooks/          # React Query hooks
│   │   └── env.ts          # Frontend environment config
│   └── .env.example
├── server/                 # Express API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Upload, error handling
│   │   ├── routes/         # API routes
│   │   └── config/env.ts   # Validated server environment
│   ├── prisma/             # Schema + migrations
│   └── .env.example
└── package.json            # Monorepo scripts
```

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment variables

**Server** — copy and edit:

```bash
cp server/.env.example server/.env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | API server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | required |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `UPLOAD_DIR` | Directory for stored files | `uploads` |
| `MAX_UPLOAD_SIZE_MB` | Upload size limit | `20` |
| `LOG_LEVEL` | Pino log level | `info` |

**Client** — copy and edit:

```bash
cp client/.env.example client/.env.local
```

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL (include `/api`) | `http://localhost:3001/api` |
| `NEXT_PUBLIC_APP_NAME` | App name shown in navigation | `Document Analyzer` |

### 3. Create the database

```bash
createdb document_analyzer
```

Update `DATABASE_URL` in `server/.env` to match your local PostgreSQL user and database name.

### 4. Run migrations

```bash
cd server
nvm use 22          # if using nvm
npx prisma migrate dev
```

### 5. Start development servers

From the project root:

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/api |
| Health check | http://localhost:3001/api/health |

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/documents` | List all documents |
| `POST` | `/api/documents` | Upload a document |
| `GET` | `/api/documents/:id/file` | View/download a file |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start client + server concurrently |
| `npm run dev:client` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run build` | Build both packages |
| `npm run install:all` | Install all dependencies |

### Server-only scripts

```bash
cd server
npm run db:migrate    # Run Prisma migrations
npm run db:generate   # Generate Prisma client
npm run db:studio     # Open Prisma Studio
```

## Architecture notes

- **Centralized API client** — import from `client/lib/api.ts` in all frontend code
- **Separated concerns** — API logic in `lib/api/`, UI in `app/components/`, data fetching in `lib/hooks/`
- **Shared UI primitives** — `Button`, `Card`, `LoadingState`, `ErrorMessage`, `EmptyState` in `app/components/ui/`
- **Error handling** — server returns `{ success: false, error: { message } }`; client parses via `getApiErrorMessage()`
- **Logging** — Pino on the server; lightweight `logger` on the client (dev-friendly, suppressed debug in production)

## Upload constraints

- **Allowed types:** PDF, DOCX, TXT
- **Max size:** 20 MB (configurable via `MAX_UPLOAD_SIZE_MB`)
