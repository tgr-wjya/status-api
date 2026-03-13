# Docker & CI — Practical Reference

> Written for someone who already understands backend APIs and just needs the Docker/CI mental model to piece things together.

---

## PART 1: DOCKER

### The Mental Model

Your app works on your machine. It might not work on someone else's — different OS, different Bun version, different environment variables. Docker solves this by packaging your app *and everything it needs to run* into a single unit called an **image**. Run that image anywhere and it behaves identically.

```
Your code + runtime + dependencies + config = Image
Image running = Container
```

- **Image** — the blueprint. Built once, reused everywhere.
- **Container** — a running instance of an image. You can run many containers from one image.

---

### The Dockerfile

A Dockerfile is just a recipe for building an image. Each line is an instruction.

```dockerfile
FROM node:20-alpine

WORKDIR /srv

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
```

Line by line:

- `FROM node:20-alpine` — start from an existing base image (Node 20 on Alpine Linux). You're not building from scratch — you're layering on top of something that already has your runtime.
- `WORKDIR /srv` — all subsequent commands run from this directory inside the container. Creates it if it doesn't exist.
- `COPY package*.json ./` — copy *only* the package files first. Why? Keep reading.
- `RUN npm install` — install dependencies inside the container.
- `COPY . .` — now copy the rest of your source code.
- `EXPOSE 8080` — documentation only. Tells Docker (and humans) what port the app listens on. Does not actually publish the port.
- `CMD ["node", "server.js"]` — what runs when the container starts. Only one `CMD` per Dockerfile — last one wins.

---

### Why `COPY package*.json` before `COPY . .`?

Docker builds images in **layers**. Each instruction is a layer. Layers are cached — if nothing changed, Docker reuses the cached layer instead of rebuilding it.

```dockerfile
COPY package*.json ./   # Layer A — rarely changes
RUN npm install         # Layer B — only rebuilds if Layer A changed
COPY . .                # Layer C — changes every time you edit code
```

If you change `server.js`, only Layer C rebuilds. Layers A and B are reused from cache — `npm install` doesn't run again.

If you flip the order:

```dockerfile
COPY . .                # changes every time
RUN npm install         # cache busted — reinstalls every single build
```

Every code change triggers a full reinstall. With a large `node_modules`, that's painful.

---

### Building and Running

```bash
# Build an image, tag it as "my-app"
docker build -t my-app .

# Run a container from that image
# -p 8080:8080 → map host port 8080 to container port 8080
docker run -p 8080:8080 my-app

# Run in detached mode (background)
docker run -d -p 8080:8080 my-app

# List running containers
docker ps

# Stop a container
docker stop <container-id>

# See all images
docker images
```

The `-p host:container` flag is how you actually expose a port. `EXPOSE` in the Dockerfile is just a note — `-p` is what makes it reachable.

---

### Environment Variables

```dockerfile
# Set a default inside the Dockerfile
ENV NODE_ENV=production

# Or pass it at runtime
```

```bash
docker run -p 8080:8080 -e DATABASE_URL=postgres://... my-app
```

Runtime variables override Dockerfile defaults. Never hardcode secrets in a Dockerfile — pass them in at runtime or use a secrets manager.

---

### Docker Compose

Running one container is fine. Running multiple containers that need to talk to each other (app + database, app + cache) is what Compose is for.

```yaml
# docker-compose.yml
services:
  web:
    build: .
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://cache:6379
    depends_on:
      - cache

  cache:
    image: redis:alpine
    ports:
      - "6379:6379"
```

Key things:

**Service names are hostnames.** Inside the `web` container, you reach Redis at `redis://cache:6379` — not `localhost`. Each service gets its own network identity using the service name as the hostname. `localhost` inside a container is the container itself, not another container.

**`depends_on` starts services in order — but doesn't wait for them to be ready.** It means "start `cache` before `web`", not "wait until Redis is accepting connections before starting `web`". If your app crashes because the database isn't ready yet, `depends_on` alone won't fix it. You need a healthcheck or retry logic in your app.

