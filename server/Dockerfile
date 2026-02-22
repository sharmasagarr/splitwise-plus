# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# 1. Copy package files
COPY package*.json ./

# 2. COPY THE PRISMA FOLDER FIRST
# This ensures the schema is present when 'npm install' triggers 'postinstall'
COPY prisma ./prisma/

# 3. Now install dependencies
RUN npm install

# 4. Copy the rest of the source code and build
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Railway usually provides the PORT env var, but we'll default to 8080
ENV NODE_ENV=production
EXPOSE 3500

CMD ["node", "dist/index.js"]