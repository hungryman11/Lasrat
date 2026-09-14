# Lagos State LEHME Escalations MVP

A server-backed React and TypeScript MVP for submitting, triaging, assigning, and resolving escalation complaints for Lagos State LEHME. The application supports authenticated users, staff/admin queue management, complaint ownership, optional supporting attachments, and MySQL/TiDB persistence.

> This repository is an MVP mock. It is suitable for local testing and product validation. It is not a production compliance, records-retention, notification, or incident-management system.

## Contents

- [Product scope](#product-scope)
- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Database setup and migrations](#database-setup-and-migrations)
- [Running the application](#running-the-application)
- [Application routes](#application-routes)
- [User roles and access control](#user-roles-and-access-control)
- [Complaint attachments](#complaint-attachments)
- [Testing and quality checks](#testing-and-quality-checks)
- [Production build](#production-build)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Security and privacy notes](#security-and-privacy-notes)
- [Known limitations](#known-limitations)
- [References](#references)

## Product scope

The MVP supports two primary journeys. An authenticated user submits a complaint, optionally adds up to three supporting files, receives a generated LEHME reference, and views the complaint status. An authenticated staff member or administrator opens the staff queue, searches and filters complaints, assigns work, changes priority or status, and marks work resolved or closed.

The application stores complaint records, attachment metadata, and the platform-provided authenticated user identity. File bytes are stored through the configured Manus storage service. The database stores only the storage key and URL needed to retrieve an attachment.

## Technology stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Browser | React 19, TypeScript, Vite, Tailwind CSS | Routes, forms, accessibility, responsive UI, and typed tRPC calls. |
| API | Express, tRPC 11, Zod | Server procedures, input validation, session context, and authorization. |
| Persistence | Drizzle ORM, MySQL/TiDB | Users, complaints, attachment metadata, and migrations. |
| Authentication | Manus OAuth | Login, callback handling, and HTTP-only session cookies. |
| File storage | Manus storage helper and S3-backed object storage | Attachment bytes and `/manus-storage/` retrieval paths. |
| Testing | Vitest, TypeScript compiler | Unit-level API authorization, validation, and regression checks. |

The browser never connects directly to the database or receives server-only credentials. Complaint mutations and attachment validation execute on the server.

## Prerequisites

Install the following tools before starting local development:

| Requirement | Recommended version | Purpose |
| --- | --- | --- |
| Node.js | 22 or later | Runs Vite, the Express server, and build tooling. |
| pnpm | 10.x | Installs dependencies and runs project scripts. |
| MySQL or TiDB | A compatible current release | Stores users, complaints, and attachment metadata. |
| Manus OAuth application | Project-specific credentials | Authenticates local users. |
| Manus storage configuration | Project-specific built-in Forge credentials | Stores uploaded file bytes. |

The repository includes `pnpm-lock.yaml`. Use pnpm rather than npm or yarn to keep dependency resolution consistent.

## Local setup

### 1. Clone the repository

```bash
git clone <your-github-repository-url>
cd "leh me-escalations"
```

If the directory name differs, use the directory created by `git clone` for all subsequent commands.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a local `.env` file at the repository root. Do not commit this file.

```dotenv
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=mysql://USERNAME:PASSWORD@127.0.0.1:3306/lehme_escalations

# Manus OAuth
VITE_APP_ID=your-manus-oauth-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
JWT_SECRET=replace-with-a-long-random-local-secret
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Local Owner

# Manus built-in storage
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-server-side-forge-api-key
```

The exact OAuth portal and Forge API URLs may differ between environments. Use the values supplied by the project environment rather than copying the example values blindly. The application reads server-side values from `server/_core/env.ts`; do not expose `BUILT_IN_FORGE_API_KEY`, `DATABASE_URL`, or `JWT_SECRET` through `VITE_` variables.

### 4. Create the local database

Create an empty database using your MySQL client. The database name must match the final path component of `DATABASE_URL`.

```sql
CREATE DATABASE lehme_escalations CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then apply the existing Drizzle migrations:

```bash
pnpm db:push
```

`pnpm db:push` runs `drizzle-kit generate` followed by `drizzle-kit migrate`. It requires a reachable `DATABASE_URL`. The current migration set creates the platform users table, complaints table, and complaint attachment metadata table, and extends user roles with `staff` and `admin`.

For a managed WebDev database, use the project migration workflow instead of pointing a local process at production data. Generate the migration locally, review the SQL under `drizzle/`, and apply it through the approved project database migration mechanism.

### 5. Start the development server

```bash
pnpm dev
```

The server starts the Express API and Vite development server. Open the URL printed by the process, normally `http://localhost:3000`.

## Environment variables

| Variable | Server or browser | Required | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Server | Yes | MySQL/TiDB connection string. |
| `JWT_SECRET` | Server | Yes | Session cookie signing secret. |
| `VITE_APP_ID` | Shared configuration | Yes | Manus OAuth application identifier. |
| `OAUTH_SERVER_URL` | Server | Yes | OAuth backend base URL. |
| `VITE_OAUTH_PORTAL_URL` | Browser | Yes | Login portal URL used by the client. |
| `OWNER_OPEN_ID` | Server | Recommended | OAuth identity promoted to administrator by the auth upsert flow. |
| `OWNER_NAME` | Server | Optional | Owner display name provided by the environment. |
| `BUILT_IN_FORGE_API_URL` | Server | Required for attachments | Built-in Forge API base URL used by storage helpers. |
| `BUILT_IN_FORGE_API_KEY` | Server | Required for attachments | Server-side credential used to request storage presigned URLs. |
| `NODE_ENV` | Server | Optional | `development` for Vite development mode or `production` for static serving. |
| `PORT` | Server | Optional | Preferred local HTTP port. |

Do not put server-only secrets in client code. Do not commit `.env`, database dumps, uploaded files, or credentials.

## Running the application

Use separate terminals for development and quality checks when convenient.

```bash
# Terminal 1: development server
pnpm dev

# Terminal 2: TypeScript validation
pnpm check

# Terminal 2: automated tests
pnpm test
```

The current application uses Manus OAuth. A local user must complete the configured OAuth flow before protected routes can be used. The configured owner identity is promoted to `admin` by the existing user upsert logic. Additional users default to `user` unless their database role is changed to `staff` or `admin` through an approved administrative process.

## Application routes

| Route | Audience | Purpose |
| --- | --- | --- |
| `/` | Everyone | Overview, sign-in entry point, and explanation of the escalation workflow. |
| `/submit` | Authenticated users | Submit a complaint and optional attachments. |
| `/my-complaints` | Authenticated users | List the caller's complaints. |
| `/complaints/:id` | Complaint owner | Read the caller's own complaint and attachments. |
| `/staff` | Staff/admin | Search and filter the operational complaint queue. |
| `/staff/complaints/:id` | Staff/admin | Read, assign, prioritize, and update a complaint. |
| `/404` | Everyone | Fallback page. |

The route is not the security boundary. The server re-checks authentication, role, and complaint ownership for every protected tRPC procedure.

## User roles and access control

| Role | Access |
| --- | --- |
| `user` | Create complaints, list own complaints, read own complaint details and attachments. |
| `staff` | All user capabilities plus queue access, all complaint reads, assignment, priority changes, and status changes. |
| `admin` | All staff capabilities. The MVP does not include a role-management screen. |

The API rejects unauthorized calls with tRPC authorization errors. A user cannot read another user's complaint by changing an identifier in the URL because `complaints.getById` applies an ownership predicate unless the caller is staff or admin.

## Complaint attachments

Users can add optional supporting files during complaint submission. The current MVP accepts a maximum of three files per complaint and a maximum of 8 MiB per file.

| Accepted category | MIME types |
| --- | --- |
| Images | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Documents | `application/pdf`, Microsoft Word `.doc` and `.docx` MIME types |
| Text | `text/plain` |

The browser displays a filename and size before submission. The server validates MIME type, base64 payload size, filename length, and attachment count again. The original filename is retained as metadata for display. The storage key uses a generated UUID and a sanitized filename to avoid path traversal and collisions.

The upload flow is:

1. The browser reads each selected file as base64 for the MVP request contract.
2. The protected `complaints.create` procedure validates the complaint and attachment metadata.
3. The server writes the complaint record.
4. The server uploads each file through `storagePut` to the configured object storage service.
5. The server stores attachment metadata, including the storage key and `/manus-storage/` URL.
6. Authorized users and staff see links on the complaint detail page.

This approach is intentionally simple for an MVP. A production implementation should use multipart or direct-to-storage uploads for larger files, virus/malware scanning, content inspection, upload progress, orphan cleanup, and stronger attachment lifecycle controls.

## Testing and quality checks

Run the complete local quality sequence before submitting changes:

```bash
pnpm check
pnpm test
pnpm build
```

The test suite currently covers the following behavior:

| Test area | Coverage |
| --- | --- |
| Authentication | Logout clears the configured session cookie. |
| Authorization | Regular users cannot open the staff queue. |
| Complaint validation | Short complaint descriptions are rejected. |
| Attachment validation | Unsupported attachment MIME types are rejected before storage is called. |
| Build validation | Vite client and bundled Express server compile successfully. |

For a manual smoke test, sign in and perform the following sequence:

1. Open `/submit`.
2. Enter a subject and a description of at least 20 characters.
3. Choose **Supporting files** and select a small `.txt`, `.png`, or `.pdf` file.
4. Confirm that the selected filename and size appear.
5. Submit the complaint.
6. Open the newly created complaint from `/my-complaints`.
7. Confirm that the supporting file appears as a link.
8. Open `/staff` as a staff/admin user and confirm the complaint appears in the queue.
9. Confirm that a regular user cannot access another user's complaint by identifier.

## Production build

Create the production client and server bundle with:

```bash
pnpm build
```

This command runs `vite build` and bundles the Express entrypoint to `dist/index.js`. Start the bundle with:

```bash
pnpm start
```

Production requires the same server-side environment variables as local development. The runtime must be able to reach the configured database, OAuth server, and storage service. The application is designed to run as one Node process and does not require a background worker.

## Project structure

```text
client/
  src/
    components/       Shared layout and UI components.
    pages/            Route-level React pages.
    lib/trpc.ts       Typed tRPC client binding.
    App.tsx           Route registration and providers.
    index.css         Global design tokens and styles.
drizzle/
  schema.ts           Database tables and inferred types.
  migrations/         Generated migration metadata and SQL.
server/
  _core/              OAuth, Express, tRPC, environment, and storage proxy infrastructure.
  db.ts               Drizzle query and mutation helpers.
  routers.ts          Typed API procedures and authorization checks.
  storage.ts          Manus storage upload helper.
  *.test.ts           Vitest server tests.
docs/
  implementation-plan.md  MVP assumptions, architecture, risks, and acceptance criteria.
```

Avoid editing framework files under `server/_core` unless infrastructure behavior must change. Keep feature-specific database access in `server/db.ts` and feature contracts in `server/routers.ts`.

## Troubleshooting

### `DATABASE_URL is required to run drizzle commands`

The shell cannot see `DATABASE_URL`. Confirm that `.env` exists at the repository root and that the variable is exported or loaded by the command environment. Confirm that the URL contains the correct host, port, database name, username, and password.

### The application starts but protected routes show a sign-in state

Confirm that the OAuth application ID, OAuth server URL, portal URL, and callback configuration match the current environment. Clear stale cookies and repeat the login flow. Inspect the server log for OAuth callback errors without printing session tokens.

### Attachments fail with a storage configuration error

Confirm that `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` are present on the server. The storage helper requests a presigned upload URL from Forge and then uploads the bytes to object storage. Do not place the Forge API key in a browser environment variable.

### Attachments are rejected

Check the file type and size. The MVP allows three files per complaint and 8 MiB per file. A browser may report an empty MIME type for an unusual file extension; use one of the supported formats and retry.

### The port is already in use

Set a different preferred port for the development command:

```bash
PORT=3100 pnpm dev
```

### The database schema is out of sync

Do not edit production tables manually. Compare `drizzle/schema.ts` with the latest generated migration, run `pnpm drizzle-kit generate`, review the SQL, and apply the migration through the environment's approved migration path.

## Security and privacy notes

Complaint descriptions and attachments may contain sensitive information. The UI asks users not to submit passwords, payment details, or unnecessary personal information. Authorized staff can read complaint content and attachments. The application does not currently provide a legal privacy notice, formal consent registry, retention automation, malware scanning, rate limiting, audit history, or data-subject request workflow.

Before production use, define a retention schedule, access-review process, incident response plan, backup policy, attachment scanning policy, legal notice, and data classification rules. Add structured server logs that exclude complaint bodies, attachment contents, session cookies, and credentials.

## Known limitations

The MVP does not implement role-management UI, email or SMS notifications, SLA timers, complaint history, bulk actions, exports, reporting, multilingual content, attachment deletion, attachment versioning, or external LEHME integrations. The base64 upload request is appropriate for small MVP files but should be replaced by multipart or direct-to-storage upload for larger production workloads.

## References

[1]: https://react.dev/ "React documentation"

[2]: https://www.typescriptlang.org/docs/ "TypeScript documentation"

[3]: https://orm.drizzle.team/docs/overview "Drizzle ORM documentation"

[4]: https://trpc.io/docs "tRPC documentation"

[5]: https://vite.dev/guide/ "Vite guide"
