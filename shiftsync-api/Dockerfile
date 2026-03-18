FROM node:22-alpine AS deps

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Build the NestJS project
RUN npm run build

# -------- Production Stage --------
FROM node:22-alpine AS production

WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

# Copy only package.json and install prod dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/main.js"]

