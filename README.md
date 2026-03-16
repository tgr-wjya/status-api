# docker-mastery2

[![CircleCI](https://dl.circleci.com/status-badge/img/circleci/85F8zZ7ostSSLjq88Rwb8X/HokgEug1DmtoUsvHEmuyC8/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/circleci/85F8zZ7ostSSLjq88Rwb8X/HokgEug1DmtoUsvHEmuyC8/tree/main)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/tgr-wjya/docker-mastery2/ci.yml)
[![codecov](https://codecov.io/gh/tgr-wjya/docker-mastery2/graph/badge.svg?token=4fn6sa5jB7)](https://codecov.io/gh/tgr-wjya/docker-mastery2)

## 17 March 2026

> **minimal api. maximum infrastructure**

actually deploying my app with my own written **dockerfile** and **ci pipeline** from scratch without llm scaffolding help

deployed on azure using azure container registries which then deployed on container app

the goal is to learn and write the deployment config on my own.

understanding docker is an integral part of becoming a devops engineer. scaffolding it won't help me learn anything. what's a backend engineer worth without knowing devops?

## live url

**check the container app here**: [status-api](https://status-api.ashypebble-debb1f65.southeastasia.azurecontainerapps.io/)

> ps: azure container app is designed to aggresively scale to zero when they're idle, so expect your request to take a long time!

it's coming don't worry, but its ridicolously slow for an endpoint, i've tested, and its a mindboggling `~17s`. to cut down cust, i've decided not to enable the `min_replica`.

so, if you really have the time to check it out, thank you so much!

## openapi documentation

**check out the openapi documentation here**: [status-api swagger docs](https://status-api.ashypebble-debb1f65.southeastasia.azurecontainerapps.io/swagger)

## endpoints

| method        | what it does                                                                  |
| ------------- | ----------------------------------------------------------------------------- |
| `GET /`       | app name, author, version and uptime                                          |
| `GET /health` | returns `{ status: "ok" }` with `200`, or `{ status: "degraded" }` with `503` |
| `POST /echo`  | returns whatever JSON body you send it                                        |

## what i learned

- `WORKDIR` just sets where commands run inside the container.
- so, if your project structure look like this:
- ```
  /app/
    app/
      index.ts
    package.json
  ```

- your `CMD ["bun", "index.ts"]` will fail because its actually at `app/app/index.ts`
- only use `docker build` and `docker run` when you want to know whether your project does work in the container environment.
- its much more preferred to use `bun dev` for development, involve docker when you're finish doing what you're doing.
- `--watch` should not be used in a Docker `CMD`.
- watch mode is meant for development, while containers usually run a stable production process.
- bun does support caching, you could either define a new steps with an example below:
- ```yml
  - uses: oven-sh/setup-bun@v2
    with:
      bun-version: latest

  - name: Cache bun dependencies
    uses: actions/cache@v4
    with:
      path: ~/.bun/install/cache
      key: bun-${{ hashFiles('bun.lock') }}
      restore-keys: bun-

  - name: Install dependencies
    run: bun install --frozen-lockfile
  ```

- or, just do this instead, which replaces the separate `actions/cache` step entirely.
- ```yml
  - uses: oven-sh/setup-bun@v2
    with:
      bun-version: latest
  ```

- `oven-sh/setup-bun@v2` automatically caches the Bun runtime installation.
- bun also has a very fast global package cache, so dependency installs are already quick.
- caching is on by default via `no-cache`, but it caches the bun binary, not the project dependencies
- `actions/cache` step for `~/.bun/install/cache` still has value for larger projects.
- you can specify what virtual machine your ci would be running, it depends on your use case but `runs-on: ubuntu-latest` for default is preferred
- **circleci** uses large `resource_class: large` by default, use `small` to save credit
- a bit details on the `resource_class` using docker as the executor:
  - `large` gave you 4 cpu and 8gb of ram, this is definitely overkill, that's why i recommend defining the `resource_class`
  - whereas `small` give you 1 cpu and 2 gb of ram which is more than enough for most use cases.

## how to deploy on azure with azure container registry 101

1. **first step** is to obviously develop the project
   - continue to iterate on your project until its worthy for deployment

2. **second**, get your azure container registry ready. setting it up is simple:
   - go to `container registries`, and create your registry
   - **on how azure registries naming should be**:
     - naming your registry **after the project** `(statusapi)` is actually fine when the registry is project-scoped.
     - the convention of **using your name** makes more sense when the registry is meant to hold multiple projects, one registry, many images.
     - **the real best practice** for ACR is one registry per team/org, multiple repositories inside it
     - ```
       tgrwjya.azurecr.io/
         status-api:latest
         guestbook-api:latest
         kaomoji-api:latest
       ```

3. **third** how to **tag, build and push** your image to azure
   - make sure to `az acr login` before tagging and pushing said image.
     - ```bash
       az acr login --name <registry-name>
       ```
   - **tagging and pushing an image**:
     - to push it to azure registries, you must create a tag that includes the registry address:
     - ```bash
       docker tag <local-image-name>:<tag> <acr-login-server>/<repository-name>:<tag>

       # in my example
       docker tag status-api:latest statusapi-dxa6e4dje7hsera4.azurecr.io/status-api:latest
       ```

     - only then, you can push it to azure:
     - ```bash
       docker push <acr-login-server>/<repository-name>:<tag>

       # in my example
       docker push statusapi-dxa6e4dje7hsera4.azurecr.io/status-api:latest
       ```

     - docker defaults to `latest` on `docker build` and `docker pull`, but docker tag requires you to specify the tag explicitly.

4. **lastly, container app**.
   - this step is easy, go to your `resource group`, in my example its `docker-mastery-rg`.
   - click the `create` button and search for `container app` in the marketplace
   - point out the deployment source using your said image from the azure registries
   - if your container is an api, you might want to enable the `ingress`, just don't forget to set the `target port` to your actual project port, in my case its `3000`
   - and voilà, you've successfully deployed your own container app project!

## mistakes i made (and fixed)

1. `az acr build` is blocked on azure for students
   - `az acr build` uses acr tasks, a remote build feature that student subscriptions don't allow.
   - fix: build locally on the ci runner with `docker build` and push with `docker push` instead.

2. wrong `ACR_NAME` secret value
   - set it to the full hostname `statusapi-dxa6e4dje7hsera4.azurecr.io` instead of just the registry
     name `statusapi`.
   - this caused `docker push` to resolve a nonexistent host.
   - fix: secret should be the registry name only — `.azurecr.io` is appended in the workflow.

3. missing `az acr login` before `docker push`
   - `docker push` to azure registries requires docker to be authenticated separately from the azure cli.
   - fix: add `az acr login --name ${{ secrets.ACR_NAME }}` after `azure/login@v2`.

## find me

[portfolio](https://tgr-wjya.github.io) · [linkedin](https://linkedin.com/in/tegar-wijaya-kusuma-591a881b9) · [email](mailto:tgr.wjya.queue.top126@pm.me)

---

made with ◉‿◉