```bash
# Start everything
docker compose up

# Start in background
docker compose up -d

# Tear everything down
docker compose down

# Rebuild images before starting
docker compose up --build

# See logs
docker compose logs web
```

---

### Multi-Stage Builds

Your dev environment needs TypeScript compiler, test tools, build scripts. Your production container doesn't. Multi-stage builds let you use a fat image to build and a slim image to run.

```dockerfile
# Stage 1 — build
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build   # compiles TS → JS into /app/dist

# Stage 2 — run
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev
CMD ["node", "dist/server.js"]
```

`COPY --from=builder` pulls files from the `builder` stage into the `runner` stage. The `builder` stage doesn't ship — only `runner` ends up in the final image. Smaller image, smaller attack surface, faster pull times.

```bash
# Check image sizes
docker images
```

---

## PART 2: GITHUB ACTIONS

### The Mental Model

Every push to GitHub can trigger a workflow. A workflow is just a YAML file that runs a sequence of steps on a fresh virtual machine. Steps are things like "checkout code", "install deps", "run tests".

```
push → GitHub spins up a VM → your steps run → pass or fail
```

---

### Basic Workflow Structure

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches:
      - '**'        # all branches
  pull_request:
    branches:
      - main        # only PRs targeting main

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test
```

Anatomy:

- `on` — what triggers this workflow. `push` fires on any push. `pull_request` fires when a PR is opened or updated.
- `jobs` — parallel units of work. Each job runs on its own VM.
- `runs-on` — the VM type. `ubuntu-latest` is the standard choice.
- `steps` — sequential tasks inside a job.
- `uses` — runs a pre-built action from the marketplace. `actions/checkout` checks out your repo. `actions/setup-node` installs Node.
- `run` — runs a shell command directly.

---

### `on: push` vs `on: pull_request`

```yaml
on:
  push:
    branches:
      - main          # fires when you push directly to main
  pull_request:
    branches:
      - main          # fires when a PR targets main
```

Common pattern: run CI on every branch push (catch errors early), but also on PRs to main (gate merges). You can have both:

```yaml
on:
  push:
    branches:
      - '**'
  pull_request:
    branches:
      - main
```

This means: "run on every push to any branch, and also on any PR targeting main."

---

### Caching Dependencies

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Setup Node
    uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'npm'      # built-in cache for npm

  - name: Install dependencies
    run: npm ci
```

`cache: 'npm'` tells the action to cache `node_modules` keyed by `package-lock.json`. If the lockfile hasn't changed, deps are restored from cache instead of reinstalled.

For runtimes without built-in cache support, you do it manually:

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: ~/.cache/custom-runtime
    key: deps-${{ hashFiles('**/lockfile') }}
    restore-keys: deps-

- name: Install
  run: custom-runtime install
```

`hashFiles('**/lockfile')` generates a hash of your lockfile — same concept as CircleCI's `{{ checksum }}`.

---

## PART 3: CIRCLECI

### The Mental Model

Same idea as GitHub Actions — push code, pipeline runs. The differences are in syntax, executor model, and how caching works.

---

### Basic Config Structure

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  build-and-test:
    docker:
      - image: node:20-alpine     # the executor — runs your steps inside this container

    steps:
      - checkout

      - restore_cache:
          keys:
            - npm-deps-{{ checksum "package-lock.json" }}
            - npm-deps-

      - run:
          name: Install dependencies
          command: npm install

      - save_cache:
          key: npm-deps-{{ checksum "package-lock.json" }}
          paths:
            - node_modules

      - run:
          name: Run tests
          command: npm test

workflows:
  version: 2
  build:
    jobs:
      - build-and-test
```

---

### Executors: Docker vs Machine

CircleCI runs your steps inside an executor. The two most common:

```yaml
# Docker executor — lightweight, fast startup
docker:
  - image: node:20-alpine

# Machine executor — full VM, slower but more capable
machine:
  image: ubuntu-2204:current
```

Docker executor runs your steps inside the specified container. If you need Docker-in-Docker (building images inside CI), you need the machine executor or Docker Layer Caching add-on.

---

### Caching in CircleCI

