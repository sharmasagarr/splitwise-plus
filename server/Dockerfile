# =========================
# Stage 1: Build
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma requires this to exist during generate
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build



# =========================
# Stage 2: Production
# =========================
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy compiled application
COPY --from=builder /app/dist ./dist

# Copy generated Prisma client
COPY --from=builder /app/generated ./generated

EXPOSE 3500

CMD ["node", "dist/src/index.js"]