# Frontend Development Dockerfile - Standalone
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies with legacy-peer-deps flag to handle React 19 compatibility issues
RUN npm ci --quiet --legacy-peer-deps || npm install --legacy-peer-deps

# Copy the rest of the application with specific handling for Windows file permissions
# Using the COPY command with specific targets instead of COPY . .
COPY public ./public/
COPY src ./src/
COPY index.html vite.config.js ./
COPY tailwind.config.js postcss.config.js ./

# Fix file permissions explicitly
RUN find /app -type f -exec chmod 644 {} \; && \
    find /app -type d -exec chmod 755 {} \;

# Expose port 5173
EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 