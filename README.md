# imsometa

A metadata scraping service built with Bun, Hono, React, Drizzle ORM, and Playwright.

## Development

This project relies on [Playwright](https://playwright.dev/) for browser-based scraping and uses **SQLite** (via Bun's built-in driver) for persistence. The recommended way to run the app locally is via **Docker Compose**, which handles all of that automatically.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### Running locally

```bash
docker compose up
```

This builds the image (based on the official Playwright Docker image), runs any pending database migrations, and starts the app at [http://localhost:3000](http://localhost:3000) with **hot reloading** enabled — changes to source files are picked up automatically. The SQLite database is stored in a named Docker volume (`app_data`).

To rebuild the image after changing dependencies (e.g. `package.json`):

```bash
docker compose up --build
```

## Database & migrations

The database schema lives in [`src/lib/schema.ts`](src/lib/schema.ts). Migrations are managed with [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) and live in the `drizzle/` directory. The SQLite file is stored at `./data/imsometa.db` (inside the container, mounted as a named volume in Docker).

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

If you have Playwright's browser dependencies installed:

```bash
bun install
bun run db:migrate
bun dev        # development with hot reloading
bun start      # production mode
```

The database file will be created at `./data/imsometa.db` automatically. Set `DATABASE_PATH` to override the location.

> **Note:** This is not recommended for most developers. The Docker Compose setup is the reliable path.

## Proxies

Both scraping methods support optional proxy configuration via environment variables. If an env var is unset the method connects directly.

| Variable | Used by | Recommended type |
|---|---|---|
| `PROXY_DATACENTER` | `fetch` method | Webshare rotating datacenter |
| `PROXY_RESIDENTIAL` | Playwright method | Webshare rotating residential |

Webshare exposes a **single rotating endpoint** for each proxy type — it cycles through your pool automatically, so you only need one URL per variable.

Create or update your `.env` file (never commit this):

```env
# .env
PROXY_DATACENTER=http://username:password@p.webshare.io:80
PROXY_RESIDENTIAL=http://username:password@p.webshare.io:8080
```

The exact hostnames and ports are shown in your Webshare dashboard under **Proxy → Access credentials**. Both variables are completely optional — omit either to connect without a proxy for that method.

## Deploying to a NAS (or any Docker host)

The recommended production path is to publish the image to Docker Hub via CI and pull it on your NAS using the provided [`docker-compose.prod.yml`](docker-compose.prod.yml).

### 1. Publish the image to Docker Hub

The GitHub Actions workflow in [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) builds a **multi-platform image** (`linux/amd64` + `linux/arm64`) and pushes it to Docker Hub automatically on every push to `main`.

**One-time setup:**

1. Create a [Docker Hub](https://hub.docker.com/) account and a repository named `imsometa`.
2. Generate a Docker Hub **Access Token** (Account Settings → Security → New Access Token).
3. In your GitHub repository go to **Settings → Secrets and variables → Actions** and add:
   - `DOCKERHUB_USERNAME` — your Docker Hub username
   - `DOCKERHUB_TOKEN` — the access token you just created

From then on, pushing to `main` (or pushing a `v*` tag) triggers the workflow and your image lands at `your-username/imsometa:latest`.

> **Note:** The first build takes a while because it cross-compiles the ARM image under QEMU emulation. Subsequent builds are fast thanks to GitHub Actions layer caching.

### 2. Deploy on your NAS

Copy [`docker-compose.prod.yml`](docker-compose.prod.yml) to your NAS (no other files needed) and start the stack:

```bash
IMAGE=your-dockerhub-username/imsometa:latest docker compose -f docker-compose.prod.yml up -d
```

The app will be available on port **3000**. The SQLite database is stored in a named Docker volume (`app_data`) so it persists across container restarts and updates. Migrations run automatically on startup.

To pull and restart with the latest image:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Manual one-off build & push

If you want to push manually without GitHub Actions:

```bash
docker buildx create --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-dockerhub-username/imsometa:latest \
  --push \
  .
```
