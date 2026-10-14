# Aquarium Manager

Track tanks, livestock, water tests and maintenance. Practice project: React + TypeScript, GraphQL on Node, PostgreSQL, S3, Terraform.

Only `server/` exists so far. The React client, S3 uploads, Terraform and OAuth come later.

## Prerequisites

- Node.js 22 or newer recommended (20.6+ works; odd-numbered releases such as 21 run but print engine warnings)
- PostgreSQL running on `localhost:5432`

## First-time setup

Create the local database role and the dev and test databases. This needs a Postgres superuser:

```bash
psql -d postgres < server/scripts/setup-db.sql
```

If your Linux user isn't a Postgres superuser, run it as `postgres` instead: `sudo -u postgres psql < server/scripts/setup-db.sql`.

Install dependencies and configure the environment:

```bash
cd server
npm install
cp .env.example .env
cp .env.test.example .env.test
```

Create the tables and load the species catalog:

```bash
npm run db:migrate -- --name init
npm run db:import-species
```

## Day to day

| Command | What it does |
|---|---|
| `npm run dev` | Start the GraphQL API on http://localhost:4000 with reload |
| `npm test` | Migrate the test database, then run the tests against it |
| `npm run typecheck` | Type-check without emitting |
| `npm run db:migrate -- --name <change>` | Create and apply a migration after editing `prisma/schema.prisma` |
| `npm run db:import-species [file.csv]` | Validate and upsert the species catalog |
| `npm run db:studio` | Browse the database in Prisma Studio |

Opening http://localhost:4000 in a browser gives you Apollo Sandbox for trying queries.

## Layout

```
server/
  prisma/schema.prisma      data model
  prisma/seed/species.csv   species catalog source
  scripts/                  database setup and the species import
  src/typeDefs.ts           GraphQL schema
  src/resolvers.ts          GraphQL resolvers
  src/context.ts            per-request context (database client, current user)
  src/server.ts             builds the Apollo server (used by index.ts and tests)
  src/index.ts              entry point
  test/                     API tests that run against a real Postgres database
```

There is no login yet. `src/index.ts` creates a single dev user and every request runs as that user.

code --folder-uri vscode-remote://wsl+ubuntu/home/kevin-linux/Projects/aquarium-manager
