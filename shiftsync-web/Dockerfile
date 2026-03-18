
FROM node:22-alpine AS deps
 
RUN apk add --no-cache libc6-compat
WORKDIR /app
 
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:22-alpine AS builder
 
WORKDIR /app
 
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXTAUTH_URL
 
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXTAUTH_URL=$NEXTAUTH_URL \
    NEXT_TELEMETRY_DISABLED=1
 
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
 

FROM node:22-alpine AS runner
 
WORKDIR /app
 
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
 
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
 
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public
 
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