```yaml
- restore_cache:
    keys:
      - npm-deps-{{ checksum "package-lock.json" }}
      - npm-deps-       # fallback — restore any cache with this prefix

- run: npm install

- save_cache:
    key: npm-deps-{{ checksum "package-lock.json" }}
    paths:
      - node_modules
```

`{{ checksum "package-lock.json" }}` generates a unique key from the lockfile contents. If the lockfile changes, cache key changes, full reinstall. If not, cache is restored and install is skipped.

The fallback key `npm-deps-` matters. On the very first run (no cache exists), CircleCI looks for the exact key, fails, then tries the fallback prefix. It finds the most recent cache that starts with `npm-deps-` — even if it's from a different lockfile. Partial restoration is faster than nothing. Then after install, it saves a fresh cache with the new exact key.

---

### Workflows: Controlling When Jobs Run

```yaml
workflows:
  version: 2
  deploy:
    jobs:
      - test
      - deploy:
          requires:
            - test          # deploy only runs if test passes
          filters:
            branches:
              only: main    # deploy only on main branch
```

`requires` creates a dependency between jobs. `filters` restricts which branches trigger a job. Common pattern: test on every branch, deploy only when tests pass on main.

---

## PART 4: AZURE DEPLOYMENT

### The Mental Model

Your Docker image needs to live somewhere before it can run in the cloud. That somewhere is a **container registry** — Azure's is called ACR (Azure Container Registry). Once your image is in ACR, Azure Container Apps pulls it and runs it.

```
Local build → ACR (private registry) → Azure Container Apps (runs it, gives you a URL)
```

You manage the image. Azure manages the runtime, TLS, ingress, and scaling.

---

### Key Concepts

**Resource Group** — a logical container for all your Azure resources. Think of it as a folder. Everything for one project lives in one group, and you can delete the whole group to clean up.

**ACR (Azure Container Registry)** — your private Docker registry hosted on Azure. Like Docker Hub but private and integrated with the rest of Azure. Azure Container Apps can pull from it directly without you juggling credentials manually.

**Azure Container Apps (ACA)** — the deployment target. It runs your container, exposes an HTTPS URL, handles scaling, and lets you set environment variables. Abstracts away VMs and Kubernetes — you just give it an image and a port.

**Revision** — every time you deploy a new image, ACA creates a new revision. You can roll back to a previous one instantly.

---

### Setup: CLI First

Install the Azure CLI and log in:

```bash
az login
az account set --subscription <your-subscription-id>
```

Create a resource group:

```bash
az group create \
  --name docker-mastery-rg \
  --location southeastasia
```

`southeastasia` is the closest region to Indonesia (Singapore). Use it for your projects unless you have a reason not to.

---

### Azure Container Registry

```bash
# Create the registry (name must be globally unique, alphanumeric only)
az acr create \
  --resource-group docker-mastery-rg \
  --name <yourname>acr \
  --sku Basic

# Build and push directly from source — no local docker daemon needed
az acr build \
  --registry <yourname>acr \
  --image status-api:latest .

# Or if you want to build locally first, then push
az acr login --name <yourname>acr
docker build -t <yourname>acr.azurecr.io/status-api:latest .
docker push <yourname>acr.azurecr.io/status-api:latest
```

`az acr build` is the cleaner path — it uploads your source to Azure and builds there. No need for Docker Desktop locally.

---

### Azure Container Apps

```bash
# Install the ACA extension if you don't have it
az extension add --name containerapp --upgrade

# Create a Container Apps environment (the cluster that hosts your apps)
az containerapp env create \
  --name docker-mastery-env \
  --resource-group docker-mastery-rg \
  --location southeastasia

# Deploy your app
az containerapp create \
  --name status-api \
  --resource-group docker-mastery-rg \
  --environment docker-mastery-env \
  --image <yourname>acr.azurecr.io/status-api:latest \
  --registry-server <yourname>acr.azurecr.io \
  --target-port 3000 \
  --ingress external \
  --env-vars PORT=3000 NODE_ENV=production

# Get your live URL
az containerapp show \
  --name status-api \
  --resource-group docker-mastery-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

`--ingress external` makes it publicly accessible. `--target-port` must match what your app actually listens on.

---

### Updating a Deployment

When you push a new image to ACR:

```bash
# Update the container app to use the new image
az containerapp update \
  --name status-api \
  --resource-group docker-mastery-rg \
  --image <yourname>acr.azurecr.io/status-api:latest
