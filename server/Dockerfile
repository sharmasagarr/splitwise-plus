# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN mkdir -p generated/prisma

RUN npm install
COPY . .
# npx prisma generate happens here via postinstall or manual run
RUN npx prisma generate
# tsc will now compile BOTH src and generated into dist
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app

# We only need dist and node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production
EXPOSE 3500

# Check where the files landed for peace of mind
RUN ls -R /app/dist

CMD ["node", "dist/index.js"]