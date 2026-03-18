# -------- Build Stage --------
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
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /usr/src/app/dist ./dist

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/main.js"]