```

This creates a new revision. The old one stays around until you clean it up.

---

### Environment Variables

Set them at deploy time or update them later:

```bash
az containerapp update \
  --name status-api \
  --resource-group docker-mastery-rg \
  --set-env-vars HEALTH_DEGRADED=false NEW_VAR=somevalue
```

Secrets (things you don't want in your shell history):

```bash
az containerapp secret set \
  --name status-api \
  --resource-group docker-mastery-rg \
  --secrets db-password=supersecret

# Then reference the secret as an env var
az containerapp update \
  --name status-api \
  --resource-group docker-mastery-rg \
  --set-env-vars DB_PASSWORD=secretref:db-password
```

---

### CD: GitHub Actions → ACR → ACA

The full automated pipeline — tests pass, image builds, deploys automatically:

```yaml
# Add to your existing ci.yml, as a new job
  deploy:
    needs: test           # only runs if test job passes
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'   # only on main

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and push to ACR
        run: |
          az acr build \
            --registry ${{ secrets.ACR_NAME }} \
            --image status-api:${{ github.sha }} \
            --image status-api:latest .

      - name: Deploy to Container Apps
        run: |
          az containerapp update \
            --name status-api \
            --resource-group docker-mastery-rg \
            --image ${{ secrets.ACR_NAME }}.azurecr.io/status-api:${{ github.sha }}
```

**GitHub Secrets you need:**
- `AZURE_CREDENTIALS` — a service principal JSON. Generate with: `az ad sp create-for-rbac --sdk-auth`
- `ACR_NAME` — your registry name without the `.azurecr.io` suffix

Tagging with `${{ github.sha }}` gives every deploy a unique, traceable tag. `latest` is a convenience alias on top of that.

---

## PART 5: PLATFORM COMPARISON

| | GitHub Actions | CircleCI | Azure (ACA) |
|---|---|---|---|
| Config location | `.github/workflows/*.yml` | `.circleci/config.yml` | Azure Portal / CLI |
| Executor | `runs-on: ubuntu-latest` | `docker: - image: ...` | Managed (no config) |
| Caching | `actions/cache@v4` or built-in | `restore_cache` / `save_cache` | N/A |
| Cache key syntax | `${{ hashFiles(...) }}` | `{{ checksum "..." }}` | N/A |
| Pre-built steps | `uses: actions/setup-node@v4` | Custom orbs | Azure CLI actions |
| Free tier | Generous for public repos | 6000 free credits/month | Azure for Students ($100 renewable) |
| Docker builds | `az acr build` from CI | Needs machine executor | Native via ACR |
| Best for | CI pipelines | Complex pipeline logic | Deployment target |

---

## Quick Reference

```bash
# Docker
docker build -t my-app .
docker run -p 3000:3000 my-app
docker run -d -p 3000:3000 -e PORT=3000 my-app
docker ps
docker stop <id>
docker images
docker compose up
docker compose up --build
docker compose down

# Inspect a running container
docker exec -it <id> sh

# See container logs
docker logs <id>
docker compose logs <service>

# Azure
az group create --name <rg> --location southeastasia
az acr create --resource-group <rg> --name <name>acr --sku Basic
az acr build --registry <name>acr --image <app>:latest .
az containerapp env create --name <env> --resource-group <rg> --location southeastasia
az containerapp create --name <app> --resource-group <rg> --environment <env> --image <name>acr.azurecr.io/<app>:latest --target-port 3000 --ingress external
az containerapp update --name <app> --resource-group <rg> --image <name>acr.azurecr.io/<app>:latest
az containerapp show --name <app> --resource-group <rg> --query properties.configuration.ingress.fqdn --output tsv
```
