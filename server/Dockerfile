# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Create the folder so Prisma has a target
RUN mkdir -p src/generated/prisma

# This runs npm install + postinstall (prisma generate)
RUN npm install

# Copy everything else (including your updated src/db/index.ts)
COPY . .

# Compile TS to JS. This moves src/generated -> dist/generated
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app

# We only copy dist and node_modules. 
# The client is now safely inside /app/dist/generated/prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production
EXPOSE 3500

CMD ["node", "dist/index.js"]