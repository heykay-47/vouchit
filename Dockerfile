# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (including devDependencies needed for build) and clean cache
RUN npm ci && npm cache clean --force

# Copy only necessary source files (use .dockerignore)
COPY src/ ./src/
COPY public/ ./public/
COPY *.config.* ./
COPY *.json ./
COPY index.html ./

# Build the application (Vite handles type checking internally)
RUN npm run build:production

# Production stage
FROM nginx:alpine

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Create necessary directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run/nginx && \
    chown -R appuser:appgroup /var/cache/nginx /var/log/nginx /var/run/nginx /etc/nginx/conf.d

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Set proper ownership for static files
RUN chown -R appuser:appgroup /usr/share/nginx/html

# Switch to non-root user
USER appuser

# Expose port 8080
EXPOSE 8080

# Start nginx with proper error handling
CMD ["nginx", "-g", "daemon off;"]
