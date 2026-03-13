# docker-mastery

**14 March 2026**

> raw dockerfile, ci.yml for deployment on [azure](https://portal.azure.com/)

actually deploying my app with my own *dockerfile* and *ci* without llm scaffolding help to azure

the goal is to learn and write the deployment config on my own.

understanding docker is an integral part of becoming a devops engineer. scaffolding it won't help me learn anything.

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
- you can't use `--watch` in `CMD` because at that point the whole container was already immutable.
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

- or, just do this instead:
- ```yml
  - uses: oven-sh/setup-bun@v2
    with:
      bun-version: latest
      cache: true          # caches ~/.bun/install/cache keyed by bun.lock automatically
  ```

- it work the same way, `cache: true` handles both the bun binary and the package cache in one shot. which replaces the separate `actions/cache` step entirely.
- you can specify what virtual machine your ci would be running, it depends on your use case but `runs-on: ubuntu-latest` for default is preferred
- **circleci** uses large `resource_class: large` by default, use `small` to save credit
- a bit details on the `resource_class` using docker as the executor:
  - `large` gave you 4 cpu and 8gb of ram, this is definitely overkill, that's why i recommend defining the `resource_class`
  - whereas `small` give you 1 cpu and 2 gb of ram which is plenty than enough for most use cases.
- 

## find me

[portfolio](https://tgr-wjya.github.io) · [linkedin](https://linkedin.com/in/tegar-wijaya-kusuma-591a881b9) · [email](mailto:tgr.wjya.queue.top126@pm.me)

---

made with ◉‿◉
