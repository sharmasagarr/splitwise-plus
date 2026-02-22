# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# 1. Install dependencies
COPY package*.json ./
# Note: Ensure 'prisma' CLI is in dependencies or devDependencies
RUN npm install

# 2. Copy prisma schema and generate the new v7 client
COPY prisma ./prisma/
RUN npx prisma generate

# 3. Copy source code (which now includes the generated client in src/generated)
COPY . .

# 4. Compile TypeScript
# This will move your code AND the generated client into the /dist folder
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app

# Copy the compiled JS (includes the generated client)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Railway Environment
ENV NODE_ENV=production
EXPOSE 3500

CMD ["node", "dist/index.js"]