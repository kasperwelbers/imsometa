# imsometa

A metadata scraping service built with Bun, Hono, React, Drizzle ORM, and Playwright.

## Development

This project relies on [Playwright](https://playwright.dev/) for browser-based scraping, and [PostgreSQL](https://www.postgresql.org/) for persistence. The recommended way to run the app locally is via **Docker Compose**, which handles all of that automatically.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### Running locally

```bash
docker compose up
```

This builds the image (based on the official Playwright Docker image), starts a PostgreSQL container, runs any pending database migrations, and starts the app at [http://localhost:3000](http://localhost:3000) with **hot reloading** enabled — changes to source files are picked up automatically.

To rebuild the image after changing dependencies (e.g. `package.json`):

```bash
docker compose up --build
```

## Database & migrations

The database schema lives in [`src/lib/schema.ts`](src/lib/schema.ts). Migrations are managed with [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) and live in the `drizzle/` directory.

### Workflow for schema changes

1. Edit `src/lib/schema.ts`
2. Generate a new migration file:
   ```bash
   bun run db:generate
   ```
3. Commit the generated file in `drizzle/`
4. Restart the server — migrations are applied automatically on startup via `initDb()`

### Other database commands

```bash
# Apply migrations manually (useful in CI / production)
bun run db:migrate

# Open Drizzle Studio (browser-based DB viewer)
bun run db:studio
```

> When running inside Docker, prefix commands with `docker compose exec app`:
> ```bash
> docker compose exec app bun run db:generate
> docker compose exec app bun run db:studio
> ```

## API

### Single URL scrape
```
GET /meta?url=https://example.com
```

Optional parameters (must go before `url=`):
- `method=fetch|playwright|both` (default: `both`)
- `cache=true|false|refresh` (default: `true`)

### Batch processing
```
POST /batch
{ "urls": ["https://..."], "tag": "optional-tag", "method": "both" }

GET /batch              — list all batches
GET /batch/:id          — single batch status
GET /queue/stats        — global pending/processing counts
```

### Results
```
GET /results?tag=<tag>&batchId=<id>&after=<cursor>&limit=50
GET /results/export?tag=<tag>&batchId=<id>   — download as JSON
```

## Running without Docker

If you have Playwright's browser dependencies and a local PostgreSQL instance:

```bash
bun install
export DATABASE_URL=postgres://user:pass@localhost:5432/imsometa
bun run db:migrate
bun dev        # development with hot reloading
bun start      # production mode
```

> **Note:** This is not recommended for most developers. The Docker Compose setup is the reliable path.

## Production

```bash
docker build -t imsometa .
docker run -p 3000:3000 -e DATABASE_URL=postgres://... imsometa
```
