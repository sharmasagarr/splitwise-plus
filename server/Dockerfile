# =========================
# Stage 1: Build
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma needs DATABASE_URL to exist during generate
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Copy dependency files first (for caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including dev for TypeScript)
RUN npm install

# Copy rest of the source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript -> dist
RUN npm run build



# =========================
# Stage 2: Production Runtime
# =========================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3500

CMD ["node", "dist/index.js"]