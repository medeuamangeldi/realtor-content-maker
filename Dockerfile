# Step 1: Build the app
FROM node:alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm install --frozen-lockfile || yarn install --frozen-lockfile || pnpm install --frozen-lockfile

# Copy source code and env file
COPY . .
# Optionally copy .env.local if you want build-time env variables
# (Next.js will inline them if prefixed with NEXT_PUBLIC_)
COPY .env.local .env.local

# Build the Next.js app
RUN npm run build

# Step 2: Run the app with minimal image
FROM node:alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy built app and necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json

# Copy .env.local for runtime env variables
COPY --from=builder /app/.env.local .env.local

EXPOSE 4000

# Start the app
CMD ["npm", "start"]
