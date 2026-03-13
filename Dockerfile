FROM oven/bun:latest AS builder
WORKDIR /app
COPY package*.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2
FROM oven/bun:latest AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
# This removes the dependencies for the final image, it'll be smaller, and cleaner
COPY . .
CMD ["bun", "index.ts"]
