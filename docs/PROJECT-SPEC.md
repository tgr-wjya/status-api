# PROJECT: DOCKER MASTERY

## THE CHALLENGE

You will learn Docker by doing it — no scaffolding, no LLM writing your config files. Every file you write yourself. The app is intentionally trivial because **the app is not the point.**

---

## THE APP

A **System Status API**. Three endpoints, that's it.

- `GET /` — returns app name, version, uptime
- `GET /health` — returns `{ status: "ok" }` with `200`, or `{ status: "degraded" }` with `503`
- `GET /echo` — returns whatever JSON body you send it

No file I/O. No database. No auth. Pure in-memory. You've built all of this before in an hour — do it in 30 minutes and move on to the real work.

---

## MILESTONE 1: WRITE THE DOCKERFILE

**Goal:** Understand every line you write. No copy-paste.

### Requirements
- Base image: `oven/bun:latest`
- Working directory: `/app`
- Copy `package*.json` first, then source code (you know why)
- Install deps, expose port, define start command

### Success Criteria
- ✅ `docker build -t status-api .` succeeds
- ✅ `docker run -p 3000:3000 status-api` starts the server
- ✅ `GET /health` returns 200 from inside the container
- ✅ You can explain every single line in the file without looking it up

---

## MILESTONE 2: DOCKER COMPOSE

**Goal:** Run a multi-container setup locally.

### Requirements
Add a second service: **Redis** (you won't use it yet — you're just learning how services talk to each other).

```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Success Criteria
- ✅ `docker compose up` starts both containers
- ✅ `docker compose down` tears both down cleanly
- ✅ You understand what `depends_on` does and what it **doesn't** guarantee
- ✅ You understand why the hostname is `redis` and not `localhost`

---

## MILESTONE 3: GITHUB ACTIONS CI

**Goal:** Tests run automatically on every push.

### Requirements
Write `.github/workflows/ci.yml` yourself:
- Trigger on push to all branches, PR to main
- Steps: checkout → setup bun → install deps → type check → run tests

### Success Criteria
- ✅ Push a branch, watch the action run in the GitHub UI
- ✅ Break a test intentionally, confirm the action fails
- ✅ Fix it, confirm it goes green
- ✅ You understand the difference between `on: push` and `on: pull_request`

---

## MILESTONE 4: CIRCLECI CI

**Goal:** Same pipeline, different platform. Understand the differences.

### Requirements
Write `.circleci/config.yml` yourself (no copying from guestbook-api):
- Use `oven/bun:latest` as the Docker executor
- Same steps as GitHub Actions
- Add dependency caching with `bun.lock` checksum

### Success Criteria
- ✅ Both GitHub Actions AND CircleCI pass on the same push
- ✅ You can explain one concrete difference between the two platforms
- ✅ Cache actually works — second run is faster than first

---

## MILESTONE 5: DEPLOY TO AZURE CONTAINER APPS

**Goal:** A real URL that anyone can hit — on infrastructure you'll actually keep using.

### Why Azure Container Apps
Azure for Students credit is renewable. You're not racing a clock. ACA handles ingress, TLS, scaling, and env vars without you managing VMs or Kubernetes. It's the right level of abstraction for a portfolio deployment you want to stay alive.

### Requirements
- Push your Docker image to **Azure Container Registry (ACR)**
- Deploy to **Azure Container Apps** using that image
- Set environment variables through the Azure portal or CLI
- Confirm `GET /health` returns 200 at your live URL

### The Flow
```
docker build → ACR (your private registry) → Azure Container Apps (pulls from ACR and runs it)
```

### Steps (do these yourself — hints only)
1. Create a Resource Group: `az group create --name docker-mastery-rg --location southeastasia`
2. Create an ACR: `az acr create --resource-group docker-mastery-rg --name <yourname>acr --sku Basic`
3. Build and push your image to ACR: `az acr build --registry <yourname>acr --image status-api:latest .`
4. Create a Container Apps environment and deploy

### Success Criteria
- ✅ Live URL works
- ✅ Image lives in ACR, not Docker Hub
- ✅ Environment variables are set through Azure, not hardcoded
- ✅ You understand what Azure Container Apps is actually doing with your image
- ✅ You can redeploy by pushing a new image to ACR and updating the revision

---

## BONUS MILESTONE A: CD WITH GITHUB ACTIONS → ACR

**Goal:** Push to main, image builds and pushes to ACR automatically.

### Requirements
Extend your `ci.yml`:
- After tests pass on main, build and push the Docker image to ACR
- Use GitHub Secrets for Azure credentials (never hardcode them)

```yaml
- name: Log in to ACR
  uses: azure/docker-login@v1
  with:
    login-server: ${{ secrets.ACR_LOGIN_SERVER }}
    username: ${{ secrets.ACR_USERNAME }}
    password: ${{ secrets.ACR_PASSWORD }}

- name: Build and push
  run: |
    docker build -t ${{ secrets.ACR_LOGIN_SERVER }}/status-api:latest .
    docker push ${{ secrets.ACR_LOGIN_SERVER }}/status-api:latest
```

### Success Criteria
- ✅ Push to main triggers a new image build and push to ACR
- ✅ No credentials in code — all in GitHub Secrets
- ✅ You understand why `ACR_PASSWORD` is a service principal secret, not your personal Azure password

---

## BONUS MILESTONE B: MULTI-STAGE DOCKERFILE

**Goal:** Smaller, production-appropriate image.

```dockerfile
# Stage 1 — install everything
FROM oven/bun:latest AS builder
WORKDIR /app
COPY package*.json ./
RUN bun install
COPY . .

# Stage 2 — only what's needed to run
FROM oven/bun:latest AS runner
WORKDIR /app
COPY --from=builder /app .
CMD ["bun", "index.ts"]
```

### Success Criteria
- ✅ `docker images` shows the multi-stage image is smaller than your original
- ✅ You can explain what `COPY --from=builder` is doing
- ✅ App still works after deploy to ACA from the smaller image

---

## WHAT YOU'RE NOT ALLOWED TO DO

- Scaffold the Dockerfile, `ci.yml`, or `config.yml` with an LLM
- Copy configs from guestbook-api
- Move to the next milestone without passing the current one's success criteria

You can ask for hints. You cannot ask for the solution.

---

## STACK

- Runtime: Bun + Elysia
- Container: Docker
- Compose: Docker Compose v2
- CI: GitHub Actions + CircleCI
- Registry: Azure Container Registry (ACR)
- Deploy: Azure Container Apps (ACA)

Good luck.
