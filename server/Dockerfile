# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# 1. Copy package files
COPY package*.json ./

# 2. Copy Prisma folder BEFORE npm install
# This satisfies the 'postinstall' script triggered by npm install
COPY prisma ./prisma/

# 3. Create the directory for the new v7 client
RUN mkdir -p src/generated/prisma

# 4. Install dependencies (this will run 'prisma generate' automatically)
RUN npm install

# 5. Copy the rest of your source code
COPY . .

# 6. Build the project
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app

# Copy the compiled JS and node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Railway Environment
ENV NODE_ENV=production
# Ensure this matches your server.listen port
EXPOSE 3500

CMD ["node", "dist/index.js"]