# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
# Create the directory for the client
RUN mkdir -p generated/prisma

RUN npm install
COPY . .
# Compile only your source code
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
# Copy the generated client exactly as it is
COPY --from=builder /app/generated ./generated

ENV NODE_ENV=production
EXPOSE 3500

CMD ["node", "dist/index.js"]